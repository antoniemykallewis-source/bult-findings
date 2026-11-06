/* BULT interactive product study. Dependency-free WebGL, locally drawn artwork. */
(() => {
  'use strict';
  const canvas = document.getElementById('pack-canvas');
  const stage = document.getElementById('product-stage');
  if (!canvas || !stage) return;
  const fallback = document.getElementById('pack-fallback');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let gl, program, meshes = [], textures = [], raf = 0, visible = true, lost = false;
  let targetY = -.18, targetX = -.06, angleY = targetY, angleX = targetX, hoverX = 0, hoverY = 0;
  let pointer = null, lastTime = 0, initialized = false, aspect = 1;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive three-dimensional BULT daily supplement pack. Drag horizontally or use left and right arrow keys to rotate.');
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';
  let cssScene = null, cssPack = null, usingCSS = false;
  function fail(reason) {
    console.warn("[BULT pack] WebGL unavailable; using interactive CSS 3D:", reason);
    cancelAnimationFrame(raf); raf = 0; initialized = false;
    canvas.hidden = true; canvas.style.display = 'none';
    if (fallback) { fallback.hidden = false; fallback.style.display = 'block'; }
    stage.classList.add('pack-static');
    initCSS();
  }
  const vertex = `
    attribute vec3 aPosition; attribute vec3 aNormal; attribute vec2 aUV;
    uniform vec3 uAngles; uniform float uAspect; uniform float uFloat;
    varying mediump vec3 vNormal; varying mediump vec3 vPosition; varying mediump vec2 vUV;
    vec3 rotate(vec3 p) {
      float sx=sin(uAngles.x),cx=cos(uAngles.x),sy=sin(uAngles.y),cy=cos(uAngles.y),sz=sin(uAngles.z),cz=cos(uAngles.z);
      p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);
      p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
      return vec3(p.x*cz-p.y*sz,p.x*sz+p.y*cz,p.z);
    }
    void main(){
      vec3 p=rotate(aPosition); p.y+=uFloat;
      vNormal=rotate(aNormal);vPosition=p;vUV=aUV;
      float cameraDistance=max(5.35,3.5/uAspect);float depth=cameraDistance-p.z;
      gl_Position=vec4(p.x*2.414/uAspect,p.y*2.414,depth*.98-.2,depth);
    }`;
  const fragment = `
    precision mediump float;
    varying mediump vec3 vNormal; varying mediump vec3 vPosition; varying mediump vec2 vUV; uniform sampler2D uTexture;
    void main(){
      vec3 n=normalize(vNormal),v=normalize(vec3(0.,0.,6.35)-vPosition);
      vec3 l=normalize(vec3(-3.0,4.0,4.0));
      float diffuse=max(dot(n,l),0.);
      float spec=pow(max(dot(n,normalize(l+v)),0.),48.);
      float broad=pow(max(dot(n,normalize(vec3(3.,1.,3.)+v)),0.),8.);
      float edge=pow(1.-max(dot(n,v),0.),2.5);
      vec3 ink=texture2D(uTexture,vUV).rgb;
      vec3 color=ink*(.63+.75*diffuse)+vec3(.60,.66,.62)*spec*.44+vec3(.23,.28,.25)*broad*.20+vec3(.36,.46,.39)*edge*.30;
      gl_FragColor=vec4(color,1.);
    }`;
  function shader(type, source) {
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error((type===gl.VERTEX_SHADER?'Vertex':'Fragment')+' shader: '+gl.getShaderInfoLog(s));
    return s;
  }
  function height(x,y) {
    const ax=Math.abs(x), ay=Math.abs(y);
    const sealX=Math.min(1,Math.max(0,(1-ax)/.13));
    const sealY=Math.min(1,Math.max(0,(1-ay)/.12));
    const body=Math.pow(Math.max(0,(1-x*x)*(1-y*y)),.58)*.27;
    const crease=(Math.sin(y*31+x*7)*.014+Math.sin(y*53-x*12)*.009)*Math.pow(ax,4);
    const corner=Math.sin(x*35+y*19)*.012*Math.pow(ay,5);
    const rib=ay>.88 ? .007*Math.sin(y*440) : 0;
    return .012+(body+crease+corner)*sealX*sealY+rib;
  }
  function makeMesh(side) {
    const nx=72,ny=90,data=[],indices=[];
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
      const x=i/nx*2-1,y=j/ny*2-1,e=.001;
      const z=height(x,y)*side;
      const dx=(height(Math.min(1,x+e),y)-height(Math.max(-1,x-e),y))/(2*e)/1.22;
      const dy=(height(x,Math.min(1,y+e))-height(x,Math.max(-1,y-e)))/(2*e)/1.72;
      // Heat-sealed foil perimeter with a faint serrated cut edge.
      const px=x*1.22*(1-.027*y)+Math.sin(y*178)*.002*Math.pow(Math.abs(x),20);
      const py=y*1.72+Math.sin(x*180)*.003*Math.pow(Math.abs(y),20);
      data.push(px,py,z,-dx,-dy,side,side===1?i/nx:1-i/nx,1-j/ny);
    }
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const a=j*(nx+1)+i,b=a+nx+1;
      if(side===1) indices.push(a,a+1,b,b,a+1,b+1); else indices.push(a,b,a+1,b,b+1,a+1);
    }
    const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
    return {vb,ib,count:indices.length};
  }
  function artwork(back,logo,symbol,canvasOnly=false) {
    const c=document.createElement('canvas');c.width=1024;c.height=1440;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#171b19';ctx.fillRect(0,0,1024,1440);
    const g=ctx.createLinearGradient(0,0,1024,1440);g.addColorStop(0,'#ffffff09');g.addColorStop(.55,'#ffffff00');g.addColorStop(1,'#00000020');ctx.fillStyle=g;ctx.fillRect(0,0,1024,1440);
    let seed=517;
    for(let i=0;i<32000;i++){seed=(seed*16807)%2147483647;const x=seed%1024;seed=(seed*16807)%2147483647;ctx.fillStyle=i%2?'#ffffff05':'#0000000a';ctx.fillRect(x,seed%1440,1,1);}
    ctx.strokeStyle='#a3afa325';ctx.lineWidth=2;
    for(let y=20;y<80;y+=7){ctx.beginPath();ctx.moveTo(18,y);ctx.lineTo(1006,y);ctx.stroke();ctx.beginPath();ctx.moveTo(18,1440-y);ctx.lineTo(1006,1440-y);ctx.stroke();}
    for(let x=15;x<55;x+=7)for(let y=90;y<1350;y+=8){ctx.fillStyle='#80908018';ctx.fillRect(x,y,2,2);ctx.fillRect(1024-x,y,2,2);}
    function text(s,y,size=26,color='#dedfd5',weight=400){ctx.fillStyle=color;ctx.font=`${weight} ${size}px Arial,sans-serif`;ctx.textAlign='center';ctx.fillText(s,512,y);}
    function art(img,x,y,w,h){if(!img)return;const tmp=document.createElement('canvas');tmp.width=img.naturalWidth;tmp.height=img.naturalHeight;const t=tmp.getContext('2d');t.drawImage(img,0,0);t.globalCompositeOperation='source-in';t.fillStyle='#e7e9df';t.fillRect(0,0,tmp.width,tmp.height);ctx.drawImage(tmp,x,y,w,h);}
    if(!back){
      art(symbol,450,221,124,124);
      if(logo)art(logo,170,430,684,177);else text('BULT',585,170,'#e7e9df',700);
      text("M E N ’ S   D A I L Y   P R O T O C O L",705,25);
      ctx.fillStyle='#c6d59c';ctx.fillRect(452,850,120,3);
      text('CORE   /   VITALITY   /   OMEGA',937,26,'#c6d59c');
      text('DIETARY SUPPLEMENT',1120,28,'#e7e9df',600);
      text('5 CAPSULES  /  2 SOFTGELS',1170,26);
      text('STYLIZED PACK PREVIEW',1287,18,'#919a91');
    }else{
      text('ONE PACK. ONE DAILY RITUAL.',268,36,'#e7e9df',600);
      ctx.strokeStyle='#e7e9df66';ctx.beginPath();ctx.moveTo(135,330);ctx.lineTo(889,330);ctx.stroke();
      text('WHAT’S INSIDE',430,25,'#a9b5a1');
      text('CORE',520,40,'#e7e9df',600);text('2 capsules',567,26);
      text('VITALITY',670,40,'#e7e9df',600);text('3 capsules',717,26);
      text('OMEGA',820,40,'#e7e9df',600);text('2 softgels',867,26);
      text('Refer to the outer box for complete',1005,25);text('supplement facts and ingredient information.',1045,25);
      art(logo,347,1130,330,85);
      text('STYLIZED PREVIEW · NOT A PRODUCT LABEL',1290,18,'#919a91');
    }
    if(canvasOnly)return c;
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);return t;
  }
  function loadImage(path){return new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=path;});}
  let paused = false;
  let locations;
  async function init(){
    try {
      gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});
      if(!gl)return fail('getContext(webgl) returned null. GPU or browser policy may disable WebGL.');
      program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))return fail('Program link: '+gl.getProgramInfoLog(program));
      locations={};['aPosition','aNormal','aUV'].forEach(k=>locations[k]=gl.getAttribLocation(program,k));['uAngles','uAspect','uFloat','uTexture'].forEach(k=>locations[k]=gl.getUniformLocation(program,k));
      meshes=[makeMesh(1),makeMesh(-1)];
      const [logo,symbol]=await Promise.all([loadImage('assets/bult-logo.png?v=0f80cd652c'),loadImage('assets/bult-symbol.png?v=fc6f4b2a6b')]);
      if(lost)return;
      textures=[artwork(false,logo,symbol),artwork(true,logo,symbol)];
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
      usingCSS=false;if(cssScene)cssScene.hidden=true;stage.classList.remove('pack-css-3d');canvas.style.display='block';initialized=true;canvas.hidden=false;if(fallback){fallback.hidden=true;fallback.style.display='none';}stage.classList.remove('pack-static');stage.classList.add('pack-ready');resize();wake();
    }catch(error){fail(error);}
  }
  async function initCSS(){
    if(cssScene){usingCSS=true;initialized=true;cssScene.hidden=false;if(fallback){fallback.hidden=true;fallback.style.display='none';}stage.classList.remove('pack-static');stage.classList.add('pack-ready','pack-css-3d');resize();wake();return;}
    try {
      const [logo,symbol]=await Promise.all([loadImage('assets/bult-logo.png?v=0f80cd652c'),loadImage('assets/bult-symbol.png?v=fc6f4b2a6b')]);
      cssScene=document.createElement('div');cssScene.className='pack-css-scene';
      cssScene.style.cssText='position:absolute;inset:0;z-index:2;perspective:1000px;pointer-events:none;';
      cssPack=document.createElement('div');cssPack.style.cssText='position:absolute;left:50%;top:50%;transform-style:preserve-3d;will-change:transform;';
      cssScene.appendChild(cssPack);stage.appendChild(cssScene);
      [false,true].forEach(back=>{
        const face=document.createElement('div');face.className=back?'pack-css-back':'pack-css-front';
        face.style.cssText='position:absolute;inset:0;border-radius:4% 4% 3% 3% / 1.2% 1.2% 1% 1%;backface-visibility:hidden;background-size:100% 100%;box-shadow:inset 0 0 10px #000b,inset 12px 0 18px #ffffff10,inset -9px 0 18px #0008;border:1px solid #8e988348;';
        face.style.transform=back?'rotateY(180deg) translateZ(7px)':'translateZ(7px)';
        face.style.backgroundImage=`url(${artwork(back,logo,symbol,true).toDataURL()})`;
        const foil=document.createElement('div');foil.style.cssText='position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(112deg,transparent 8%,#d7e4d218 23%,transparent 36%,#0004 47%,transparent 60%,#d9e2cd13 78%,transparent 91%);box-shadow:inset 2px 0 9px #dee6d51c;';
        face.appendChild(foil);cssPack.appendChild(face);
      });
      ['left','right'].forEach((side,i)=>{
        const edge=document.createElement('div');edge.style.cssText=`position:absolute;top:0;${side}:0;width:14px;height:100%;background:linear-gradient(90deg,#0b100c,#48503f,#11170e);transform:translateX(${i?'50%':'-50%'}) rotateY(90deg);`;cssPack.appendChild(edge);
      });
      usingCSS=true;initialized=true;canvas.hidden=true;canvas.style.display='none';
      if(fallback){fallback.hidden=true;fallback.style.display='none';}
      stage.classList.remove('pack-static');stage.classList.add('pack-ready','pack-css-3d');
      stage.tabIndex=0;stage.setAttribute('role','img');stage.setAttribute('aria-label',canvas.getAttribute('aria-label'));
      stage.style.touchAction='pan-y';stage.style.cursor='grab';resize();wake();
    }catch(error){console.warn('[BULT pack] CSS 3D initialization failed:',error);}
  }
  function resize(){
    const r=stage.getBoundingClientRect();const d=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));aspect=canvas.width/canvas.height;
    if(usingCSS&&cssPack){const h=Math.min(r.height*.82,r.width*1.12);cssPack.style.height=h+'px';cssPack.style.width=(h*1024/1440)+'px';}
    else if(initialized)gl.viewport(0,0,canvas.width,canvas.height);wake();
  }
  function wake(){if(initialized&&(!lost||usingCSS)&&visible&&!document.hidden&&!raf)raf=requestAnimationFrame(draw);}
  function draw(time){
    raf=0;if(!initialized||(lost&&!usingCSS)||!visible||document.hidden)return;
    const dt=Math.min(40,time-(lastTime||time));lastTime=time;
    const easing=motion.matches?1:1-Math.exp(-dt*.011);
    const tx=targetX+hoverX,ty=targetY+hoverY;
    angleX+=(tx-angleX)*easing;angleY+=(ty-angleY)*easing;
    const idle=(motion.matches||paused)?0:Math.sin(time*.00065)*.028;
    if(usingCSS){
      cssPack.style.transform=`translate(-50%,-50%) translateY(${idle*45}px) rotateX(${-angleX}rad) rotateY(${angleY}rad) rotateZ(${-0.065+idle*.25}rad)`;
      if((!motion.matches&&!paused)||Math.abs(tx-angleX)+Math.abs(ty-angleY)>.001)wake();
      return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    gl.uniform3f(locations.uAngles,angleX,angleY,-.065+idle*.25);gl.uniform1f(locations.uAspect,aspect);gl.uniform1f(locations.uFloat,idle);gl.uniform1i(locations.uTexture,0);
    meshes.forEach((m,i)=>{gl.bindBuffer(gl.ARRAY_BUFFER,m.vb);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.ib);[['aPosition',3,0],['aNormal',3,12],['aUV',2,24]].forEach(([name,size,offset])=>{gl.enableVertexAttribArray(locations[name]);gl.vertexAttribPointer(locations[name],size,gl.FLOAT,false,32,offset);});gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);});
    if((!motion.matches&&!paused)||Math.abs(tx-angleX)+Math.abs(ty-angleY)>.001)wake();
  }
  function setView(back){targetY=back?Math.PI:0;targetX=-.04;hoverX=hoverY=0;document.querySelectorAll('[data-pack-view]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.packView==='back')===back)));wake();}
  document.querySelectorAll('[data-pack-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.packView==='back')));
  document.getElementById('pack-reset')?.addEventListener('click',()=>setView(false));
  const pauseButton = document.getElementById('pack-motion');
  function syncMotionControl(){
    if(!pauseButton)return;
    pauseButton.disabled=motion.matches;
    pauseButton.textContent=motion.matches?'Reduced motion':paused?'Resume motion':'Pause motion';
    pauseButton.setAttribute('aria-pressed',String(motion.matches||paused));
    pauseButton.setAttribute('aria-label',motion.matches?'Reduced motion enabled':paused?'Resume pack motion':'Pause pack motion');
  }
  syncMotionControl();
  pauseButton?.addEventListener('click',()=>{if(motion.matches)return;paused=!paused;syncMotionControl();hoverX=hoverY=0;wake();});
  stage.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();if(e.key==='Home'||e.key==='End')setView(e.key==='End');else{targetY+=e.key==='ArrowLeft'?-.25:.25;wake();}}});
  stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY,start:targetY,dragging:false,touch:e.pointerType!=='mouse'};hoverX=hoverY=0;if(!pointer.touch)stage.setPointerCapture(e.pointerId);stage.style.cursor=canvas.style.cursor='grabbing';});
  stage.addEventListener('pointermove',e=>{
    if(pointer&&e.pointerId===pointer.id){const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
      if(pointer.touch&&!pointer.dragging){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){pointer=null;stage.style.cursor=canvas.style.cursor='grab';return;}if(Math.abs(dx)<8)return;pointer.dragging=true;stage.setPointerCapture(e.pointerId);}
      targetY=pointer.start+dx*.009;wake();
    }else if(fine.matches&&!motion.matches&&!paused){const r=stage.getBoundingClientRect();hoverY=((e.clientX-r.left)/r.width-.5)*.24;hoverX=((e.clientY-r.top)/r.height-.5)*.16;wake();}
  });
  function release(){if(pointer&&stage.hasPointerCapture(pointer.id))stage.releasePointerCapture(pointer.id);pointer=null;stage.style.cursor=canvas.style.cursor='grab';}
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',()=>{pointer=null;stage.style.cursor=canvas.style.cursor='grab';});
  stage.addEventListener('pointerleave',()=>{hoverX=hoverY=0;wake();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;fail('WebGL context lost. Waiting for browser restoration.');});canvas.addEventListener('webglcontextrestored',()=>{lost=false;init();});
  document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else wake();});
  motion.addEventListener('change',()=>{syncMotionControl();hoverX=hoverY=0;wake();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){lastTime=0;wake();}else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'80px'}).observe(stage);
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
  init();
})();
