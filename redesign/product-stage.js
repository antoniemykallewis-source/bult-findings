/* Authentic product photographs in a CSS perspective scene. Not a synthetic 360 scan. */
(() => {
 'use strict';
 const stage=document.getElementById('product-scene');
 const object=document.getElementById('physical-product');
 const toggle=document.getElementById('view-product');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let x=0,y=-9,pack=true;
 function angle(){object.style.setProperty('--tilt-x',x+'deg');object.style.setProperty('--tilt-y',y+'deg');}
 stage.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||reduced.matches)return;const r=stage.getBoundingClientRect();x=-((event.clientY-r.top)/r.height-.5)*9;y=((event.clientX-r.left)/r.width-.5)*17;angle();});
 stage.addEventListener('pointerleave',()=>{x=0;y=-9;angle();});
 stage.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();x=0;y=event.key==='Home'?-9:Math.max(-18,Math.min(18,y+(event.key==='ArrowLeft'?-6:6)));angle();});
 toggle.addEventListener('click',()=>{pack=!pack;stage.dataset.pack=String(pack);toggle.setAttribute('aria-pressed',String(pack));toggle.replaceChildren(document.createTextNode(pack?'See the 30-day box ':'See the daily pack '));const a=document.createElement('i');a.className='arrow-icon';a.setAttribute('aria-hidden','true');toggle.append(a);document.getElementById('live-status').textContent=pack?'Showing actual BULT daily sachets.':'Showing the BULT 30-day box.';});
})();
