import{$ as V,C as L,D as G,E as U,G as B,I,N as O,Q as P,U as k,X as D,Y as H,a as E,aa as q,ca as j,e as F,f as z,l as R,m as d,n as p,o as w,p as T,u as f,w as b,y as _,z as v}from"./chunk-PONX32QE.js";import{b as W,c as N,d as Q}from"./chunk-HPECGZFJ.js";import"./chunk-2NFLSA4Y.js";var et=16761984,$=16773336,g={size:8,behind:3,y:3.1,strength:.34},y={top:[7.4,-4],foot:[2.9,.3],width:2.2,neck:.5,behind:1.2,strength:.09},n={top:[4.9,-.7],foot:[1.5,.25],width:3.8,neck:.7,motes:52,sinks:.016,ahead:.7,behind:2.4,idleAfter:60,settles:4,wakes:1.5,strength:.6};function K(r,t){return[new w(t,...r.top),new w(t,...r.foot)]}var it=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,st=`
  uniform vec3 tint;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    float round = 1.0 - clamp(distance(vUv, vec2(0.5)) * 2.0, 0.0, 1.0);
    gl_FragColor = vec4(tint, round * round * strength);
    #include <colorspace_fragment>
  }
`,rt=`
  uniform vec3 tint;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    // Narrow where it enters, wide where it lands; it gathers and thins slowly, so neither end shows as an edge
    float across = abs(vUv.x - 0.5) * 2.0 / mix(1.0, ${y.neck.toFixed(2)}, vUv.y);
    float body = 1.0 - smoothstep(0.0, 1.0, across);
    float along = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.6, 1.0, vUv.y));
    gl_FragColor = vec4(tint, body * body * along * strength);
    #include <colorspace_fragment>
  }
`,nt=`
  uniform float time;
  uniform float level;
  uniform float halfHeight;
  uniform float ceiling;
  uniform vec3 top;
  uniform vec3 fall;
  uniform vec3 side;
  attribute vec4 mote;
  attribute vec3 trait;
  varying float vLight;
  void main() {
    float t = time * trait.y + mote.w;
    // Each mote sinks the length of the column and starts again at its top, dark at both ends so the turn is not seen
    float sunk = fract(mote.x + time * trait.y * ${(n.sinks/Math.hypot(n.top[0]-n.foot[0],n.top[1]-n.foot[1])).toFixed(5)});
    float reach = mix(${n.neck.toFixed(2)}, 1.0, sunk) * ${(n.width/2).toFixed(2)};
    vec3 drifted = top + fall * sunk + side * (mote.y * reach) + vec3(mote.z, 0.0, 0.0)
      + vec3(sin(t * 0.61) * 0.11, sin(t * 0.43) * 0.05, cos(t * 0.37) * 0.11);
    vec4 seen = modelViewMatrix * vec4(drifted, 1.0);
    gl_Position = projectionMatrix * seen;
    gl_PointSize = max(trait.x * halfHeight * projectionMatrix[1][1] / -seen.z, 3.0);
    float turning = smoothstep(0.0, 0.12, sunk) * (1.0 - smoothstep(0.84, 1.0, sunk));
    float underCeiling = 1.0 - smoothstep(ceiling - 0.08, ceiling, gl_Position.y / gl_Position.w);
    vLight = trait.z * level * turning * underCeiling * (0.7 + 0.3 * sin(t * 1.7));
  }
`,ot=`
  uniform vec3 tint;
  varying float vLight;
  void main() {
    float soft = 1.0 - clamp(length(gl_PointCoord - 0.5) * 2.0, 0.0, 1.0);
    gl_FragColor = vec4(tint, soft * soft * vLight);
    #include <colorspace_fragment>
  }
`;function X(r,t){return new L({uniforms:{tint:{value:new f(t)},strength:{value:0}},vertexShader:it,fragmentShader:r,transparent:!0,blending:F,depthWrite:!1})}var M=class{objects;halo=X(st,et);shaft=X(rt,$);constructor(){let t=new v(new P(g.size,g.size),this.halo);t.rotation.y=-Math.PI/2,t.position.set(g.behind,g.y,0);let[e,i]=K(y,y.behind),s=new v(new P(y.width,e.distanceTo(i)),this.shaft);s.rotation.y=-Math.PI/2,s.rotation.z=Math.atan2(i.z-e.z,e.y-i.y),s.position.copy(e).add(i).multiplyScalar(.5),this.objects=[t,s]}setLevel(t){this.halo.uniforms.strength.value=g.strength*t,this.shaft.uniforms.strength.value=y.strength*t}};function at(r){let t=r;return()=>(t=(t*1664525+1013904223)%4294967296,t/4294967296)}function lt(r,t,e){let i=t<n.idleAfter?e/n.wakes:-e/n.settles;return d.clamp(r+i,0,1)}var x=class{points;time=0;idle=0;presence=0;constructor(){let t=at(11),e=new Float32Array(n.motes*4),i=new Float32Array(n.motes*3);for(let l=0;l<n.motes;l++){let a=Math.sqrt(t())*(t()<.5?-1:1);e.set([t(),a,d.lerp(-n.ahead,n.behind,t()),t()*40],l*4),i.set([d.lerp(.024,.06,t()),d.lerp(.6,1.2,t()),1-.7*a*a],l*3)}let s=new _;s.setAttribute("position",new b(new Float32Array(n.motes*3),3)),s.setAttribute("mote",new b(e,4)),s.setAttribute("trait",new b(i,3));let[o,h]=K(n,0);this.points=new I(s,new L({uniforms:{tint:{value:new f($).multiplyScalar(n.strength)},time:{value:0},level:{value:0},halfHeight:{value:400},ceiling:{value:1},top:{value:o},fall:{value:h.clone().sub(o)},side:{value:new w(0,o.z-h.z,h.y-o.y).normalize()}},vertexShader:nt,fragmentShader:ot,transparent:!0,blending:F,depthWrite:!1}));let u=new p;this.points.onBeforeRender=l=>{this.points.material.uniforms.halfHeight.value=l.getDrawingBufferSize(u).y/2},this.points.frustumCulled=!1,this.points.visible=!1}stir(){this.idle=0}setCeiling(t){this.points.material.uniforms.ceiling.value=1-2*t}update(t,e){return this.time+=t,this.idle+=t,this.presence=lt(this.presence,this.idle,t),this.points.visible=this.presence>0&&e>0,this.points.material.uniforms.time.value=this.time,this.points.material.uniforms.level.value=this.presence*e,this.presence>0}};var ht=1315863,dt=1920*1080*2,ct=[2,1.5,1.25,1].map(r=>({pixelRatio:r,statueShadow:!0,reflections:!1})),mt=20,ut=.25,m={height:2.7,plinth:1,drum:1.4,yaw:Math.PI-.35},c={eye:1.65,back:7,aim:3.2,tall:6.24},pt=2.4,C={from:.9,to:2.4},ft=16767392,vt=10466e3,S={from:[-4.4,6.6,-3.6],to:[0,2.5,0],angle:.44,strength:560},A={from:[1.6,4.6,4.8],to:[0,2.6,0],angle:.46,strength:330},Y=1.9;function J(r,t,e,i){let s=new H(i,0,18,e,.75,2);return s.position.set(...r),s.target.position.set(...t),s}function gt(){let r=new k({color:3354926,roughness:.6,metalness:0}),t=new k({color:13083722,roughness:.38,metalness:.65}),e=m.plinth,i=(o,h,u,l)=>{let a=new v(new O(o,o,h,64),l);return a.position.y=u,a.castShadow=!0,a.receiveShadow=!0,a},s=new U;return s.add(i(m.drum+.2,.18,.09,r),i(m.drum,e-.26,.18+(e-.26)/2,r),i(m.drum+.1,.08,e-.04,r),i(m.drum+.006,.014,e-.2,t)),s}var Z=class{constructor(t,e,i=q){this.canvas=t;this.options=e;this.renderer=new V({canvas:t,antialias:!0}),this.quality=new j(ct,0,()=>this.fit(),()=>this.lose()),this.watchDisplay(mt),this.renderer.outputColorSpace=R,this.renderer.toneMapping=z,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=E,this.renderer.shadowMap.autoUpdate=!1,t.addEventListener("webglcontextlost",this.lose);let s=Math.hypot(c.back,c.aim-c.eye);this.camera=new G(d.radToDeg(2*Math.atan(c.tall/2/s)),1,.5,40),this.key.penumbra=1,this.key.castShadow=!0,this.key.shadow.mapSize.set(1024,1024),this.key.shadow.bias=-6e-4,this.scene.background=new f(ht),this.scene.add(this.ambient,this.key,this.key.target,this.rim,this.rim.target,gt(),...this.light.objects,this.motes.points),this.fit(),this.cancelLion=i(e.assets,{height:m.height,at:[0,m.plinth,0],yaw:m.yaw},o=>{this.unveil(o)},this.lose)}canvas;options;renderer;quality;scene=new B;camera;ambient=new D(14210770,1710622,Y);key=J(S.from,S.to,S.angle,ft);rim=J(A.from,A.to,A.angle,vt);light=new M;motes=new x;pointer=new p;drawn=new p;cancelLion;scroll=0;turn=0;lift=0;shownFor=0;shown=!1;ready=!1;compiling;rafId=0;lastFrame=0;running=!1;paused=!1;lost=!1;disposed=!1;setPointer(t,e){this.pointer.set(t,e),this.motes.stir(),this.invalidate()}setScroll(t){this.scroll=t,this.motes.stir(),this.invalidate()}resize(t){this.motes.setCeiling(t),this.fit()}setPaused(t){this.paused=t,t?(cancelAnimationFrame(this.rafId),this.rafId=0,this.running=!1):this.invalidate()}dispose(){this.disposed=!0,cancelAnimationFrame(this.rafId),this.canvas.removeEventListener("webglcontextlost",this.lose),this.cancelLion(),this.compiling?this.compiling.then(()=>this.release()):this.release()}release(){this.scene.traverse(t=>{let{geometry:e,material:i}=t;e?.dispose();for(let s of[i??[]].flat()){for(let o of Object.values(s))o instanceof T&&o.dispose();s.dispose()}}),this.renderer.dispose(),this.renderer.forceContextLoss()}fit(){let{clientWidth:t,clientHeight:e}=this.canvas;if(!t||!e)return;let i=Math.min(window.devicePixelRatio,this.quality.tier.pixelRatio,Math.sqrt(dt/(t*e))),{x:s,y:o}=this.renderer.getSize(this.drawn);s===t&&o===e&&this.renderer.getPixelRatio()===i||(this.renderer.setDrawingBufferSize(t,e,i),this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.quality.settle(),this.shown&&this.renderer.render(this.scene,this.camera),this.invalidate())}invalidate(){this.rafId||this.paused||this.disposed||!this.ready||(this.running||(this.lastFrame=performance.now()),this.rafId=requestAnimationFrame(this.frame))}frame=t=>{this.rafId=0;let e=Math.max(t-this.lastFrame,0)/1e3,i=Math.min(e,ut);if(this.lastFrame=t,this.running&&this.shownFor>=C.from?this.quality.frame(e,this.renderer.getPixelRatio()):this.quality.settle(),this.disposed)return;this.shownFor+=i;let s=d.smoothstep(this.shownFor,C.from,C.to),o=W(this.pointer.x,this.scroll)*s,h=N(this.pointer.y)*s,u=Math.abs(o-this.turn)>4e-4||Math.abs(h-this.lift)>4e-4,l=u?1-Math.exp(-i*pt):1;this.turn+=(o-this.turn)*l,this.lift+=(h-this.lift)*l;let a=1-s*(1-Q(this.scroll)),tt=this.motes.update(i,a);this.ambient.intensity=Y*(.3+.7*a),this.key.intensity=S.strength*a,this.rim.intensity=A.strength*a,this.light.setLevel(a),this.camera.position.set(-c.back*Math.cos(this.turn),c.eye+this.lift,-c.back*Math.sin(this.turn)),this.camera.lookAt(0,c.aim,0),this.renderer.render(this.scene,this.camera),this.shown||(this.shown=!0,this.options.onReady()),this.running=u||tt||s<1,this.running&&this.invalidate()};async unveil(t){this.scene.add(t),this.renderer.shadowMap.needsUpdate=!0,this.compiling=this.precompile(),await this.compiling,this.compiling=void 0,this.ready=!0,this.invalidate()}async precompile(){try{await this.renderer.compileAsync(this.scene,this.camera)}catch{}}lose=()=>{this.lost||this.disposed||(this.lost=!0,this.options.onLost())};watchDisplay(t,e){requestAnimationFrame(i=>{this.disposed||(e!==void 0&&this.quality.displayFrame((i-e)/1e3),t>1&&this.watchDisplay(t-1,i))})}};export{c as FRAME,Z as HeroScene,m as STATUE};
