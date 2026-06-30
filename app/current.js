/* ============================================================================
   Polyvagal Current — three-input figure
   Justin Sunseri's model, adapted so each of the three autonomic circuits has
   its own input (ventral / sympathetic / dorsal). The single "safety influence"
   slider of the canonical component becomes three independent presences; the
   blend states (play / stillness / freeze) emerge when two circuits co-activate,
   exactly as the model intends. Meaning-bearing palette — never decorative.

   createCurrent(mountEl, {flow:true, labels:true}) -> {
     set({v,sym,dor}[, animate]),   // 0..1 each
     dominant(),                    // {key,name,color}
     readout(),                     // gentle present-tense sentence
     destroy()
   }
   ========================================================================== */
(function (global) {
  const BASE = { yellow: '#F4D58D', red: '#E89B9B', blue: '#A3C0DD' };
  const MIX  = { play: '#E8A871', stillness: '#9FC498', freeze: '#B89AC4' };

  // The six states, each defined by how the three circuits combine.
  // weight() returns 0..1 strength of that state given circuit presences.
  const STATES = {
    stillness:   { name: 'stillness',     color: MIX.stillness, weight: (v,s,d) => Math.min(v, d) * (1 - s) },
    safety:      { name: 'safety',        color: BASE.yellow,   weight: (v,s,d) => v * (1 - s) * (1 - d) },
    play:        { name: 'play',          color: MIX.play,      weight: (v,s,d) => Math.min(v, s) * (1 - d) },
    fightflight: { name: 'flight/fight',color: BASE.red,     weight: (v,s,d) => s * (1 - v) * (1 - d) },
    freeze:      { name: 'freeze',        color: MIX.freeze,    weight: (v,s,d) => Math.min(s, d) * (1 - v) },
    shutdown:    { name: 'shutdown',      color: BASE.blue,     weight: (v,s,d) => d * (1 - v) * (1 - s) },
  };

  // Gentle, present-tense, never-an-identity readouts (brand guardrail #4/#5).
  const READOUTS = {
    stillness:   'your system is resting in stillness right now. safe enough to be still.',
    safety:      'your system is leaning toward safety right now.',
    play:        'there is safety here, with some charge moving through. this is play.',
    fightflight: 'there is a lot of mobilizing energy moving right now. flight/fight.',
    freeze:      'a lot is moving and holding still at once right now. this is freeze.',
    shutdown:    'your system is pulling toward shutdown right now. it is protecting you.',
    neutral:     'notice where your system is right now. there is no wrong answer.',
  };

  function hexToRgb(h){const n=parseInt(h.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
  function rgbToHex(a){return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');}
  function lerpColor(c1,c2,t){if(t<=0)return c1;if(t>=1)return c2;const a=hexToRgb(c1),b=hexToRgb(c2);return rgbToHex([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]);}
  const lerp=(a,b,t)=>a+(b-a)*t;

  const SVG_NS='http://www.w3.org/2000/svg';
  function el(tag,attrs){const e=document.createElementNS(SVG_NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);return e;}

  function createCurrent(mount, opts){
    opts = opts || {};
    const showLabels = opts.labels !== false;
    const wantFlow = opts.flow !== false && !matchMedia('(prefers-reduced-motion: reduce)').matches;

    const svg = el('svg',{viewBox:'0 0 900 330'});
    svg.style.width='100%';svg.style.height='auto';svg.style.overflow='visible';svg.style.display='block';

    const defs = el('defs');
    function grad(id,x1,x2){
      const g=el('linearGradient',{id,gradientUnits:'userSpaceOnUse',x1,y1:150,x2,y2:150});
      [['0%','0'],['10%','1'],['90%','1'],['100%','0']].forEach(([o,op])=>{
        g.appendChild(el('stop',{offset:o,'stop-opacity':op}));
      });
      return g;
    }
    const gBR=grad('app-grad-br',150,450), gRY=grad('app-grad-ry',450,750);
    defs.appendChild(gBR);defs.appendChild(gRY);svg.appendChild(defs);

    const flowG=el('g',{fill:'none','stroke-width':6,'stroke-linecap':'round'});
    const xBR=[el('path',{d:'M 150,70 C 250,70 350,230 450,230',stroke:'url(#app-grad-br)'}),
               el('path',{d:'M 450,70 C 350,70 250,230 150,230',stroke:'url(#app-grad-br)'})];
    const xRY=[el('path',{d:'M 750,230 C 650,230 550,70 450,70',stroke:'url(#app-grad-ry)'}),
               el('path',{d:'M 450,230 C 550,230 650,70 750,70',stroke:'url(#app-grad-ry)'})];
    xBR.forEach(p=>{p.style.strokeDasharray='14 18';flowG.appendChild(p);});
    xRY.forEach(p=>{p.style.strokeDasharray='14 18';flowG.appendChild(p);});
    const cB=el('path',{d:'M 150,70 A 80 80 0 0 1 150,230 A 80 80 0 0 1 150,70',stroke:BASE.blue});
    const cR=el('path',{d:'M 450,70 A 80 80 0 0 0 450,230 A 80 80 0 0 0 450,70',stroke:BASE.red});
    const cY=el('path',{d:'M 750,70 A 80 80 0 0 1 750,230 A 80 80 0 0 1 750,70',stroke:BASE.yellow});
    [cY,cR,cB].forEach(c=>{c.style.strokeDasharray='14 18';flowG.appendChild(c);});
    svg.appendChild(flowG);

    if(showLabels){
      const lg=el('g',{'text-anchor':'middle'});
      [['dorsal',150],['sympathetic',450],['ventral',750]].forEach(([t,x])=>{
        const tx=el('text',{x,y:285});tx.textContent=t;
        tx.setAttribute('font-size','13');tx.setAttribute('letter-spacing','0.12em');
        tx.setAttribute('fill',(getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()||'#5E5A4E'));tx.style.textTransform='uppercase';
        lg.appendChild(tx);
      });
      svg.appendChild(lg);
    }
    mount.appendChild(svg);

  // ---- shared animation epoch so all instances stay in phase ----
    const KF=[{strokeDashoffset:0},{strokeDashoffset:-32}];
    const OPTS={duration:1600,iterations:Infinity,easing:'linear'};
    const DUR={yellow:1600,red:550,blue:3600};
    let anims=null;
    if(wantFlow && cY.animate){
      if(!global._pvEpoch) global._pvEpoch=performance.now();
      const elapsed=performance.now()-global._pvEpoch;
      function syncTime(a,realDur){a.currentTime=(elapsed%realDur)*(1600/realDur);}
      anims={
        y:cY.animate(KF,OPTS), r:cR.animate(KF,OPTS), b:cB.animate(KF,OPTS),
        br:xBR.map(p=>p.animate(KF,OPTS)), ry:xRY.map(p=>p.animate(KF,OPTS)),
      };
      anims.y.updatePlaybackRate(1600/DUR.yellow); syncTime(anims.y,DUR.yellow);
      anims.r.updatePlaybackRate(1600/DUR.red);    syncTime(anims.r,DUR.red);
      anims.b.updatePlaybackRate(1600/DUR.blue);   syncTime(anims.b,DUR.blue);
      const brDur=(DUR.blue+DUR.red)/2, ryDur=(DUR.red+DUR.yellow)/2;
      anims.br.forEach(a=>{a.updatePlaybackRate(1600/brDur);syncTime(a,brDur);});
      anims.ry.forEach(a=>{a.updatePlaybackRate(1600/ryDur);syncTime(a,ryDur);});
    }

    // ---- state ----
    let cur={v:0,sym:0,dor:0};         // displayed (eased) values
    let target={v:0,sym:0,dor:0};
    let raf=null;

    function paint(v,s,d){
      // circle presences
      const py=Math.max(v, Math.min(v,s), Math.min(v,d));
      const pr=Math.max(s, Math.min(v,s), Math.min(s,d));
      const pb=Math.max(d, Math.min(v,d), Math.min(s,d));
      // blends
      const playMix=Math.min(1,Math.min(v,s)*1.4);
      const stillMix=Math.min(1,Math.min(v,d)*1.4);
      const freezeMix=Math.min(1,Math.min(s,d)*1.4);
      const yC=lerpColor(lerpColor(BASE.yellow,MIX.play,playMix),MIX.stillness,stillMix);
      const rC=lerpColor(lerpColor(BASE.red,MIX.play,playMix),MIX.freeze,freezeMix);
      const bC=lerpColor(lerpColor(BASE.blue,MIX.stillness,stillMix),MIX.freeze,freezeMix);
      cY.style.stroke=yC;cR.style.stroke=rC;cB.style.stroke=bC;
      setStops(gBR,bC,rC);setStops(gRY,rC,yC);
      pres(cY,py,9.5);pres(cR,pr,8.5);pres(cB,pb,9.5);
      const brOp=lerp(0.18,1,Math.max(pb,pr)), ryOp=lerp(0.18,1,Math.max(pr,py));
      xBR.forEach(e=>e.style.strokeOpacity=brOp);
      xRY.forEach(e=>e.style.strokeOpacity=ryOp);
      // dorsal "behind plexiglas" desaturation when shutdown dominates
      const shut=d*(1-v)*(1-s);
      flowG.style.filter=`saturate(${lerp(1,0.82,shut)})`;
      if(anims){const drag=1+shut*0.6;anims.y.updatePlaybackRate(1600/(DUR.yellow*drag));anims.r.updatePlaybackRate(1600/(DUR.red*drag));}
    }
    function pres(c,p,peak){c.style.strokeOpacity=lerp(0.3,1,p);c.style.strokeWidth=lerp(6,peak,p);}
    function setStops(g,l,r){const s=g.querySelectorAll('stop');s[0].setAttribute('stop-color',l);s[1].setAttribute('stop-color',l);s[2].setAttribute('stop-color',r);s[3].setAttribute('stop-color',r);}

    function tick(){
      let moving=false;
      ['v','sym','dor'].forEach(k=>{const dx=target[k]-cur[k];if(Math.abs(dx)>0.001){cur[k]+=dx*0.16;moving=true;}else cur[k]=target[k];});
      paint(cur.v,cur.sym,cur.dor);
      if(moving)raf=requestAnimationFrame(tick);else raf=null;
    }

    function set(vals,animate){
      target={v:clamp(vals.v),sym:clamp(vals.sym),dor:clamp(vals.dor)};
      if(animate===false){cur={...target};paint(cur.v,cur.sym,cur.dor);return;}
      if(!raf)raf=requestAnimationFrame(tick);
    }
    function clamp(x){return Math.max(0,Math.min(1,x||0));}

    function dominant(){
      let best={key:'neutral',name:'',color:'#D8D2C2',w:0};
      for(const k in STATES){const w=STATES[k].weight(cur.v,cur.sym,cur.dor);if(w>best.w)best={key:k,name:STATES[k].name,color:STATES[k].color,w};}
      if(best.w<0.06)return {key:'neutral',name:'settling',color:'#D8D2C2',w:0};
      return best;
    }
    function readout(){const d=dominant();return READOUTS[d.key]||READOUTS.neutral;}

    paint(0,0,0);
    return {set,dominant,readout,destroy(){if(raf)cancelAnimationFrame(raf);mount.removeChild(svg);}};
  }

  // expose state metadata for other screens (timeline colors, names)
  createCurrent.STATES = STATES;
  createCurrent.dominantOf = function(v,s,d){
    let best={key:'neutral',name:'settling',color:'#D8D2C2',w:0};
    for(const k in STATES){const w=STATES[k].weight(v,s,d);if(w>best.w)best={key:k,name:STATES[k].name,color:STATES[k].color,w};}
    return best.w<0.06?{key:'neutral',name:'settling',color:'#D8D2C2',w:0}:best;
  };

  // readout computed directly from values (not the figure's eased state) — so
  // callers get the correct sentence the instant inputs change, with no lag.
  createCurrent.readoutOf = function(v,s,d){
    const dom = createCurrent.dominantOf(v,s,d);
    return READOUTS[dom.key] || READOUTS.neutral;
  };

  global.PVCurrent = createCurrent;
})(window);
