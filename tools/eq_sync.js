(function () {
  // ---- Idempotent accessible-EQ sync for SteelSeries GG (parametric EQ) ----
  // Safe to run repeatedly (the injector daemon evaluates it on a poll):
  //   * EQ present, no panel      -> build the 10 band-gain sliders
  //   * EQ present, panel present -> re-sync values from the live model
  //                                  (skips the slider you're currently editing)
  //   * EQ absent                 -> remove a stale panel
  // Each slider drives the app's own setCurrentBandMarkerIdx + updateBandMarkerParams.

  var PANEL_ID = 'ss-a11y-eq-panel';
  var GAIN_MIN = -12, GAIN_MAX = 12, STEP = 1, BIGSTEP = 3;

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
  function freqLabel(hz){ return hz>=1000 ? ((hz/1000)+' kHz').replace('.0',' ') : (hz+' Hz'); }
  function gainText(g){ var r=Math.round(g*10)/10; return (r>0?'+':'')+r+' dB'; }

  var ctrl = findController();
  var panel = document.getElementById(PANEL_ID);

  if(!ctrl){ if(panel) panel.remove(); return JSON.stringify({eq:false}); }

  if(panel){
    // re-sync displayed values from the live model, but never clobber the
    // slider the user is currently focused on / editing.
    var active = document.activeElement;
    panel.querySelectorAll('[role=slider][data-idx]').forEach(function(s){
      if(s===active) return;
      var b = ctrl.bandMarkers[+s.dataset.idx];
      if(!b) return;
      s.setAttribute('aria-valuenow', b.gain);
      var lab = s.getAttribute('data-label');
      s.setAttribute('aria-valuetext', lab + ', ' + gainText(b.gain));
      s.textContent = gainText(b.gain);
    });
    return JSON.stringify({eq:true, state:'present', bands:panel.querySelectorAll('[role=slider]').length});
  }

  // ---- build ----
  var bands = ctrl.bandMarkers;
  panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.setAttribute('role','region');
  panel.setAttribute('aria-label','Accessible Equalizer');
  panel.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;'+
    'background:#11141a;color:#fff;border-bottom:2px solid #ff5b22;'+
    'padding:8px 12px;font:13px sans-serif;display:flex;gap:6px;align-items:flex-end;flex-wrap:wrap;';
  var h = document.createElement('h2');
  h.textContent = 'Accessible Equalizer';
  h.style.cssText = 'font-size:13px;margin:0 10px 0 0;align-self:center;color:#ff5b22;';
  panel.appendChild(h);

  function makeSlider(idx){
    var band = bands[idx];
    var lab = freqLabel(band.frequency);
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;min-width:58px;';
    var s = document.createElement('div');
    s.setAttribute('role','slider');
    s.setAttribute('tabindex','0');
    s.setAttribute('aria-label', lab + ' band gain');
    s.setAttribute('aria-valuemin', GAIN_MIN);
    s.setAttribute('aria-valuemax', GAIN_MAX);
    s.dataset.idx = idx;
    s.dataset.label = lab;
    s.style.cssText = 'width:46px;height:34px;background:#222936;border:1px solid #3a4456;'+
      'border-radius:5px;display:flex;align-items:center;justify-content:center;'+
      'color:#fff;font-weight:600;cursor:ns-resize;outline-offset:2px;';
    function render(g){
      s.setAttribute('aria-valuenow', g);
      s.setAttribute('aria-valuetext', lab + ', ' + gainText(g));
      s.textContent = gainText(g);
    }
    function currentGain(){ var c=findController(); var b=c&&c.bandMarkers[idx]; return b?b.gain:band.gain; }
    render(currentGain());
    function setGain(g){
      g = Math.max(GAIN_MIN, Math.min(GAIN_MAX, g));
      var c = findController();
      if(c){ try {
        if(typeof c.setCurrentBandMarkerIdx==='function') c.setCurrentBandMarkerIdx(idx);
        c.updateBandMarkerParams(idx, {gain: g});
      } catch(e){} }
      render(g);
    }
    s.addEventListener('focus', function(){ render(currentGain()); });
    s.addEventListener('keydown', function(ev){
      var g = parseFloat(s.getAttribute('aria-valuenow'))||0, handled=true;
      switch(ev.key){
        case 'ArrowUp': case 'ArrowRight': setGain(g+STEP); break;
        case 'ArrowDown': case 'ArrowLeft': setGain(g-STEP); break;
        case 'PageUp': setGain(g+BIGSTEP); break;
        case 'PageDown': setGain(g-BIGSTEP); break;
        case 'Home': setGain(GAIN_MAX); break;
        case 'End': setGain(GAIN_MIN); break;
        case 'Delete': case 'Backspace': setGain(0); break;
        default: handled=false;
      }
      if(handled){ ev.preventDefault(); ev.stopPropagation(); }
    });
    wrap.appendChild(s);
    var cap = document.createElement('div');
    cap.setAttribute('aria-hidden','true');
    cap.textContent = lab;
    cap.style.cssText = 'font-size:10px;color:#9aa4b5;margin-top:2px;';
    wrap.appendChild(cap);
    return wrap;
  }
  for(var i=0;i<bands.length;i++) panel.appendChild(makeSlider(i));
  document.body.appendChild(panel);
  return JSON.stringify({eq:true, state:'built', bands:bands.length});
})();
