(function () {
  function clean(s){return (s||'').replace(/\s+/g,' ').trim();}
  function rect(el){var r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}
  function reactProps(el){
    var pk=Object.keys(el).find(function(k){return k.startsWith('__reactProps$');});
    if(!pk) return null;
    var p=el[pk]||{}, out={};
    Object.keys(p).forEach(function(n){
      var v=p[n];
      if(typeof v==='function') out[n]='fn';
      else if(v&&typeof v==='object') out[n]='{obj}';
      else out[n]=v;
    });
    return out;
  }
  function visible(el){var r=el.getBoundingClientRect();return !(r.width===0&&r.height===0)&&el.offsetParent!==null;}
  function nearestLabel(el){
    // climb and look for a band label text nearby
    var node=el;
    for(var i=0;i<10&&node;i++,node=node.parentElement){
      var lbl=node.querySelector&&node.querySelector('[class*=SwitchableLabel__Label],[class*=Label]');
      if(lbl){var t=clean(lbl.textContent);if(t&&t.length<20)return t;}
    }
    return null;
  }

  // 1) All BandParam inputs (gain/freq/Q), visible or not.
  var bandInputs=[...document.querySelectorAll('input[class*=BandParam]')].map(function(el){
    var rp=reactProps(el)||{};
    return {value:el.value, placeholder:el.getAttribute('placeholder'), readOnly:el.readOnly,
      visible:visible(el), rect:rect(el), label:nearestLabel(el),
      reactValue:rp.value, hasOnChange:!!rp.onChange, hasOnBlur:!!rp.onBlur,
      hasOnKeyDown:!!rp.onKeyDown, name:rp.name, unit:rp.unit, min:rp.min, max:rp.max, step:rp.step};
  });

  // 2) Band selector tabs.
  var tabs=[...document.querySelectorAll('[class*=SwitchableLabel__Label]')].map(function(el){
    var p=el.closest('[class*=SwitchableLabelBanner__L],[class*=Item],button,[role]')||el.parentElement;
    return {text:clean(el.textContent), role:p&&p.getAttribute('role'),
      tabindex:p&&p.getAttribute('tabindex'), cursor:getComputedStyle(p||el).cursor,
      cls:(p&&p.className||'').toString().slice(0,40)};
  });

  // 3) The EQ graph: any svg/canvas on the page + big interactive divs.
  var graphs=[];
  [...document.querySelectorAll('svg,canvas')].forEach(function(el){
    var r=el.getBoundingClientRect();
    if(r.width>200&&r.height>80) graphs.push({tag:el.tagName,rect:rect(el),
      circles:el.querySelectorAll?el.querySelectorAll('circle').length:0,
      cls:(el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className||'').toString().slice(0,40)});
  });

  // 4) Count band-param groups: look for container holding the 3 inputs.
  var groups=[...document.querySelectorAll('[class*=BandParam]')].length;

  return JSON.stringify({bandInputs:bandInputs, tabs:tabs, graphs:graphs,
    bandParamEls:groups, totalInputs:document.querySelectorAll('input').length}, null, 1);
})();
