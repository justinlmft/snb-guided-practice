/* ============================================================================
   Stuck Not Broken — cloud config.
   Paste your Supabase project's URL and PUBLIC anon key below to turn on real
   accounts + cross-device sync. Both are safe to ship in client code (the anon
   key only works through row-level security, which the SQL setup enforces).

   Get them at: Supabase dashboard > your project > Project Settings > API.
   Until these are filled in, the app runs in on-device mode (no account).
   See SUPABASE-SETUP.md for the 5-minute setup + the SQL to paste.
   ========================================================================== */
window.SNB_CONFIG = {
  SUPABASE_URL:      'https://piutnzwpbrydyipwaocl.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpdXRuendwYnJ5ZHlpcHdhb2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNjEzMzcsImV4cCI6MjA5NzgzNzMzN30.sWJQ--a6-Wdodud6StMzfU_wwSCeUT-ThSRiOxbJ0uU',
};

window.sb = null;
(function () {
  const c = window.SNB_CONFIG;
  if (c.SUPABASE_URL && c.SUPABASE_ANON_KEY && window.supabase) {
    try { window.sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY); }
    catch (e) { console.warn('Supabase init failed:', e); }
  }
})();
window.SNB_CLOUD = !!window.sb;   // true once keys are in and the client built
