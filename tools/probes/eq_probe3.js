(function () {
  function clean(s){return (s||'').replace(/\s+/g,' ').trim();}
  function safeStr(v, cap){
    var seen=new WeakSet();
    try{
      return JSON.stringify(v, function(k, val){
        if(typeof val==='function') return 'fn';
        if(val&&typeof val==='object'){
          if(seen.has(val)) return undefined;
          seen.add(val);
          // skip obvious react-fiber internals to avoid huge/circular dumps
          if('stateNode' in val||'memoizedProps' in val||'__reactFiber'in val) return undefined;
        }
        return val;
      }).slice(0, cap||180);
    }catch(e){ return null; }
  }
  // Walk React fiber from a DOM node upward, collecting component names and any
  // memoizedProps/State that look like the EQ band model.
  function fiberKey(el){return Object.keys(el).find(function(k){return k.startsWith('__reactFiber$');});}
  function dumpFiber(el, maxUp){
    var fk=fiberKey(el); if(!fk) return {err:'no fiber'};
    var f=el[fk], chain=[];
    for(var i=0;i<maxUp&&f;i++,f=f.return){
      var name=(typeof f.type==='function'?(f.type.displayName||f.type.name):(typeof f.type==='string'?f.type:(f.type&&f.type.displayName)))||'';
      var rec={name:name};
      var mp=f.memoizedProps;
      if(mp&&typeof mp==='object'){
        var keys=Object.keys(mp).filter(function(k){return /band|gain|freq|eq|preset|index|value|param|filter/i.test(k);});
        if(keys.length) rec.props={};
        keys.forEach(function(k){var v=mp[k];rec.props[k]=(typeof v==='function')?'fn':(v&&typeof v==='object')?safeStr(v,160):v;});
      }
      var ms=f.memoizedState;
      // hooks state is a linked list; sample shallow
      if(ms&&typeof ms==='object'&&'memoizedState' in ms){
        var hooks=[],h=ms,c=0;
        while(h&&c<12){var s=h.memoizedState; if(s&&typeof s==='object'){var j=safeStr(s,220);if(j&&/band|gain|freq|eq|preset|filter/i.test(j))hooks.push(j);} h=h.next;c++;}
        if(hooks.length) rec.hooks=hooks;
      }
      if(rec.props||rec.hooks||name) chain.push(rec);
    }
    return chain;
  }

  var gain=[...document.querySelectorAll('input[class*=BandParam]')].find(function(el){
    var pk=Object.keys(el).find(function(k){return k.startsWith('__reactProps$');});
    return pk && /gain/i.test(JSON.stringify(Object.keys(el[pk])) + (el[pk].name||''));
  }) || document.querySelector('input[class*=BandParam]');

  var out={};
  if(gain){
    var pk=Object.keys(gain).find(function(k){return k.startsWith('__reactProps$');});
    var p=gain[pk]||{};
    out.gainInput={value:gain.value};
    out.onChangeSrc=(p.onChange||'').toString().slice(0,300);
    out.onKeyDownSrc=(p.onKeyDown||'').toString().slice(0,300);
    out.onBlurSrc=(p.onBlur||'').toString().slice(0,300);
    out.fiberChain=dumpFiber(gain, 25);
  } else {
    out.err='no BandParam input found';
  }
  // Global store sniff.
  out.globals=Object.keys(window).filter(function(k){return /store|redux|state|__/i.test(k);}).slice(0,20);
  return JSON.stringify(out, null, 1);
})();
