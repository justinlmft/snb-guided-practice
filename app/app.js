/* ============================================================================
   Stuck Not Broken — app prototype. Vanilla JS, on-device storage, real weaver.
   Screens: auth -> paywall -> [today | current | practice | you] + check-in.
   ========================================================================== */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const root = $('#screen');
  let _toastT=null;
  function showToast(msg){ let t=document.getElementById('app-toast'); if(!t){ t=document.createElement('div'); t.id='app-toast'; t.className='app-toast'; document.body.appendChild(t); } t.textContent=msg; t.classList.add('on'); clearTimeout(_toastT); _toastT=setTimeout(()=>t.classList.remove('on'),1900); }
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

  const STATE_COLOR = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].color : '#D8D2C2');
  const STATE_NAME  = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].name : 'settling');

  // The three brand marks ARE the three nervous-system axes. heart=safety,
  // bolt=fight-or-flight, x=shutdown. One vocabulary across check-in, you-tab, feedback.
  const AXIS_ICON = {
    v:   { icon:'heart', state:'safety',      sub:'settled, connected' },
    sym: { icon:'bolt',  state:'fightflight', sub:'charged, mobilized' },
    dor: { icon:'x',     state:'shutdown',    sub:'heavy, far away' },
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
          <p class="lede" style="margin-bottom:24px">check in on how you feel, watch what shifts over time, and practice your way back to steadier ground.</p>
          <div class="field"><label for="em">email</label><input id="em" type="email" autocomplete="email" value="${escapeHtml(lastEmail)}"></div>
          ${up ? '<div class="field"><label for="nm">your name <span style="color:var(--muted);font-weight:400">(optional)</span></label><input id="nm" type="text" autocomplete="name"></div>' : ''}
          <div class="field"><label for="pw">password</label><input id="pw" type="password" autocomplete="${up?'new-password':'current-password'}"></div>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="go" style="margin-top:8px"${busy?' disabled':''}>${busy?'one moment…':(up?'Create account':'Sign in')}</button>
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
        <button class="btn block" id="back2">Back to sign in</button>
      </div></div>`);
    $('#back2').onclick=()=>{ authMode='in'; screenSignIn(); };
  }
  // In-app reader for the create-account disclaimers. Back returns to the
  // create-account screen (authMode='up'), never into the main app.
  function screenPolicy(which){
    const isPriv = which==='privacy';
    const eyebrow = isPriv ? 'privacy policy' : 'terms of use';
    const title = isPriv ? 'what we keep, and what we don’t.' : 'how to hold this app.';
    const lede = isPriv
      ? 'plain language, because you’re trusting us with something tender.'
      : 'a few honest notes before you begin.';
    const sections = isPriv ? [
      ['what we keep','your email, and the check-ins, notes, and practice you create. nothing more.'],
      ['why','so your account works, and your history is here on every device you sign in from.'],
      ['who sees it','only you. we don’t sell your data, and we don’t share it with advertisers.'],
      ['your control','you can ask us to delete your account and everything in it, any time.']
    ] : [
      ['what this is','a tool for noticing your nervous system and practicing your way back to safety. it isn’t medical care, diagnosis, or therapy.'],
      ['in a crisis','if you’re in danger or thinking about harming yourself, contact the 988 Suicide &amp; Crisis Lifeline or your local emergency services. this app can’t help in an emergency.'],
      ['be gentle','every nervous system is different. there’s no failing here, and no streak to keep.'],
      ['changes','we may update the app and these terms over time. we’ll keep it working, and tell you about anything that matters.']
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
  function app(tab){
    currentTab = tab;
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
    document.body.classList.remove('show-fab');
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
        if(hero){ hero.classList.add('is-done'); hero.style.transition='opacity 1s ease'; hero.style.opacity='0.48'; }
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
  function renderWin(k, s){
    const { done, last, reco } = s;
    if(k==='breath'){
      const faded = done && !repeatBreath;
      const title = faded ? 'one breath taken' : (Store.getName() ? 'take one intentional breath, '+escapeHtml(Store.getName())+'.' : 'take one intentional breath.');
      return `
        <button class="breathhero${faded?' is-done':''}" data-win="breath"${faded ? ' style="opacity:.5"' : ''}>
          <span class="bh-stage">
            <span class="wc-ring" id="tring" aria-hidden="true"><span class="t-core"></span></span>
          </span>
          <span class="bh-rowwrap">
            <span class="bh-phase" id="bh-phase" aria-live="polite"></span>
            <span class="bh-row">
              <span class="wc-text">
                <span class="wc-kicker">one breath</span>
                <span class="bh-title" id="breathlabel">${title}</span>
                <span class="bh-hint" id="breathhint" style="${faded?'opacity:0':'opacity:1'}">tap the ring to begin</span>
              </span>
            </span>
          </span>
        </button>`;
    }
    if(k==='checkin'){
      const seg = segOf(Date.now());
      return `
        <button class="wincard ${done?'done':''}" data-win="checkin">
          <span class="wc-text">
            <span class="wc-kicker">${done ? 'checked in' : seg+' check-in'}</span>
            <span class="wc-title">${done ? `${STATE_NAME(last.dom)} · this ${segLabel(segOf(last.t))}` : `how's your ${segPoss(seg)}?`}</span>
          </span>
          <span class="wc-go">${CHEV}</span>
        </button>`;
    }
    return `
      <button class="wincard practice-row ${done?'done':''}" id="practice-main-btn">
        <span class="wc-text">
          <span class="wc-kicker">recommended practice</span>
          <span class="wc-title">${Store.practiceLabel(reco.practiceKey)}</span>
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
      `${name}'s back.`,
      `good ${seg}, ${name}.`,
      `welcome back, ${name}.`,
      `there you are, ${name}.`,
      `glad you're here, ${name}.`,
      `hello again, ${name}.`,
      `you made it back, ${name}.`,
      `settle in, ${name}.`
    ] : [
      `hi again.`,
      `welcome back.`,
      `good ${seg}.`,
      `there you are.`,
      `you made it back.`,
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
    const r = FromJustin.today();
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
        ? `<button class="wincard from-card" id="open-refl"><span class="wc-text"><span class="wc-kicker">for you</span><span class="wc-fj-text">${escapeHtml(r.text)}</span></span><span class="wc-go">${CHEV}</span></button>`
        : `<div class="wincard from-card from-card-static"><span class="wc-text"><span class="wc-kicker">for you</span><span class="wc-fj-text">${escapeHtml(r.text)}</span></span></div>`
      ) : ''}
    </div>`;
    const breathBtn  = c.querySelector('[data-win="breath"]');  if(breathBtn)  breathBtn.onclick  = winAction('breath', reco);
    const checkinBtn = c.querySelector('[data-win="checkin"]'); if(checkinBtn) checkinBtn.onclick = winAction('checkin', reco);
    const mainBtn    = c.querySelector('#practice-main-btn');   if(mainBtn)    mainBtn.onclick    = winAction('practice', reco);
    const reflBtn = c.querySelector('#open-refl'); if(reflBtn) reflBtn.onclick = screenReflectionDeep;
  }

  function screenReflectionDeep(){
    const note = FromJustin.today();
    const last = Store.lastCheckin();
    const cs   = Store.checkins();
    const paced = groupByDay(cs);

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
    const lead = note ? `<p style="font-size:16px;line-height:1.65;color:var(--ink-80);text-wrap:pretty;margin:0 0 4px">${escapeHtml(note.text)}</p>` : '';

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
      bodyHTML = `${lead}${P('Check in a few times and a more personal summary will show up here.')}`;
    }

    setHTML(`
      <header class="appbar"><button class="backbtn" id="deep-back">today</button></header>
      <div class="scroll">
        <div class="view read" style="gap:0">
          <p class="eyebrow" style="margin-bottom:10px">for you</p>
          ${bodyHTML}
        </div>
      </div>`);
    $('#deep-back').onclick = ()=>app('today');
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
        <button class="btn" id="startreco">Begin this practice</button>
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
    settle:  'just settle. we’ll stay with what already feels okay and not reach for anything hard.',
    gentle:  'a light touch. we’ll glance toward something tender, then come back to safe.',
    meet:    'meet it. we’ll stay a little longer with what’s hard, with safety kept close. good on a day you’ve got some room.',
    stretch: 'stretch. we’ll turn toward the harder thing on purpose, staying connected to safety. best when you’ve got safety to spare.',
  };
  // short labels for the segmented control (the nuance lives in the caption below)
  const CH_SHORT = { settle:'settle', gentle:'gentle', meet:'meet', stretch:'stretch' };

  function screenCheckin(){
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    root.innerHTML = `
      <header class="appbar"></header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('practice','practice')}${tabBtn('current','you')}
      </nav>`;
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));

    let v=18, s=14, d=12, ch=0.65;
    const seg = segPoss(segOf(Date.now()));
    $('#content').innerHTML = `<div class="view checkin2">

        <div class="scr-head">
          <p class="eyebrow"></p>
          <h2 class="scr-h">how is your system showing up this ${seg}?</h2>
        </div>

        <div class="ci-block">
          <div class="sliders">
            ${sliderHTML('v','safety','settled, connected','r-v',v)}
            ${sliderHTML('sym','fight or flight','charged, mobilized','r-sym',s)}
            ${sliderHTML('dor','shutdown','heavy, far away','r-dor',d)}
          </div>
          <p class="ci-readout" id="ci-readout"></p>
        </div>

        <div class="ci-block ci-challenge">
          <p class="dash-prompt">how far do you want to go today?</p>
          <div class="ch-seg" id="ch-seg">
            ${CH_LEVELS.map(l=>`<button class="ch-opt${l.v===ch?' on':''}" type="button" data-ch="${l.v}" data-chkey="${l.key}">${CH_SHORT[l.key]||l.label}</button>`).join('')}
          </div>
          <p class="ch-cap" id="ch-cap"></p>
        </div>

        <div class="actionbar"><button class="btn block" id="save">Save check-in</button></div>
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
    setCap('meet');
    $('#ch-seg').querySelectorAll('.ch-opt').forEach(b=>b.onclick=()=>{
      ch = +b.dataset.ch;
      $('#ch-seg').querySelectorAll('.ch-opt').forEach(x=>x.classList.toggle('on', x===b));
      setCap(b.dataset.chkey);
    });

    $('#save').onclick = ()=>{
      Store.addCheckin({ v:v/100, sym:s/100, dor:d/100, challenge:ch });
      FromJustin.refresh();
      app('current');
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
    lineSvg=`<path d="${areaPath}" fill="url(#cline)" opacity=".1"></path><path d="${linePath}" fill="none" stroke="url(#cline)" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"></path>`;
    if(mode==='safety'){
      footer=`<div class="arc-scale"><span>less safety</span><span class="arc-scale-bar"></span><span>more</span></div>`;
      readoutTxt=`${last.label} \u00b7 ${Math.round(last.avg*100)}% safety`;
    } else {
      const states=[...new Set(B.map(b=>b.dom))];
      footer=`<div class="legend">${states.map(k=>`<span class="lg-it">${stateMarks(k)}${STATE_NAME(k)}</span>`).join('')}</div>`;
      readoutTxt=`${last.label} \u00b7 ${STATE_NAME(last.dom)}`;
    }
    return `<div class="arc-readout" id="chart-readout">${readoutTxt}</div><svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet">${defs}${lineSvg}${dots}${labs.join('')}</svg>${footer}`;
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
        <p class="map-lede">three states move through everyone. none of them is wrong.</p>
        <div class="map-rows">${teach}</div>
        <p class="map-foot">check in twice and your own pattern starts to show here.</p>
        <button class="btn" id="goci">Check in</button></div></div>`;
      $('#goci').onclick = screenCheckin; return;
    }

    const avg = a => a.length ? a.reduce((s,v)=>s+v,0)/a.length : 0;
    const domOf = arr => { const m={}; arr.forEach(x=>{m[x.dom]=(m[x.dom]||0)+1;}); const e=Object.entries(m).sort((a,b)=>b[1]-a[1])[0]; return e?e[0]:null; };

    function render(){
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
          <span class="distrow-top"><span class="distrow-name">${stateMarks(key)}${STATE_NAME(key)}</span><span class="distrow-pct">${pct}%</span></span>
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
        dayByDay=`<p class="panel-empty">a few more days of check-ins and your timeline fills in here.</p>`;
      } else {
        const minT=paced[0].t, maxT=paced[paced.length-1].t, spanD=(maxT-minT)/864e5;
        const unit = spanD>75?'month': spanD>21?'week':'day';
        const keyOf=(t)=>{ const d=new Date(t); if(unit==='month') return d.getFullYear()+'-'+d.getMonth(); if(unit==='week'){ const o=new Date(d); o.setHours(0,0,0,0); o.setDate(o.getDate()-o.getDay()); return o.getTime(); } return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate(); };
        const labOf=(t)=>{ const d=new Date(t); return unit==='month'?d.toLocaleDateString(undefined,{month:'short'}):d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); };
        const bmap=new Map();
        paced.forEach(p=>{ const k=keyOf(p.t); if(!bmap.has(k)) bmap.set(k,{t:p.t,vs:[],dom:{}}); const bb=bmap.get(k); bb.vs.push(p.v); bb.dom[p.dom]=(bb.dom[p.dom]||0)+1; });
        arcBuckets=[...bmap.values()].sort((a,b)=>a.t-b.t).map(b=>({t:b.t, label:labOf(b.t), avg:b.vs.reduce((s,v)=>s+v,0)/b.vs.length, dom:Object.entries(b.dom).sort((x,y)=>y[1]-x[1])[0][0]}));
        dayByDay=`<div class="chart-toggle"><button class="ct-btn${chartMode==='safety'?' on':''}" type="button" data-mode="safety">safety</button><button class="ct-btn${chartMode==='states'?' on':''}" type="button" data-mode="states">states</button></div><div id="chart-host">${chartInner(chartMode, arcBuckets, safetyColor)}</div>`;
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
        if(diff>=4){ good=true; verdict=`yes, your safety runs ${diff} points higher on the days you practice.`; }
        else if(diff<=-4){ verdict=`you tend to reach for practice on your harder days, that's a good thing, not a setback.`; }
        else { verdict=`about even so far. keep going, the pattern takes time to show.`; }
        helpHTML=`
          <div class="help-bars">
            <div class="help-row"><span class="help-lbl">practice days</span><span class="help-track"><span class="help-fill" style="width:${onP}%;background:var(--s-safety)"></span></span><span class="help-pct">${onP}%</span></div>
            <div class="help-row"><span class="help-lbl">other days</span><span class="help-track"><span class="help-fill" style="width:${offP}%;background:var(--hairline)"></span></span><span class="help-pct">${offP}%</span></div>
          </div>`;
      }

      const SHARE_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 14V4"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M5 12v7h14v-7"/></svg>';
      const shareBtn=(k)=>`<button class="panel-share" type="button" data-share="${k}" aria-label="Share this card">${SHARE_ICON}</button>`;
      c.innerHTML=`
        <div class="view play-view">
          <div class="filter-bar">
            <div class="play-filter seg">
              ${PERIODS.map(p=>`<button class="period-pill${activePeriod===p.key?' on':''}" data-period="${p.key}">${p.label}</button>`).join('')}
            </div>
            <button class="set-gear ci-add" id="add-ci" type="button" aria-label="new check in" title="new check in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></button>
            <button class="set-gear" id="set-btn" type="button" aria-label="settings" title="settings">${GEAR_SVG}</button>
          </div>

          <div class="carousel" id="carousel">
            <section class="panel">
              ${shareBtn('safety')}<p class="panel-title">your safety</p>
              <p class="panel-sub">how much safe-and-social your system held, on average</p>
              <div class="safety-wrap${rising?' rising':''}" id="safety-wrap">
                <div class="safety-num"><span class="safety-num-val">${safetyPct}</span><span class="pct">%</span></div>
                <div class="safety-trend ${dir}">${dir==='rising'?'and rising \u2191':dir==='falling'?'and dipping \u2193':'and steady'}</div>
              </div>
              <div class="safety-meter"><span class="safety-meter-fill" style="width:${safetyPct}%"></span></div>
              ${topState?`<p class="safety-foot">most often in ${stateMarks(topState)}<b>${STATE_NAME(topState)}</b></p>`:''}
              <p class="safety-range">ranged ${loPct}% to ${hiPct}% across ${cs.length} check-ins</p>
              ${rising?'<p class="bloom-line">your system is finding more safety.</p>':''}
            </section>

            <section class="panel">
              ${shareBtn('mix')}<p class="panel-title">your mix</p>
              <p class="panel-sub">where your check-ins landed${periodTxt==='all time'?', all time':', over '+periodTxt}</p>
              <div class="dist-bars">${mixHTML}</div>
            </section>

            <section class="panel">
              ${shareBtn('day')}<p class="panel-title">day by day</p>
              <p class="panel-sub">your safety over time. the line rises and deepens with more safety. tap a point to see it.</p>
              ${dayByDay}
            </section>

            <section class="panel">
              ${shareBtn('practice')}<p class="panel-title">does practice help?</p>
              <p class="panel-sub">your average safety on the days you practice vs. the days you don't</p>
              ${helpHTML}
            </section>
          </div>

          <div class="dots" id="dots">${[0,1,2,3].map(i=>`<span class="dot-i${i===0?' on':''}"></span>`).join('')}</div>

          <div class="deep">
            <div class="deep-block">
              <p class="deep-h">time of day</p>
              ${['morning','afternoon','evening','late'].map(seg=>{ const sub=cs.filter(x=>segOf(x.t)===seg); const k=domOf(sub); return `<div class="deep-row"><span class="deep-lbl">${segLabel(seg)}</span><span class="deep-val">${k?`<span class="dv-n" style="opacity:.4;font-size:11px;margin-right:6px">${sub.length}</span><span class="deep-tap" data-state-detail="${k}" style="cursor:pointer">${stateMarks(k)}</span>`:'<span class="deep-none">\u2014</span>'}</span></div>`; }).join('')}
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
          <p class="deep-hint" style="font-size:11px;opacity:.5;text-align:center;margin:6px 0 2px">tap a symbol to learn what it means</p>
          <div class="ystats">
            <div class="ystat"><span class="ys-n">${Store.checkins().length}</span><span class="ys-l">check-ins</span></div>
            <div class="ystat"><span class="ys-n">${Store.learned().sessionsDone}</span><span class="ys-l">practices</span></div>
          </div>
        </div>`;

      function stopPlay(){ if(playTimer){ clearInterval(playTimer); playTimer=null; } const p=$('#ot-play'); if(p) p.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 Z"/></svg>'; }

      c.querySelectorAll('.period-pill').forEach(b=>b.addEventListener('click',()=>{ stopPlay(); const cv=$('#carousel'); const sl=cv?cv.scrollLeft:0; activePeriod=b.dataset.period; render(); const nv=$('#carousel'); if(nv){ nv.scrollLeft=sl; const i=Math.round(sl/(nv.clientWidth||1)); c.querySelectorAll('#dots .dot-i').forEach((d,j)=>d.classList.toggle('on',j===i)); } }));
      const setBtn=$('#set-btn'); if(setBtn) setBtn.onclick=screenSettings;
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
    fightflight: { headline:'fight or flight',color:'#E89B9B', about:"Fight or flight is sympathetic energy without enough safety yet. Your body picked up danger and mobilized to handle it. Flight first, the urge to escape, anxiety. Then fight, the urge to push back, anger. It's protection, not a flaw, even when it spills onto people you care about.", whenDrops:"Move a little on purpose, a short walk, shake out your hands, push your palms against a wall. Give the energy somewhere to go, then name the feeling under it. A long, slow exhale helps too.", practice:{practiceKey:'anchoring',sense:'movement',silence:8} },
    shutdown:    { headline:'shutdown',       color:'#A3C0DD', about:"Shutdown is the oldest brake your body has, heavy, flat, far away. Your system powered down to protect you when things got to be too much. A lot of what gets called depression is the body in shutdown. It isn't weakness, and it isn't who you are.", whenDrops:"Very small, very low demand. One sip of water, a dimmer light, one thing you can see or hear right now. You don't force your way out of shutdown. You add a little safety, and the body lets some energy come back.", practice:{practiceKey:'mindfulness',sense:'touch',silence:8} },
    play:        { headline:'play',           color:'#E8A871', about:"Play is safety and energy at the same time, the social, mobilized kind shared with people you trust. On your own, the same drive shows up as motivation. It's the same fuel as fight or flight, with safety mixed in, so it runs as creativity and drive instead of defense.", whenDrops:"If the safety thins and the energy stays, watch for the tip toward fight or flight. Keep a little safety in the mix, slow down enough to feel it, and aim the energy at one thing that matters.", practice:{practiceKey:'anchoring',sense:'touch',silence:8} },
    stillness:   { headline:'stillness',      color:'#9FC498', about:"Stillness is the body slowed and quiet, without fear. The same powering-down as shutdown, but with safety mixed in, so it restores instead of collapses. On your own it's stillness; shared with someone safe, it's intimacy. A deeply regulated state.", whenDrops:"If the quiet starts to feel flat or heavy or scared instead of restful, that's the cue to add a small bit of safety, not to force yourself up and out.", practice:{practiceKey:'anchoring',sense:'sound',silence:8} },
    freeze:      { headline:'freeze',         color:'#B89AC4', about:"Freeze is a mixed state, fight-or-flight energy held down by shutdown. Gas and brake at once. It isn't a deeper shutdown, it's both pedals down, which is why it can feel panicked and paralyzed at the same time. A braced, protective state, not nothing.", whenDrops:"The smallest movement, plus a cue of safety. Let your eyes go where they want, then wiggle your toes or roll your wrists, slow. Don't force it, that adds gas to a slammed brake. Get smaller and safer.", practice:{practiceKey:'most',skill:'pendulation',sense:'touch',silence:8} },
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
          <span class="sd-marks">${stateMarks(key)}</span>
          <h2 class="scr-h">${escapeHtml(d.headline)}</h2>
        </div>
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
      return nm ? 'a steady place to begin, '+escapeHtml(nm)+'.' : 'a steady place to begin.';
    }
    const map = {
      safety:      'you checked in with real safety. here is a way to use it.',
      play:        'there is safety with some charge today. let us point it somewhere kind.',
      stillness:   'you are settled and still. a quiet practice to match.',
      fightflight: 'a lot of energy is moving. let us help it settle.',
      shutdown:    'things feel heavy right now. nothing to push against, just a little safety.',
      freeze:      'held and braced today. we will start with the smallest movement.',
    };
    return map[last.dom] || 'a practice shaped to where you are.';
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
  function renderPlan(reco){
    clearFigures(); document.body.classList.remove('in-practice'); document.body.classList.remove('show-fab');
    currentTab = 'practice';
    const tk = trackOf(reco.practiceKey);
    const planNm = Store.getName();
    const planTitle = planNm ? `${escapeHtml(planNm)}’s custom practice` : 'your custom practice';
    const chLabel = reco.challenge!=null ? Store.challengeLabel(reco.challenge) : null;
    // the customized items used to be a separate key/value list; they now live inside
    // "what to expect" as track-colored tokens woven into the sentence.
    const hl = (s)=>`<span class="plan-hl">${escapeHtml(String(s))}</span>`;
    const shapeBits = [
      (reco.practiceKey!=='mindfulness' && reco.sense) ? `anchored through ${hl(reco.sense)}` : null,
      reco.skill ? `practicing ${hl(skillLabel(reco.skill))}` : null,
      `with ${hl(silLabel(reco.silence))} silence between guidance`,
      chLabel ? `meeting you at ${hl(chLabel)}` : null,
    ].filter(Boolean);
    const joinList = (a)=> a.length<=1 ? (a[0]||'') : a.slice(0,-1).join(', ')+' and '+a[a.length-1];
    const shapedSentence = shapeBits.length ? `tuned for you, ${joinList(shapeBits)}.` : '';
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
        <p class="dash-prompt">why this, for you</p>
        <p class="plan-why">${escapeHtml(reco.reason)}</p>
      </div>
      <div class="plan-sec">
        <p class="dash-prompt">what to expect</p>
        <p class="plan-about">${escapeHtml(aboutOf(reco.practiceKey, reco.sense))}</p>
        ${shapedSentence?`<p class="plan-about plan-shaped">${shapedSentence}</p>`:''}
      </div>
      <div class="plan-actions">
        <button class="set-quiet actionbar-aux" id="plan-change">change this practice</button>
        <button class="btn block" id="plan-begin">Begin</button>
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
        <button class="btn block" id="p-begin"${canBegin?'':' disabled'}>Begin</button>
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
    if(m.event === 'complete'){ logSession(reco, true, false, m.minutes); renderFeedback(reco); }
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
      more:    { h:'something opened up.',           s:"that's worth noticing." },
      same:    { h:'you showed up.',                 s:'that counts more than it feels like.' },
      less:    { h:'you stayed with it.',            s:"that's not nothing." },
      struggle:{ h:'hard ones are still practice.',  s:"you're still here." },
      unsure:  { h:'not knowing is allowed.',        s:'you still showed up.' },
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
          <button class="btn block" id="fb-checkin">do a full check-in</button>
          <button class="navlink" id="fb-home" style="align-self:center">back to today</button>
        </div>
      </div></div>`);
    requestAnimationFrame(()=>{ const s=root.querySelector('.settle'); if(s) s.classList.add('on'); });
    $('#fb-checkin').onclick = screenCheckin;
    $('#fb-home').onclick = ()=>app('today');
  }

  // ---------------------------------------------------------------- YOU
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
    const ps = Store.prefSense(); const psil = Store.prefSilence();
    const segBtn=(group,val,lbl,on)=>`<button type="button" data-${group}="${val}"${on?' class="on"':''}>${lbl}</button>`;
    $('#content').innerHTML = `
      <div class="view settings-view">
        <div class="scr-head">
          <p class="eyebrow"></p>
          <h2 class="scr-h">settings</h2>
        </div>

        <div class="set-rows">
          <div class="row"><span class="k">name</span><input class="name-input" id="nm-val" type="text" value="${escapeHtml(Store.getName())}" placeholder="add your name"></div>
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
    const segSense=$('#seg-sense'); if(segSense) segSense.querySelectorAll('[data-sense]').forEach(b=>b.onclick=()=>{
      Store.setPrefSense(b.dataset.sense);
      segSense.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    });
    const segSil=$('#seg-silence'); if(segSil) segSil.querySelectorAll('[data-sil]').forEach(b=>b.onclick=()=>{
      Store.setPrefSilence(b.dataset.sil);
      segSil.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
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
    }catch(e){}
  }
  function relTime(t){ const m=Math.round((Date.now()-t)/60000); if(m<1)return 'just now'; if(m<60)return m+' min ago'; const h=Math.round(m/60); if(h<24)return h+'h ago'; const d=Math.round(h/24); return d+'d ago'; }

  (function(){ const fab=document.getElementById('fab-checkin'); if(fab) fab.addEventListener('click',()=>{ if(Store.user()) screenCheckin(); }); })();
  applyPrefs();
  Store.init(route);
})();
