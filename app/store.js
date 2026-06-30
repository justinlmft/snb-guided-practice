/* ============================================================================
   Store — accounts, cross-device sync, and the simulated-AI recommender.

   Two modes, same API:
   • Cloud (keys in config.js): real Supabase email/password accounts. Check-ins
     and sessions live in Postgres under the signed-in user (row-level security),
     mirrored to an on-device cache for instant render + offline. An outbox holds
     anything written while offline and flushes on next load.
   • Local (no keys): a profile + data kept in localStorage on this device only.
     Lets the prototype run, and shows the exact sign-in UX, before keys exist.

   Reads are synchronous over an in-memory copy (so the UI render stays simple);
   writes are write-through (memory + cache now, cloud in the background).
   ========================================================================== */
(function (global) {
  // ----------------------------------------------------------------------------
  // WebKit / iOS hardening for the Supabase auth client.
  // config.js builds window.sb with createClient(url, key) and ALL-DEFAULT auth
  // options. On iOS WebKit those defaults bite us:
  //   • the default cross-tab lock (navigator.locks) can wedge per-request token
  //     resolution, so authenticated calls silently go out WITHOUT a JWT — RLS
  //     then rejects the write (insert -> 42501) while a cached read masks it.
  //     This is why even a fresh iOS sign-in fails to persist.
  //   • a single localStorage access that throws (private mode / storage
  //     partitioning) can knock out session persistence entirely.
  // We rebuild the client here — same project, default storageKey, so any
  // session already on the device is reused — with a serial in-memory lock and a
  // never-throw storage shim. config.js is left untouched. If anything goes
  // wrong we fall back to the original client, so desktop behaviour is unchanged.
  // ----------------------------------------------------------------------------
  function buildClient(){
    const orig = global.sb;
    const cfg = global.SNB_CONFIG || {};
    if(!orig || !global.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return orig;
    try{
      // serial, deadlock-proof lock (the auth-js processLock shape): each call
      // waits for the previous to settle, so token refreshes never overlap and
      // we never depend on navigator.locks (which misbehaves under iOS WebKit).
      let chain = Promise.resolve();
      const serialLock = (_name, _acquireTimeout, fn) => {
        const run = chain.then(() => fn());
        chain = run.then(() => {}, () => {});      // advance on settle, swallow errors
        return run;
      };
      // storage that can never throw: real localStorage when reachable, else a
      // memory map, so one WebKit access error can't kill the whole session.
      const mem = {};
      const safeStorage = {
        getItem(k){ try{ return global.localStorage.getItem(k); }catch(e){ return (k in mem) ? mem[k] : null; } },
        setItem(k, v){ try{ global.localStorage.setItem(k, v); }catch(e){ mem[k] = String(v); } },
        removeItem(k){ try{ global.localStorage.removeItem(k); }catch(e){ delete mem[k]; } },
      };
      const client = global.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: safeStorage,
          lock: serialLock,
          // storageKey defaults to sb-<ref>-auth-token — identical to the
          // config.js client, so the device's existing session is picked up.
        },
      });
      try{ orig.auth.stopAutoRefresh(); }catch(e){}   // retire config.js's refresher (avoid two)
      global.sb = client;                              // keep console/diagnostic `sb` on the live client
      return client;
    }catch(e){ console.warn('[store] hardened client build failed, using default', e); return orig; }
  }

  const sb = buildClient();             // supabase client or null
  const CLOUD = !!sb;
  const PROFILE_KEY = 'snb_profile';    // local-mode current profile pointer

  let auth = { user: null };            // {id, email}
  let data = { checkins: [], sessions: [] };
  let outbox = { checkins: [], sessions: [] };
  let onChange = null;                  // app re-render hook (set in init)
  let sync = { state: 'idle', pending: 0, error: null };  // 'idle' | 'syncing' | 'error'

  const cacheKey = () => 'snb_cache_' + (auth.user ? auth.user.id : 'anon');
  function saveCache(){ try { localStorage.setItem(cacheKey(), JSON.stringify({ data, outbox })); } catch(e){} }
  function loadCache(){ try { const o = JSON.parse(localStorage.getItem(cacheKey())); if(o){ data = o.data||{checkins:[],sessions:[]}; outbox = o.outbox||{checkins:[],sessions:[]}; } else { data={checkins:[],sessions:[]}; outbox={checkins:[],sessions:[]}; } } catch(e){ data={checkins:[],sessions:[]}; outbox={checkins:[],sessions:[]}; } _purgeTombs(); }

  // ---- sync plumbing (merge, live-session gating, loud failure) ----
  function notify(){ try{ onChange && onChange(); }catch(e){} }
  function setSync(state, error){
    sync.state = state;
    sync.error = error || null;
    sync.pending = outbox.checkins.length + outbox.sessions.length;
    renderSyncToast();
  }

  // union check-in / session lists by timestamp. Later args win on shared
  // fields (cloud is authoritative for v/sym/dor/dom/...), but local-only fields
  // (e.g. `challenge`, which has no cloud column yet) are preserved. This is what
  // keeps an un-synced check-in visible instead of being wiped by a cloud read.
  function unionByT(...lists){
    const m = new Map();
    for(const list of lists){ if(!list) continue; for(const r of list){ if(r && r.t!=null){ m.set(r.t, Object.assign({}, m.get(r.t), r)); } } }
    return Array.from(m.values()).sort((a,b)=>a.t-b.t);
  }

  // a "your token isn't valid" failure (vs a transient network blip)?
  function isAuthError(err){
    if(!err) return false;
    const code = String(err.code||'');
    const status = err.status || err.statusCode;
    const msg = String(err.message||'').toLowerCase();
    return code==='42501' || code==='PGRST301' || status===401 || status===403 ||
           msg.includes('jwt') || msg.includes('row-level security') || msg.includes('not authorized');
  }

  // Return a live, non-expired session, refreshing if it is about to lapse;
  // null if there is no usable session. Authenticated reads/writes gate on this
  // so we never silently act on a stale or missing token (the iOS failure mode).
  async function ensureSession(){
    if(!CLOUD) return null;
    try{
      const { data:{ session } } = await sb.auth.getSession();
      if(!session) return null;
      const now = Math.floor(Date.now()/1000);
      if(session.expires_at && session.expires_at - now < 60){
        const { data:r, error } = await sb.auth.refreshSession();
        if(error) return session;                    // refresh failed — hand back what we have
        return (r && r.session) || session;
      }
      return session;
    }catch(e){ return null; }
  }

  // ---- loud failure: a small, self-contained "couldn't sync" toast.
  // Lives entirely in store.js (no app.css / app.js dependency) so the whole fix
  // ships as one identical file to both repos.
  function renderSyncToast(){
    try{
      if(typeof document==='undefined' || !document.body) return;
      const id='snb-sync-toast';
      const existing=document.getElementById(id);
      if(sync.state!=='error'){ if(existing) existing.remove(); return; }
      if(existing) return;
      const el=document.createElement('div');
      el.id=id; el.setAttribute('role','status');
      el.style.cssText='position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:99999;max-width:88%;display:flex;gap:10px;align-items:center;padding:10px 14px;border-radius:14px;background:#3a2a2a;color:#fff;font:500 13px/1.35 -apple-system,system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.28)';
      el.appendChild(document.createTextNode('your last check-in hasn’t synced yet.'));
      const b=document.createElement('button');
      b.type='button'; b.textContent='retry';
      b.style.cssText='appearance:none;border:0;background:rgba(255,255,255,.18);color:#fff;font:600 13px/1 inherit;padding:7px 12px;border-radius:9px;cursor:pointer';
      b.onclick=()=>{ setSync('syncing'); hydrate(); };
      el.appendChild(b);
      document.body.appendChild(el);
    }catch(e){}
  }

  // ---- row mappers (cloud columns are snake_case) ----
  const rowToCheckin = r => ({ t:r.t, v:r.v, sym:r.sym, dor:r.dor, fr:r.fr, note:r.note, dom:r.dom });
  const checkinToRow = c => ({ user_id:auth.user.id, t:c.t, v:c.v, sym:c.sym, dor:c.dor, fr:c.fr||0, note:c.note||'', dom:c.dom });
  const rowToSession = r => ({ t:r.t, practiceKey:r.practice_key, skill:r.skill, sense:r.sense, silence:r.silence, completed:r.completed, endedEarly:r.ended_early, minutes:r.minutes, domBefore:r.dom_before });
  const sessionToRow = s => ({ user_id:auth.user.id, t:s.t, practice_key:s.practiceKey, skill:s.skill, sense:s.sense, silence:s.silence, completed:!!s.completed, ended_early:!!s.endedEarly, minutes:s.minutes, dom_before:s.domBefore });

  // ---- lifecycle ----
  async function init(cb){
    onChange = cb || null;
    if(CLOUD){
      try{
        // React to background token refreshes / sign-in elsewhere: keep auth.user
        // current and re-sync + re-render when a valid session (re)appears. This
        // is what recovers the UI on iOS once the session plumbing settles.
        sb.auth.onAuthStateChange((event, session)=>{
          if(event==='INITIAL_SESSION') return;          // handled by the explicit load below
          if(session && session.user){
            const was = auth.user && auth.user.id;
            auth.user = { id:session.user.id, email:session.user.email };
            if(was !== auth.user.id) loadCache();
            if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED' || was !== auth.user.id) hydrate();
          } else if(event==='SIGNED_OUT'){
            auth.user = null;
          }
        });
        const session = await ensureSession();           // live, refreshed-if-needed session — not a cached pointer
        if(session && session.user){ auth.user = { id:session.user.id, email:session.user.email }; loadCache(); await hydrate(); }
      }catch(e){ console.warn('session check failed', e); }
    } else {
      const p = readProfile();
      if(p){ auth.user = p; loadCache(); }
    }
    cb && cb();
  }
  function readProfile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch(e){ return null; } }
  function writeProfile(p){ try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch(e){} }
  function clearProfile(){ try { localStorage.removeItem(PROFILE_KEY); } catch(e){} }

  async function hydrate(){
    if(!CLOUD || !auth.user) return;
    setSync('syncing');
    await flush();                                   // push anything queued offline first
    try{
      const session = await ensureSession();         // a real GET, not the local cache, must be authenticated
      if(!session){ setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', 'no session'); return; }
      const [cs, ss] = await Promise.all([
        sb.from('checkins').select('*').order('t', { ascending:true }),
        sb.from('sessions').select('*').order('t', { ascending:true }),
      ]);
      let changed = false;
      // MERGE (union by t), never overwrite: local + still-queued outbox + cloud.
      // An un-synced check-in stays visible and is never lost to a cloud read.
      if(!cs.error){ data.checkins = unionByT(data.checkins, outbox.checkins, (cs.data||[]).map(rowToCheckin)); changed = true; }
      if(!ss.error){ data.sessions = unionByT(data.sessions, outbox.sessions, (ss.data||[]).map(rowToSession)); changed = true; }
      _purgeTombs();                                   // re-apply deletions over whatever the cloud just merged back
      saveCache();
      setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', (cs.error||ss.error)||null);
      if(changed) notify();                          // re-render once fresh data lands (post-init / post-refresh)
    }catch(e){ console.warn('hydrate failed (using cache)', e); setSync((outbox.checkins.length||outbox.sessions.length) ? 'error' : 'idle', e); }
  }

  let flushing = false;
  async function flush(){
    if(!CLOUD || !auth.user) return;
    if(flushing) return;                 // a flush is already in flight; it will drain the outbox
    flushing = true;
    let ok = true;
    try{
      if(outbox.checkins.length) ok = await flushTable('checkins', outbox.checkins, checkinToRow);
      if(ok && outbox.sessions.length) ok = await flushTable('sessions', outbox.sessions, sessionToRow);
    } finally {
      flushing = false;
    }
    // drained cleanly but more arrived mid-flush? keep going. otherwise surface state.
    if(ok && (outbox.checkins.length || outbox.sessions.length)){ setSync('syncing'); return flush(); }
    setSync(ok ? 'idle' : 'error');
  }
  // Push one table's outbox. On an auth failure (no/expired JWT — the iOS case),
  // refresh the session once and retry before giving up. Returns true if the
  // queue drained, false if it is stuck (items stay queued; nothing is dropped).
  async function flushTable(table, queue, toRow){
    if(!queue.length) return true;
    const batch = queue.slice();
    let { error } = await sb.from(table).insert(batch.map(toRow));
    if(error && isAuthError(error)){
      try{ await sb.auth.refreshSession(); }catch(e){}
      const live = await ensureSession();
      if(live){ ({ error } = await sb.from(table).insert(batch.map(toRow))); }
    }
    if(!error){ queue.splice(0, batch.length); saveCache(); return true; }
    console.warn('[store] sync failed for', table, error);
    return false;
  }

  // ---- auth ----
  async function signUp(email, password){
    if(CLOUD){
      const { data:res, error } = await sb.auth.signUp({ email, password });
      if(error) return { error: error.message };
      if(res.user && !res.session) return { needsConfirm: true };     // email confirmation on
      if(res.user){ auth.user = { id:res.user.id, email:res.user.email }; loadCache(); await hydrate(); }
      return {};
    }
    return localEnter(email);
  }
  async function signIn(email, password){
    if(CLOUD){
      const { data:res, error } = await sb.auth.signInWithPassword({ email, password });
      if(error) return { error: error.message };
      auth.user = { id:res.user.id, email:res.user.email }; loadCache(); await hydrate();
      return {};
    }
    return localEnter(email);
  }
  function localEnter(email){
    auth.user = { id:'local:'+(email||'me'), email:email||'' };
    writeProfile(auth.user); loadCache(); return {};
  }
  async function signOut(){
    if(CLOUD){ try{ await sb.auth.signOut(); }catch(e){} } else { clearProfile(); }
    auth.user = null; data = { checkins:[], sessions:[] }; outbox = { checkins:[], sessions:[] };
    setSync('idle');
  }
  function user(){ return auth.user; }
  function cloud(){ return CLOUD; }
  function syncStatus(){ return { state: sync.state, pending: sync.pending }; }   // {state:'idle'|'syncing'|'error', pending}

  // ---- check-ins ----
  function addCheckin(c){
    const dom = PVCurrent.dominantOf(c.v, c.sym, c.dor);
    // challenge = the level of challenge the person wants today (0..1). Tracked over
    // time and fed to the recommender. NOTE: not yet a cloud column — it lives in the
    // on-device record/cache; add a `challenge` column + map it in checkinToRow to sync it.
    const rec = { t:Date.now(), v:c.v, sym:c.sym, dor:c.dor, fr:c.freeze||0, note:c.note||'', dom:dom.key,
                  challenge:(typeof c.challenge==='number'?c.challenge:null) };
    data.checkins.push(rec);
    if(CLOUD && auth.user){ outbox.checkins.push(rec); setSync('syncing'); }
    saveCache(); if(CLOUD) flush();
    return rec;
  }
  // edit an existing check-in in place (by timestamp): local + cloud. challenge stays local-only (no cloud column yet).
  function updateCheckin(t, c){
    const i = data.checkins.findIndex(x=>x.t===t);
    if(i<0) return null;
    const old = data.checkins[i];
    const dom = PVCurrent.dominantOf(c.v, c.sym, c.dor);
    const rec = Object.assign({}, old, { v:c.v, sym:c.sym, dor:c.dor, fr:(c.freeze!=null?c.freeze:old.fr)||0, dom:dom.key,
                challenge:(typeof c.challenge==='number'?c.challenge:old.challenge) });
    data.checkins[i] = rec;
    const oi = outbox.checkins.findIndex(x=>x.t===t);
    if(oi>=0) outbox.checkins[oi] = rec;
    saveCache();
    if(CLOUD && auth.user && oi<0){
      try{ sb.from('checkins').update({ v:rec.v, sym:rec.sym, dor:rec.dor, fr:rec.fr, dom:rec.dom }).eq('user_id', auth.user.id).eq('t', t); }catch(e){}
    }
    return rec;
  }
  function checkins(){ return data.checkins.slice(); }
  // Most recent check-in, IGNORING any dated in the future. A device with a
  // skewed clock can leave a future-stamped row in the cloud; because reads sort
  // by t, that row would otherwise hijack "today" forever — lastCheckin() would
  // never be sameDay(now), so the for-you reader, done-states, and the practice
  // recommendation all silently fall back to their neutral/stale forms. Tolerance
  // of 60s absorbs minor clock differences on a just-made check-in.
  function lastCheckin(){
    const cutoff = Date.now() + 60000;
    let best = null;
    for(const c of data.checkins){ if(c && typeof c.t==='number' && c.t <= cutoff && (!best || c.t > best.t)) best = c; }
    return best || (data.checkins.length ? data.checkins[data.checkins.length-1] : null);
  }

  // ---- sessions ----
  function addSession(s){
    const rec = Object.assign({ t:Date.now() }, s);
    data.sessions.push(rec);
    if(CLOUD && auth.user){ outbox.sessions.push(rec); setSync('syncing'); }
    saveCache(); if(CLOUD) flush();
  }
  function sessions(){ return data.sessions.slice(); }
  // tombstones: timestamps the user deleted, per kind ('sessions' | 'checkins'). A deletion
  // must survive the cloud re-merge on the next hydrate even before (or if) the cloud DELETE
  // lands, so we record deleted t's locally and purge them after every load/hydrate.
  function _tombKey(kind){ return 'snb_deleted_' + kind + '_' + (auth.user ? auth.user.id : 'anon'); }
  function _tombs(kind){ try{ const a=JSON.parse(localStorage.getItem(_tombKey(kind))); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  function _addTomb(kind, t){ try{ const a=_tombs(kind); if(a.indexOf(t)<0){ a.push(t); localStorage.setItem(_tombKey(kind), JSON.stringify(a.slice(-500))); } }catch(e){} }
  function _tombSet(kind){ const a=_tombs(kind); if(!a.length) return null; const set=Object.create(null); a.forEach(t=>set[t]=1); return set; }
  function _purgeTombs(){
    const ss=_tombSet('sessions'); if(ss) data.sessions = data.sessions.filter(s=> !(s && ss[s.t]));
    const cc=_tombSet('checkins'); if(cc) data.checkins = data.checkins.filter(c=> !(c && cc[c.t]));
  }
  // delete a logged practice session by timestamp (e.g. a test run). Local + cloud + tombstone.
  function deleteSession(t){
    _addTomb('sessions', t);                                  // record the deletion so it sticks across sync
    const i = data.sessions.findIndex(x => x.t===t);
    if(i >= 0) data.sessions.splice(i, 1);
    const oi = outbox.sessions.findIndex(x => x.t===t);
    if(oi >= 0) outbox.sessions.splice(oi, 1);
    saveCache();
    if(CLOUD && auth.user){
      // .then() is required: a supabase-js builder only sends the request when awaited/thened.
      try{ sb.from('sessions').delete().eq('user_id', auth.user.id).eq('t', t).then(function(){}, function(){}); }catch(e){}
    }
    return true;
  }
  // delete a check-in by timestamp. Same tombstone + fire-the-cloud-delete pattern.
  function deleteCheckin(t){
    _addTomb('checkins', t);
    const i = data.checkins.findIndex(x => x.t===t);
    if(i >= 0) data.checkins.splice(i, 1);
    const oi = outbox.checkins.findIndex(x => x.t===t);
    if(oi >= 0) outbox.checkins.splice(oi, 1);
    saveCache();
    if(CLOUD && auth.user){
      try{ sb.from('checkins').delete().eq('user_id', auth.user.id).eq('t', t).then(function(){}, function(){}); }catch(e){}
    }
    return true;
  }

  // ---- learned preferences ----
  function learned(){
    const done = data.sessions.filter(s=>s.completed);
    const count = (arr,key)=>{const m={};arr.forEach(s=>{const k=s[key];if(k)m[k]=(m[k]||0)+1;});return m;};
    const top = (m)=>Object.keys(m).sort((a,b)=>m[b]-m[a])[0]||null;
    const earlyRate = data.sessions.length ? data.sessions.filter(s=>s.endedEarly).length/data.sessions.length : 0;
    const chs = data.checkins.map(c=>c.challenge).filter(v=>typeof v==='number');
    const recentCh = chs.slice(-8);
    const challengeAvg = recentCh.length ? recentCh.reduce((s,v)=>s+v,0)/recentCh.length : null;
    return { favSense: top(count(done,'sense')), favSkill: top(count(done,'skill')), favPractice: top(count(done,'practiceKey')),
             sessionsDone: done.length, endsEarlyOften: earlyRate >= 0.4 && data.sessions.length >= 3,
             challengeAvg, challengeN: chs.length };
  }

  // ---- trend ----
  function trend(){
    const cs = data.checkins.slice(-5);
    if(!cs.length) return null;
    const avg = k => cs.reduce((n,c)=>n+c[k],0)/cs.length;
    const v=avg('v'), sym=avg('sym'), dor=avg('dor');
    const dom = PVCurrent.dominantOf(v,sym,dor);
    let dir='steady';
    if(cs.length>=2){ const d=cs[cs.length-1].v - cs[0].v; dir = d>0.12?'rising':d<-0.12?'falling':'steady'; }
    return { v, sym, dor, dom, dir, n:cs.length };
  }

  // ---- transitions: the state-change the person tends to make most ----
  // Returns the most common ordered pair of consecutive, DIFFERENT dominant states
  // across their check-in history, or null until there's enough of a pattern to claim.
  function transitions(){
    const cs = data.checkins;
    if(cs.length < 6) return null;                              // not enough history to claim a shape
    const pairs = {}; let total = 0;
    for(let i=1;i<cs.length;i++){
      const a=cs[i-1].dom, b=cs[i].dom;
      if(!a||!b||a===b||a==='neutral'||b==='neutral') continue; // only real state changes count
      const k=a+'>'+b; pairs[k]=(pairs[k]||0)+1; total++;
    }
    if(total < 3) return null;
    let bestK=null, bestN=0;
    for(const k in pairs){ if(pairs[k]>bestN){ bestN=pairs[k]; bestK=k; } }
    if(!bestK || bestN < 2) return null;                        // the top pattern has to repeat
    const i=bestK.indexOf('>');
    return { a:bestK.slice(0,i), b:bestK.slice(i+1), count:bestN, total };
  }

  // ---- time-of-day: a daypart that skews toward one state vs the overall baseline ----
  // Returns {seg,dom,n} for the daypart most over-represented by a single state, or null.
  function timeOfDay(){
    const cs = data.checkins;
    if(cs.length < 6) return null;
    const seg = t => { const h=new Date(t).getHours(); return h<5?'late':h<12?'morning':h<17?'afternoon':h<22?'evening':'late'; };
    const bySeg = {}, overall = {}; let N=0;
    cs.forEach(c=>{ if(!c.dom||c.dom==='neutral') return; const s=seg(c.t); (bySeg[s]=bySeg[s]||{})[c.dom]=(bySeg[s][c.dom]||0)+1; overall[c.dom]=(overall[c.dom]||0)+1; N++; });
    if(N < 6) return null;
    let best=null;
    for(const s in bySeg){
      const sc=bySeg[s]; let sn=0; for(const d in sc) sn+=sc[d];
      if(sn < 3) continue;                                      // enough check-ins in this daypart
      for(const d in sc){
        const segShare=sc[d]/sn, baseShare=overall[d]/N, lift=segShare-baseShare;
        if(segShare < 0.5 || lift < 0.15) continue;             // dominates the daypart AND over-represented vs baseline
        if(!best || lift>best.lift) best={ seg:s, dom:d, n:sc[d], lift };
      }
    }
    return best ? { seg:best.seg, dom:best.dom, n:best.n } : null;
  }

  // ---- tenure: how long they've been here + how much data exists, as an honest "stage" ----
  // Drives the for-you blog's time-framing and depth (and the daily card + practice rec) so
  // nothing claims more than the data shows. Pure stage table is split out for testing.
  function _stageFor(m){
    const count=m.count, days=m.days, windowCount=m.windowCount;
    if(count <= 1)                                  return 'start';      // just arrived: no pattern to claim
    if(count <= 4 && days <= 3)                      return 'early';      // first few check-ins: "so far"
    if(days >= 21 && count >= 16 && windowCount >= 4) return 'established'; // long-running + still active
    if(days >= 7 && windowCount >= 4 && count >= 7)  return 'week';        // a real week: 7+ days AND a week's worth of check-ins (not a sparse old account)
    return 'building';                                                    // some history, but not a full honest week
  }
  function tenure(){
    const cs = data.checkins, count = cs.length;
    if(!count) return { count:0, days:0, windowCount:0, sinceLast:null, returning:false, stage:'start' };
    const now = Date.now(), DAY = 86400000;
    const sd = t => { const d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); };
    const days = Math.round((sd(now) - sd(cs[0].t)) / DAY);          // calendar days since the first check-in
    const windowCount = cs.filter(c => now - c.t <= 7*DAY).length;   // check-ins inside the last 7 days
    const sinceLast = Math.floor((now - cs[count-1].t) / DAY);       // whole days since the most recent check-in
    const returning = count >= 5 && sinceLast >= 4 && windowCount <= 2; // has history but just back from a gap
    return { count, days, windowCount, sinceLast, returning, stage: _stageFor({count, days, windowCount}) };
  }

  // ---- richer for-you signals (read by the blog; all self-gating on min data) ----
  const _REG = { safety:1, play:1, stillness:1 };          // regulated dominants
  const _DYS = { fightflight:1, shutdown:1, freeze:1 };     // dysregulated / defensive dominants
  const _RANK = { shutdown:0, freeze:0, fightflight:1, play:2, stillness:2, safety:3 }; // "steadier" ladder

  // weekMix: the window's state distribution — the 2nd-most-common state and the
  // regulated:dysregulated balance. Powers section 1's secondary-state + balance lines.
  // Computed the same way the reader picks its window-dominant, so `second` never equals it.
  function weekMix(days){
    days = days || 7;
    const cut = Date.now() - days*86400000;
    const cs = data.checkins.filter(c => c.t >= cut && c.dom && c.dom !== 'neutral');
    const n = cs.length;
    if(n < 6) return null;                                  // too few in-window to claim a mix
    const cnt = {}; cs.forEach(c => { cnt[c.dom] = (cnt[c.dom]||0) + 1; });
    const order = Object.keys(cnt).sort((a,b) => cnt[b]-cnt[a]);
    const dom = order[0], second = order[1] || null;
    let reg=0, dys=0; cs.forEach(c => { if(_REG[c.dom]) reg++; else if(_DYS[c.dom]) dys++; });
    const lean = reg>dys ? 'regulated' : dys>reg ? 'dysregulated' : 'even';
    return { n, dom, domShare:Math.round(cnt[dom]/n*100), second,
             secondShare: second ? Math.round(cnt[second]/n*100) : 0,
             reg, dys, regShare:Math.round(reg/n*100), lean, distinct:order.length,
             defenseStates: order.filter(d => _DYS[d]) };       // actual non-safety states present, by frequency
  }

  // recovery: after a dip out of a regulated state, how many check-ins until a regulated
  // one returns. The hope signal — only trustworthy with real history + several round-trips.
  function recovery(){
    const cs = data.checkins.filter(c => c.dom && c.dom !== 'neutral');
    if(cs.length < 12) return null;
    const gaps = []; let i = 0;
    while(i < cs.length){
      if(!_REG[cs[i].dom]){                                 // entered a harder state
        let j = i, steps = 0, found = false;
        while(j < cs.length){ if(_REG[cs[j].dom]){ found = true; break; } j++; steps++; }
        if(found) gaps.push(steps);                         // check-ins in the dip before steadier ground
        i = j;
      } else i++;
    }
    if(gaps.length < 3) return null;                         // need several completed recoveries
    return { avg: gaps.reduce((a,b)=>a+b,0)/gaps.length, n: gaps.length };
  }

  // practiceEffect: of the check-ins that follow a practice session, how often the next one
  // reads steadier than the state they went in with. Closes the read->practice->steadier loop.
  function practiceEffect(){
    const ss = data.sessions.filter(s => s.domBefore && _RANK[s.domBefore] != null);
    if(!ss.length) return null;
    const cs = data.checkins;
    let moved=0, total=0;
    ss.forEach(s => {
      const next = cs.find(c => c.t > s.t && c.dom && _RANK[c.dom] != null);
      if(!next) return;
      total++;
      if(_RANK[next.dom] > _RANK[s.domBefore]) moved++;
    });
    if(total < 6) return null;                               // enough paired session->check-in
    return { moved, total, rate: moved/total };
  }

  // dayArc: any one calendar day's moments as an arc — the atom of the reflections
  // system. Returns that day's check-ins in order, within-day direction (by
  // safety/ventral), that day's sessions, and any practice deltas (a session
  // sitting between two reads). From moment one. `today()` is dayArc of today.
  function dayArc(t0){
    const tEnd = t0 + 864e5;
    const moments = data.checkins
      .filter(c => c && typeof c.t==='number' && c.t>=t0 && c.t<tEnd && c.dom && c.dom!=='neutral')
      .sort((a,b)=>a.t-b.t);
    const sess = data.sessions
      .filter(s => s && typeof s.t==='number' && s.t>=t0 && s.t<tEnd)
      .sort((a,b)=>a.t-b.t);
    const n = moments.length;
    let dir = null;
    if(n>=2){ const d = moments[n-1].v - moments[0].v; dir = d>0.08?'up' : d<-0.08?'down' : 'steady'; }
    // practice deltas: the read just before a session vs the first read after it
    const deltas = [];
    sess.forEach(s => {
      const after = moments.find(m => m.t > s.t);
      if(!after) return;
      let before = null;
      for(const m of moments){ if(m.t <= s.t) before = m; else break; }
      const bv = before ? before.v : null;
      deltas.push({ t:s.t, beforeV:bv, afterV:after.v, rose: (bv!=null) ? (after.v > bv+0.04) : null });
    });
    return { moments, sessions:sess, n, dir, deltas, first: n?moments[0]:null, last: n?moments[n-1]:null };
  }
  function today(){ const d=new Date(); d.setHours(0,0,0,0); return dayArc(d.getTime()); }

  // ---- mint store: dated, immutable reflections (the archive / keepsake moat) ----
  // A reflection lives while its span is open and MINTS (snapshots, frozen) at the
  // span's close. Frozen because the copy arrays cycle randomly — recomputing would
  // change the words. Per device for now (localStorage); cloud sync is a later add.
  function _mintKey(){ return 'snb_mint_' + (auth.user ? auth.user.id : 'anon'); }
  function _mintsRaw(){ try{ const a = JSON.parse(localStorage.getItem(_mintKey())); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
  function mints(tier){ let a = _mintsRaw(); if(tier) a = a.filter(m => m.tier===tier); return a.sort((x,y)=> y.dateMs - x.dateMs); }
  function hasMint(tier, date){ return _mintsRaw().some(m => m.tier===tier && m.date===date); }
  function saveMint(entry){
    if(!entry || !entry.tier || !entry.date || !entry.text) return false;
    if(hasMint(entry.tier, entry.date)) return false;               // immutable: never overwrite
    const a = _mintsRaw();
    a.push({ id: entry.tier+':'+entry.date, tier: entry.tier, date: entry.date, dateMs: entry.dateMs, text: entry.text, data: entry.data || null, ts: Date.now() });
    try{ localStorage.setItem(_mintKey(), JSON.stringify(a)); }catch(e){}
    return true;
  }

  // ---- recommender (simulated AI) ----
  function recommend(){
    const last = lastCheckin();
    const L = learned();
    const tr = trend();
    // how far the person wants to go: this check-in's stated appetite, else their
    // recent average, else a balanced default. This is the new lever the advisor reads.
    let want = (last && typeof last.challenge==='number') ? last.challenge
               : (L.challengeAvg!=null ? L.challengeAvg : 0.55);
    if(!last){
      return cfg('mindfulness', null, prefSense()||L.favSense||'touch', 8,
        'a simple place to start. after checking in, you will get a practice attuned to your system.', 'simplest place to begin');
    }
    // first few days: keep the practice gentle and build from there, unless they explicitly asked to stretch.
    const _tn = tenure();
    const early = (_tn.stage==='start' || _tn.stage==='early') && !(typeof last.challenge==='number' && last.challenge>=0.78);
    if(early) want = Math.min(want, 0.55);
    const dom = last.dom;
    const sense = prefSense() || L.favSense || 'touch';
    const moreSilence = L.endsEarlyOften ? 12 : 8;
    if(dom==='shutdown' || dom==='freeze'){
      let reason = dom==='shutdown'
        ? 'you are pulling toward shutdown. nothing to push against. we will just find a little safety, gently.'
        : "a lot is frozen within. let's practice through settling, then look for safety.";
      if(tr && tr.dir==='falling') reason = "safety has been slipping in the last few check-ins. let's spend this one just on rebuilding it.";
      else if(want>=0.78) reason += ' you asked to go further, and we will, by settling first.';
      return cfg('anchoring', null, sense, L.endsEarlyOften?12:10, reason, 'meet you where you are');
    }
    if(dom==='fightflight' || dom==='play'){
      let reason = dom==='play'
        ? "there's safety with some energy within. a good opportunity to practice noticing."
        : "a lot of energy within. we'll slow down and let some of it settle before anything else.";
      if(want<=0.3) reason = dom==='play'
        ? "energy with safety mixed in. you asked to keep it gentle, so let's see if we can find more calm."
        : "a lot of energy within you, and you asked for gentle. we'll only settle for now.";
      return cfg('mindfulness', null, sense, moreSilence, reason, 'settle the charge');
    }
    // safe / regulated — this is where the challenge appetite has the most room to act
    if(want<=0.35 || early){
      const reason = early
        ? "you have real safety here. you're just getting started, so let's keep these first few gentle and connect with the calm within."
        : "you have real safety, and you asked to keep it gentle. let's connect more deeply with calm.";
      return cfg('anchoring', null, sense, moreSilence, reason, early ? 'gentle start' : 'stay gentle');
    }
    const skill = want>=0.78 ? 'pendulation' : (L.favSkill || 'imagery');
    let reason = "there is real safety here right now. if you're willing, this is a chance to gently meet defense, knowing you can come back.";
    if(want>=0.78) reason = "you have safety, and you asked for more challenge. let's use that capacity to connect with non-safety.";
    else if(L.sessionsDone>=3 && L.favPractice==='most') reason = "you have safety, and self-regulation is where you keep going back. let's pick that thread up again.";
    return cfg('most', skill, sense, want>=0.78?4:(L.endsEarlyOften?8:6), reason, 'room to go deeper');

    function cfg(practiceKey, skill, sense, silence, reason, tag){
      const pSil = prefSilence();
      return { practiceKey, skill, sense, silence: (pSil!=null?pSil:silence), reason, tag,
               adapted: (L.sessionsDone>0 || L.challengeN>0), domBefore: last?last.dom:null, challenge: want };
    }
  }

  // ---- challenge appetite: shared levels + label (used by check-in + advisor + you) ----
  const CHALLENGE_LEVELS = [
    { v:0.12, key:'settle',  label:'simple mindfulness' },
    { v:0.40, key:'gentle',  label:'safety-focused' },
    { v:0.65, key:'meet',    label:'beginner defense' },
    { v:0.90, key:'stretch', label:'advanced defense' },
  ];
  function challengeLabel(v){
    if(v==null||isNaN(v)) return null;
    let b=CHALLENGE_LEVELS[0];
    for(const l of CHALLENGE_LEVELS){ if(Math.abs(l.v-v)<Math.abs(b.v-v)) b=l; }
    return b.label;
  }
  // post-practice: stamp how the body felt afterward onto the last session
  function noteFeedback(val){ const s=data.sessions[data.sessions.length-1]; if(s){ s.feedback=val; saveCache(); } }

  const PRACTICE_LABEL = { mindfulness:'simple mindfulness', anchoring:'connect with safety', most:'self-regulation' };
  function practiceLabel(k){ return PRACTICE_LABEL[k]||k; }

  // ---- name ----
  function getName(){ try{ return localStorage.getItem('snb_name_'+(auth.user?auth.user.id:'anon'))||''; }catch(e){ return ''; } }
  function setName(n){ try{ localStorage.setItem('snb_name_'+(auth.user?auth.user.id:'anon'), String(n||'').trim()); }catch(e){} }

  // ---- user-chosen practice preferences (auto-fill the customizer; null = let the app decide) ----
  function prefSense(){ try{ return localStorage.getItem('snb_pref_sense')||null; }catch(e){ return null; } }
  function setPrefSense(s){ try{ if(s) localStorage.setItem('snb_pref_sense', s); else localStorage.removeItem('snb_pref_sense'); }catch(e){} }
  function prefSilence(){ try{ const v=localStorage.getItem('snb_pref_silence'); return v?+v:null; }catch(e){ return null; } }
  function setPrefSilence(n){ try{ if(n!=null&&n!=='') localStorage.setItem('snb_pref_silence', String(n)); else localStorage.removeItem('snb_pref_silence'); }catch(e){} }

  async function reset(){
    if(CLOUD && auth.user){
      try{ await sb.from('checkins').delete().eq('user_id', auth.user.id); await sb.from('sessions').delete().eq('user_id', auth.user.id); }catch(e){}
    }
    data = { checkins:[], sessions:[] }; outbox = { checkins:[], sessions:[] }; saveCache();
  }

  global.Store = {
    init, signUp, signIn, signOut, user, cloud, syncStatus,
    addCheckin, updateCheckin, deleteCheckin, checkins, lastCheckin, addSession, sessions, deleteSession, today, dayArc,
    mints, hasMint, saveMint,
    learned, trend, transitions, timeOfDay, tenure, _stageFor, weekMix, recovery, practiceEffect, recommend, practiceLabel, reset, getName, setName,
    challengeLabel, noteFeedback, CHALLENGE_LEVELS,
    prefSense, setPrefSense, prefSilence, setPrefSilence,
  };
})(window);
