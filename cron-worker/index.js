// Minimal Cloudflare Worker, deployed separately from the main site.
// Cloudflare Pages projects can't run code on a schedule by themselves, so
// this tiny Worker exists purely to call the site's reminder endpoint once
// an hour via a Cron Trigger. It does no other work.
//
// Setup (Cloudflare dashboard, no CLI needed):
// 1. Workers & Pages -> Create -> Create Worker -> give it a name (e.g.
//    "sen-support-studio-reminders") -> Deploy.
// 2. Edit code -> replace the default contents with this file's contents ->
//    Save and deploy.
// 3. Settings -> Variables and Secrets -> Add -> name it CRON_SECRET, type
//    Secret, and paste in a long random value (e.g. generate one at
//    https://1password.com/password-generator or similar). Save.
// 4. Add that exact same value as a CRON_SECRET variable (type Secret) on
//    the main SEN-Support-Studio-Website Pages project's environment
//    variables - same place STRIPE_SECRET_KEY etc. already live.
// 5. On this Worker: Settings -> Triggers -> Cron Triggers -> Add Cron
//    Trigger -> schedule "0 * * * *" (every hour).
// 6. Redeploy the Pages project once (Deployments -> retry the latest) so
//    it picks up the new CRON_SECRET variable.

export default {
  async scheduled(event, env, ctx) {
    const resp = await fetch('https://sensupportstudio.com/api/cron/send-reminders', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.CRON_SECRET }
    });
    const body = await resp.text();
    console.log('send-reminders responded ' + resp.status + ': ' + body);
  }
};
