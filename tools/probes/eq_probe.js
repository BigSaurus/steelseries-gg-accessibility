// Deep probe of the SteelSeries EQ screen. Returns the DOM/structural facts we
// need to turn the band graph into real, keyboard-operable sliders:
//   - the EQ container + its SVG/canvas/handle structure
//   - any existing inputs (range/number) that already hold the dB values
//   - React fiber props/handlers on candidate band elements (how a value is set)
//   - data-* attributes and class names that identify bands
// App-agnostic JS; safe read-only inspection.
(function () {
  function clean(s){return (s||'').replace(/\s+/g,' ').trim();}
  function rect(el){var r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};}

  // React fiber digging: find props (esp. event handlers + value-ish fields).
  function fiberProps(el){
    var k=Object.keys(el).find(function(k){return k.startsWith('__reactProps$')||k.startsWith('__reactInternalInstance$')||k.startsWith('__reactФiber');});
    var pk=Object.keys(el).find(function(k){return k.startsWith('__reactProps$');});
    if(!pk) return null;
    var p=el[pk]||{};
    var out={};
    Object.keys(p).forEach(function(name){
      var v=p[name];
      if(typeof v==='function') out[name]='fn';
      else if(v && typeof v==='object') out[name]='{obj}';
      else if(name.toLowerCase().match(/value|min|max|step|band|freq|gain|db|index/)) out[name]=v;
    });
    return out;
  }

  // Locate the EQ region: a container whose text mentions the band names.
  var bands=['SUB BASS','BASS','LOW MIDS','MID RANGE','UPPER MIDS','HIGHS'];
  var all=[...document.querySelectorAll('*')];
  var eqRoot=null;
  for(var i=all.length-1;i>=0;i--){
    var t=clean(all[i].textContent).toUpperCase();
    if(bands.every(function(b){return t.includes(b);}) && clean(all[i].textContent).length<400){
      eqRoot=all[i]; break;
    }
  }
  // Fallback: smallest element containing 'SUB BASS' and 'HIGHS'
  if(!eqRoot){
    var c=all.filter(function(e){var x=clean(e.textContent).toUpperCase();return x.includes('SUB BASS')&&x.includes('HIGHS');});
    eqRoot=c.length?c[c.length-1]:null;
  }

  var report={found:!!eqRoot};
  if(!eqRoot){ report.note='EQ region not found on this page'; return JSON.stringify(report); }

  report.eqRoot={tag:eqRoot.tagName,cls:(eqRoot.className||'').toString().slice(0,60),rect:rect(eqRoot)};

  // Inputs anywhere on the page (range/number/sliders).
  report.inputs=[...document.querySelectorAll('input,[role=slider]')].map(function(el){
    return {tag:el.tagName,type:el.getAttribute('type'),role:el.getAttribute('role'),
      aria:el.getAttribute('aria-label'),val:el.value,min:el.min,max:el.max,step:el.step,
      cls:(el.className||'').toString().slice(0,40),rect:rect(el)};
  });

  // SVG / canvas inside EQ.
  report.svgs=[...eqRoot.querySelectorAll('svg')].map(function(s){
    return {rect:rect(s),childTags:[...s.children].map(function(c){return c.tagName;}).slice(0,12),
      circles:s.querySelectorAll('circle').length,paths:s.querySelectorAll('path').length,
      rects:s.querySelectorAll('rect').length,gs:s.querySelectorAll('g').length};
  });
  report.canvases=[...eqRoot.querySelectorAll('canvas')].map(rect);

  // Candidate band handles: circles in svg, or elements with band-ish data attrs / draggable.
  var handles=[];
  [...eqRoot.querySelectorAll('circle,[draggable=true],[data-index],[class*=handle],[class*=dot],[class*=point],[class*=thumb],[class*=band]')].forEach(function(el){
    handles.push({tag:el.tagName,cls:(el.className&&el.className.baseVal!==undefined?el.className.baseVal:el.className||'').toString().slice(0,40),
      attrs:[...el.attributes].filter(function(a){return /^(data-|cx|cy|r|transform|aria|role|tabindex|draggable)/.test(a.name);}).map(function(a){return a.name+'='+a.value.slice(0,30);}),
      react:fiberProps(el),rect:rect(el)});
  });
  report.handles=handles.slice(0,20);

  // Whole EQ subtree outline (tag.class + short text), capped.
  var outline=[];
  (function walk(el,d){
    if(outline.length>120||d>12) return;
    var txt=clean(el.childNodes.length&&[...el.childNodes].filter(function(n){return n.nodeType===3;}).map(function(n){return n.textContent;}).join(' '));
    outline.push('  '.repeat(d)+el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+
      ((el.className&&el.className.toString())?'.'+el.className.toString().trim().split(/\s+/)[0].slice(0,24):'')+
      (txt?(' "'+txt.slice(0,24)+'"'):''));
    [...el.children].forEach(function(c){walk(c,d+1);});
  })(eqRoot,0);
  report.outline=outline;

  return JSON.stringify(report);
})();
