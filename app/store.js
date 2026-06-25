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
  const sb = global.sb;                 // supabase client or null
  const CLOUD = !!sb;
  const PROFILE_KEY = 'snb_profile';    // local-mode current profile pointer

  let auth = { user: null };            // {id, email}
  let data = { checkins: [], sessions: [] };
  let outbox = { checkins: [], sessions: [] };

  const cacheKey = () => 'snb_cache_' + (auth.user ? auth.user.id : 'anon');
  function saveCache(){ try { localStorage.setItem(cacheKey(), JSON.stringify({ data, outbox })); } catch(e){} }
  function loadCache(){ try { const o = JSON.parse(localStorage.getItem(cacheKey())); if(o){ data = o.data||{checkins:[],sessions:[]}; outbox = o.outbox||{checkins:[],sessions:[]}; } else { data={checkins:[],sessions:[]}; outbox={checkins:[],sessions:[]}; } } catch(e){ data={checkins:[],sessions:[]}; outbox={checkins:[],sessions:[]}; } }

  // ---- row mappers (cloud columns are snake_case) ----
  const rowToCheckin = r => ({ t:r.t, v:r.v, sym:r.sym, dor:r.dor, fr:r.fr, note:r.note, dom:r.dom });
  const checkinToRow = c => ({ user_id:auth.user.id, t:c.t, v:c.v, sym:c.sym, dor:c.dor, fr:c.fr||0, note:c.note||'', dom:c.dom });
  const rowToSession = r => ({ t:r.t, practiceKey:r.practice_key, skill:r.skill, sense:r.sense, silence:r.silence, completed:r.completed, endedEarly:r.ended_early, minutes:r.minutes, domBefore:r.dom_before });
  const sessionToRow = s => ({ user_id:auth.user.id, t:s.t, practice_key:s.practiceKey, skill:s.skill, sense:s.sense, silence:s.silence, completed:!!s.completed, ended_early:!!s.endedEarly, minutes:s.minutes, dom_before:s.domBefore });

  // ---- lifecycle ----
  async function init(cb){
    if(CLOUD){
      try{
        const { data:{ session } } = await sb.auth.getSession();
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
    await flush();                                   // push anything queued offline first
    try{
      const [cs, ss] = await Promise.all([
        sb.from('checkins').select('*').order('t', { ascending:true }),
        sb.from('sessions').select('*').order('t', { ascending:true }),
      ]);
      if(!cs.error) data.checkins = (cs.data||[]).map(rowToCheckin);
      if(!ss.error) data.sessions = (ss.data||[]).map(rowToSession);
      saveCache();
    }catch(e){ console.warn('hydrate failed (using cache)', e); }
  }

  let flushing = false;
  async function flush(){
    if(!CLOUD || !auth.user) return;
    if(flushing) return;                 // a flush is already in flight; it will drain the outbox
    flushing = true;
    try{
      if(outbox.checkins.length){
        const batch = outbox.checkins.slice();
        const { error } = await sb.from('checkins').insert(batch.map(checkinToRow));
        if(!error){ outbox.checkins.splice(0, batch.length); saveCache(); } else { return; }
      }
      if(outbox.sessions.length){
        const batch = outbox.sessions.slice();
        const { error } = await sb.from('sessions').insert(batch.map(sessionToRow));
        if(!error){ outbox.sessions.splice(0, batch.length); saveCache(); }
      }
    } finally {
      flushing = false;
    }
    // if more was queued while we were flushing, drain it
    if(outbox.checkins.length || outbox.sessions.length) return flush();
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
  }
  function user(){ return auth.user; }
  function cloud(){ return CLOUD; }

  // ---- check-ins ----
  function addCheckin(c){
    const dom = PVCurrent.dominantOf(c.v, c.sym, c.dor);
    const rec = { t:Date.now(), v:c.v, sym:c.sym, dor:c.dor, fr:c.freeze||0, note:c.note||'', dom:dom.key };
    data.checkins.push(rec);
    if(CLOUD && auth.user){ outbox.checkins.push(rec); }
    saveCache(); if(CLOUD) flush();
    return rec;
  }
  function checkins(){ return data.checkins.slice(); }
  function lastCheckin(){ return data.checkins[data.checkins.length-1] || null; }

  // ---- sessions ----
  function addSession(s){
    const rec = Object.assign({ t:Date.now() }, s);
    data.sessions.push(rec);
    if(CLOUD && auth.user){ outbox.sessions.push(rec); }
    saveCache(); if(CLOUD) flush();
  }
  function sessions(){ return data.sessions.slice(); }

  // ---- learned preferences ----
  function learned(){
    const done = data.sessions.filter(s=>s.completed);
    const count = (arr,key)=>{const m={};arr.forEach(s=>{const k=s[key];if(k)m[k]=(m[k]||0)+1;});return m;};
    const top = (m)=>Object.keys(m).sort((a,b)=>m[b]-m[a])[0]||null;
    const earlyRate = data.sessions.length ? data.sessions.filter(s=>s.endedEarly).length/data.sessions.length : 0;
    return { favSense: top(count(done,'sense')), favSkill: top(count(done,'skill')), favPractice: top(count(done,'practiceKey')),
             sessionsDone: done.length, endsEarlyOften: earlyRate >= 0.4 && data.sessions.length >= 3 };
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

  // ---- recommender (simulated AI) ----
  function recommend(){
    const last = lastCheckin();
    const L = learned();
    const tr = trend();
    if(!last){
      return cfg('mindfulness', null, L.favSense||'touch', 8,
        'a calm place to start. when you check in, i will tune this to where your system actually is.', 'simplest place to begin');
    }
    const dom = last.dom;
    const sense = L.favSense || 'touch';
    const moreSilence = L.endsEarlyOften ? 12 : 8;
    if(dom==='shutdown' || dom==='freeze'){
      let reason = dom==='shutdown'
        ? 'you are pulling toward shutdown. nothing to push against. we will just find a little safety, gently.'
        : 'a lot is held still and moving at once. we will steady, then look for safety.';
      if(tr && tr.dir==='falling') reason = 'safety has been slipping the last few check-ins. let us spend this one just building it back.';
      return cfg('anchoring', null, sense, L.endsEarlyOften?12:10, reason, 'meet you where you are');
    }
    if(dom==='fightflight' || dom==='play'){
      const reason = dom==='play'
        ? 'there is safety here with some charge moving. a good place to practice noticing.'
        : 'a lot of energy is moving. we will slow down and let some of it settle before anything else.';
      return cfg('mindfulness', null, sense, moreSilence, reason, 'settle the charge');
    }
    const skill = L.favSkill || 'imagery';
    let reason = 'there is real safety here right now. if you are willing, this is a chance to gently meet something harder, knowing you can come back.';
    if(L.sessionsDone>=3 && L.favPractice==='most') reason = 'you have safety, and self-regulation is where you keep going back. let us pick that thread up again.';
    return cfg('most', skill, sense, L.endsEarlyOften?8:4, reason, 'room to go deeper');

    function cfg(practiceKey, skill, sense, silence, reason, tag){
      return { practiceKey, skill, sense, silence, reason, tag, adapted: L.sessionsDone>0, domBefore: last?last.dom:null };
    }
  }

  const PRACTICE_LABEL = { mindfulness:'simple mindfulness', anchoring:'connect with safety', most:'self-regulation' };
  function practiceLabel(k){ return PRACTICE_LABEL[k]||k; }

  async function reset(){
    if(CLOUD && auth.user){
      try{ await sb.from('checkins').delete().eq('user_id', auth.user.id); await sb.from('sessions').delete().eq('user_id', auth.user.id); }catch(e){}
    }
    data = { checkins:[], sessions:[] }; outbox = { checkins:[], sessions:[] }; saveCache();
  }

  global.Store = {
    init, signUp, signIn, signOut, user, cloud,
    addCheckin, checkins, lastCheckin, addSession, sessions,
    learned, trend, recommend, practiceLabel, reset,
  };
})(window);
