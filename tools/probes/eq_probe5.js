// Probe the EQ parameter ranges by pushing extreme values through the app's own
// setter and reading back what it clamps/quantizes to. Tests on band 0 and
// restores it. Returns the discovered bounds so we can size the new sliders.
(function () {
  function fiberKey(el){return Object.keys(el).find(function(k){return k.startsWith('__reactFiber$');});}
  function findController(){
    var a=document.querySelector('canvas[class*=Graph__Canvas]')||document.querySelector('input[class*=BandParam]');
    if(!a) return null; var fk=fiberKey(a); if(!fk) return null; var f=a[fk];
    for(var i=0;i<40&&f;i++,f=f.return){var mp=f.memoizedProps;
      if(mp&&typeof mp.updateBandMarkerParams==='function'&&Array.isArray(mp.bandMarkers))return mp;}
    return null;
  }
  var c=findController();
  if(!c) return JSON.stringify({err:'EQ controller not found (open the Equalizer screen)'});
  var orig=JSON.parse(JSON.stringify(c.bandMarkers));
  var origIdx=c.currentBandMarkerIdx;
  var wait=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
  function setRead(params){
    var cc=findController();
    if(typeof cc.setCurrentBandMarkerIdx==='function') cc.setCurrentBandMarkerIdx(0);
    cc.updateBandMarkerParams(0, params);
    return wait(220).then(function(){ return findController().bandMarkers[0]; });
  }
  return (async function(){
    var fLow = (await setRead({frequency:1})).frequency;
    var fHigh= (await setRead({frequency:50000})).frequency;
    var qLow = (await setRead({qFactor:0.001})).qFactor;
    var qHigh= (await setRead({qFactor:1000})).qFactor;
    var gLow = (await setRead({gain:-50})).gain;
    var gHigh= (await setRead({gain:50})).gain;
    // step probing: nudge from a known value to see quantization granularity
    var fStepA=(await setRead({frequency:1000})).frequency;
    var fStepB=(await setRead({frequency:1001})).frequency;
    var qStepA=(await setRead({qFactor:1.0})).qFactor;
    var qStepB=(await setRead({qFactor:1.01})).qFactor;
    // restore band 0
    var cc=findController();
    cc.updateBandMarkerParams(0, orig[0]);
    if(typeof cc.setCurrentBandMarkerIdx==='function') cc.setCurrentBandMarkerIdx(origIdx);
    return JSON.stringify({
      gain:{min:gLow,max:gHigh},
      frequency:{min:fLow,max:fHigh, near1000:fStepA, near1001:fStepB},
      qFactor:{min:qLow,max:qHigh, near1_00:qStepA, near1_01:qStepB},
      restoredBand0:findController().bandMarkers[0],
      allFreqs:orig.map(function(b){return b.frequency;})
    }, null, 1);
  })();
})();
