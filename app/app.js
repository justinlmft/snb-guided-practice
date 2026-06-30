/* ============================================================================
   Stuck Not Broken — app prototype. Vanilla JS, on-device storage, real weaver.
   Screens: auth -> paywall -> [today | current | practice | you] + check-in.
   ========================================================================== */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const root = $('#screen');
  let _toastT=null;
  function showToast(msg){ let t=document.getElementById('app-toast'); if(!t){ t=document.createElement('div'); t.id='app-toast'; t.className='app-toast'; document.body.appendChild(t); } t.textContent=msg; t.classList.add('on'); clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.remove('on'),1900); }
  // Haptics — a soft, sparing confirmation when you act (check-in saved, practice
  // started, session complete). Android exposes the Vibration API; iOS Safari does
  // NOT, so there we toggle a hidden iOS <input switch>, which emits a light tap
  // (iOS 17.4+). Both paths need a real user gesture, so haptic() must be called
  // straight from a tap handler. On by default; Settings > haptics writes '0' to mute.
  function _hapIsIOS(){
    try{ return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1); }catch(e){ return false; }
  }
  function _hapTap(){   // iOS web-haptic: create+toggle an <input switch> (rendered, not display:none/opacity:0)
    try{
      const label = document.createElement('label');
      label.setAttribute('aria-hidden','true');
      label.style.cssText = 'position:fixed;top:0;left:0;width:6px;height:6px;opacity:0.0001;border:0;margin:0;padding:0;pointer-events:none;z-index:-1';
      const input = document.createElement('input');
      input.type = 'checkbox'; input.setAttribute('switch','');
      label.appendChild(input);
      (document.body || document.documentElement).appendChild(label);
      label.click();
      setTimeout(()=>{ try{ label.remove(); }catch(e){} }, 200);
    }catch(e){}
  }
  function haptic(kind){
    try{
      if(localStorage.getItem('snb_haptics') === '0') return;       // on by default; '0' mutes
      if(_hapIsIOS()){
        try{ if(navigator.vibrate) navigator.vibrate(12); }catch(e){}   // some iOS builds expose it
        _hapTap();                                                       // the <input switch> path
        return;
      }
      if(navigator.vibrate) navigator.vibrate(kind === 'complete' ? [16,80,16] : 12);   // Android / Chrome
    }catch(e){}
  }
  const MARK = '../assets/logo/snb-mark-ink.svg';

  // ── demo mode ─────────────────────────────────────────────────────
  // Loads ~4 months of sample check-ins for review/demo only. Never persisted,
  // never touches a real account's data. Enable: localStorage.snb_demo='1' or #demo.
  (function demoData(){
    // Production: demo data is OFF by default. Opt in for review only via
    // localStorage.snb_demo='1' or #demo in the URL. Never persisted.
    let on=false; try{ if(localStorage.getItem('snb_demo')==='1' || /(^|[#&])demo\b/.test(location.hash)) on=true; }catch(e){}
    if(!on || !window.PVCurrent) return;
    const cs=[], ss=[];
    for(let d=130; d>=0; d--){
      if(Math.random()<0.32) continue;
      const prog=(130-d)/130, base=0.34+prog*0.42;
      const v=Math.max(.05,Math.min(.95, base+(Math.random()-0.5)*0.38));
      const sym=Math.max(0,Math.min(.9,(1-v)*Math.random()*1.1));
      const dor=Math.max(0,Math.min(.9,(1-v)*Math.random()*0.95));
      const dom=window.PVCurrent.dominantOf(v,sym,dor);
      const t=Date.now()-d*864e5-Math.floor(Math.random()*8)*36e5;
      const challenge=Math.max(0.1,Math.min(0.95, 0.45+prog*0.25+(Math.random()-0.5)*0.4));
      cs.push({t,v,sym,dor,fr:0,note:'',dom:dom.key,challenge});
      if(Math.random()<0.42) ss.push({t:t+18e5,practiceKey:'mindfulness',skill:null,sense:'touch',silence:8,completed:true,endedEarly:false,minutes:9,domBefore:dom.key});
    }
    cs.sort((a,b)=>a.t-b.t);
    Store.checkins=()=>cs.slice();
    Store.sessions=()=>ss.slice();
    try{ const _rn=Store.getName(); Store.getName=()=>_rn||'Sam'; }catch(e){}   // demo name in-memory only; never persisted
  })();

  // ── audio autoplay unlock ─────────────────────────────────────────
  // The meditation player runs in an iframe; browsers block its first autoplay
  // until the user has played media on this origin. Play a short silent clip on
  // the first gesture anywhere in the app so the player can autostart with no tap.
  (function(){
    let done=false;
    const SILENT='data:audio/wav;base64,UklGRvQHAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YdAHAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
    function unlock(){
      if(done)return; done=true;
      document.removeEventListener('pointerdown',unlock,true);
      try{ const a=new Audio(SILENT); const p=a.play(); if(p&&p.catch)p.catch(function(){}); }catch(e){}
    }
    document.addEventListener('pointerdown',unlock,true);
  })();

  // ── installable PWA: capture the browser's install prompt + small helpers ──
  let _deferredInstall = null;
  const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isiOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '');
  const canInstall = () => !!_deferredInstall;
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); _deferredInstall = e; updateInstallUI(); });
  window.addEventListener('appinstalled', ()=>{ _deferredInstall = null; try{ localStorage.setItem('snb_installed','1'); }catch(_){} updateInstallUI(); showToast('installed'); });
  function promptInstall(){
    if(!_deferredInstall) return;
    const dp = _deferredInstall;
    dp.prompt();
    Promise.resolve(dp.userChoice).then(()=>{ _deferredInstall = null; updateInstallUI(); }).catch(()=>{});
  }
  // refresh any visible install UI when availability changes (settings row + today nudge)
  function updateInstallUI(){
    const row = document.getElementById('install-row');
    if(row){ row.innerHTML = installRowInner(); const g = row.querySelector('.in-go'); if(g) g.onclick = promptInstall; }
    if(isStandalone() || !canInstall()){ const n = document.getElementById('install-nudge'); if(n) n.remove(); }
    else if(currentTab === 'today') maybeInstallNudge();
  }
  // long-press on chrome shouldn't pop the browser menu; inline text links keep theirs
  document.addEventListener('contextmenu', (e)=>{ const t = e.target; if(t && t.closest && t.closest('.tabbar,.fab,.breathhero,.set-seg,svg,button:not(.linkbtn)')) e.preventDefault(); }, false);
  // no zoom: block iOS Safari pinch-zoom (it ignores user-scalable=no); double-tap zoom is killed by touch-action:manipulation
  ['gesturestart','gesturechange','gestureend'].forEach(ev=>document.addEventListener(ev, e=>e.preventDefault(), {passive:false}));

  const STATE_COLOR = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].color : '#D8D2C2');
  const STATE_NAME  = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].name : 'settling');

  // The three brand marks ARE the three nervous-system axes. heart=safety,
  // bolt=fight-or-flight, x=shutdown. One vocabulary across check-in, you-tab, feedback.
  const AXIS_ICON = {
    v:   { icon:'heart', state:'safety',      sub:'connected to self, others, & environment' },
    sym: { icon:'bolt',  state:'fightflight', sub:'mobile, ready for movement' },
    dor: { icon:'x',     state:'shutdown',    sub:'immobile, ready for collapse, numb, heavy' },
  };
  const ico = (k,o) => (window.iconSVG ? window.iconSVG(k,o) : '');
  // every state is one or two axes — so every state is one or two marks.
  // blends show BOTH component marks, each tinted to its own axis. this is the
  // identity used everywhere a state is named (replaces the old colored dots).
  const STATE_AXES = {
    safety:     [['heart','safety']],
    fightflight:[['bolt','fightflight']],
    shutdown:   [['x','shutdown']],
    play:       [['heart','safety'],['bolt','fightflight']],
    stillness:  [['heart','safety'],['x','shutdown']],
    freeze:     [['bolt','fightflight'],['x','shutdown']],
  };
  // which check-in axes (v/sym/dor) make up each state — used to tint the sliders
  // of a blended state (e.g. freeze tints fight-or-flight + shutdown, safety stays its own).
  const STATE_CORE = { safety:['v'], fightflight:['sym'], shutdown:['dor'],
                       play:['v','sym'], stillness:['v','dor'], freeze:['sym','dor'] };
  const AXIS_OWN = () => ({ v:STATE_COLOR('safety'), sym:STATE_COLOR('fightflight'), dor:STATE_COLOR('shutdown') });
  // The brand logo as a live state read: heart, bolt, x in one fixed lockup (size + spacing
  // never change) — only fill color moves. Active axis(es) take the state color, the rest sit in
  // a neutral tone; color eases in on mount (MutationObserver near boot). Reduce-motion safe.
  const TRI_ORDER = ['heart','bolt','x'];
  const TRI_VB = (function(){ const I=window.SNB_ICONS||{}; let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    TRI_ORDER.forEach(k=>{ const v=((I[k]&&I[k].vb)||'0 0 1 1').trim().split(/\s+/).map(Number); x0=Math.min(x0,v[0]); y0=Math.min(y0,v[1]); x1=Math.max(x1,v[0]+v[2]); y1=Math.max(y1,v[1]+v[3]); });
    return x0+' '+y0+' '+(x1-x0)+' '+(y1-y0); })();
  function triGlyph(key){
    const col = STATE_COLOR(key), I = window.SNB_ICONS||{};
    const active = (STATE_AXES[key]||[]).map(a=>a[0]);
    const paths = TRI_ORDER.map(m=>`<path class="tg-m" data-m="${m}"${active.indexOf(m)>=0?` data-col="${col}"`:''} d="${(I[m]&&I[m].d)||''}"></path>`).join('');
    return `<svg class="triglyph" viewBox="${TRI_VB}" aria-hidden="true">${paths}</svg>`;
  }
  function stateMarks(key){
    const ax = STATE_AXES[key];
    if(!ax) return `<span class="st-dot" style="background:${STATE_COLOR(key)}"></span>`;
    // blends mix to the state's own color (e.g. freeze = both marks purple, matching its bar)
    const col = STATE_COLOR(key);
    const marks = ax.map(([icn])=>ico(icn,{cls:'st-mark', color:col})).join('');
    return `<span class="st-marks${ax.length>1?' st-pair':''}">${marks}</span>`;
  }
  // "tuned to you" sparkle — marks the one practice we shaped for you (not the logo)
  const SPARKLE = '<svg class="snb-spark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1 C12.8 6.5 13.5 9.2 16 10 C18.5 10.8 20.5 11.2 23 12 C20.5 12.8 18.5 13.2 16 14 C13.5 14.8 12.8 17.5 12 23 C11.2 17.5 10.5 14.8 8 14 C5.5 13.2 3.5 12.8 1 12 C3.5 11.2 5.5 10.8 8 10 C10.5 9.2 11.2 6.5 12 1 Z"></path></svg>';
  function setIcoLvl(axis,val){
    const el = root.querySelector('.slider[data-axis="'+axis+'"] .slider-ico');
    if(el) el.style.setProperty('--lvl',(Math.max(0,Math.min(100,val))/100).toFixed(3));
  }

  // Practice track colors (brand): mindfulness = ink, connect-with-safety = blue,
  // self-regulation = orange. Used for the "for you" card + plan reader accents.
  const TRACK = {
    mindfulness: { cls:'mind',   color:'var(--track-mind)' },
    anchoring:   { cls:'safety', color:'var(--track-safety)' },
    most:        { cls:'self',   color:'var(--track-self)' },
    more:        { cls:'mind',   color:'var(--track-mind)' },
  };
  const trackOf = (k) => TRACK[k] || TRACK.mindfulness;
  const SKILL_LABEL = { imagery:'imagery & invitation', obstacles:'obstacles', balancing:'balancing', pendulation:'pendulation' };
  const skillLabel = (k) => SKILL_LABEL[k] || k;
  const silLabel = (n) => n<=4 ? 'a little' : n>=12 ? 'a lot' : 'some';

  // Check-in readout: turn the three raw signals (v / sym / dor, 0..1) into a qualified
  // phrase — degree + dominant state, plus an optional "with a {hint|bit} of {axis}" when
  // a non-core axis is notably present. e.g. "mostly safety with a bit of sympathetic".
  function readoutPhrase(v, sym, dor){
    const dom = window.PVCurrent.dominantOf(v, sym, dor);
    const primary = dom.name || 'settling';
    const peak = Math.max(v, sym, dor);
    const degree = peak < 0.28 ? 'a little' : peak < 0.55 ? 'some' : 'mostly';
    // axes already expressed by the dominant blend — don't name them again as a secondary
    const core = { safety:['v'], fightflight:['sym'], shutdown:['dor'],
                   play:['v','sym'], stillness:['v','dor'], freeze:['sym','dor'] }[dom.key] || [];
    const sec = [['v',v,'safety'],['sym',sym,'sympathetic'],['dor',dor,'shutdown']]
      .filter(a=>!core.includes(a[0])).sort((a,b)=>b[1]-a[1])[0];
    let clause = '';
    if(sec && sec[1] > 0.18 && sec[1] > 0.33*peak){
      clause = ` with ${sec[1] < 0.34 ? 'a hint of' : 'a bit of'} <b>${sec[2]}</b>`;
    }
    return { html:`${degree} <b style="color:${dom.color}">${primary}</b>${clause}`, color: dom.color };
  }
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>';
  // "tuned to you" badge: the brand mark (recolors to white via currentColor)
  const MARK_GLYPH = "<svg viewBox=\"4 44 462 371\" fill=\"currentColor\"><path d=\"M 228.6626430999995,414.99967965948633 C 193.0931878499996,414.99967965948633 159.69623824999962,401.15528090948635 134.56332974999987,376.0223724094866 L 42.977307250000194,284.43634990948647 C 17.844398749999527,259.30344140948625 4.0,225.86389365948654 4.0,190.3370365594864 C 4.0,154.76758130948647 17.844398750000437,121.3706317094865 42.977307250000194,96.23772320948629 C 68.11021574999995,71.10481470948653 101.54976350000015,57.26041595948655 137.07662059999984,57.260415959486096 C 171.45332764999966,57.260415959486096 203.82792165000046,70.21025355948623 228.6626430999995,93.76703050948609 C 280.7175823999996,44.35317650948619 363.2727970999995,45.20513950948626 414.34797894999974,96.23772320948629 C 466.23252564999984,148.1222699094864 466.23252564999984,232.5518032094864 414.34797894999974,284.47894805948624 L 322.76195644999916,376.06497055948637 C 297.6290479499994,401.1978790594861 264.1895001999992,415.0422778094861 228.6626430999995,415.0422778094861 L 228.6626430999995,414.99967965948633 M 137.11921875000007,109.86913120948648 C 115.60715299999993,109.86913120948648 95.41562990000057,118.21836860948625 80.20809035000002,133.42590815948634 C 48.813253799999075,164.82074470948638 48.813253799999075,215.8533284094864 80.20809035000002,247.24816495948645 L 171.7941128499997,338.83418745948654 C 187.00165239999933,354.0417270094862 207.1931754999996,362.3909644094864 228.70524124999974,362.3909644094864 C 250.2173069999999,362.3909644094864 270.40883009999925,354.0417270094862 285.6163696499989,338.83418745948654 L 377.20239214999947,247.24816495948645 C 408.5546305500002,215.89592655948618 408.5546305500002,164.82074470948638 377.20239214999947,133.42590815948634 C 345.80755560000034,102.0310716094863 294.7749719000003,102.0310716094863 263.3801353500003,133.42590815948634 L 228.70524124999974,168.10080225948641 L 194.03034714999922,133.42590815948634 C 178.82280759999958,118.21836860948625 158.6312844999993,109.86913120948648 137.11921875000007,109.86913120948648\"/></svg>";
  const GEAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>';
  // Plain-language "what to expect" so a newcomer knows what each practice is.
  const PRACTICE_ABOUT = {
    mindfulness: ()=>'a gentle, guided sit. a calm voice helps you arrive, follow your breath, and move slowly through your senses. nothing to fix, nowhere to be, the simplest way back to yourself.',
    anchoring: (sense)=>`you'll use your ${sense||'senses'} as an anchor and let it lead your system toward a felt sense of safety, then rest there a while. good when things feel charged or heavy.`,
    most: ()=>'the deepest practice. you\u2019ll gently turn toward something hard while staying connected to safety, building the capacity to meet it without being pulled under. best when there is safety to spare.',
    more: ()=>'a full, standalone guided session, played start to finish.',
  };
  const aboutOf = (k, sense) => { const f = PRACTICE_ABOUT[k]; return f ? f(sense) : ''; };

  const fmtDay = (t) => new Date(t).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
  const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });

  let liveFigures = []; // current figures to destroy on screen change
  function clearFigures(){ liveFigures.forEach(f=>{try{f.destroy();}catch(e){}}); liveFigures = []; }
  function mountFigure(host, opts){ const f = window.PVCurrent(host, opts); liveFigures.push(f); return f; }

  function setHTML(html){ clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab'); root.innerHTML = html; }

  // ---------------------------------------------------------------- routing
  function route(){
    if(!Store.user()) return screenSignIn();
    return app(currentTab);
  }
  let currentTab = 'today';
  let authMode = 'in';
  let lastEmail = '';

  // ---------------------------------------------------------------- sign in / up
  function screenSignIn(err, busy){
    const up = authMode==='up';
    setHTML(`
      <div class="view gate">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <div class="gate-body">
          <p class="eyebrow">stuck not broken</p>
          <h1 style="margin:10px 0 12px">${up?'an app to guide you through emotional regulation.':'your nervous system, over time.'}</h1>
          <p class="lede" style="margin-bottom:24px">check in about your polyvagal states, get custom practices and guidance, watch your system build safety over time.</p>
          <div class="field"><label for="em">email</label><input id="em" type="email" autocomplete="email" value="${escapeHtml(lastEmail)}"></div>
          ${up ? '<div class="field"><label for="nm">your name <span style="color:var(--muted);font-weight:400">(optional)</span></label><input id="nm" type="text" autocomplete="name"></div>' : ''}
          <div class="field"><label for="pw">password</label><input id="pw" type="password" autocomplete="${up?'new-password':'current-password'}"></div>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="go" style="margin-top:8px"${busy?' disabled':''}>${busy?'one moment…':(up?'create account':'sign in')}</button>
          ${up?`<p class="fineprint" style="margin-top:10px">by creating an account, you agree to the <a href="#" data-policy="terms">terms</a> and <a href="#" data-policy="privacy">privacy policy</a>.</p>`:''}
          <p class="fineprint">${up?'already have an account?':'new here?'} <button class="linkbtn" id="toggle" style="font-size:inherit;padding:2px">${up?'sign in':'create an account'}</button></p>
          ${Store.cloud()?'':'<p class="fineprint" style="margin-top:8px">on-device mode: your sign-in works locally now. cross-device sync turns on once Supabase keys are added in config.js.</p>'}
        </div>
      </div>`);
    if(busy) return;
    $('#toggle').onclick = ()=>{ authMode = up?'in':'up'; screenSignIn(); };
    $('#go').onclick = submit;
    root.querySelectorAll('.fineprint a[data-policy]').forEach(a=>{
      a.onclick = (e)=>{ e.preventDefault(); screenPolicy(a.getAttribute('data-policy')); };
    });
    $('#em').addEventListener('input', e=>{ lastEmail=e.target.value; });
    $('#pw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
    function submit(){
      const email=$('#em').value.trim(), pw=$('#pw').value;
      if(!email || (Store.cloud() && !pw)){ lastEmail=email; screenSignIn('enter your email and a password.'); return; }
      lastEmail=email;
      const nm = up ? (($('#nm')||{}).value||'').trim() : '';
      screenSignIn(null, true);
      Promise.resolve(up ? Store.signUp(email,pw) : Store.signIn(email,pw)).then(res=>{
        if(res && res.error) return screenSignIn(res.error);
        if(res && res.needsConfirm) return screenConfirm(email);
        if(nm) Store.setName(nm);
        currentTab='today'; route();
      }).catch(e=>screenSignIn(String((e&&e.message)||e)));
    }
  }
  function screenConfirm(email){
    setHTML(`
      <div class="view gate"><div class="gate-body" style="text-align:center">
        <p class="eyebrow">almost there</p>
        <h1 style="margin:12px 0 12px">check your email.</h1>
        <p class="lede" style="margin-bottom:24px">we sent a confirmation link to <b style="font-weight:500">${escapeHtml(email)}</b>. tap it, then come back here to sign in.</p>
        <button class="btn block" id="back2">back to sign in</button>
      </div></div>`);
    $('#back2').onclick=()=>{ authMode='in'; screenSignIn(); };
  }
  // In-app reader for the create-account disclaimers. Back returns to the
  // create-account screen (authMode='up'), never into the main app.
  function screenPolicy(which){
    const isPriv = which==='privacy';
    const eyebrow = isPriv ? 'privacy policy' : 'terms of use';
    const title = isPriv ? 'what we keep, and what we don’t.' : 'how to get the most out of this app.';
    const lede = isPriv
      ? 'written in plain language.'
      : 'transparency before you begin.';
    const sections = isPriv ? [
      ['what we keep','this app keeps track of your email, in-app preferences and check-ins.'],
      ['why','so your account works, your history is here on every device you sign in from, to track progress, and make custom recommendations.'],
      ['who sees it',"only you. your data isn't sold or given away. no advertisers will see it. justin checks data averages or anonymized results to ensure the app is helpful and to improve it."],
      ['your control','you can ask to delete your account and everything in it, any time. you can also choose to delete your data in your settings.']
    ] : [
      ['what this is',"a tool for noticing your daily experiences through the lens of the nervous system and practicing your way back to safety. it isn't medical care, diagnosis, or therapy, nor should it replace any of those or other professional services."],
      ['in a crisis','if you’re in danger or thinking about harming yourself, contact the 988 Suicide &amp; Crisis Lifeline or your local emergency services. this app can’t help in an emergency.'],
      ['be gentle',"everyone is different. there's no failing here, and no streak to keep. use the app as you want and when you want. practice at your cadence."],
      ['changes',"justin may (and will) update the app and these terms over time. it'll keep it working, and you'll be informed about changes through the app or through the email you used to log in."]
    ];
    const PP=(t)=>`<p style="font-size:15px;line-height:1.7;color:var(--ink-80);text-wrap:pretty;margin:0">${t}</p>`;
    setHTML(`
      <header class="appbar"><button class="backbtn" id="policy-back">back</button></header>
      <div class="scroll">
        <div class="view read" style="gap:22px">
          <div>
            <p class="eyebrow" style="margin-bottom:10px">${eyebrow}</p>
            <h1 style="margin:0 0 12px">${title}</h1>
            ${PP(lede)}
          </div>
          ${sections.map(([h,b])=>`<div style="display:flex;flex-direction:column;gap:8px">
            <p class="eyebrow" style="margin:0">${h}</p>
            ${PP(b)}
          </div>`).join('')}
          <p class="fineprint" style="margin-top:4px">plain-language draft for this design. the final ${isPriv?'privacy policy':'terms'} will replace this before launch.</p>
        </div>
      </div>`);
    $('#policy-back').onclick = ()=>{ authMode='up'; screenSignIn(); };
  }

  // ---------------------------------------------------------------- app shell
  let _mintedThisSession = false;
  function app(tab){
    currentTab = tab;
    if(!_mintedThisSession){ _mintedThisSession = true; mintPastDays(); mintWeeks(); }
    const u = Store.user();
    setHTML(`
      <header class="appbar">
      </header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`);
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    ({ today:tabToday, current:tabCurrent, practice:tabPractice }[tab] || tabToday)();
    if(tab === 'today') maybeInstallNudge();
    document.body.classList.remove('show-fab');
  }
  // install affordances: a quiet settings row + an optional dismissable today nudge
  function installRowInner(){
    if(isStandalone()) return '<span class="val" style="font-weight:400">installed</span>';
    if(canInstall()) return '<button class="set-quiet in-go" type="button">install this app</button>';
    if(isiOS()) return '<span class="ios-hint">to install: tap the share icon, then choose add to home screen.</span>';
    return '<span class="ios-hint">to install: open your browser menu and choose install or add to home screen.</span>';
  }
  function maybeInstallNudge(){
    try{ if(isStandalone() || !canInstall()) return; if(localStorage.getItem('snb_install_nudge') === 'dismissed') return; }catch(_){ return; }
    const c = content(); if(!c || document.getElementById('install-nudge')) return;
    const b = document.createElement('div'); b.className = 'install-nudge'; b.id = 'install-nudge';
    b.innerHTML = '<span class="in-txt">install the SNB app.</span><span class="in-actions"><button type="button" class="in-go">install</button><button type="button" class="in-x" aria-label="dismiss">\u00d7</button></span>';
    c.insertBefore(b, c.firstChild);
    const g = b.querySelector('.in-go'); if(g) g.onclick = promptInstall;
    const x = b.querySelector('.in-x'); if(x) x.onclick = ()=>{ try{ localStorage.setItem('snb_install_nudge','dismissed'); }catch(_){} b.remove(); };
  }
  function tabBtn(t,label){ return `<button data-t="${t}" class="${currentTab===t?'on':''}"><span class="lb">${label}</span></button>`; }
  const content = () => $('#content');

  // ---------------------------------------------------------------- TODAY
  // ---- daily wins (no counter, no streak — three small things, checkable each day) ----
  function sameDay(t){ const d=new Date(t), n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate(); }
  // morning / afternoon / evening — the check-in resets each segment so you can notice
  // where you are at different times of day, and see those patterns build up over time.
  function segOf(t){ const h=new Date(t).getHours(); return h<5?'late':h<12?'morning':h<17?'afternoon':h<22?'evening':'late'; }
  function segLabel(seg){ return seg==='late'?'late night':seg; }
  function segPoss(seg){ return seg==='late'?'night':seg; }
  function breathKey(){ const n=new Date(); return 'snb_breath_'+n.getFullYear()+'-'+(n.getMonth()+1)+'-'+n.getDate(); }
  function breathDone(){ try{ return localStorage.getItem(breathKey())==='1'; }catch(e){ return false; } }
  function markBreath(){ try{ localStorage.setItem(breathKey(),'1'); }catch(e){} }
  // Daily note: state-reactive via FromJustin module
  function winsDone(){
    const last = Store.lastCheckin();
    const sess = Store.sessions();
    return {
      breath: breathDone(),
      checkin: !!(last && sameDay(last.t) && segOf(last.t)===segOf(Date.now())),   // resets each part of day
      practice: sess.some(s => sameDay(s.t)),
    };
  }

  let breathing = false, repeatBreath = false;
  function guideOneBreath(){
    if(breathing) return;
    const ring = $('#tring'), label = $('#breathlabel'), phase = document.getElementById('bh-phase');
    if(!ring) return;
    breathing = true;
    document.body.classList.add('breathing');
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

    const startCycle = ()=>{
      const finish = ()=>{
        breathing = false; repeatBreath = false; markBreath();
        document.body.classList.remove('breathing');
        if(phase){ phase.classList.remove('show'); setTimeout(()=>{if(phase)phase.textContent='';},800); }
        if(label) label.textContent = 'one breath taken';
        const tick = document.getElementById('breathtick');
        if(tick){ requestAnimationFrame(()=>{ tick.style.transition='opacity .5s .1s ease'; tick.style.opacity='1'; }); }
        ring.style.transition = 'transform 1.8s ease, opacity 1.8s';
        ring.style.transform  = 'scale(.96)'; ring.style.opacity = '.6';
        const hero = document.querySelector('.breathhero');
        if(hero){ hero.style.transition=''; hero.style.opacity=''; }
        { const hh=document.getElementById('breathhint'); if(hh) hh.textContent='take another?'; }
        setTimeout(()=>{ ring.style.transition=''; ring.style.transform=''; ring.style.opacity=''; ring.style.animation=''; }, 1900);
      };
      if(reduce){ if(phase){phase.textContent='in';phase.classList.add('show');} setTimeout(finish,1200); return; }
      // inhale from rest
      ring.getBoundingClientRect();
      ring.style.transition = 'transform 4s cubic-bezier(.4,0,.5,1), opacity 4s';
      ring.style.transform = 'scale(1.28)'; ring.style.opacity = '.78';
      if(phase){ phase.textContent='in'; phase.classList.add('show'); }
      setTimeout(()=>{
        if(phase) phase.textContent='out';
        ring.style.transition = 'transform 6s cubic-bezier(.4,0,.5,1), opacity 6s';
        ring.style.transform = 'scale(.78)'; ring.style.opacity = '.4';
      }, 4300);
      setTimeout(finish, 10600);
    };

    // Stop ambient animation, glide back to rest, then begin
    ring.style.animation = 'none';
    ring.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
    ring.getBoundingClientRect();
    ring.style.transform = 'scale(.86)'; ring.style.opacity = '.5';
    setTimeout(startCycle, 380);
  }

  const WINS = ['breath','checkin','practice'];
  function winAction(k, reco){
    if(k==='breath') return ()=>{
      haptic('start');               // soft tap when the one-breath ring is triggered
      if(winsDone().breath && !repeatBreath){
        repeatBreath = true;
        const hero = document.querySelector('.breathhero');
        if(hero){ hero.classList.remove('is-done'); hero.style.transition='opacity .5s ease'; hero.style.opacity='1'; }
        const lbl = document.getElementById('breathlabel');
        const tickr = document.getElementById('breathtick');
        if(lbl) lbl.textContent = Store.getName() ? 'take one intentional breath, '+Store.getName()+'.' : 'take one intentional breath.';
        if(tickr){ tickr.style.transition='none'; tickr.style.opacity='0'; }
        requestAnimationFrame(()=>guideOneBreath());
      }
      else guideOneBreath();
    };
    if(k==='checkin') return screenCheckin;
    // recommended-practice card → the practice detail/plan screen (not straight into the
    // player); from there the user can Begin or customize.
    return ()=>renderPlan(reco);
  }
  const CHECKIN_DONE_LINE = {
    safety:     "connected & present. notice while it's here.",
    play:       "energized, with safety in the mix = motivation & play.",
    stillness:  "immobile & safe = stillness & intimacy.",
    fightflight:"revved up & ready to move.",
    shutdown:   "disconnected & ready to collapse.",
    freeze:     "mobile & immobile at the same time.",
    neutral:    "no obvious state showing up."
  };
  function renderWin(k, s){
    const { done, last, reco } = s;
    if(k==='breath'){
      const isDone = done && !repeatBreath;
      const title = isDone ? 'one breath taken' : (Store.getName() ? 'take one intentional breath, '+escapeHtml(Store.getName())+'.' : 'take one intentional breath.');
      const hint = isDone ? 'take another?' : 'tap the ring to begin';
      return `
        <button class="breathhero" data-win="breath">
          <span class="bh-phase" id="bh-phase" aria-live="polite"></span>
          <span class="bh-stage">
            <span class="wc-ring" id="tring" aria-hidden="true"><span class="t-core"></span></span>
          </span>
          <span class="bh-rowwrap">
            <span class="bh-row">
              <span class="wc-text">
                <span class="wc-kicker">one breath</span>
                <span class="bh-title" id="breathlabel">${title}</span>
                <span class="bh-hint" id="breathhint" style="opacity:1">${hint}</span>
              </span>
            </span>
          </span>
        </button>`;
    }
    if(k==='checkin'){
      const seg = segOf(Date.now());
      if(done){
        return `
        <button class="wincard done-rich" data-win="checkin">
          <span class="dr-logo">${triGlyph(last.dom)}</span>
          <span class="wc-text">
            <span class="wc-kicker">checked in · this ${segLabel(segOf(last.t))}</span>
            <span class="wc-title">${STATE_NAME(last.dom)}</span>
            <span class="dr-line">${CHECKIN_DONE_LINE[last.dom]||CHECKIN_DONE_LINE.neutral}</span>
          </span>
          <span class="wc-go">${CHEV}</span>
        </button>`;
      }
      return `
        <button class="wincard" data-win="checkin">
          <span class="wc-text">
            <span class="wc-kicker">${seg+' check-in'}</span>
            <span class="wc-title">how's your ${segPoss(seg)}?</span>
          </span>
          <span class="wc-go">${CHEV}</span>
        </button>`;
    }
    return `
      <button class="wincard practice-row ${done?'done-affirm':''}" id="practice-main-btn">
        <span class="wc-text">
          <span class="wc-kicker">${done ? 'practiced · '+Store.practiceLabel(reco.practiceKey) : 'recommended practice'}</span>
          <span class="wc-title">${done ? 'notice anything shift?' : Store.practiceLabel(reco.practiceKey)}</span>
          ${!done && reco.reason ? '<span class="wc-reason">'+escapeHtml(reco.reason)+'</span>' : ''}
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>`;
  }
  let todayGreet = null, todayGreetName = null;
  function pickGreeting(seg, name){
    const pool = name ? [
      `hi, ${name}.`,
      `hey again, ${name}.`,
      `${name}'s back!`,
      `good ${seg}, ${name}.`,
      `welcome back, ${name}.`,
      `hey there, ${name}.`,
      `glad you're here, ${name}.`,
      `hello again, ${name}.`,
      `you made it back, ${name}!`,
      `settle in, ${name}.`,
      `you got this, ${name}.`
    ] : [
      `hi again.`,
      `welcome back.`,
      `good ${seg}.`,
      `there you are.`,
      `you made it back!`,
      `settle in.`,
      `glad you're here.`
    ];
    let last=-1; try{ var v=parseInt(localStorage.getItem('snb_greet_i'),10); if(!isNaN(v)) last=v; }catch(e){}
    let i=Math.floor(Math.random()*pool.length);
    if(pool.length>1){ while(i===last){ i=Math.floor(Math.random()*pool.length); } }
    try{ localStorage.setItem('snb_greet_i', i); }catch(e){}
    return pool[i];
  }
  function tabToday(){
    const c = content();
    const last = Store.lastCheckin();
    const reco = Store.recommend();
    const done = winsDone();
    const breathHTML   = renderWin('breath',   {done:done.breath,   last, reco});
    const checkinHTML  = renderWin('checkin',  {done:done.checkin,  last, reco});
    const practiceHTML = renderWin('practice', {done:done.practice, last, reco});
    const r = (FromJustin.daily ? FromJustin.daily() : FromJustin.today());
    const td = (Store.today ? Store.today() : null);
    const dotsHTML = (td && td.n>=1) ? momentDots(td.moments) : '';
    const nm = Store.getName();
    const seg = segOf(Date.now());
    if(todayGreet===null || todayGreetName!==nm){ todayGreet = pickGreeting(segLabel(seg), nm ? escapeHtml(nm) : ''); todayGreetName = nm; }
    const greet = todayGreet;
    c.innerHTML = `<div class="view today">
      <div class="scr-head">
        <p class="eyebrow"></p>
        <h2 class="scr-h">${greet}</h2>
      </div>
      ${breathHTML}
      ${checkinHTML}
      ${practiceHTML}
      ${r ? (r.state !== 'neutral'
        ? `<button class="wincard from-card" id="open-refl"><span class="wc-text"><span class="wc-kicker">for you</span><span class="wc-fj-text">${escapeHtml(r.text)}</span>${dotsHTML}</span><span class="wc-go">${CHEV}</span></button>`
        : `<div class="wincard from-card from-card-static"><span class="wc-text"><span class="wc-kicker">for you</span><span class="wc-fj-text">${escapeHtml(r.text)}</span></span></div>`
      ) : ''}
    </div>`;
    const breathBtn  = c.querySelector('[data-win="breath"]');  if(breathBtn)  breathBtn.onclick  = winAction('breath', reco);
    const checkinBtn = c.querySelector('[data-win="checkin"]'); if(checkinBtn) checkinBtn.onclick = winAction('checkin', reco);
    const mainBtn    = c.querySelector('#practice-main-btn');   if(mainBtn)    mainBtn.onclick    = winAction('practice', reco);
    const reflBtn = c.querySelector('#open-refl'); if(reflBtn) reflBtn.onclick = screenReflectionDeep;
  }

  // The moment timeline: today's check-ins placed by time (x) and safety (y),
  // colored by state, with practices marked as gold rings and the newest moment
  // haloed. Shows from moment one. The model made visible.
  function momentTimeline(moments, sessions){
    moments  = (moments||[]).filter(m=>m&&typeof m.t==='number'&&m.dom).slice().sort((a,b)=>a.t-b.t);
    sessions = (sessions||[]).filter(s=>s&&typeof s.t==='number').slice().sort((a,b)=>a.t-b.t);
    if(!moments.length) return '';
    const W=320,H=148,padL=24,padR=14,padT=16,padB=26;
    const d0=new Date(); d0.setHours(0,0,0,0); const t0=d0.getTime(); const span=864e5;
    const cl=x=>x<0?0:x>1?1:x;
    const fx=t=>padL + cl((t-t0)/span)*(W-padL-padR);
    const fy=v=>padT + (1-cl(v))*(H-padT-padB);
    const pts=moments.map(m=>({x:fx(m.t),y:fy(m.v),dom:m.dom}));
    const vAt=t=>{ const a=moments; if(t<=a[0].t) return a[0].v; if(t>=a[a.length-1].t) return a[a.length-1].v;
      for(let i=1;i<a.length;i++){ if(t<=a[i].t){ const f=(t-a[i-1].t)/((a[i].t-a[i-1].t)||1); return a[i-1].v+(a[i].v-a[i-1].v)*f; } } return a[a.length-1].v; };
    const midY=(padT+(H-padT-padB)/2).toFixed(0);
    const line = pts.length>1 ? `<polyline points="${pts.map(p=>p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')}" fill="none" stroke="var(--hairline)" stroke-width="1.5" stroke-dasharray="2 3"/>` : '';
    const rings = sessions.map(s=>{ const x=fx(s.t).toFixed(1), y=fy(vAt(s.t)).toFixed(1); return `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#C9A24B" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2" fill="#C9A24B"/>`; }).join('');
    const dots = pts.map((p,i)=>{ const nw=i===pts.length-1, c=STATE_COLOR(p.dom), x=p.x.toFixed(1), y=p.y.toFixed(1);
      return (nw?`<circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${c}" stroke-opacity="0.45" stroke-width="2"/>`:'')+`<circle cx="${x}" cy="${y}" r="${nw?8.5:7.5}" fill="${c}"/>`; }).join('');
    const axis=`<text transform="rotate(-90 11 ${midY})" x="11" y="${midY}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="Inter">more safety</text>`+
      `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="var(--hairline)" stroke-width="1"/>`+
      `<line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="var(--hairline)" stroke-width="1"/>`;
    const labels=[['morning',0.18],['midday',0.45],['evening',0.74],['late',0.96]].map(o=>`<text x="${(padL+o[1]*(W-padL-padR)).toFixed(0)}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--muted)" font-family="Inter">${o[0]}</text>`).join('');
    const present=moments.map(m=>m.dom).filter((d,i,a)=>a.indexOf(d)===i);
    const leg=present.map(d=>`<span class="mtl-key"><span class="mtl-sw" style="background:${STATE_COLOR(d)}"></span>${escapeHtml(STATE_NAME(d))}</span>`).join('')+
      (sessions.length?`<span class="mtl-key"><span class="mtl-ring"></span>practice</span>`:'');
    return `<div class="mtl"><svg viewBox="0 0 ${W} ${H}" class="mtl-svg" role="img" aria-label="your check-ins today, placed by time and safety, colored by state">${axis}${line}${rings}${dots}${labels}</svg><div class="mtl-legend">${leg}</div></div>`;
  }
  // compact dots for the today card: today's moments in order, newest ringed.
  function momentDots(moments){
    const ms=(moments||[]).filter(m=>m&&m.dom).slice(-8);
    if(!ms.length) return '';
    return `<span class="md-row" aria-hidden="true">${ms.map((m,i)=>`<span class="md-dot${i===ms.length-1?' md-new':''}" style="background:${STATE_COLOR(m.dom)}"></span>`).join('')}</span>`;
  }

  function screenReflectionDeep(){
    const note = FromJustin.today();
    const last = Store.lastCheckin();
    const cs   = Store.checkins();
    const paced = groupByDay(cs);
    // today block (daily altitude): the live daily reflection + the moment timeline,
    // shown above the weekly letter. From moment one.
    const td = Store.today ? Store.today() : null;
    const dailyNote = FromJustin.daily ? FromJustin.daily(td||undefined) : null;
    const todayBlock = (td && td.n>=1) ? `
      <section style="margin:0 0 4px">
        <p class="eyebrow" style="margin:0 0 8px">today, so far</p>
        ${dailyNote ? `<p style="font-size:16px;line-height:1.65;color:var(--ink-80);text-wrap:pretty;margin:0 0 12px">${escapeHtml(dailyNote.text)}</p>` : ''}
        ${momentTimeline(td.moments, td.sessions)}
      </section>
      <hr style="border:none;border-top:0.5px solid var(--hairline);margin:18px 0 20px">` : '';

    // signals over the last 7 days (fall back to all check-ins)
    const wk = cs.filter(c => c.t >= Date.now() - 7*864e5);
    const base = wk.length ? wk : cs;
    let dom=null, share=null, dir=null, variance=null, streak=0;
    if(base.length){
      const freq={}; base.forEach(c=>{ freq[c.dom]=(freq[c.dom]||0)+1; });
      let bestN=-1; for(const k in freq){ if(freq[k]>bestN){ bestN=freq[k]; dom=k; } }
      share = Math.round((freq[dom]||0)/base.length*100);
    }
    if(!dom && last) dom = last.dom;
    if(cs.length>=2) dir = Store.trend().dir;
    if(base.length>=3){
      const avgV=base.reduce((s,c)=>s+c.v,0)/base.length;
      const sd=Math.sqrt(base.reduce((s,c)=>s+(c.v-avgV)*(c.v-avgV),0)/base.length);
      variance = sd>0.18 ? 'shifts' : 'consistent';
    }
    if(dom && paced.length>=2){ for(let i=paced.length-1;i>=0;i--){ if(paced[i].dom===dom) streak++; else break; } }

    const issue = (dom && FromJustin.blog) ? FromJustin.blog({ dom:dom, share:share, dir:dir, variance:variance, count:base.length, streak:streak }) : null;

    const recentBars = paced.length >= 2 ? `<div class="trendstrip" style="margin:6px 0 2px">${paced.slice(-10).map(c=>{ const h=16+Math.round(c.v*30); return `<div class="bar" style="height:${h}px;background:${STATE_COLOR(c.dom)}"></div>`; }).join('')}</div>` : '';
    const P = (t)=> t ? `<p style="font-size:15px;line-height:1.7;color:var(--ink-80);text-wrap:pretty;margin:0 0 12px">${escapeHtml(t)}</p>` : '';
    // the daily note now lives in the today block above; only fall back to a lead
    // paragraph when there are no moments today (todayBlock empty).
    const lead = (!todayBlock && dailyNote) ? `<p style="font-size:16px;line-height:1.65;color:var(--ink-80);text-wrap:pretty;margin:0 0 4px">${escapeHtml(dailyNote.text)}</p>` : '';

    let bodyHTML;
    if(issue){
      const bulletsHTML = issue.bullets.map(b=>{
        const jump = b.jumpId ? ` <a href="#${b.jumpId}" style="color:var(--link);text-decoration:none;white-space:nowrap;font-size:12.5px">${escapeHtml(b.jumpLabel)} ↓</a>` : '';
        return `<li style="margin:0 0 8px;line-height:1.55;color:var(--ink-80)">${escapeHtml(b.text)}${jump}</li>`;
      }).join('');
      const sectionsHTML = issue.sections.map(sec=>`
        <section style="margin-top:22px">
          <h3 id="${sec.id}" class="eyebrow" style="margin:0 0 10px;scroll-margin-top:14px">${escapeHtml(sec.heading)}</h3>
          ${sec.paras.map(P).join('')}
        </section>`).join('');
      bodyHTML = `
        ${lead}
        ${recentBars}
        <div style="margin-top:14px">
          <p class="eyebrow" style="margin:0 0 10px">the short version</p>
          <ul style="margin:0;padding-left:18px">${bulletsHTML}</ul>
        </div>
        ${sectionsHTML}`;
    } else {
      bodyHTML = `${lead}${P('Check in a few times, and a more personal summary will show up here.')}`;
    }

    const hasArchive = (Store.mints && Store.mints().length > 0);
    const archiveLink = hasArchive ? `<button class="linkbtn arch-link" id="open-arch" style="margin-top:26px">past reflections →</button>` : '';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="deep-back">today</button></header>
      <div class="scroll">
        <div class="view read" style="gap:0">
          <p class="eyebrow" style="margin-bottom:10px">for you</p>
          ${todayBlock}
          ${bodyHTML}
          ${archiveLink}
        </div>
      </div>`);
    $('#deep-back').onclick = ()=>app('today');
    const ab = $('#open-arch'); if(ab) ab.onclick = screenArchive;
  }

  // ---- reflections archive (minted past reflections) -------------------------
  function fmtMintDate(ms){
    try{ return new Date(ms).toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' }); }
    catch(e){ return new Date(ms).toDateString(); }
  }
  // mint each closed day's daily reflection once (freeze the text — arrays cycle, so
  // recomputing would change the words). Idempotent: skips days already minted.
  function mintPastDays(){
    try{
      if(!(FromJustin.daily && Store.dayArc && Store.saveMint && Store.hasMint)) return;
      const cs = Store.checkins(); if(!cs.length) return;
      const sod = (function(){ const d=new Date(); d.setHours(0,0,0,0); return d.getTime(); })();
      const seen = {};
      cs.forEach(c => { if(c && typeof c.t==='number'){ const d=new Date(c.t); d.setHours(0,0,0,0); const t0=d.getTime(); if(t0 < sod) seen[t0]=true; } });
      Object.keys(seen).map(Number).forEach(t0 => {
        const key = new Date(t0).toDateString();
        if(Store.hasMint('daily', key)) return;
        const ctx = Store.dayArc(t0);
        if(!ctx || ctx.n < 1) return;
        const note = FromJustin.daily(ctx);
        if(note && note.text) Store.saveMint({ tier:'daily', date:key, dateMs:t0, text:note.text });
      });
    }catch(e){}
  }
  // ---- weekly altitude: mint each closed Sunday-week's letter (the for-you reader
  // content), computed over that exact 7-day window so it's honest even on a late open.
  const WEEK_MS = 7*864e5;
  function _sundayStart(t){ const d=new Date(t); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d.getTime(); }
  // windowed equivalent of Store.weekMix() over an explicit set of in-window check-ins
  function _windowMix(cs){
    const n=cs.length; if(n<6) return null;                 // weekMix self-gates >=6; below that no secondary lines
    const cnt={}; cs.forEach(c=>cnt[c.dom]=(cnt[c.dom]||0)+1);
    const order=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
    const dom=order[0], second=order[1]||null;
    const REG={safety:1,play:1,stillness:1}, DYS={fightflight:1,shutdown:1,freeze:1};
    let reg=0; cs.forEach(c=>{ if(REG[c.dom]) reg++; });
    const regShare=reg/n, lean = regShare>=0.6?'regulated' : regShare<=0.4?'dysregulated' : 'even';
    return { n, dom, domShare:Math.round(cnt[dom]/n*100), second, secondShare: second?Math.round(cnt[second]/n*100):0,
             reg, dys:n-reg, regShare, lean, distinct:order.length, defenseStates:order.filter(d=>DYS[d]) };
  }
  function weeklyIssueFor(ws){
    if(!FromJustin.blog) return null;
    const we = ws + WEEK_MS;
    const cs = Store.checkins().filter(c=>c&&typeof c.t==='number'&&c.t>=ws&&c.t<we&&c.dom&&c.dom!=='neutral').sort((a,b)=>a.t-b.t);
    const n = cs.length;
    if(n < 3) return null;                                   // sparse week: skip minting in v1
    const freq={}; cs.forEach(c=>freq[c.dom]=(freq[c.dom]||0)+1);
    let dom=null,bestN=-1; for(const k in freq){ if(freq[k]>bestN){ bestN=freq[k]; dom=k; } }
    const share = Math.round(bestN/n*100);
    const dv = cs[n-1].v - cs[0].v; const dir = dv>0.08?'rising' : dv<-0.08?'falling' : 'steady';
    const avgV = cs.reduce((s,c)=>s+c.v,0)/n;
    const sd = Math.sqrt(cs.reduce((s,c)=>s+(c.v-avgV)*(c.v-avgV),0)/n);
    const variance = sd>0.18 ? 'shifts' : 'consistent';
    const mix = _windowMix(cs);
    // force the full-week framing (it IS a complete week) + suppress the from-now secondary
    // lines (transitions/time-of-day/recovery/payoff) with empty overrides so the snapshot
    // never borrows current data.
    const issue = FromJustin.blog({ dom, share, dir, variance, count:n, mix,
      trans:{}, tod:{}, recovery:{}, practiceEffect:{}, stage:'week', tenure:{stage:'week',days:7,returning:false} });
    if(!issue) return null;
    const doms = Object.keys(freq).sort((a,b)=>freq[b]-freq[a]);     // doms[0] = the week's dominant state (lights the triGlyph)
    const traj = dir==='rising' ? 'leaned toward safe' : dir==='falling' ? 'kept showing up all week' : 'stayed with it all week';
    const card = {
      dateLabel: 'week of ' + new Date(ws).toLocaleDateString(undefined,{month:'long',day:'numeric'}),
      n: n, dir: dir, traj: traj, doms: doms
    };
    const summary = (issue.bullets && issue.bullets[0]) ? issue.bullets[0].text : (n + ' check-ins this week.');
    return { issue, card, summary };
  }
  function mintWeeks(){
    try{
      if(!(FromJustin.blog && Store.saveMint && Store.hasMint)) return;
      const cs = Store.checkins(); if(!cs.length) return;
      let firstT = Infinity; cs.forEach(c=>{ if(c&&typeof c.t==='number'&&c.t<firstT) firstT=c.t; });
      if(!isFinite(firstT)) return;
      const thisWeek = _sundayStart(Date.now());
      for(let ws = _sundayStart(firstT); ws < thisWeek; ws += WEEK_MS){
        const key = 'w' + new Date(ws).toISOString().slice(0,10);
        if(Store.hasMint('weekly', key)) continue;
        const built = weeklyIssueFor(ws);
        if(!built) continue;
        Store.saveMint({ tier:'weekly', date:key, dateMs:ws, text:built.summary, data:{ issue:built.issue, card:built.card } });
      }
    }catch(e){}
  }

  // the guardrailed share card: the user's name + their personal triGlyph (the brand
  // logo) lit to the week's dominant state. Proud = showing-up + trajectory, never a ranking.
  function _cardLine(card){
    const name = (Store.getName && Store.getName()) || '';
    return (name ? 'Checked' : 'I checked') + ' in ' + card.n + ' times this week, and ' + (card.traj || 'stayed with it all week') + '.';
  }
  // solid-fill triGlyph (explicit fills, no CSS) for rasterizing into the share image
  function triGlyphSolid(key, dimCol){
    const col = STATE_COLOR(key), I = window.SNB_ICONS || {};
    const active = (STATE_AXES[key]||[]).map(a=>a[0]);
    const paths = TRI_ORDER.map(m=>`<path d="${(I[m]&&I[m].d)||''}" fill="${active.indexOf(m)>=0?col:dimCol}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${TRI_VB}">${paths}</svg>`;
  }
  function shareCardHTML(card){
    const name = (Store.getName && Store.getName()) || '';
    const dom = (card.doms && card.doms[0]) || 'safety';
    const nameTag = name ? `<span class="sc-name">${escapeHtml(name)}</span>` : '';
    // name + triGlyph sit at the bottom, like an attribution under a quote.
    return `<div class="share-card"><div class="sc-eyebrow">${escapeHtml(String(card.dateLabel||'').toUpperCase())}</div><div class="sc-line">${escapeHtml(_cardLine(card))}</div><div class="sc-foot"><span class="sc-attrib">${triGlyph(dom)}${nameTag}</span><span class="sc-brand">stuck not broken</span></div></div>
      <button class="btn block sc-share" id="sc-share" type="button">share this</button>`;
  }
  function _wrapText(g, text, x, y, maxW, lh){ const words=String(text).split(' '); let line='', yy=y; for(const w of words){ const test=line?line+' '+w:w; if(g.measureText(test).width>maxW && line){ g.fillText(line,x,yy); line=w; yy+=lh; } else line=test; } if(line) g.fillText(line,x,yy); return yy; }
  async function shareWeekCard(card){
    try{
      const W=1080, H=1080, PAD=96, cv=document.createElement('canvas'); cv.width=W; cv.height=H;
      const g=cv.getContext('2d'); g.fillStyle='#1A1F2A'; g.fillRect(0,0,W,H); g.textBaseline='top';
      g.fillStyle='#B9B09A'; g.font='500 30px Inter, sans-serif'; g.fillText(String(card.dateLabel||'').toUpperCase(), PAD, 300);
      // the quote line, large, up top
      g.fillStyle='#F4F1E8'; g.font='500 66px Inter, sans-serif'; _wrapText(g, _cardLine(card), PAD, 372, W-PAD*2, 88);
      // attribution at the bottom: the personal triGlyph (lit to the week's dominant state) + name
      const dom = (card.doms && card.doms[0]) || 'safety';
      const vb = String(TRI_VB).split(/\s+/).map(Number); const aspect = (vb[2]||1)/(vb[3]||1);
      const gw = 210, gh = gw/aspect, by = H - 150 - gh;
      try{
        const svg = triGlyphSolid(dom, '#565961');
        const img = new Image();
        await new Promise((res,rej)=>{ img.onload=res; img.onerror=rej; img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg); });
        g.drawImage(img, PAD, by, gw, gh);
      }catch(_){}
      const name = (Store.getName && Store.getName()) || '';
      if(name){ g.fillStyle='#F4F1E8'; g.font='500 44px Inter, sans-serif'; g.fillText(name, PAD + gw + 26, by + gh/2 - 26); }
      g.fillStyle='#B9B09A'; g.font='400 30px Inter, sans-serif'; g.textAlign='right'; g.fillText('stuck not broken', W-PAD, by + gh/2 - 16); g.textAlign='left';
      const blob = await new Promise(res=>cv.toBlob(res,'image/png'));
      if(!blob) throw new Error('no blob');
      const file = new File([blob], 'snb-week.png', { type:'image/png' });
      if(navigator.canShare && navigator.canShare({ files:[file] }) && navigator.share){
        await navigator.share({ files:[file], text: _cardLine(card) });
      } else {
        const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='snb-week.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1500);
      }
    }catch(e){ /* user cancelled or unsupported — no-op */ }
  }
  // render a frozen weekly issue (short version + sections) like the live for-you reader
  function renderIssue(issue){
    const P=(t)=> t?`<p style="font-size:15px;line-height:1.7;color:var(--ink-80);text-wrap:pretty;margin:0 0 12px">${escapeHtml(t)}</p>`:'';
    const bulletsHTML = (issue.bullets||[]).map(b=>{ const jump=b.jumpId?` <a href="#${b.jumpId}" style="color:var(--link);text-decoration:none;white-space:nowrap;font-size:12.5px">${escapeHtml(b.jumpLabel)} ↓</a>`:''; return `<li style="margin:0 0 8px;line-height:1.55;color:var(--ink-80)">${escapeHtml(b.text)}${jump}</li>`; }).join('');
    const sectionsHTML = (issue.sections||[]).map(sec=>`<section style="margin-top:22px"><h3 id="${sec.id}" class="eyebrow" style="margin:0 0 10px;scroll-margin-top:14px">${escapeHtml(sec.heading)}</h3>${(sec.paras||[]).map(P).join('')}</section>`).join('');
    return `<div style="margin-top:14px"><p class="eyebrow" style="margin:0 0 10px">the short version</p><ul style="margin:0;padding-left:18px">${bulletsHTML}</ul></div>${sectionsHTML}`;
  }

  function screenArchive(){
    const list = Store.mints ? Store.mints() : [];
    const rows = list.length
      ? list.map(m => {
          const weekly = m.tier==='weekly';
          const label = weekly ? ((m.data&&m.data.card&&m.data.card.dateLabel) || fmtMintDate(m.dateMs)) : fmtMintDate(m.dateMs);
          const tag = weekly ? '<span class="arch-tag">weekly</span>' : '';
          const snip = String(m.text||'').split('. ')[0];
          return `<button class="arch-row" data-id="${escapeHtml(m.id)}"><span class="arch-row-main"><span class="arch-date">${escapeHtml(label)}${tag}</span><span class="arch-snip">${escapeHtml(snip)}.</span></span><span class="wc-go">${CHEV}</span></button>`;
        }).join('')
      : `<p style="font-size:15px;line-height:1.6;color:var(--muted);margin:8px 0 0">your reflections will collect here as each day and week closes.</p>`;
    setHTML(`
      <header class="appbar"><button class="backbtn" id="arch-back">for you</button></header>
      <div class="scroll">
        <div class="view read" style="gap:0">
          <p class="eyebrow" style="margin-bottom:14px">past reflections</p>
          ${rows}
        </div>
      </div>`);
    $('#arch-back').onclick = screenReflectionDeep;
    document.querySelectorAll('.arch-row').forEach(b => b.onclick = ()=>screenMintedEntry(b.dataset.id));
  }
  function screenMintedEntry(id){
    const m = (Store.mints ? Store.mints() : []).find(x => x.id===id);
    if(!m) return screenArchive();
    if(m.tier==='weekly' && m.data && m.data.issue){
      const card = m.data.card || {};
      setHTML(`
        <header class="appbar"><button class="backbtn" id="me-back">past reflections</button></header>
        <div class="scroll">
          <div class="view read" style="gap:0">
            <p class="eyebrow" style="margin-bottom:12px">${escapeHtml(card.dateLabel || fmtMintDate(m.dateMs))}</p>
            ${shareCardHTML(card)}
            ${renderIssue(m.data.issue)}
          </div>
        </div>`);
      $('#me-back').onclick = screenArchive;
      const sb = $('#sc-share'); if(sb) sb.onclick = ()=>shareWeekCard(card);
      return;
    }
    const ctx = Store.dayArc ? Store.dayArc(m.dateMs) : null;
    const tl = (ctx && ctx.n >= 1) ? momentTimeline(ctx.moments, ctx.sessions) : '';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="me-back">past reflections</button></header>
      <div class="scroll">
        <div class="view read" style="gap:0">
          <p class="eyebrow" style="margin-bottom:8px">${escapeHtml(fmtMintDate(m.dateMs))}</p>
          <p style="font-size:16px;line-height:1.65;color:var(--ink-80);text-wrap:pretty;margin:0 0 16px">${escapeHtml(m.text)}</p>
          ${tl}
        </div>
      </div>`);
    $('#me-back').onclick = screenArchive;
  }

  function recoCardHTML(reco){
    const label = Store.practiceLabel(reco.practiceKey);
    const extra = [reco.skill, reco.practiceKey!=='mindfulness'?reco.sense:null].filter(Boolean).join(' · ');
    return `
      <div class="reco">
        <div class="head">
          <h3>${label}</h3>
          ${reco.adapted ? '<span class="adapt">tuned to you</span>' : ''}
        </div>
        ${extra?`<p class="meta">${extra}</p>`:''}
        <p class="why">${escapeHtml(reco.reason)}</p>
        <button class="btn" id="startreco">begin this practice</button>
      </div>`;
  }
  function wireReco(reco){ const b=$('#startreco'); if(b) b.onclick=()=>launchWeaver(reco); }

  function trendHTML(){
    const cs = Store.checkins();
    if(cs.length < 2) return '';
    const recent = cs.slice(-10);
    const bars = recent.map(c=>{
      const h = 16 + Math.round(c.v*30); // height reads "safety present"
      return `<div class="bar" style="height:${h}px;background:${STATE_COLOR(c.dom)}"></div>`;
    }).join('');
    const tr = Store.trend();
    const dirTxt = tr.dir==='rising' ? 'safety has been rising lately.' : tr.dir==='falling' ? 'safety has dipped lately. worth being gentle with yourself.' : 'fairly steady lately.';
    return `
      <p class="eyebrow section-label">lately</p>
      <div class="trendstrip">${bars}</div>
      <p class="trend-cap">${dirTxt} <button class="linkbtn" id="seeall" style="font-size:13px">see your states over time →</button></p>`;
  }

// ---------------------------------------------------------------- CHECK-IN
  // Challenge appetite levels for the check-in (mirror Store.CHALLENGE_LEVELS), each
  // with a one-line read of what choosing it means.
  const CH_LEVELS = (window.Store && Store.CHALLENGE_LEVELS) || [
    { v:0.12, key:'settle',  label:'just settle' },
    { v:0.40, key:'gentle',  label:'gently' },
    { v:0.65, key:'meet',    label:'meet me' },
    { v:0.90, key:'stretch', label:'stretch me' },
  ];
  const CH_CAP = {
    settle:  'just connecting to the external present moment and your natural breath. no pressure. just presence.',
    gentle:  "simple mindfulness but taken a step further through connecting with safety in your body if it's there.",
    meet:    'anchor into safety, then use beginner skills to gently connect with defense.',
    stretch: 'anchor into safety, then use advanced skills to connect with defense at a deeper level. more potential for self-regulation, but more challenge. only approach this with a strong safety baseline.',
  };
  // short labels for the segmented control (the nuance lives in the caption below)
  const CH_SHORT = { settle:'simple mindfulness', gentle:'safety-focused', meet:'beginner defense', stretch:'advanced defense' };

  let _snackT=null;
  function actionSnack(msg, label, fn){
    let s=document.getElementById('action-snack'); if(s) s.remove();
    s=document.createElement('div'); s.id='action-snack'; s.className='update-toast';
    const sp=document.createElement('span'); sp.textContent=msg;
    const b=document.createElement('button'); b.type='button'; b.textContent=label;
    s.appendChild(sp); s.appendChild(b); document.body.appendChild(s);
    requestAnimationFrame(()=>s.classList.add('on'));
    const close=()=>{ s.classList.remove('on'); setTimeout(()=>{ if(s.parentNode) s.remove(); }, 260); };
    b.onclick=()=>{ close(); fn&&fn(); };
    clearTimeout(_snackT); _snackT=setTimeout(close, 6000);
  }
  // change a recent check-in: pick from the last few, then edit it in place
  function screenChangeCheckin(){
    const recent = Store.checkins().slice(-6).reverse();
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    const rows = recent.length ? recent.map((c,i)=>`<button class="change-row" data-i="${i}" type="button"><span class="change-when">${relTime(c.t)}</span><span class="change-mark">${stateMarks(c.dom)}<span class="change-state">${STATE_NAME(c.dom)}</span></span><span class="wc-go">${CHEV}</span></button>`).join('') : '<p class="panel-empty">no check-ins to change yet.</p>';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="cc-back">back</button></header>
      <div class="scroll"><div class="view" style="gap:14px">
        <div class="scr-head"><p class="eyebrow"></p><h2 class="scr-h">change a check-in</h2></div>
        <p class="map-sub" style="margin:0">pick one of your recent check-ins to adjust.</p>
        <div class="change-list">${rows}</div>
      </div></div>`);
    $('#cc-back').onclick=()=>app('current');
    root.querySelectorAll('.change-row').forEach(b=>b.onclick=()=>screenCheckin(recent[+b.dataset.i]));
  }

  // manage logged practices: remove a session you didn't mean to keep (e.g. a test run)
  function _fbShort(k){ return ({ more:'felt more present', same:'about the same', less:'less connected', struggle:'struggled', unsure:'not sure' })[k] || ''; }
  function screenManagePractices(){
    const recent = Store.sessions().slice(-8).reverse();
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    const rows = recent.length
      ? recent.map(s => {
          const fb = s.feedback ? ` · ${escapeHtml(_fbShort(s.feedback))}` : '';
          const ended = (s.completed===false || s.endedEarly) ? ' · ended early' : '';
          return `<div class="pr-row"><span class="pr-main"><span class="change-when">${relTime(s.t)}</span><span class="pr-label">${escapeHtml(Store.practiceLabel(s.practiceKey))}${fb}${ended}</span></span><button class="pr-del" data-t="${s.t}" type="button">remove</button></div>`;
        }).join('')
      : '<p class="panel-empty">no practices to manage yet.</p>';
    setHTML(`
      <header class="appbar"><button class="backbtn" id="mp-back">back</button></header>
      <div class="scroll"><div class="view" style="gap:14px">
        <div class="scr-head"><p class="eyebrow"></p><h2 class="scr-h">manage your practices</h2></div>
        <p class="map-sub" style="margin:0">remove a logged practice you didn't mean to keep, like a test. this can't be undone.</p>
        <div class="change-list">${rows}</div>
      </div></div>`);
    $('#mp-back').onclick=()=>app('current');
    root.querySelectorAll('.pr-del').forEach(b=>b.onclick=()=>{
      const t = +b.dataset.t;
      if(confirm('Remove this practice? This cannot be undone.')){
        Store.deleteSession(t); haptic('save'); screenManagePractices();
      }
    });
  }
  function screenCheckin(editRec){
    if(editRec && typeof editRec.t!=='number') editRec = null;   // the today-card onclick passes its click EVENT as editRec; an event is not a check-in to edit -> start a fresh check-in (fixes "change your check-in" / "NaNd ago" / silent no-save)
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));

    let v=18, s=14, d=12, ch=0.65;
    if(editRec){ v=Math.round((editRec.v||0)*100); s=Math.round((editRec.sym||0)*100); d=Math.round((editRec.dor||0)*100); if(typeof editRec.challenge==='number') ch=editRec.challenge; }
    const seg = segPoss(segOf(editRec?editRec.t:Date.now()));
    $('#content').innerHTML = `<div class="view checkin2">

        <div class="scr-head">
          <p class="eyebrow"></p>
          <h2 class="scr-h">${editRec?'change your check-in':'how is your system showing up this '+seg+'?'}</h2>
          ${editRec?`<p class="ci-when">${relTime(editRec.t)}</p>`:''}
        </div>

        <div class="ci-block">
          <div class="sliders">
            ${sliderHTML('v','safety','connected to self, others, & environment','r-v',v)}
            ${sliderHTML('sym','flight/fight','mobile, ready for movement','r-sym',s)}
            ${sliderHTML('dor','shutdown','immobile, ready for collapse, numb, heavy','r-dor',d)}
          </div>
          <p class="ci-readout" id="ci-readout"></p>
        </div>

        <div class="ci-block ci-challenge">
          <p class="dash-prompt">what practice level would you like next?</p>
          <div class="ch-seg" id="ch-seg">
            ${CH_LEVELS.map(l=>`<button class="ch-opt${l.v===ch?' on':''}" type="button" data-ch="${l.v}" data-chkey="${l.key}">${CH_SHORT[l.key]||l.label}</button>`).join('')}
          </div>
          <p class="ch-cap" id="ch-cap"></p>
        </div>

        <div class="actionbar"><button class="btn block" id="save">${editRec?'save changes':'save check-in'}</button></div>
      </div>`;

    const amt = x => x<12?'barely':x<35?'a little':x<65?'some':x<88?'a lot':'fully';
    const readout = $('#ci-readout');
    function refresh(){
      setIcoLvl('v',v); setIcoLvl('sym',s); setIcoLvl('dor',d);
      const dom = window.PVCurrent.dominantOf(v/100, s/100, d/100);
      // tint the sliders to the current state: a blend colors only its active axes
      const core = STATE_CORE[dom.key] || [];
      const own = AXIS_OWN();
      ['v','sym','dor'].forEach(ax=>{ const el=$('#sl-'+ax); if(!el) return;
        const active = core.length>1 && core.includes(ax);
        el.style.setProperty('--rail', active ? STATE_COLOR(dom.key) : own[ax]); });
      if(readout){ const r = readoutPhrase(v/100, s/100, d/100);
        readout.innerHTML = `<span class="ci-readtext">you're reporting ${r.html}.</span>`; }
    }
    bindSlider('v', val=>{v=val;refresh();});
    bindSlider('sym', val=>{s=val;refresh();});
    bindSlider('dor', val=>{d=val;refresh();});
    refresh();

    const cap = $('#ch-cap');
    function setCap(key){ if(cap) cap.textContent = CH_CAP[key] || ''; }
    setCap((CH_LEVELS.find(l=>l.v===ch)||{key:'meet'}).key);
    $('#ch-seg').querySelectorAll('.ch-opt').forEach(b=>b.onclick=()=>{
      ch = +b.dataset.ch;
      $('#ch-seg').querySelectorAll('.ch-opt').forEach(x=>x.classList.toggle('on', x===b));
      setCap(b.dataset.chkey);
    });

    $('#save').onclick = ()=>{
      const vals = { v:v/100, sym:s/100, dor:d/100, challenge:ch };
      if(editRec){ Store.updateCheckin(editRec.t, vals); haptic('save'); FromJustin.refresh(); app('current'); showToast('check-in updated'); return; }
      const rec = Store.addCheckin(vals);
      haptic('save');
      FromJustin.refresh();
      app('current');
      actionSnack('checked in', 'change', ()=>screenCheckin(rec));
    };
  }
  function sliderHTML(key,name,sub,cls,val){
    const ax = AXIS_ICON[key] || {};
    const icon = ax.icon ? ico(ax.icon,{cls:'slider-ico', color:STATE_COLOR(ax.state)}) : '';
    return `<div class="slider" data-axis="${key}">
      <span class="slider-ico-wrap">${icon}</span>
      <div class="slider-main">
        <div class="top"><span class="nm">${name}:</span><span class="sub">${sub}</span></div>
        <input type="range" class="${cls}" id="sl-${key}" min="0" max="100" value="${val}">
      </div>
    </div>`;
  }
  function bindSlider(key,fn){ const el=$('#sl-'+key); el.addEventListener('input',()=>fn(+el.value)); }

  // ---------------------------------------------------------------- CURRENT OVER TIME
  let playTimer=null;
  const PERIODS=[{key:'7',label:'7d',days:7},{key:'30',label:'30d',days:30},{key:'90',label:'90d',days:90},{key:'all',label:'all',days:null}];
  let activePeriod='all';
  let chartMode='safety';
  function filterByPeriod(cs,days){ if(!days) return cs; const cut=Date.now()-days*864e5; return cs.filter(c=>c.t>=cut); }
  function groupByDay(arr){
    const map={};
    arr.forEach(c=>{ const k=new Date(c.t).toDateString(); if(!map[k]) map[k]=[]; map[k].push(c); });
    return Object.values(map).map(g=>{
      const n=g.length, last=g[n-1];
      return {...last, v:g.reduce((s,c)=>s+c.v,0)/n, sym:g.reduce((s,c)=>s+c.sym,0)/n, dor:g.reduce((s,c)=>s+c.dor,0)/n};
    });
  }
  function periodLabel(key){ return PERIODS.find(p=>p.key===key)?.label||'all time'; }

  function chartInner(mode, B, safetyColor){
    const N=B.length;
    const W=320,H=132,padL=10,padR=10,padT=16,padB=26;
    const plotW=W-padL-padR, plotH=H-padT-padB;
    const xOf=i=> N===1? W/2 : padL+(i/(N-1))*plotW;
    const yOf=v=> padT+(1-Math.max(0,Math.min(1,v)))*plotH;
    const pts=B.map((b,i)=>({x:+xOf(i).toFixed(1), y:+yOf(b.avg).toFixed(1), b, i}));
    const baseY=(padT+plotH).toFixed(1);
    const linePath=N===1?`M ${pts[0].x} ${pts[0].y} L ${pts[0].x+0.1} ${pts[0].y}`:'M '+pts.map(p=>`${p.x} ${p.y}`).join(' L ');
    const areaPath=`M ${pts[0].x} ${baseY} L `+pts.map(p=>`${p.x} ${p.y}`).join(' L ')+` L ${pts[pts.length-1].x} ${baseY} Z`;
    const maxL=Math.min(6,N), seen=new Set(), labs=[];
    for(let i=0;i<maxL;i++){ const idx=Math.round(i*(N-1)/(maxL-1||1)); if(seen.has(idx))continue; seen.add(idx); labs.push(`<text x="${xOf(idx).toFixed(1)}" y="${H-8}" text-anchor="${idx===0?'start':idx===N-1?'end':'middle'}" class="cx">${B[idx].label}</text>`); }
    // monochrome intensity gradient: height encodes safety; color deepens with it (no state hues)
    const ramp=(v)=>{ v=Math.max(0,Math.min(1,v)); const LO=[206,200,187],HI=[58,55,48]; return `rgb(${LO.map((c,i)=>Math.round(c+(HI[i]-c)*v)).join(',')})`; };
    const dots=pts.map(p=>`<circle class="cpt" data-i="${p.i}" cx="${p.x}" cy="${p.y}" r="3.6" fill="${mode==='safety'?ramp(p.b.avg):STATE_COLOR(p.b.dom)}" stroke="var(--bone)" stroke-width="1.6"></circle>`).join('');
    let defs, lineSvg, footer, readoutTxt;
    const last=B[N-1];
    const stops=pts.map(p=>`<stop offset="${N===1?0:(p.i/(N-1)).toFixed(3)}" stop-color="${mode==='safety'?ramp(p.b.avg):STATE_COLOR(p.b.dom)}"></stop>`).join('');
    defs=`<defs><linearGradient id="cline" x1="${padL}" y1="0" x2="${padL+plotW}" y2="0" gradientUnits="userSpaceOnUse">${stops}</linearGradient></defs>`;
    lineSvg=`<path class="cline-area" d="${areaPath}" fill="url(#cline)" opacity=".1"></path><path class="cline-path" pathLength="1" d="${linePath}" fill="none" stroke="url(#cline)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"></path>`;
    if(mode==='safety'){
      footer=`<div class="arc-scale"><span>less safety</span><span class="arc-scale-bar"></span><span>more</span></div>`;
      readoutTxt=`${last.label} \u00b7 ${Math.round(last.avg*100)}% safety`;
    } else {
      const states=[...new Set(B.map(b=>b.dom))];
      footer=`<div class="legend">${states.map(k=>`<span class="lg-it">${stateMarks(k)}${STATE_NAME(k)}</span>`).join('')}</div>`;
      readoutTxt=`${last.label} \u00b7 ${STATE_NAME(last.dom)}`;
    }
    const gain = mode==='safety' && N>=2 && (B[N-1].avg - B[0].avg) > 0.04;   // a real safety rise -> the line draws itself as a payoff
    return `<div class="arc-readout" id="chart-readout">${readoutTxt}</div><svg viewBox="0 0 ${W} ${H}" class="chart${gain?' draw-gain':''}" preserveAspectRatio="xMidYMid meet">${defs}${lineSvg}${dots}${labs.join('')}</svg>${footer}`;
  }
  function openShare(txt){
    const url=location.href;
    if(navigator.share){ navigator.share({title:'stuck not broken', text:txt, url}).catch(()=>{}); return; }
    const enc=encodeURIComponent(txt);
    const host=document.querySelector('.phone')||document.body;
    const old=document.getElementById('share-sheet'); if(old) old.remove();
    const s=document.createElement('div'); s.id='share-sheet'; s.className='share-sheet';
    s.innerHTML=`<div class="ss-card"><p class="ss-h">share your progress</p><a class="ss-opt" href="sms:?&body=${enc}">message</a><a class="ss-opt" href="mailto:?subject=${encodeURIComponent('my progress')}&body=${enc}">email</a><a class="ss-opt" href="https://twitter.com/intent/tweet?text=${enc}" target="_blank" rel="noopener">post to X</a><button class="ss-opt" type="button" data-copy="1">copy</button><button class="ss-cancel" type="button">cancel</button></div>`;
    host.appendChild(s);
    requestAnimationFrame(()=>s.classList.add('on'));
    const close=()=>{ s.classList.remove('on'); setTimeout(()=>{ if(s.parentNode) s.remove(); },240); };
    s.addEventListener('click',e=>{ if(e.target===s) close(); });
    s.querySelector('.ss-cancel').onclick=close;
    s.querySelector('[data-copy]').onclick=()=>{ try{ navigator.clipboard&&navigator.clipboard.writeText(txt); }catch(_){} showToast('copied'); close(); };
    s.querySelectorAll('a.ss-opt').forEach(a=>a.addEventListener('click',()=>setTimeout(close,80)));
  }
  function tabCurrent(){
    const c = content();
    const ab=document.querySelector('.appbar');
    if(ab) ab.innerHTML='';
    const allCs = Store.checkins();
    if(allCs.length < 2){
      const teach = ['safety','fightflight','shutdown'].map(st=>{
        const ax = AXIS_ICON[{safety:'v',fightflight:'sym',shutdown:'dor'}[st]];
        return `<div class="map-row">
          <span class="map-ico">${ico(ax.icon,{color:STATE_COLOR(st)})}</span>
          <span class="map-text"><span class="map-name">${STATE_NAME(st)}</span><span class="map-sub">${ax.sub}</span></span>
        </div>`;
      }).join('');
      c.innerHTML = `<div class="view"><div class="map-empty">
        <p class="map-lede">your three autonomic states.</p>
        <div class="map-rows">${teach}</div>
        <p class="map-foot">check in twice to start seeing your autonomic patterns.</p>
        <button class="btn" id="goci">check in</button></div></div>`;
      $('#goci').onclick = screenCheckin; return;
    }

    const avg = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
    const domOf = arr => { const m={}; arr.forEach(x=>{m[x.dom]=(m[x.dom]||0)+1;}); const e=Object.entries(m).sort((a,b)=>b[1]-a[1])[0]; return e?e[0]:null; };

    function render(){
      const _span = Store.tenure().days;
      const visPer = PERIODS.filter(p=>p.days==null || p.days<=_span);   // only windows the data actually spans
      if(!visPer.some(p=>p.key===activePeriod)) activePeriod='all';
      const days = PERIODS.find(p=>p.key===activePeriod)?.days||null;
      const cs = filterByPeriod(allCs, days);
      const paced = groupByDay(cs);
      const sess = filterByPeriod(Store.sessions(), days);
      const periodTxt = PERIODS.find(p=>p.key===activePeriod)?.label||'all time';

      // ---- safety hero + trend over the window ----
      const safetyPct = Math.round(avg(cs.map(x=>x.v))*100);
      const vsAll = cs.map(x=>x.v);
      const hiPct = vsAll.length?Math.round(Math.max.apply(null,vsAll)*100):0;
      const loPct = vsAll.length?Math.round(Math.min.apply(null,vsAll)*100):0;
      const topState = domOf(cs);
      let dir='steady';
      if(paced.length>=4){
        const k=Math.max(1,Math.floor(paced.length/3));
        const d = avg(paced.slice(-k).map(x=>x.v)) - avg(paced.slice(0,k).map(x=>x.v));
        dir = d>0.08?'rising':d<-0.08?'falling':'steady';
      }
      const rising = dir==='rising';

      // ---- mix (time-bound) ----
      const counts={}; cs.forEach(x=>{counts[x.dom]=(counts[x.dom]||0)+1;});
      const total=cs.length||1;
      const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      const mixHTML=ranked.map(([key,n])=>{
        const pct=Math.round(n/total*100);
        return `<button class="distrow" data-state-detail="${key}">
          <span class="distrow-top"><span class="distrow-name">${stateMarks(key)}${({play:'regulated mobility',stillness:'regulated immobility'}[key])||STATE_NAME(key)}</span><span class="distrow-pct">${pct}%</span></span>
          <span class="distrow-track"><span class="distrow-fill" style="width:${Math.max(pct,2)}%;background:${STATE_COLOR(key)}"></span></span>
        </button>`;
      }).join('');

      // ---- day by day: a flowing ribbon — warmer = more safety ----
      function safetyColor(v){
        const stops=[[0,[163,192,221]],[0.5,[159,196,152]],[1,[244,213,141]]];
        v=Math.max(0,Math.min(1,v));
        let a=stops[0],b=stops[stops.length-1];
        for(let i=0;i<stops.length-1;i++){ if(v>=stops[i][0]&&v<=stops[i+1][0]){a=stops[i];b=stops[i+1];break;} }
        const t=(v-a[0])/((b[0]-a[0])||1);
        const c=a[1].map((x,i)=>Math.round(x+(b[1][i]-x)*t));
        return `rgb(${c[0]},${c[1]},${c[2]})`;
      }
      let dayByDay, arcBuckets=null;
      if(paced.length<3){
        dayByDay=`<p class="panel-empty">a few more days of check-ins, and your timeline fills in here.</p>`;
      } else {
        const minT=paced[0].t, maxT=paced[paced.length-1].t, spanD=(maxT-minT)/864e5;
        const unit = spanD>75?'month': spanD>21?'week':'day';
        const keyOf=(t)=>{ const d=new Date(t); if(unit==='month') return d.getFullYear()+'-'+d.getMonth(); if(unit==='week'){ const o=new Date(d); o.setHours(0,0,0,0); o.setDate(o.getDate()-o.getDay()); return o.getTime(); } return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
        const labOf=(t)=>{ const d=new Date(t); return unit==='month'?d.toLocaleDateString(undefined,{month:'short'}):d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); };
        const bmap=new Map();
        paced.forEach(p=>{ const k=keyOf(p.t); if(!bmap.has(k)) bmap.set(k,{t:p.t,vs:[],dom:{}}); const bb=bmap.get(k); bb.vs.push(p.v); bb.dom[p.dom]=(bb.dom[p.dom]||0)+1; });
        arcBuckets=[...bmap.values()].sort((a,b)=>a.t-b.t).map(b=>({t:b.t, label:labOf(b.t), avg:b.vs.reduce((s,v)=>s+v,0)/b.vs.length, dom:Object.entries(b.dom).sort((x,y)=>y[1]-x[1])[0][0]}));
        dayByDay=`<div class="chart-toggle"><button class="ct-btn${chartMode==='safety'?' on':''}" type="button" data-mode="safety">safety</button><button class="ct-btn${chartMode==='states'?' on':''}" type="button" data-mode="states">all states</button></div><div id="chart-host">${chartInner(chartMode, arcBuckets, safetyColor)}</div>`;
      }

      // ---- does practice help: safety on practice days vs other days ----
      const pDays=new Set(sess.map(s=>new Date(s.t).toDateString()));
      const on=[],off=[];
      cs.forEach(x=>{ (pDays.has(new Date(x.t).toDateString())?on:off).push(x.v); });
      let helpHTML;
      if(sess.length<2 || !on.length || !off.length){
        helpHTML=`<p class="panel-empty">practice a few times, checking in around it, and we'll show you whether it moves your safety.</p>`;
      } else {
        const onP=Math.round(avg(on)*100), offP=Math.round(avg(off)*100), diff=onP-offP;
        let verdict, good=false;
        if(diff>=4){ good=true; verdict=`yes, your safety runs ${diff} points higher after you practice.`; }
        else if(diff<=-4){ verdict=`you tend to reach for practice on your harder days, that's a good thing, not a setback.`; }
        else { verdict=`about even so far. keep going, the pattern takes time to show.`; }
        helpHTML=`
          <div class="help-bars">
            <div class="help-row"><span class="help-lbl">practice days</span><span class="help-track"><span class="help-fill" style="width:${onP}%;background:var(--s-safety)"></span></span><span class="help-pct">${onP}%</span></div>
            <div class="help-row"><span class="help-lbl">other days</span><span class="help-track"><span class="help-fill" style="width:${offP}%;background:var(--hairline)"></span></span><span class="help-pct">${offP}%</span></div>
          </div>`;
      }

      // ---- growth headline: safety now vs when you started (all-time, not period-filtered) ----
      let growthHead='';
      (function(){
        const tn=Store.tenure();
        if(allCs.length>=8 && tn.days>=5 && tn.stage!=='start' && tn.stage!=='early'){
          const k=Math.max(2,Math.floor(allCs.length/4));
          const startV=avg(allCs.slice(0,k).map(x=>x.v)), recentV=avg(allCs.slice(-k).map(x=>x.v));
          const g=Math.round((recentV-startV)*100), up=g>=3, down=g<=-3;
          const cap=up?'higher than when you started. your practice reps add up!':down?"safety comes and goes for everyone. this is a dip. it'll come back.":'about steady since you started.';
          growthHead=`<p class="growth-head"><span class="growth-num ${up?'up':down?'down':'flat'}">${g>0?'+':''}${g} pts</span><span class="growth-cap">${cap}</span></p>`;
        }
      })();
      const SHARE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14V4"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M5 12v7h14v-7"/></svg>';
      const shareBtn=(k)=>`<button class="panel-share" type="button" data-share="${k}" aria-label="Share this card">${SHARE_ICON}</button>`;
      c.innerHTML=`
        <div class="view play-view">
          <div class="filter-bar">
            ${visPer.length>1?`<div class="play-filter seg">${visPer.map(p=>`<button class="period-pill${activePeriod===p.key?' on':''}" data-period="${p.key}">${p.label}</button>`).join('')}</div>`:''}
            <button class="set-gear ci-add" id="add-ci" type="button" aria-label="new check in" title="new check in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
            <button class="set-gear" id="set-btn" type="button" aria-label="settings" title="settings">${GEAR_SVG}</button>
          </div>

          <div class="carousel" id="carousel">
            <section class="panel">
              ${shareBtn('safety')}<p class="panel-title">your safety</p>
              <p class="panel-sub">the average level of safety in your system during the last ${periodTxt}</p>
              <div class="safety-wrap${rising?' rising':''}" id="safety-wrap">
                <div class="safety-num"><span class="safety-num-val">${safetyPct}</span><span class="pct">%</span></div>
                <div class="safety-trend ${dir}">${dir==='rising'?'and rising \u2191':dir==='falling'?'and dipping \u2193':'and steady'}</div>
              </div>
              <div class="safety-meter"><span class="safety-meter-fill" style="width:${safetyPct}%"></span></div>
              ${topState?`<div class="safety-foot"><span class="tg-host">${triGlyph(topState)}</span><span class="sf-txt">your typical safety type is <b>${({play:'regulated mobility',stillness:'regulated immobility'}[topState])||STATE_NAME(topState)}</b></span></div>`:''}
              ${rising?'<p class="bloom-line">your system is finding more safety.</p>':''}
            </section>

            <section class="panel">
              ${shareBtn('mix')}<p class="panel-title">your state mix</p>
              <p class="panel-sub">${periodTxt==='all time'?'your state averages, all time':'your check-in averages, over '+periodTxt}</p>
              <div class="dist-bars">${mixHTML}</div>
            </section>

            <section class="panel">
              ${shareBtn('day')}<p class="panel-title">your safety changes</p>
              <p class="panel-sub">your safety state over time, and how far you've come since you started.</p>
              ${growthHead}${dayByDay}
            </section>

            <section class="panel">
              ${shareBtn('practice')}<p class="panel-title">is practice helping?</p>
              <p class="panel-sub">your average safety after you practice vs. not</p>
              ${helpHTML}
            </section>
          </div>

          <div class="dots" id="dots">${[0,1,2,3].map(i=>`<span class="dot-i${i===0?' on':''}"></span>`).join('')}</div>

          <div class="deep">
            <div class="deep-block">
              <p class="deep-h">time of day</p>
              ${['morning','afternoon','evening','late'].map(seg=>{ const sub=cs.filter(x=>segOf(x.t)===seg); const k=domOf(sub); return `<div class="deep-row"><span class="deep-lbl">${segLabel(seg)}</span><span class="deep-val">${k?`<span class="deep-tap" data-state-detail="${k}" style="cursor:pointer">${stateMarks(k)}</span>`:'<span class="deep-none">\u2014</span>'}</span></div>`; }).join('')}
            </div>
            <div class="deep-block">
              <p class="deep-h">at a glance</p>
              <div class="deep-row"><span class="deep-lbl">most often</span><span class="deep-val">${topState?`<span class="deep-tap" data-state-detail="${topState}" style="cursor:pointer">${stateMarks(topState)}</span>`:'\u2014'}</span></div>
              <div class="deep-row"><span class="deep-lbl">avg safety</span><span class="deep-val">${safetyPct}%</span></div>
              <div class="deep-row"><span class="deep-lbl">challenge level</span><span class="deep-val">${(function(){const ca=Store.learned().challengeAvg;return ca!=null?Store.challengeLabel(ca):'\u2014';})()}</span></div>
              <div class="deep-row"><span class="deep-lbl">trend</span><span class="deep-val">${dir}</span></div>
              ${(function(){const L=Store.learned();let h='';if(L.favPractice)h+=`<div class="deep-row"><span class="deep-lbl">you return to</span><span class="deep-val">${Store.practiceLabel(L.favPractice)}</span></div>`;if(L.favSense)h+=`<div class="deep-row"><span class="deep-lbl">anchored through</span><span class="deep-val">${L.favSense}</span></div>`;return h;})()}
            </div>
          </div>
          <p class="deep-hint" style="font-size:11px;opacity:.5;text-align:center;margin:6px 0 2px">tap a symbol to learn more</p>
          <button class="change-link" id="change-ci" type="button">change a recent check-in</button>
          ${Store.sessions().length ? '<button class="change-link" id="manage-pr" type="button">manage your practices</button>' : ''}
        </div>`;

      function stopPlay(){ if(playTimer){ clearInterval(playTimer); playTimer=null; } const p=$('#ot-play'); if(p) p.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 Z"/></svg>'; }

      c.querySelectorAll('.period-pill').forEach(b=>b.addEventListener('click',()=>{ stopPlay(); const cv=$('#carousel'); const sl=cv?cv.scrollLeft:0; activePeriod=b.dataset.period; render(); const nv=$('#carousel'); if(nv){ nv.scrollLeft=sl; const i=Math.round(sl/(nv.clientWidth||1)); c.querySelectorAll('#dots .dot-i').forEach((d,j)=>d.classList.toggle('on',j===i)); } }));
      const setBtn=$('#set-btn'); if(setBtn) setBtn.onclick=screenSettings;
      const chgBtn=$('#change-ci'); if(chgBtn) chgBtn.onclick=screenChangeCheckin;
      const mpBtn=$('#manage-pr'); if(mpBtn) mpBtn.onclick=screenManagePractices;
      const addBtn=$('#add-ci'); if(addBtn) addBtn.onclick=screenCheckin;
      c.querySelectorAll('.panel-share').forEach(b=>b.addEventListener('click',(e)=>{ e.stopPropagation(); openShare(`my nervous system, lately, ${safetyPct}% safe-and-social, most often in ${STATE_NAME(topState||'safety')}. stuck not broken`); }));
      c.querySelectorAll('.distrow').forEach(b=>b.addEventListener('click',()=>screenStateDetail(b.dataset.stateDetail)));
      c.querySelectorAll('.deep-tap').forEach(b=>b.addEventListener('click',()=>screenStateDetail(b.dataset.stateDetail)));

      const chartHost=$('#chart-host');
      if(chartHost && arcBuckets){
        const bindPts=()=>{ chartHost.querySelectorAll('.cpt').forEach(el=>el.addEventListener('click',()=>{ const i=+el.dataset.i, b=arcBuckets[i], r=$('#chart-readout'); if(b&&r) r.textContent = chartMode==='safety'?`${b.label} \u00b7 ${Math.round(b.avg*100)}% safety`:`${b.label} \u00b7 ${STATE_NAME(b.dom)}`; })); };
        bindPts();
        c.querySelectorAll('.ct-btn').forEach(btn=>btn.addEventListener('click',()=>{ chartMode=btn.dataset.mode; c.querySelectorAll('.ct-btn').forEach(x=>x.classList.toggle('on',x===btn)); chartHost.innerHTML=chartInner(chartMode, arcBuckets, safetyColor); bindPts(); }));
      }

      const carousel=$('#carousel'); const dots=c.querySelectorAll('#dots .dot-i');
      if(carousel){ carousel.addEventListener('scroll',()=>{ const i=Math.round(carousel.scrollLeft/carousel.clientWidth); dots.forEach((d,j)=>d.classList.toggle('on',j===i)); },{passive:true}); }

      // gentle count-up to the safety figure — the card's one breath of life,
      // and only the first time it's shown per page load (not on every period/tab switch).
      if(!window._snbSafetyCounted){
        window._snbSafetyCounted = true;
        const el=c.querySelector('.safety-num-val');
        if(el){
          const target=safetyPct, dur=1100, t0=Date.now();
          const ease=x=>1-Math.pow(1-x,3);
          const calm=document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion:reduce)').matches;
          if(calm){ el.textContent=target; }
          else { el.textContent='0';
            const timer=setInterval(()=>{ if(!el.isConnected){ clearInterval(timer); return; }
              const p=Math.min(1,(Date.now()-t0)/dur);
              el.textContent=Math.round(target*ease(p));
              if(p>=1){ el.textContent=target; clearInterval(timer); }
            }, 32);
          }
        }
      }
    }

    render();
  }
  const STATE_DETAIL = {
    safety:      { headline:'safety',        color:'#F4D58D', about:"Safety is your nervous system open and online, not braced for anything. It spends its energy on rest, connection, and repair instead of defense. Safety isn't the absence of hard emotions. It's having enough capacity inside to meet them.", whenDrops: null },
    fightflight: { headline:'flight/fight',color:'#E89B9B', about:"Flight/fight is sympathetic energy without enough safety yet. Your body picked up danger and mobilized to handle it. Flight first, the urge to escape, anxiety. Then fight, the urge to push back, anger. It's protection, not a flaw, even when it spills onto people you care about.", whenDrops:"Move a little on purpose, a short walk, shake out your hands, push your palms against a wall. Give the energy somewhere to go, then name the feeling under it. A long, slow exhale helps too.", practice:{practiceKey:'anchoring',sense:'movement',silence:8} },
    shutdown:    { headline:'shutdown',       color:'#A3C0DD', about:"Shutdown is the oldest brake your body has, heavy, flat, far away. Your system powered down to protect you when things got to be too much. A lot of what gets called depression is the body in shutdown. It isn't weakness, and it isn't who you are.", whenDrops:"Very small, very low demand. One sip of water, a dimmer light, one thing you can see or hear right now. You don't force your way out of shutdown. You add a little safety, and the body lets some energy come back.", practice:{practiceKey:'mindfulness',sense:'touch',silence:8} },
    play:        { headline:'play/motivation', sub:'regulated mobilization', color:'#E8A871', about:"Play is safety and energy at the same time, the social, mobilized kind shared with people you trust. On your own, the same drive shows up as motivation. It's the same fuel as flight/fight, with safety mixed in, so it runs as creativity and drive instead of defense.", whenDrops:"If the safety thins and the energy stays, watch for the tip toward flight/fight. Keep a little safety in the mix, slow down enough to feel it, and aim the energy at one thing that matters.", practice:{practiceKey:'anchoring',sense:'touch',silence:8} },
    stillness:   { headline:'stillness/intimacy', sub:'regulated immobilization', color:'#9FC498', about:"Stillness is the body slowed and quiet, without fear. The same powering-down as shutdown, but with safety mixed in, so it restores instead of collapses. On your own it's stillness; shared with someone safe, it's intimacy. A deeply regulated state.", whenDrops:"If the quiet starts to feel flat or heavy or scared instead of restful, that's the cue to add a small bit of safety, not to force yourself up and out.", practice:{practiceKey:'anchoring',sense:'sound',silence:8} },
    freeze:      { headline:'freeze',         color:'#B89AC4', about:"Freeze is a mixed state, flight/fight energy held down by shutdown. Gas and brake at once. It isn't a deeper shutdown, it's both pedals down, which is why it can feel panicked and paralyzed at the same time. A braced, protective state, not nothing.", whenDrops:"The smallest movement, plus a cue of safety. Let your eyes go where they want, then wiggle your toes or roll your wrists, slow. Don't force it, that adds gas to a slammed brake. Get smaller and safer.", practice:{practiceKey:'most',skill:'pendulation',sense:'touch',silence:8} },
  };

  function screenStateDetail(key){
    const d = STATE_DETAIL[key] || STATE_DETAIL.safety;
    clearFigures(); document.body.classList.remove('in-practice');
    root.innerHTML = `
      <header class="appbar">
      </header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    $('#content').innerHTML = `<div class="view read sd-view">
        <div class="scr-head sd-head">
          <span class="sd-marks">${triGlyph(key)}</span>
          <h2 class="scr-h">${escapeHtml(d.headline)}</h2>
        </div>
        ${d.sub ? `<p class="sd-sub" style="font-size:13px;opacity:.55;margin:-2px 0 14px;letter-spacing:.02em">${escapeHtml(d.sub)}</p>` : ''}
        <p class="sd-body">${escapeHtml(d.about)}</p>
        ${d.whenDrops ? `<div class="sd-when">
          <p class="sd-when-label">when safety drops</p>
          <p class="sd-body">${escapeHtml(d.whenDrops)}</p>
        </div>` : ''}
      </div>`;
  }

  function statsHTML(cs){
    if(cs.length<3) return `<p style="font-size:11.5px;color:var(--hairline);text-align:right;margin-top:8px">${cs.length} check-in${cs.length===1?'':'s'}</p>`;
    const freq={};cs.forEach(c=>{freq[c.dom]=(freq[c.dom]||0)+1;});
    const topEntries=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    const [topKey,topCount]=topEntries[0];
    const topPct=Math.round(topCount/cs.length*100);
    const avgV=cs.reduce((s,c)=>s+c.v,0)/cs.length;
    const avgPct=Math.round(avgV*100);
    const tr=Store.trend();
    const trendTxt=tr.dir==='rising'?'rising':tr.dir==='falling'?'dipping':'steady';
    const trendArrow=tr.dir==='rising'?'↑':tr.dir==='falling'?'↓':'→';
    const variance=cs.reduce((s,c)=>s+(c.v-avgV)**2,0)/cs.length;
    const stdDev=Math.sqrt(variance);
    const volTxt=stdDev>0.22?'shifts a lot':stdDev>0.12?'some variation':'fairly consistent';
    const SEGS=['morning','afternoon','evening','late'];
    const segRows=SEGS.map(seg=>{
      const arr=cs.filter(c=>segOf(c.t)===seg);
      if(arr.length<2) return null;
      const f={};arr.forEach(c=>{f[c.dom]=(f[c.dom]||0)+1;});
      const [sk]=Object.entries(f).sort((a,b)=>b[1]-a[1])[0];
      return {seg,key:sk};
    }).filter(Boolean);
    return `
      <div class="hr"></div>
      <button class="stats-toggle" id="p-stats-toggle" aria-expanded="false">
        <span class="eyebrow" style="margin:0">your patterns</span>
        <span class="stats-tog-icon">+</span>
      </button>
      <div class="stats-body" id="p-stats-body">
      <div class="stat-rows" style="margin-top:8px">
        <button class="stat-row stat-row-tap" data-state-detail="${topKey}">
          <span class="stat-row-lbl">most often in</span>
          <span class="stat-row-val">
            ${stateMarks(topKey)}
            ${STATE_NAME(topKey)} <span style="color:var(--muted);font-weight:400">${topPct}%</span>
            <span style="color:var(--hairline);margin-left:2px">›</span>
          </span>
        </button>
        <div class="stat-row">
          <span class="stat-row-lbl">average safety</span>
          <span class="stat-row-val">
            <span class="safety-track"><span class="safety-fill" style="width:${avgPct}%"></span></span>
            ${avgPct}% <span class="stat-trend">${trendArrow} ${trendTxt}</span>
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-row-lbl">consistency</span>
          <span class="stat-row-val" style="color:var(--muted);font-weight:400">${volTxt}</span>
        </div>
      </div>
      ${segRows.length>=2?`
      <div class="hr"></div>
      <p class="eyebrow" style="margin:0 0 12px">by time of day</p>
      <div class="stat-rows">
        ${segRows.map(s=>`
        <div class="stat-row">
          <span class="stat-row-lbl">${s.seg}</span>
          <span class="stat-row-val">
            ${stateMarks(s.key)}
            ${STATE_NAME(s.key)}
          </span>
        </div>`).join('')}
      </div>`:''}
      <p style="font-size:11.5px;color:var(--hairline);text-align:right;margin-top:14px">${cs.length} check-in${cs.length===1?'':'s'}</p>
      </div>
    `;
  }
  function legendHTML(cs){
    const present = [...new Set(cs.map(c=>c.dom))];
    return `<div class="statelegend">${present.map(k=>`<span class="it">${stateMarks(k)}${STATE_NAME(k)}</span>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- PRACTICE
  // The player (player.html) is embedded full-bleed with no top chrome — the bottom
  // tab bar is the only navigation, and it hides once a session is playing. The
  // practice tab opens the player's own 4-option chooser (incl. "More meditations").
  function practiceShell(src, reco){
    haptic('start');               // soft tap as the practice begins (Begin tap = user gesture)
    currentTab = 'practice';
    setHTML(`
      <div class="weaver-wrap"><iframe class="weaver-frame" id="weaver" src="${src}" title="Guided practice" allow="autoplay"></iframe></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`);
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    window._pendingReco = reco || Store.recommend();   // so a completed session still shows the “you came back” screen
  }
  // ---------------------------------------------------------------- PRACTICE CHOOSER DATA
  const P_OPTS=[
    {key:'mindfulness',title:'Simple mindfulness',       sub:'the gentlest, a calm place to start'},
    {key:'anchoring',  title:'Connect with safety',      sub:'settling into safety through your senses'},
    {key:'most',       title:'Practice self-regulation', sub:'the deepest, meeting what is hard'},
    {key:'more',       title:'More meditations',         sub:'standalone guided sessions'},
  ];
  const P_SENSES=['touch','sound','sight','movement','imagination'];
  const P_SKILLS=[['imagery','imagery & invitation'],['obstacles','obstacles'],['balancing','balancing'],['pendulation','pendulation']];
  const P_SILENCE=[[4,'a little'],[8,'some'],[12,'a lot']];
  const P_MEDS=[
    {id:'uye',                 title:'Use Your Ears',       est:'~10 min', sub:'grounding through sound'},
    {id:'eye',                 title:'Use Your Eyes',       est:'~9 min',  sub:'grounding through sight'},
    {id:'daily-dysregulation', title:'Daily Dysregulation', est:'~16 min', sub:'meeting a recent activation'},
    {id:'outside-the-cave',    title:'Outside the Cave',    est:'~32 min', sub:'a deeper imagery journey'},
  ];
  let pState=null;

  // Practice opens on a personalized "for you" view: a context line tuned to the
  // last check-in, and one track-colored card the Curriculum Advisor recommends.
  // Tapping it opens the plan reader. "choose another way" reveals the full chooser.
  function tabPractice(){
    const reco = Store.recommend();
    pState = { key:null, sense:reco.sense||'touch', skill:reco.skill||'imagery', silence:reco.silence||8, med:null };
    renderPracticeChooser();
  }

  function practiceContextLine(last){
    const nm = Store.getName();
    if(!last || !sameDay(last.t)){
      return nm ? 'something simple before your first check-in, '+escapeHtml(nm)+'.' : 'something simple before your first check-in.';
    }
    const map = {
      safety:      "you checked in with safety. here's what to do next.",
      play:        "your body has safety and mobility. let's see if we can connect with those. remain open to what else is within you.",
      stillness:   "you're okay with simply being as you are and where you are. let's deepen that potential with this practice. be open to what the moment brings you.",
      fightflight: "energy within. let's see if you can also connect with safety.",
      shutdown:    "things feel heavy right now. we don't reject it. but we also see if there is potential to connect to the present.",
      freeze:      "sounds like some tension currently. good job noticing honestly and calling it as it is. let's see what happens when we connect to the present.",
    };
    return map[last.dom] || 'a practice for you in this moment.';
  }

  function renderForYou(){
    const c = content();
    const reco = Store.recommend();
    const last = Store.lastCheckin();
    const tk = trackOf(reco.practiceKey);
    const chLabel = reco.challenge!=null ? Store.challengeLabel(reco.challenge) : null;
    const meta = [reco.skill ? skillLabel(reco.skill) : null,
                  reco.practiceKey!=='mindfulness' ? reco.sense : null,
                  chLabel ? chLabel : null].filter(Boolean).join('  \u00b7  ');
    c.innerHTML = `<div class="view fy-view">
      <div class="scr-head">
        <p class="eyebrow"></p>
        <h2 class="scr-h">${practiceContextLine(last)}</h2>
      </div>
      <button class="foryou-card track-${tk.cls}" id="foryou">
        <span class="fy-rail"></span>
        <span class="fy-body">
          <span class="fy-kicker">${reco.adapted ? 'tuned to you' : 'a place to start'}</span>
          <span class="fy-title">${Store.practiceLabel(reco.practiceKey)}</span>
          <span class="fy-reason">${escapeHtml(reco.reason)}</span>
          ${meta ? `<span class="fy-meta">${escapeHtml(meta)}</span>` : ''}
          <span class="fy-cta">see your practice \u2192</span>
        </span>
      </button>
      <button class="navlink fy-other" id="fy-other">or choose another way</button>
    </div>`;
    const fc = c.querySelector('#foryou'); if(fc) fc.onclick = ()=>renderPlan(reco);
    const ot = c.querySelector('#fy-other'); if(ot) ot.onclick = ()=>{
      pState = { key:null, sense:reco.sense||'touch', skill:reco.skill||'imagery', silence:reco.silence||8, med:null };
      renderPracticeChooser();
    };
  }

  // Plan reader: a calm, full read of the recommended practice before it starts —
  // what it is, its shape, why it was chosen — with Begin / change.
  // sentence-case a lowercase advisor string for the blog-styled plan screen
  function properCase(s){ return String(s==null?'':s).replace(/(^|[.!?]\s+)([a-z])/g,(m,p,c)=>p+c.toUpperCase()).replace(/\bi\b/g,'I').replace(/\bi(['’])/g,'I$1'); }
  function renderPlan(reco){
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    currentTab = 'practice';
    const tk = trackOf(reco.practiceKey);
    const planNm = Store.getName();
    const planTitle = planNm ? `${escapeHtml(planNm)}’s custom practice` : 'Your custom practice';
    const chLabel = reco.challenge!=null ? Store.challengeLabel(reco.challenge) : null;
    // the customized items used to be a separate key/value list; they now live inside
    // "what to expect" as track-colored tokens woven into the sentence.
    const hl = (s)=>`<span class="plan-hl">${escapeHtml(String(s))}</span>`;
    const shapeBits = [
      (reco.practiceKey!=='mindfulness' && reco.sense) ? `anchored through ${hl(reco.sense)}` : null,
      reco.skill ? `practicing ${hl(skillLabel(reco.skill))}` : null,
      `with ${hl(silLabel(reco.silence))} silence between guidance`,
      chLabel ? `challenge level at ${hl(chLabel)}` : null,
    ].filter(Boolean);
    const joinList = (a)=> a.length<=1 ? (a[0]||'') : a.slice(0,-1).join(', ')+' and '+a[a.length-1];
    const shapedSentence = shapeBits.length ? `Tuned for you, ${joinList(shapeBits)}.` : '';
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    $('#content').innerHTML = `<div class="view plan-view track-${tk.cls}">
      <div class="plan-head">
        <p class="eyebrow"></p>
        <div class="plan-titlerow">
          <span class="plan-rail" aria-hidden="true"></span>
          <h1 class="plan-title">${planTitle}</h1>
        </div>
      </div>
      <div class="plan-sec">
        <p class="dash-prompt">Why this practice was chosen for you</p>
        <p class="plan-why">${escapeHtml(properCase(reco.reason))}</p>
      </div>
      <div class="plan-sec">
        <p class="dash-prompt">What to expect in your custom practice</p>
        <p class="plan-about">${escapeHtml(properCase(aboutOf(reco.practiceKey, reco.sense)))}</p>
        ${shapedSentence?`<p class="plan-about plan-shaped">${shapedSentence}</p>`:''}
      </div>
      <div class="plan-actions">
        <button class="set-quiet actionbar-aux" id="plan-change">change this practice</button>
        <button class="btn block" id="plan-begin">begin</button>
      </div>
    </div>`;
    $('#plan-begin').onclick = ()=>launchWeaver(reco);
    $('#plan-change').onclick = ()=>{
      app('practice');
      // open the chooser already on this practice, with its current shape selected
      pState = { key:(reco.practiceKey==='more'?null:reco.practiceKey), sense:reco.sense||'touch', skill:reco.skill||'imagery', silence:reco.silence||8, med:null };
      renderPracticeChooser();
    };
  }

  function renderPracticeChooser(animateIn){
    const c=content();
    const {key,sense,skill,silence,med}=pState;

    const selCard=(o,dataAttr,selected)=>`
      <button class="wincard p-opt${selected?' p-sel':''}" ${dataAttr}>
        <span class="wc-text">
          <span class="wc-title">${escapeHtml(o.title)}</span>
          <span class="wc-reason">${escapeHtml(o.sub)}</span>
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>`;

    const chip=(lbl,val,attr,on)=>
      `<button class="p-chip${on?' on':''}" data-${attr}="${escapeHtml(String(val))}">${escapeHtml(lbl)}</button>`;

    const refineHTML=(key&&key!=='more')?`
      <div class="p-refine">
        ${key!=='mindfulness'?`<div class="p-rgroup">
          <p class="dash-prompt">what would you like to anchor with?</p>
          <div class="p-chips">${P_SENSES.map(s=>chip(s,s,'sense',s===sense)).join('')}</div>
        </div>`:''}
        ${key==='most'?`<div class="p-rgroup">
          <p class="dash-prompt">which skill do you want to practice?</p>
          <div class="p-chips">${P_SKILLS.map(([v,l])=>chip(l,v,'skill',v===skill)).join('')}</div>
        </div>`:''}
        <div class="p-rgroup">
          <p class="dash-prompt">how much silence between guidance?</p>
          <div class="p-chips">${P_SILENCE.map(([v,l])=>chip(l,v,'sil',v===silence)).join('')}</div>
        </div>
        ${key==='most'?'<button class="p-surprise" id="p-surprise">surprise me</button>':''}
      </div>`:'';

    const medsHTML=key==='more'?`
      <div class="p-med-list">
        ${P_MEDS.map(m=>`<button class="p-med-row${med===m.id?' on':''}" data-pmed="${m.id}">
          <span class="p-med-title">${escapeHtml(m.title)}</span>
          <span class="p-med-meta">${escapeHtml(m.est)} · ${escapeHtml(m.sub)}</span>
        </button>`).join('')}
      </div>`:'';

    const canBegin=!!(key&&(key!=='more'||med));

    const reco = Store.recommend();
    const tk = trackOf(reco.practiceKey);
    const tunedNm = Store.getName();
    const tunedHeading = tunedNm ? `${escapeHtml(tunedNm)}'s custom practice` : 'your custom practice';
    const tunedCard = `
      <button class="wincard tuned-card track-${tk.cls}" id="foryou">
        <span class="tuned-badge" aria-hidden="true">${SPARKLE}</span>
        <span class="wc-text">
          <span class="wc-title">${tunedHeading}</span>
          <span class="wc-reason">${escapeHtml(reco.reason)}</span>
        </span>
        <span class="wc-go">${CHEV}</span>
      </button>`;

    const heading = !key ? 'choose your practice.'
      : (key==='more' ? 'choose a session.'
      : `adjust your <span class="p-adjust-name">${escapeHtml(Store.practiceLabel(key))}</span> practice.`);

    c.innerHTML=`<div class="view p-view${key?' track-'+trackOf(key).cls:''}">
      <div class="scr-head">
        <p class="eyebrow"></p>
        <h2 class="scr-h">${heading}</h2>
      </div>
      <div class="p-bottom">
        ${!key
          ? `${tunedCard}<div class="p-opts" id="p-opts-list">${P_OPTS.map(o=>selCard(o,`data-pkey="${o.key}"`,key===o.key)).join('')}</div>`
          : `${refineHTML}${medsHTML}`}
      </div>
      ${key?`<div class="actionbar">
        <button class="set-quiet actionbar-aux" id="p-cancel">cancel</button>
        <button class="btn block" id="p-begin"${canBegin?'':' disabled'}>begin</button>
      </div>`:''}
    </div>`;

    c.querySelectorAll('[data-pkey]').forEach(b=>b.onclick=()=>{pState.key=pState.key===b.dataset.pkey?null:b.dataset.pkey;pState.med=null;renderPracticeChooser();});
    const cancelBtn=$('#p-cancel'); if(cancelBtn) cancelBtn.onclick=()=>{pState.key=null;pState.med=null;renderPracticeChooser();};
    c.querySelectorAll('[data-pmed]').forEach(b=>b.onclick=()=>{
      pState.med=b.dataset.pmed;
      c.querySelectorAll('[data-pmed]').forEach(r=>r.classList.toggle('on',r.dataset.pmed===pState.med));
      const bb=$('#p-begin'); if(bb){bb.disabled=false;bb.removeAttribute('disabled');}
    });
    c.querySelectorAll('[data-sense]').forEach(b=>b.onclick=()=>{
      pState.sense=b.dataset.sense;
      c.querySelectorAll('[data-sense]').forEach(r=>r.classList.toggle('on',r.dataset.sense===pState.sense));
    });
    c.querySelectorAll('[data-skill]').forEach(b=>b.onclick=()=>{
      pState.skill=b.dataset.skill;
      c.querySelectorAll('[data-skill]').forEach(r=>r.classList.toggle('on',r.dataset.skill===pState.skill));
    });
    c.querySelectorAll('[data-sil]').forEach(b=>b.onclick=()=>{
      pState.silence=+b.dataset.sil;
      c.querySelectorAll('[data-sil]').forEach(r=>r.classList.toggle('on',r.dataset.sil===String(pState.silence)));
    });

    const surpriseBtn=$('#p-surprise');
    if(surpriseBtn)surpriseBtn.onclick=()=>{
      const rskill=P_SKILLS[Math.floor(Math.random()*P_SKILLS.length)][0];
      const rsense=P_SENSES[Math.floor(Math.random()*P_SENSES.length)];
      const rsilence=P_SILENCE[Math.floor(Math.random()*P_SILENCE.length)][0];
      practiceShell('player.html?'+new URLSearchParams({embed:'1',autostart:'1',practice:'most',sense:rsense,silence:String(rsilence),skill:rskill}).toString(),{practiceKey:'most',sense:rsense,skill:rskill,silence:rsilence});
    };

    const tuned=$('#foryou'); if(tuned) tuned.onclick=()=>renderPlan(reco);
    const beginBtn=$('#p-begin');
    // attach regardless of initial canBegin: for "More meditations" the button starts
    // disabled (no session picked yet) and is enabled when a session is chosen — but the
    // handler must already be wired, or clicking the enabled button does nothing.
    if(beginBtn)beginBtn.onclick=()=>{
      const {key,sense,skill,silence,med}=pState;
      let src;
      if(key==='more'){
        src='player.html?embed=1&autostart=1&more=1&med='+encodeURIComponent(med);
      }else{
        const ps={embed:'1',autostart:'1',practice:key,sense,silence:String(silence)};
        if(key==='most')ps.skill=skill;
        src='player.html?'+new URLSearchParams(ps).toString();
      }
      practiceShell(src,{practiceKey:key,sense,skill,silence});
    };
  }

  // Today's "a practice for now" row → one-tap autostart of the recommended practice,
  // same full-bleed shell (tab bar for nav, no top header).
  function launchWeaver(reco){
    const params = { embed:'1', autostart:'1', practice:reco.practiceKey, sense:reco.sense||'touch', silence:String(reco.silence||8) };
    if(reco.skill) params.skill = reco.skill;
    practiceShell('player.html?'+new URLSearchParams(params).toString(), reco);
  }

  // weaver -> app messages
  window.addEventListener('message', (e)=>{
    const m = e.data || {};
    if(m.type !== 'snb-weaver') return;
    if(m.event === 'screen'){ document.body.classList.toggle('in-practice', m.screen==='player'); return; }
    const reco = window._pendingReco;
    if(!reco) return;
    if(m.event === 'complete'){ haptic('complete'); logSession(reco, true, false, m.minutes); renderFeedback(reco); }
    else if(m.event === 'exit'){ logSession(reco, false, true, m.minutes); app('today'); }
  });
  function logSession(reco, completed, endedEarly, minutes){
    if(window._sessionLogged) return; window._sessionLogged=true;
    Store.addSession({ practiceKey:reco.practiceKey, skill:reco.skill, sense:reco.sense, silence:reco.silence,
      completed:!!completed, endedEarly:!!endedEarly, minutes:minutes||null, domBefore:reco.domBefore||null });
    setTimeout(()=>{ window._sessionLogged=false; }, 1000);
  }
  // Post-practice: a gentle read of how the body landed. Logged onto the session
  // (feeds the advisor over time), then a soft hand-off to a check-in or back home.
  const FB_OPTS = [
    { key:'more',    label:'more connection & presence' },
    { key:'same',    label:'about the same' },
    { key:'less',    label:'less connected and present' },
    { key:'struggle',label:'struggled with this one' },
    { key:'unsure',  label:'not sure' },
  ];
  function renderFeedback(reco){
    setHTML(`
      <header class="appbar"></header>
      <div class="scroll"><div class="view fb-view">
        <div class="scr-head">
          <p class="eyebrow">share your experience</p>
          <h1 class="scr-h">how does your system feel now?</h1>
          <p class="scr-lede">there’s no right answer here. just notice where you are now, compared to where you started.</p>
        </div>
        <div class="fb-opts">
          ${FB_OPTS.map(o=>`<button class="fb-opt" data-fb="${o.key}">${o.label}</button>`).join('')}
        </div>
        <button class="navlink" id="fb-skip" style="align-self:center;margin-top:18px">skip</button>
      </div></div>`);
    root.querySelectorAll('.fb-opt').forEach(b=>b.onclick=()=>{ try{ Store.noteFeedback(b.dataset.fb); }catch(e){} fbThanks(b.dataset.fb); });
    const sk=$('#fb-skip'); if(sk) sk.onclick=()=>app('today');
  }
  function fbThanks(val){
    // closing line in Justin's voice — the report tunes the tone, never judges it
    const CLOSE = {
      more:    { h:'something shifted toward connection.', s:"that's worth a small pat on your nervous system's back." },
      same:    { h:'no major change, but you showed up.',  s:"that's a solid rep and your system thanks you for it." },
      less:    { h:'you stayed with it.',                  s:"that's not nothing. imperfect practice is still practice. it's a chance to learn, adjust, and give yourself kudos for the effort. adjust for the next one. maybe take it easier and work your way back to more challenge. don't rush it." },
      struggle:{ h:'hard ones are still practice.',        s:"you're still here. you showed up. struggling with practices is very normal. come back to it when you're ready, but maybe focus on an easier skill. customize the next practice to your content." },
      unsure:  { h:'not knowing is allowed.',             s:'you still showed up. well done. stay curious and open for the next one.' },
    };
    const cl = CLOSE[val] || CLOSE.same;
    setHTML(`
      <header class="appbar"></header>
      <div class="scroll"><div class="view fb-view fb-thanks">
        <div class="settle" aria-hidden="true">
          <span class="settle-ico settle-bolt">${ico('bolt',{color:STATE_COLOR('fightflight')})}</span>
          <span class="settle-ico settle-heart">${ico('heart',{color:STATE_COLOR('safety')})}</span>
          <span class="settle-ico settle-x">${ico('x',{color:STATE_COLOR('shutdown')})}</span>
        </div>
        <div class="scr-head fb-thanks-head">
          <h1 class="scr-h">${cl.h}</h1>
          <p class="scr-lede">${cl.s}</p>
        </div>
        <p class="settle-note">safety doesn't erase the rest. it just holds them.</p>
        <div class="fb-after">
          <button class="btn block" id="fb-checkin">do a post-practice check-in</button>
          <button class="navlink" id="fb-home" style="align-self:center">back to today</button>
        </div>
      </div></div>`);
    requestAnimationFrame(()=>{ const s=root.querySelector('.settle'); if(s) s.classList.add('on'); });
    $('#fb-checkin').onclick = screenCheckin;
    $('#fb-home').onclick = ()=>app('today');
  }

  // ---------------------------------------------------------------- YOU
  // ---- offline ("save all practices") — bulk precache into the existing snb-audio-v1 SW cache ----
  const OFFLINE_FLAG = 'snb_offline_all';
  async function offlineManifest(){
    try{ const r = await fetch('./offline-manifest.json', {cache:'no-store'}); if(!r.ok) return [];
      const arr = await r.json(); return (Array.isArray(arr)?arr:[]).map(p=>new URL(p, location.href).href); }
    catch(e){ return []; }
  }
  async function offlineCachedCount(){
    try{ const c = await caches.open('snb-audio-v1'); const keys = await c.keys();
      return keys.filter(req=>/\/(clips|packs)\//.test(new URL(req.url).pathname)).length; }catch(e){ return 0; }
  }
  // post the clip list to the SW, which bulk-caches with progress; resolves when done
  async function downloadOffline(urls, onProgress){
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active || navigator.serviceWorker.controller;
    if(!sw) throw new Error('no active service worker');
    return new Promise((resolve)=>{
      const onMsg = (ev)=>{ const d = ev.data||{};
        if(d.type==='PRECACHE_PROGRESS'){ try{ onProgress && onProgress(d); }catch(e){} }
        else if(d.type==='PRECACHE_DONE'){ navigator.serviceWorker.removeEventListener('message', onMsg); resolve(d); } };
      navigator.serviceWorker.addEventListener('message', onMsg);
      sw.postMessage({ type:'PRECACHE_AUDIO', urls });
    });
  }
  async function clearOffline(){ try{ await caches.delete('snb-audio-v1'); }catch(e){} }

  function screenSettings(){
    clearFigures(); document.body.classList.remove('in-practice');
    currentTab='current';
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    const u=Store.user();
    const ts = (localStorage.getItem('snb_textscale')||'1');
    const rm = (localStorage.getItem('snb_reduce_motion')==='1');
    const th = (localStorage.getItem('snb_theme')||'');
    const hp = (localStorage.getItem('snb_haptics')!=='0');   // on by default
    const offOn = (localStorage.getItem('snb_offline_all')==='1');   // offline download — off by default
    const ps = Store.prefSense(); const psil = Store.prefSilence();
    const segBtn=(group,val,lbl,on)=>`<button type="button" data-${group}="${val}"${on?' class="on"':''}>${lbl}</button>`;
    $('#content').innerHTML = `
      <div class="view settings-view">
        <div class="scr-head">
          <p class="eyebrow"></p>
          <h2 class="scr-h">settings</h2>
        </div>

        <div class="set-rows">
          <div class="row"><span class="k">name</span><input class="name-input" id="nm-val" type="text" value="${escapeHtml(Store.getName())}" placeholder="add your name for a custom feel"></div>
          <div class="row"><span class="k">account</span><span class="val" style="font-weight:400">${escapeHtml(u.email||'on this device')}</span></div>
        </div>

        <div class="hr"></div>

        <div class="set-group">
          <p class="dash-prompt">text size</p>
          <div class="set-seg" id="seg-text">
            ${segBtn('ts','0.92','smaller',ts==='0.92')}${segBtn('ts','1','default',ts==='1')}${segBtn('ts','1.12','larger',ts==='1.12')}
          </div>
        </div>
        <div class="set-group">
          <p class="dash-prompt">motion</p>
          <div class="set-seg" id="seg-motion">
            ${segBtn('rm','0','full',!rm)}${segBtn('rm','1','calm',rm)}
          </div>
        </div>
        <div class="set-group">
          <p class="dash-prompt">haptics</p>
          <div class="set-seg" id="seg-haptics">
            ${segBtn('hp','0','off',!hp)}${segBtn('hp','1','on',hp)}
          </div>
        </div>
        <div class="set-group">
          <p class="dash-prompt">appearance</p>
          <div class="set-seg" id="seg-theme">
            ${segBtn('th','','auto',th==='')}${segBtn('th','light','light',th==='light')}${segBtn('th','dark','dark',th==='dark')}
          </div>
        </div>
        <div class="set-group">
          <p class="dash-prompt">anchoring</p>
          <div class="set-seg" id="seg-sense" style="flex-wrap:wrap">
            ${segBtn('sense','','auto',!ps)}${P_SENSES.map(s=>segBtn('sense',s,s,ps===s)).join('')}
          </div>
        </div>
        <div class="set-group">
          <p class="dash-prompt">silence between guidance</p>
          <div class="set-seg" id="seg-silence" style="flex-wrap:wrap">
            ${segBtn('sil','','auto',psil==null)}${P_SILENCE.map(([v,l])=>segBtn('sil',v,l,psil===v)).join('')}
          </div>
        </div>

        <div class="set-group">
          <p class="dash-prompt">app</p>
          <div class="set-row-inline" id="install-row">${installRowInner()}</div>
        </div>

        <div class="set-group">
          <p class="dash-prompt">offline</p>
          <div class="set-seg" id="seg-offline">
            ${segBtn('off','0','off',!offOn)}${segBtn('off','1','on',offOn)}
          </div>
          <p class="fineprint" id="offline-status" style="margin-top:8px">about 94 mb. best on wi-fi. lets every meditation play without a connection.</p>
          <p class="fineprint" style="margin-top:4px;opacity:.7">on iphone, the system may clear this if the app goes unused for a while. just turn it back on if that happens.</p>
        </div>

        <div class="hr"></div>

        <div class="set-actions">
          <button class="set-quiet" id="export">export your check-ins</button>
          <button class="set-quiet" id="signout">sign out</button>
          <button class="set-quiet" id="reset">reset my data</button>
        </div>
      </div>`;
    const nmVal = $('#nm-val'); if(nmVal) nmVal.addEventListener('change', e=>{ Store.setName(e.target.value.trim()); });
    const segText=$('#seg-text'); if(segText) segText.querySelectorAll('[data-ts]').forEach(b=>b.onclick=()=>{
      localStorage.setItem('snb_textscale', b.dataset.ts); applyPrefs();
      segText.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    const segMot=$('#seg-motion'); if(segMot) segMot.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{
      localStorage.setItem('snb_reduce_motion', b.dataset.rm); applyPrefs();
      segMot.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    const segTh=$('#seg-theme'); if(segTh) segTh.querySelectorAll('[data-th]').forEach(b=>b.onclick=()=>{
      localStorage.setItem('snb_theme', b.dataset.th); applyPrefs();
      segTh.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    const segHp=$('#seg-haptics'); if(segHp) segHp.querySelectorAll('[data-hp]').forEach(b=>b.onclick=()=>{
      localStorage.setItem('snb_haptics', b.dataset.hp); haptic('save');
      segHp.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    const segSense=$('#seg-sense'); if(segSense) segSense.querySelectorAll('[data-sense]').forEach(b=>b.onclick=()=>{
      Store.setPrefSense(b.dataset.sense);
      segSense.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    const segSil=$('#seg-silence'); if(segSil) segSil.querySelectorAll('[data-sil]').forEach(b=>b.onclick=()=>{
      Store.setPrefSilence(b.dataset.sil);
      segSil.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    const irow = $('#install-row'); if(irow){ const ig = irow.querySelector('.in-go'); if(ig) ig.onclick = promptInstall; }
    // offline: bulk download / clear, with an honest iOS-eviction check on render
    const segOff = $('#seg-offline'); const offStatus = $('#offline-status');
    const setOff = (t)=>{ if(offStatus) offStatus.textContent = t; };
    (async ()=>{
      if(localStorage.getItem(OFFLINE_FLAG)==='1'){
        const mani = await offlineManifest(); const have = await offlineCachedCount();
        setOff(mani.length && have>=mani.length ? 'saved for offline ✓' : 'your device cleared the offline copy. turn on to download it again.');
      }
    })();
    let offBusy = false;
    if(segOff) segOff.querySelectorAll('[data-off]').forEach(b=>b.onclick=async ()=>{
      if(offBusy) return;
      const want = b.dataset.off==='1';
      segOff.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
      if(want){
        offBusy = true; haptic('save'); setOff('preparing…');
        const urls = await offlineManifest();
        if(!urls.length){ setOff("couldn't read the practice list. try again."); offBusy=false; return; }
        try{
          const res = await downloadOffline(urls, d=>setOff('saving… '+d.done+'/'+d.total));
          localStorage.setItem(OFFLINE_FLAG,'1');
          try{ if(navigator.storage && navigator.storage.persist) await navigator.storage.persist(); }catch(e){}
          const have = await offlineCachedCount();
          if(res.quota || have < urls.length) setOff("didn't all fit — saved "+have+" of "+urls.length+". free up space and turn on again.");
          else setOff('saved for offline ✓');
        }catch(e){ setOff('download failed. check your connection and try again.'); }
        offBusy = false;
      } else {
        offBusy = true; await clearOffline(); localStorage.removeItem(OFFLINE_FLAG); setOff('offline copy removed.'); offBusy = false;
      }
    });
    $('#export').onclick = ()=>{
      const blob = new Blob([JSON.stringify(Store.checkins(),null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='my-checkins.json'; a.click();
    };
    $('#signout').onclick = async ()=>{ await Store.signOut(); currentTab='today'; route(); };
    $('#reset').onclick = async ()=>{ if(confirm('Clear all your check-ins and practices?')){ await Store.reset(); try{ Object.keys(localStorage).filter(k=>k.startsWith('snb_breath_')).forEach(k=>localStorage.removeItem(k)); }catch(e){} app('today'); } };
  }

  // ---------------------------------------------------------------- delegated nav (trend "see all")
  document.addEventListener('click',(e)=>{ if(e.target && e.target.id==='seeall'){ app('current'); } });

  // ---------------------------------------------------------------- utils
  function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  // user display preferences (text size + motion), persisted and applied app-wide
  function applyPrefs(){
    try{
      const ts = parseFloat(localStorage.getItem('snb_textscale')||'1') || 1;
      document.documentElement.style.setProperty('--type-scale', String(ts));
      document.body.classList.toggle('reduce-motion', localStorage.getItem('snb_reduce_motion')==='1');
      const theme = localStorage.getItem('snb_theme') || '';            // '', 'light', 'dark' ('' follows the system)
      const de = document.documentElement;
      de.classList.toggle('theme-dark', theme==='dark');
      de.classList.toggle('theme-light', theme==='light');
      const dark = theme==='dark' || (theme!=='light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
      const tcm = document.querySelector('meta[name="theme-color"]'); if(tcm) tcm.setAttribute('content', dark ? '#1B1C1E' : '#FAF9F5');
    }catch(e){}
  }
  function relTime(t){ const m=Math.round((Date.now()-t)/60000); if(m<1)return 'just now'; if(m<60)return m+' min ago'; const h=Math.round(m/60); if(h<24)return h+'h ago'; const d=Math.round(h/24); return d+'d ago'; }

  (function(){ const fab=document.getElementById('fab-checkin'); if(fab) fab.addEventListener('click',()=>{ if(Store.user()) screenCheckin(); }); })();
  applyPrefs();
  // light up any triglyph as it enters the DOM: fill eases from the neutral tone into the active
  // axis color(s), so the brand mark settles into your state on each render. Reduce-motion -> instant.
  try{
    const _litTri = ()=>requestAnimationFrame(()=>{ document.querySelectorAll('.triglyph .tg-m[data-col]').forEach(p=>{ if(!p.style.fill) p.style.fill=p.getAttribute('data-col'); }); });
    new MutationObserver((muts)=>{ for(const m of muts){ if(m.addedNodes){ for(const n of m.addedNodes){ if(n.nodeType===1 && (n.classList&&n.classList.contains('triglyph') || (n.querySelector&&n.querySelector('.triglyph')))){ _litTri(); return; } } } } }).observe(document.body,{childList:true,subtree:true});
  }catch(e){}
  try{ if(window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefs); }catch(_){}
  Store.init(route);
})();
