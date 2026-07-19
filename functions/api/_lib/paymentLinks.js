// Mirrors site/js/payment-links.js (Tide payment links, one per bookable
// service/price tier). Kept as a small server-side copy rather than a shared
// import, matching how small constants are duplicated elsewhere in this
// codebase rather than introducing a build step to share browser/worker code.
export const PAYMENT_LINKS = {
  'tuition-parent': 'https://pay.tide.co/products/11-tutition-6Xut6y3i',
  'tuition-parent-pack': 'https://pay.tide.co/products/11-tuition-e1Luhi0E',
  'tuition-school': 'https://pay.tide.co/products/11-pupil-tu-nTKpm3n0',
  'tuition-school-pack': 'https://pay.tide.co/products/11-pupil-tu-3tO5yRjy',
  'sensory-parent': 'https://pay.tide.co/products/sensory-pro-bdZ5mEAX',
  'sensory-school': 'https://pay.tide.co/products/sensory-pro-ClREh8T3',
  'sensory-school-pack': 'https://pay.tide.co/products/sensory-pro-gdSGzbjz',
  'support': 'https://pay.tide.co/products/support-ses-ZPiVGbt5',
  'sentence-steps': 'https://pay.tide.co/products/sentence-st-OyI33gHh',
  'sentence-steps-pack': 'https://pay.tide.co/products/sentence-st-c2xWkvFs',
  'build-buddies': 'https://pay.tide.co/products/build-buddi-1kbaMMo9',
  'build-buddies-pack': 'https://pay.tide.co/products/build-buddi-g54XUohD'
};
