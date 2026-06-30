(function () {
  // Find the fiber whose memoizedProps expose the EQ control functions.
  function fiberKey(el){return Object.keys(el).find(function(k){return k.startsWith('__reactFiber$');});}
  var anyInput=document.querySelector('input[class*=BandParam]') ||
               document.querySelector('canvas[class*=Graph__Canvas]');
  if(!anyInput) return JSON.stringify({err:'no EQ anchor element'});
  var fk=fiberKey(anyInput); if(!fk) return JSON.stringify({err:'no fiber'});
  var f=anyInput[fk], found=null;
  for(var i=0;i<40&&f;i++,f=f.return){
    var mp=f.memoizedProps;
    if(mp&&typeof mp==='object'&&typeof mp.updateBandMarkerParams==='function'&&Array.isArray(mp.bandMarkers)){
      found=mp; break;
    }
  }
  if(!found) return JSON.stringify({err:'EQ controller props not found'});

  // Expose the live controller on window for the injection layer to reuse.
  window.__ssEQ = {
    get props(){ return found; },
    bandMarkers: found.bandMarkers,
    update: found.updateBandMarkerParams,
    setIdx: found.setCurrentBandMarkerIdx,
    currentIdx: found.currentBandMarkerIdx
  };

  return JSON.stringify({
    bandCount: found.bandMarkers.length,
    bandMarkers: found.bandMarkers,
    currentBandMarkerIdx: found.currentBandMarkerIdx,
    updateSrc: (found.updateBandMarkerParams||'').toString().slice(0,500),
    setIdxSrc: (found.setCurrentBandMarkerIdx||'').toString().slice(0,300),
    filterTypeOptions: found.filterTypeOptions,
    disabledDefaults: found.disabledBandmarkerDefaultValues
  }, null, 1);
})();
