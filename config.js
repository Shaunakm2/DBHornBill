/* config.js — the only file that differs between deployments.

   Both values below are public by design. The anon key is safe in a browser:
   it carries no privileges of its own, and every table is protected by
   row-level security that acts on the signed-in user.

   The service_role key is a different thing entirely. It bypasses every
   policy in the project. It belongs in Supabase function secrets and must
   never appear in this file, in app.js, or anywhere else a browser can
   reach. The CI workflow fails the build if it finds one. */

window.ATS_CONFIG = {
  url: 'https://cwssahztaeltousbczxh.supabase.co',
  anonKey: 'sb_publishable_bJktBazyw-F1SBO_HezDng_Vj8khlx4'
};
