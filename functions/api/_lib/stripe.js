// Thin fetch-based wrapper around Stripe's REST API - matches how this app
// already talks to Google Calendar and Resend (plain fetch + Bearer auth)
// rather than pulling in the Stripe Node SDK, which isn't a good fit for
// the Workers runtime.

const API_BASE = 'https://api.stripe.com/v1';

// Stripe's API expects PHP-style bracket-encoded form params for nested
// objects/arrays (e.g. line_items[0][price_data][unit_amount]), not JSON.
function flattenParams(obj, prefix, out) {
  Object.keys(obj).forEach(function (key) {
    const value = obj[key];
    if (value == null) return;
    const paramKey = prefix ? prefix + '[' + key + ']' : key;
    if (Array.isArray(value)) {
      value.forEach(function (item, i) {
        const arrKey = paramKey + '[' + i + ']';
        if (item && typeof item === 'object') flattenParams(item, arrKey, out);
        else out.push([arrKey, String(item)]);
      });
    } else if (typeof value === 'object') {
      flattenParams(value, paramKey, out);
    } else {
      out.push([paramKey, String(value)]);
    }
  });
}

async function stripeRequest(env, method, path, params) {
  if (!env.STRIPE_SECRET_KEY) {
    const err = new Error('Payments are not configured yet.');
    err.status = 503;
    throw err;
  }

  const options = {
    method: method,
    headers: {
      Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  let url = API_BASE + path;
  if (params) {
    const pairs = [];
    flattenParams(params, '', pairs);
    const body = new URLSearchParams(pairs);
    if (method === 'GET') {
      url += '?' + body.toString();
    } else {
      options.body = body.toString();
    }
  }

  const resp = await fetch(url, options);
  const rawText = await resp.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    // A non-JSON body means something between us and Stripe (rather than
    // Stripe itself) rejected the request - still surface it as a clean
    // 4xx instead of crashing on the JSON parse.
    console.log('Stripe API returned non-JSON response: ' + resp.status + ' ' + rawText.slice(0, 300));
    const err = new Error('Could not reach Stripe right now - please try again shortly.');
    err.status = 422;
    throw err;
  }

  if (!resp.ok) {
    console.log('Stripe API error: ' + resp.status + ' ' + JSON.stringify(data));
    const err = new Error((data.error && data.error.message) || 'Stripe rejected the request.');
    // Stay in the 4xx range - Cloudflare swaps a generic branded page in for
    // any 5xx response, which would hide the real reason from the UI.
    err.status = resp.status >= 400 && resp.status < 500 ? resp.status : 422;
    throw err;
  }

  return data;
}

export async function createCheckoutSession(env, {
  customerEmail, customerName, lineItemName, lineItemDescription,
  unitAmount, currency, successUrl, cancelUrl, metadata
}) {
  return stripeRequest(env, 'POST', '/checkout/sessions', {
    mode: 'payment',
    customer_email: customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency || 'gbp',
          unit_amount: unitAmount,
          product_data: {
            name: lineItemName,
            description: lineItemDescription || undefined
          }
        }
      }
    ],
    metadata: metadata || {},
    payment_intent_data: { metadata: metadata || {} }
  });
}

export async function retrieveCheckoutSession(env, sessionId) {
  return stripeRequest(env, 'GET', '/checkout/sessions/' + encodeURIComponent(sessionId), null);
}

function toHex(bytes) {
  return Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}

// Verifies the Stripe-Signature header against the raw request body using
// the endpoint's webhook signing secret (Web Crypto HMAC - no external
// crypto library needed, same approach as this app's password hashing).
export async function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader || !webhookSecret) return false;

  const parts = {};
  signatureHeader.split(',').forEach(function (part) {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    parts[part.slice(0, idx)] = part.slice(idx + 1);
  });
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  const signedPayload = timestamp + '.' + rawBody;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computedSig = toHex(new Uint8Array(sigBytes));

  if (computedSig.length !== expectedSig.length) return false;
  let diff = 0;
  for (let i = 0; i < computedSig.length; i++) {
    diff |= computedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  return diff === 0;
}
