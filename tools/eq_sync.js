(function () {
  // ---- Idempotent accessible parametric-EQ panel for SteelSeries GG ----
  // Per band: Enable, Gain, Frequency, Q sliders + Filter-type select. Each
  // drives the app's own setCurrentBandMarkerIdx + updateBandMarkerParams.
  // The app does NO bounds-checking, so we clamp to sane ranges here.
  // Safe to run repeatedly (the injector daemon evaluates it on a poll):
  //   EQ + no panel -> build · EQ + panel -> resync values · no EQ -> remove.

  var PANEL_ID = 'ss-a11y-eq-panel';
  var DEFAULT_FREQS = [32,64,125,250,500,1000,2000,4000,8000,16000];
  var DEFAULT_Q = 1.414;
  var GAIN = { min:-12, max:12, step:1, big:3 };
  var FREQ = { min:20, max:20000, semitone:Math.pow(2,1/12), third:Math.pow(2,1/3) };
  var Q    = { min:0.3, max:10, step:0.1, big:0.5 };
  var FILTERS = [
    {v:1,label:'Peaking'}, {v:2,label:'Low Pass'}, {v:3,label:'High Pass'},
    {v:4,label:'Low Shelf'}, {v:5,label:'High Shelf'}, {v:6,label:'Notch'}
  ];

  function fiberKey(el){return Object.keys(el).find(function(k){return k.startsWith('__reactFiber$');});}
  function findController(){
    var a = document.querySelector('canvas[class*=Graph__Canvas]') ||
            document.querySelector('input[class*=BandParam]');
    if(!a) return null; var fk = fiberKey(a); if(!fk) return null; var f = a[fk];
    for(var i=0;i<40&&f;i++,f=f.return){
      var mp = f.memoizedProps;
      if(mp && typeof mp==='object' && typeof mp.updateBandMarkerParams==='function' && Array.isArray(mp.bandMarkers))
        return mp;
    }
    return null;
  }
  function clamp(v,lo,hi){ return Math.max(lo, Math.min(hi, v)); }
  function fmtGain(g){ var r=Math.round(g*10)/10; return (r>0?'+':'')+r+' dB'; }
  function fmtFreq(f){ f=Math.round(f); return f>=1000 ? ((Math.round(f/100)/10)+' kHz') : (f+' Hz'); }
  function fmtQ(q){ return 'Q '+(Math.round(q*100)/100); }
  function filterLabel(v){ for(var i=0;i<FILTERS.length;i++) if(FILTERS[i].v===v) return FILTERS[i].label; return 'Peaking'; }

  function set(idx, params){
    var c = findController();
    if(!c) return;
    try {
      if(typeof c.setCurrentBandMarkerIdx==='function') c.setCurrentBandMarkerIdx(idx);
      c.updateBandMarkerParams(idx, params);
    } catch(e){}
  }
  function band(idx){ var c=findController(); return c && c.bandMarkers[idx]; }

  var ctrl = findController();
  var panel = document.getElementById(PANEL_ID);
  if(!ctrl){ if(panel) panel.remove(); return JSON.stringify({eq:false}); }

  // ---------- resync existing panel (don't rebuild / don't steal focus) ----------
  if(panel){
    var active = document.activeElement;
    panel.querySelectorAll('[data-idx][data-param]').forEach(function(el){
      if(el===active) return;
      var b = band(+el.dataset.idx); if(!b) return;
      var p = el.dataset.param;
      if(el.getAttribute('role')==='slider'){
        var val = p==='gain'? b.gain : p==='frequency'? b.frequency : b.qFactor;
        var txt = p==='gain'? fmtGain(b.gain) : p==='frequency'? fmtFreq(b.frequency) : fmtQ(b.qFactor);
        el.setAttribute('aria-valuenow', Math.round(val*100)/100);
        el.setAttribute('aria-valuetext', el.dataset.bandlabel+' '+txt);
        el.textContent = txt;
      } else if(el.tagName==='SELECT'){
        el.value = String(b.filterType);
      } else if(el.type==='checkbox'){
        el.checked = !!b.enabled;
      }
    });
    return JSON.stringify({eq:true, state:'present'});
  }

  // ---------- build ----------
  var bands = ctrl.bandMarkers;
  panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('role','region');
  panel.setAttribute('aria-label','Accessible Equalizer');
  panel.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;'+
    'background:#11141a;color:#fff;border-bottom:2px solid #ff5b22;padding:6px 10px;'+
    'font:12px sans-serif;display:flex;gap:4px;align-items:stretch;flex-wrap:nowrap;'+
    'overflow-x:auto;max-height:42vh;';
  var h = document.createElement('h2');
  h.textContent = 'Accessible EQ';
  h.style.cssText = 'font-size:12px;margin:0 8px 0 0;align-self:center;color:#ff5b22;writing-mode:vertical-rl;transform:rotate(180deg);';
  panel.appendChild(h);

  function slider(idx, param, bandLabel){
    var b = bands[idx];
    var s = document.createElement('div');
    s.setAttribute('role','slider');
    s.setAttribute('tabindex','0');
    s.dataset.idx = idx; s.dataset.param = param; s.dataset.bandlabel = bandLabel;
    var cfg = param==='gain'?GAIN:param==='frequency'?FREQ:Q;
    s.setAttribute('aria-valuemin', cfg.min);
    s.setAttribute('aria-valuemax', cfg.max);
    var pname = param==='gain'?'gain':param==='frequency'?'frequency':'Q';
    s.setAttribute('aria-label', bandLabel+' '+pname);
    s.style.cssText = 'width:56px;height:24px;background:#222936;border:1px solid #3a4456;'+
      'border-radius:4px;display:flex;align-items:center;justify-content:center;'+
      'color:#fff;font-weight:600;cursor:ns-resize;outline-offset:2px;margin:1px 0;';

    function cur(){ var bb=band(idx); var v=bb?(param==='gain'?bb.gain:param==='frequency'?bb.frequency:bb.qFactor):0; return v; }
    function render(v){
      var txt = param==='gain'?fmtGain(v):param==='frequency'?fmtFreq(v):fmtQ(v);
      s.setAttribute('aria-valuenow', Math.round(v*100)/100);
      s.setAttribute('aria-valuetext', bandLabel+' '+txt);
      s.textContent = txt;
    }
    function apply(v){
      if(param==='gain') v=clamp(v,GAIN.min,GAIN.max);
      else if(param==='frequency') v=clamp(Math.round(v),FREQ.min,FREQ.max);
      else v=clamp(Math.round(v*100)/100,Q.min,Q.max);
      var params={}; params[param]=v; set(idx, params); render(v);
    }
    function step(dir, big){
      // read the last displayed value (DOM), not the model — the React snapshot
      // lags during rapid keypresses, which would swallow repeats.
      var v=parseFloat(s.getAttribute('aria-valuenow')); if(isNaN(v)) v=cur();
      if(param==='gain') apply(v + dir*(big?GAIN.big:GAIN.step));
      else if(param==='frequency') apply(v * Math.pow(big?FREQ.third:FREQ.semitone, dir));
      else apply(v + dir*(big?Q.big:Q.step));
    }
    render(cur());
    s.addEventListener('focus', function(){ render(cur()); });
    s.addEventListener('keydown', function(ev){
      var handled=true;
      switch(ev.key){
        case 'ArrowUp': case 'ArrowRight': step(+1,false); break;
        case 'ArrowDown': case 'ArrowLeft': step(-1,false); break;
        case 'PageUp': step(+1,true); break;
        case 'PageDown': step(-1,true); break;
        case 'Home': apply(cfg.max); break;
        case 'End': apply(cfg.min); break;
        case 'Delete': case 'Backspace':
          apply(param==='gain'?0:param==='frequency'?DEFAULT_FREQS[idx]:DEFAULT_Q); break;
        default: handled=false;
      }
      if(handled){ ev.preventDefault(); ev.stopPropagation(); }
    });
    return s;
  }

  function caption(text){
    var c=document.createElement('div'); c.setAttribute('aria-hidden','true');
    c.textContent=text; c.style.cssText='font-size:9px;color:#9aa4b5;text-align:center;';
    return c;
  }

  for(var i=0;i<bands.length;i++){
    (function(idx){
      var bandLabel = 'Band '+(idx+1);
      var col = document.createElement('div');
      col.setAttribute('role','group');
      col.setAttribute('aria-label', bandLabel);
      col.style.cssText='display:flex;flex-direction:column;align-items:center;min-width:60px;gap:1px;border-left:1px solid #2a3140;padding:0 3px;';

      var head=document.createElement('div'); head.setAttribute('aria-hidden','true');
      head.textContent=bandLabel; head.style.cssText='font-size:10px;color:#ff5b22;font-weight:700;';
      col.appendChild(head);

      // enable checkbox
      var enWrap=document.createElement('label');
      enWrap.style.cssText='display:flex;align-items:center;gap:2px;font-size:9px;color:#9aa4b5;';
      var en=document.createElement('input'); en.type='checkbox';
      en.dataset.idx=idx; en.dataset.param='enabled';
      en.setAttribute('aria-label', bandLabel+' enabled');
      en.checked=!!bands[idx].enabled;
      en.addEventListener('change', function(){ set(idx,{enabled:en.checked}); });
      enWrap.appendChild(en); enWrap.appendChild(document.createTextNode('on'));
      col.appendChild(enWrap);

      col.appendChild(slider(idx,'gain',bandLabel));   col.appendChild(caption('gain'));
      col.appendChild(slider(idx,'frequency',bandLabel)); col.appendChild(caption('freq'));
      col.appendChild(slider(idx,'qFactor',bandLabel)); col.appendChild(caption('Q'));

      // filter type select
      var sel=document.createElement('select');
      sel.dataset.idx=idx; sel.dataset.param='filterType';
      sel.setAttribute('aria-label', bandLabel+' filter type');
      sel.style.cssText='width:58px;font-size:9px;background:#222936;color:#fff;border:1px solid #3a4456;border-radius:3px;';
      FILTERS.forEach(function(ft){
        var o=document.createElement('option'); o.value=ft.v; o.textContent=ft.label; sel.appendChild(o);
      });
      sel.value=String(bands[idx].filterType);
      sel.addEventListener('change', function(){ set(idx,{filterType:+sel.value}); });
      col.appendChild(sel); col.appendChild(caption('type'));

      panel.appendChild(col);
    })(i);
  }
  document.body.appendChild(panel);
  return JSON.stringify({eq:true, state:'built', bands:bands.length, params:['enabled','gain','frequency','qFactor','filterType']});
})();
