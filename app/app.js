/* ============================================================================
   Stuck Not Broken — app prototype. Vanilla JS, on-device storage, real weaver.
   Screens: auth -> paywall -> [today | current | practice | you] + check-in.
   ========================================================================== */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const root = $('#screen');
  const MARK = 'snb-mark-ink.svg';

  const STATE_COLOR = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].color : '#D8D2C2');
  const STATE_NAME  = (key) => (window.PVCurrent.STATES[key] ? window.PVCurrent.STATES[key].name : 'settling');
  const fmtDay = (t) => new Date(t).toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
  const fmtTime = (t) => new Date(t).toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });

  let liveFigures = []; // current figures to destroy on screen change
  function clearFigures(){ liveFigures.forEach(f=>{try{f.destroy();}catch(e){}}); liveFigures = []; }
  function mountFigure(host, opts){ const f = window.PVCurrent(host, opts); liveFigures.push(f); return f; }

  function setHTML(html){ clearFigures(); root.innerHTML = html; }

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
          <h1 style="margin:10px 0 12px">your nervous system, over time.</h1>
          <p class="lede" style="margin-bottom:24px">check in with where you are, watch your system change, and practice your way back to safety.</p>
          <div class="field"><label for="em">email</label><input id="em" type="email" autocomplete="email" value="${escapeHtml(lastEmail)}"></div>
          <div class="field"><label for="pw">password</label><input id="pw" type="password" autocomplete="${up?'new-password':'current-password'}"></div>
          ${err?`<p class="autherr">${escapeHtml(err)}</p>`:''}
          <button class="btn block" id="go" style="margin-top:8px"${busy?' disabled':''}>${busy?'one moment…':(up?'Create account':'Sign in')}</button>
          <p class="fineprint">${up?'already have an account?':'new here?'} <button class="linkbtn" id="toggle" style="font-size:inherit;padding:2px">${up?'sign in':'create an account'}</button></p>
          ${Store.cloud()?'':'<p class="fineprint" style="margin-top:8px">on-device mode: your sign-in works locally now. cross-device sync turns on once Supabase keys are added in config.js.</p>'}
        </div>
      </div>`);
    if(busy) return;
    $('#toggle').onclick = ()=>{ authMode = up?'in':'up'; screenSignIn(); };
    $('#go').onclick = submit;
    $('#em').addEventListener('input', e=>{ lastEmail=e.target.value; });
    $('#pw').addEventListener('keydown', e=>{ if(e.key==='Enter') submit(); });
    function submit(){
      const email=$('#em').value.trim(), pw=$('#pw').value;
      if(!email || (Store.cloud() && !pw)){ lastEmail=email; screenSignIn('enter your email and a password.'); return; }
      lastEmail=email;
      screenSignIn(null, true);
      Promise.resolve(up ? Store.signUp(email,pw) : Store.signIn(email,pw)).then(res=>{
        if(res && res.error) return screenSignIn(res.error);
        if(res && res.needsConfirm) return screenConfirm(email);
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

  // ---------------------------------------------------------------- app shell
  function app(tab){
    currentTab = tab;
    const u = Store.user();
    setHTML(`
      <header class="appbar">
        <img class="mark" src="${MARK}" alt="Stuck Not Broken">
        <span class="who"></span>
      </header>
      <div class="scroll" id="content"></div>
      <nav class="tabbar" id="tabs">
        ${tabBtn('today','today')}${tabBtn('current','current')}${tabBtn('practice','practice')}${tabBtn('you','you')}
      </nav>`);
    $('#tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>app(b.dataset.t));
    ({ today:tabToday, current:tabCurrent, practice:tabPractice, you:tabYou }[tab] || tabToday)();
  }
  function tabBtn(t,label){ return `<button data-t="${t}" class="${currentTab===t?'on':''}"><span class="lb">${label}</span></button>`; }
  const content = () => $('#content');

  // ---------------------------------------------------------------- TODAY
  function tabToday(){
    const c = content();
    const last = Store.lastCheckin();
    const reco = Store.recommend();
    const hour = new Date().getHours();
    const part = hour<12?'morning':hour<18?'afternoon':'evening';
    c.innerHTML = `
      <div class="view">
        <div class="greeting">
          <p class="eyebrow">${part}</p>
          <h1 style="margin-top:8px">${last ? 'how is your system right now?' : 'let us find your starting point.'}</h1>
        </div>
        <div class="snapshot">
          <div class="figure" id="todayfig"></div>
          <p class="state-name" id="todaystate"></p>
          <p class="readout" id="todayread"></p>
        </div>
        <button class="btn block" id="checkin" style="margin-top:6px">${last ? 'Check in again' : 'Check in'}</button>

        <p class="eyebrow section-label">a practice for now</p>
        ${recoCardHTML(reco)}
        ${trendHTML()}
      </div>`;
    const fig = mountFigure($('#todayfig'), { flow:true });
    if(last){ fig.set({v:last.v,sym:last.sym,dor:last.dor}, false);
      $('#todaystate').textContent = STATE_NAME(last.dom);
      $('#todayread').textContent = `last checked in ${relTime(last.t)}.`;
    } else {
      fig.set({v:.18,sym:.14,dor:.12}, false);
      $('#todaystate').textContent = '';
      $('#todayread').textContent = 'we will tune everything to you once you check in.';
    }
    $('#checkin').onclick = screenCheckin;
    wireReco(reco);
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
      <p class="trend-cap">${dirTxt} <button class="linkbtn" id="seeall" style="font-size:13px">see your current over time →</button></p>`;
  }

  // ---------------------------------------------------------------- CHECK-IN
  function screenCheckin(){
    // pushed full screen (not a tab) — its own view with a back affordance
    let v=18, s=14, d=12;
    setHTML(`
      <header class="appbar">
        <button class="linkbtn" id="back" style="margin-left:-2px">← today</button>
        <span class="who">checking in</span>
      </header>
      <div class="scroll"><div class="view" style="padding-top:14px">
        <p class="eyebrow">notice, do not measure</p>
        <h2 style="margin:8px 0 4px">how present is each, right now?</h2>
        <p class="muted" style="font-size:14.5px;margin-bottom:6px">there is no wrong answer. just move each toward how it feels.</p>

        <div class="checkin-figure"><div id="cfig"></div></div>
        <p class="readout" id="cread" style="margin-bottom:18px"></p>

        <div class="sliders">
          ${sliderHTML('v','safety','ventral · settled, connected','r-v',v)}
          ${sliderHTML('sym','fight or flight','sympathetic · charged, mobilized','r-sym',s)}
          ${sliderHTML('dor','shutdown','dorsal · heavy, far away','r-dor',d)}
        </div>
        <p class="muted" style="font-size:13px;margin-top:12px">when fight or flight and shutdown rise together, the figure turns toward freeze on its own.</p>

        <button class="btn block" id="save" style="margin-top:22px">Save this check-in</button>
        <div style="height:10px"></div>
      </div></div>`);
    const fig = mountFigure($('#cfig'), { flow:true });
    const amt = x => x<12?'barely':x<35?'a little':x<65?'some':x<88?'a lot':'fully';
    function refresh(){
      fig.set({v:v/100,sym:s/100,dor:d/100});
      $('#cread').textContent = window.PVCurrent.readoutOf(v/100, s/100, d/100);
      $('#av').textContent=amt(v); $('#asym').textContent=amt(s); $('#ador').textContent=amt(d);
    }
    bindSlider('v', val=>{v=val;refresh();});
    bindSlider('sym', val=>{s=val;refresh();});
    bindSlider('dor', val=>{d=val;refresh();});
    refresh();
    $('#back').onclick = ()=>app('today');
    $('#save').onclick = ()=>{
      Store.addCheckin({ v:v/100, sym:s/100, dor:d/100 });
      app('today');
    };
  }
  function sliderHTML(key,name,sub,cls,val){
    return `<div class="slider">
      <div class="top"><span class="nm">${name}<span class="sub">${sub}</span></span><span class="amt" id="a${key}"></span></div>
      <input type="range" class="${cls}" id="sl-${key}" min="0" max="100" value="${val}">
    </div>`;
  }
  function bindSlider(key,fn){ const el=$('#sl-'+key); el.addEventListener('input',()=>fn(+el.value)); }

  // ---------------------------------------------------------------- CURRENT OVER TIME
  let playTimer=null;
  function tabCurrent(){
    const c = content();
    const cs = Store.checkins();
    if(cs.length < 2){
      c.innerHTML = `<div class="view"><div class="empty">
        <p class="lede">your current over time will live here.</p>
        <p class="muted">check in a couple of times and you will start to see your system move.</p>
        <button class="btn" id="goci">Check in</button></div></div>`;
      $('#goci').onclick = screenCheckin; return;
    }
    c.innerHTML = `
      <div class="view">
        <p class="eyebrow">your polyvagal current</p>
        <h2 style="margin:8px 0 10px">how your system has moved.</h2>
        <div class="timeline-figure"><div id="tlfig"></div></div>
        <p class="state-name" id="tlstate" style="text-align:center"></p>
        <div class="playbar">
          <button class="playbtn" id="play" aria-label="Play"><svg viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 Z"/></svg></button>
          <div class="scrub"><input type="range" id="scrub" min="0" max="${cs.length-1}" value="${cs.length-1}"></div>
          <span class="when" id="when"></span>
        </div>
        <div class="river" id="river">${cs.map(c2=>`<div class="seg" style="background:${STATE_COLOR(c2.dom)}" title="${STATE_NAME(c2.dom)}"></div>`).join('')}</div>
        <div class="river-cap"><span>${fmtDay(cs[0].t)}</span><span>${fmtDay(cs[cs.length-1].t)}</span></div>
        ${legendHTML(cs)}
      </div>`;
    const fig = mountFigure($('#tlfig'), { flow:true });
    const scrub = $('#scrub');
    function show(i){
      const c2 = cs[i];
      fig.set({v:c2.v,sym:c2.sym,dor:c2.dor});
      $('#tlstate').textContent = STATE_NAME(c2.dom) + ' · ' + fmtDay(c2.t);
      $('#when').textContent = fmtTime(c2.t);
      scrub.value = i;
    }
    show(cs.length-1);
    scrub.addEventListener('input',()=>{ stopPlay(); show(+scrub.value); });
    $('#play').onclick = ()=>{
      if(playTimer){ stopPlay(); return; }
      let i = (+scrub.value >= cs.length-1) ? 0 : +scrub.value;
      $('#play').innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4.4" height="14" rx="2"/><rect x="13.6" y="5" width="4.4" height="14" rx="2"/></svg>';
      show(i);
      playTimer = setInterval(()=>{
        i++;
        if(i>cs.length-1){ stopPlay(); return; }
        show(i);
      }, 1100);
    };
    function stopPlay(){ if(playTimer){ clearInterval(playTimer); playTimer=null; } const p=$('#play'); if(p) p.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 6 L18 12 L8 18 Z"/></svg>'; }
  }
  function legendHTML(cs){
    const present = [...new Set(cs.map(c=>c.dom))];
    return `<div class="statelegend">${present.map(k=>`<span class="it"><span class="dot" style="background:${STATE_COLOR(k)}"></span>${STATE_NAME(k)}</span>`).join('')}</div>`;
  }

  // ---------------------------------------------------------------- PRACTICE
  function tabPractice(){
    const c = content();
    const reco = Store.recommend();
    c.innerHTML = `
      <div class="view">
        <p class="eyebrow">a guided practice</p>
        <h2 style="margin:8px 0 10px">woven for where you are.</h2>
        <p class="lede" style="margin-bottom:16px">each practice is built in the moment from short pieces, with the silence you choose between them. start with what is recommended, or shape your own.</p>
        ${recoCardHTML(reco)}
        <p class="eyebrow section-label">or choose another</p>
        <div id="picks"></div>
        <p class="eyebrow section-label" style="margin-top:18px">more meditations</p>
        <div id="morepicks"></div>
      </div>`;
    wireReco(reco);
    const picks = $('#picks');
    [['mindfulness','the gentlest place to start.'],
     ['anchoring','settle into safety through a sense.'],
     ['most','meet what is hard, knowing you can come back.']].forEach(([k,desc])=>{
      const row = document.createElement('div');
      row.className='row'; row.style.cursor='pointer';
      row.innerHTML = `<div><div class="val">${Store.practiceLabel(k)}</div><div class="k">${desc}</div></div><span style="color:var(--link)">→</span>`;
      row.onclick = ()=>launchWeaver({ practiceKey:k, skill:k==='most'?(Store.learned().favSkill||'imagery'):null, sense:Store.learned().favSense||'touch', silence:8, domBefore: (Store.lastCheckin()||{}).dom||null });
      picks.appendChild(row);
    });
    const more = $('#morepicks');
    [['uye','Use Your Ears','grounding through sound'],
     ['eye','Use Your Eyes','grounding through sight'],
     ['daily-dysregulation','Daily Dysregulation','meeting a recent activation'],
     ['outside-the-cave','Outside the Cave','a deeper imagery journey']].forEach(([id,title,desc])=>{
      const row = document.createElement('div');
      row.className='row'; row.style.cursor='pointer';
      row.innerHTML = `<div><div class="val">${title}</div><div class="k">${desc}</div></div><span style="color:var(--link)">→</span>`;
      row.onclick = ()=>launchPack(id, title);
      more.appendChild(row);
    });
  }

  function launchWeaver(reco){
    const p = new URLSearchParams({ embed:'1', autostart:'1', practice:reco.practiceKey, sense:reco.sense||'touch', silence:String(reco.silence||8) });
    if(reco.skill) p.set('skill', reco.skill);
    setHTML(`
      <header class="appbar">
        <button class="linkbtn" id="back" style="margin-left:-2px">← exit practice</button>
        <span class="who">${Store.practiceLabel(reco.practiceKey)}</span>
      </header>
      <div class="weaver-wrap">
        <iframe class="weaver-frame" id="weaver" src="practice.html?${p.toString()}" title="Guided practice"></iframe>
      </div>`);
    $('#back').onclick = ()=>{ logSession(reco, false, true); app('today'); };
    window._pendingReco = reco;
  }

  // launch a standalone "More meditations" session (Ears / Eyes / Daily / Cave)
  function launchPack(packId, label){
    const p = new URLSearchParams({ embed:'1', autostart:'1', pack:packId });
    setHTML(`
      <header class="appbar">
        <button class="linkbtn" id="back" style="margin-left:-2px">← exit practice</button>
        <span class="who">${escapeHtml(label)}</span>
      </header>
      <div class="weaver-wrap">
        <iframe class="weaver-frame" id="weaver" src="practice.html?${p.toString()}" title="Guided practice"></iframe>
      </div>`);
    const reco = { practiceKey:'more', skill:null, sense:null, silence:null, pack:packId, domBefore:(Store.lastCheckin()||{}).dom||null };
    $('#back').onclick = ()=>{ logSession(reco, false, true); app('today'); };
    window._pendingReco = reco;
  }

  // weaver -> app messages
  window.addEventListener('message', (e)=>{
    const m = e.data || {};
    if(m.type !== 'snb-weaver') return;
    const reco = window._pendingReco;
    if(!reco) return;
    if(m.event === 'complete'){ logSession(reco, true, false, m.minutes); afterSession(reco, true); }
    else if(m.event === 'exit'){ logSession(reco, false, true, m.minutes); }
  });
  function logSession(reco, completed, endedEarly, minutes){
    if(window._sessionLogged) return; window._sessionLogged=true;
    Store.addSession({ practiceKey:reco.practiceKey, skill:reco.skill, sense:reco.sense, silence:reco.silence,
      completed:!!completed, endedEarly:!!endedEarly, minutes:minutes||null, domBefore:reco.domBefore||null });
    setTimeout(()=>{ window._sessionLogged=false; }, 1000);
  }
  function afterSession(reco, completed){
    setHTML(`
      <div class="view gate">
        <div class="gate-body" style="text-align:center">
          <p class="eyebrow">that is complete</p>
          <h1 style="margin:12px 0 12px">you came back.</h1>
          <p class="lede" style="margin-bottom:26px">however that felt, you showed up for your system. want to notice where you are now?</p>
          <button class="btn block" id="post" style="margin-bottom:12px">Check in now</button>
          <button class="btn quiet block" id="home">Back to today</button>
        </div>
      </div>`);
    $('#post').onclick = screenCheckin;
    $('#home').onclick = ()=>app('today');
  }

  // ---------------------------------------------------------------- YOU
  function tabYou(){
    const c = content();
    const u = Store.user();
    const L = Store.learned();
    const cs = Store.checkins();
    c.innerHTML = `
      <div class="view">
        <p class="eyebrow">you</p>
        <h2 style="margin:8px 0 14px">your patterns</h2>
        <div class="stats">
          <div class="stat"><span class="big">${cs.length}</span><span class="lbl">check-ins</span></div>
          <div class="stat"><span class="big">${L.sessionsDone}</span><span class="lbl">practices</span></div>
        </div>
        ${L.sessionsDone>0 ? `<p class="muted" style="font-size:14.5px;margin-top:4px">the app is learning your patterns${L.favPractice?`. lately you return to <b style="font-weight:500;color:var(--ink-80)">${Store.practiceLabel(L.favPractice)}</b>`:''}${L.favSense?`, anchored through <b style="font-weight:500;color:var(--ink-80)">${L.favSense}</b>`:''}.</p>`:''}
        <div class="hr"></div>
        <div class="row"><span class="k">account</span><span class="val" style="font-weight:400">${escapeHtml(u.email||'on this device')}</span></div>
        <div class="row"><span class="k">sync</span><span class="val" style="font-weight:400">${Store.cloud()?'across your devices':'this device only'}</span></div>
        <div class="row"><span class="k">your check-ins</span><button class="linkbtn" id="export">export as a file</button></div>
        <div class="hr"></div>
        <button class="linkbtn" id="signout">sign out</button>
        <div style="height:8px"></div>
        <button class="linkbtn" id="reset" style="color:var(--muted)">reset my data</button>
      </div>`;
    $('#export').onclick = ()=>{
      const blob = new Blob([JSON.stringify(Store.checkins(),null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='my-checkins.json'; a.click();
    };
    $('#signout').onclick = async ()=>{ await Store.signOut(); currentTab='today'; route(); };
    $('#reset').onclick = async ()=>{ if(confirm('Clear all your check-ins and practices?')){ await Store.reset(); app('today'); } };
  }

  // ---------------------------------------------------------------- delegated nav (trend "see all")
  document.addEventListener('click',(e)=>{ if(e.target && e.target.id==='seeall'){ app('current'); } });

  // ---------------------------------------------------------------- utils
  function escapeHtml(s){ return (s||'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function relTime(t){ const m=Math.round((Date.now()-t)/60000); if(m<1)return 'just now'; if(m<60)return m+' min ago'; const h=Math.round(m/60); if(h<24)return h+'h ago'; const d=Math.round(h/24); return d+'d ago'; }

  Store.init(route);
})();
