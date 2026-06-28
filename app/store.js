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
    // challenge = the level of challenge the person wants today (0..1). Tracked over
    // time and fed to the recommender. NOTE: not yet a cloud column — it lives in the
    // on-device record/cache; add a `challenge` column + map it in checkinToRow to sync it.
    const rec = { t:Date.now(), v:c.v, sym:c.sym, dor:c.dor, fr:c.freeze||0, note:c.note||'', dom:dom.key,
                  challenge:(typeof c.challenge==='number'?c.challenge:null) };
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
    if(days >= 7 && windowCount >= 4)               return 'week';        // a real week of real data
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
        'a calm place to start. when you check in, i will tune this to where your system actually is.', 'simplest place to begin');
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
        : 'a lot is held still and moving at once. we will steady, then look for safety.';
      if(tr && tr.dir==='falling') reason = 'safety has been slipping the last few check-ins. let us spend this one just building it back.';
      else if(want>=0.78) reason += ' you asked to go further today, and we will, by settling first.';
      return cfg('anchoring', null, sense, L.endsEarlyOften?12:10, reason, 'meet you where you are');
    }
    if(dom==='fightflight' || dom==='play'){
      let reason = dom==='play'
        ? 'there is safety here with some charge moving. a good place to practice noticing.'
        : 'a lot of energy is moving. we will slow down and let some of it settle before anything else.';
      if(want<=0.3) reason = dom==='play'
        ? 'energy with safety mixed in. you asked to keep it gentle, so let us just enjoy the steadiness.'
        : 'a lot of energy is moving, and you asked for gentle. we will only settle today.';
      return cfg('mindfulness', null, sense, moreSilence, reason, 'settle the charge');
    }
    // safe / regulated — this is where the challenge appetite has the most room to act
    if(want<=0.35 || early){
      const reason = early
        ? 'you have real safety here. you are just getting started, so let us keep these first few gentle and let the calm land.'
        : 'you have real safety, and you asked to keep it gentle. let us just deepen the calm and let it land.';
      return cfg('anchoring', null, sense, moreSilence, reason, early ? 'gentle start' : 'stay gentle');
    }
    const skill = want>=0.78 ? 'pendulation' : (L.favSkill || 'imagery');
    let reason = 'there is real safety here right now. if you are willing, this is a chance to gently meet something harder, knowing you can come back.';
    if(want>=0.78) reason = 'you have safety, and you asked to be stretched. let us use that capacity and meet something real.';
    else if(L.sessionsDone>=3 && L.favPractice==='most') reason = 'you have safety, and self-regulation is where you keep going back. let us pick that thread up again.';
    return cfg('most', skill, sense, want>=0.78?4:(L.endsEarlyOften?8:6), reason, 'room to go deeper');

    function cfg(practiceKey, skill, sense, silence, reason, tag){
      const pSil = prefSilence();
      return { practiceKey, skill, sense, silence: (pSil!=null?pSil:silence), reason, tag,
               adapted: (L.sessionsDone>0 || L.challengeN>0), domBefore: last?last.dom:null, challenge: want };
    }
  }

  // ---- challenge appetite: shared levels + label (used by check-in + advisor + you) ----
  const CHALLENGE_LEVELS = [
    { v:0.12, key:'settle',  label:'just settle' },
    { v:0.40, key:'gentle',  label:'go gently' },
    { v:0.65, key:'meet',    label:'meet it' },
    { v:0.90, key:'stretch', label:'go deeper' },
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
    init, signUp, signIn, signOut, user, cloud,
    addCheckin, checkins, lastCheckin, addSession, sessions,
    learned, trend, transitions, timeOfDay, tenure, _stageFor, weekMix, recovery, practiceEffect, recommend, practiceLabel, reset, getName, setName,
    challengeLabel, noteFeedback, CHALLENGE_LEVELS,
    prefSense, setPrefSense, prefSilence, setPrefSilence,
  };
})(window);
