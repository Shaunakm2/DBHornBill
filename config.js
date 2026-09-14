/* config.js — the only file that differs between deployments.

   Both values below are public by design. The anon (publishable) key is safe
   in a browser: it carries no privileges of its own, and every table is
   protected by row-level security that acts on the signed-in user.

   The service_role key is a different thing entirely. It bypasses every
   policy in the project. It belongs in Supabase function secrets and must
   never appear in this file. CI fails the build if it finds one.

   Project Settings -> API in Supabase gives you both values below. */

window.ATS_CONFIG = {
  url: 'https://cwssahztaeltousbczxh.supabase.co',
  anonKey: 'PASTE-YOUR-PUBLISHABLE-KEY-HERE'
};
