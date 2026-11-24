// Реалистичный персонаж (Mixamo) в одном GLB с запечёнными анимациями.
// Чтобы добавить упражнения: скачай анимацию из Mixamo (FBX, Without Skin) и запиши в models/manifest.json.
const MX={enabled:false,character:'models/character.glb',clips:{},scale:1};
function mxHas(key){return !!(MX.enabled&&window.THREE&&THREE.GLTFLoader&&MX.clips[key])}
let _mxG=null;
function mxLoad(){
  if(!_mxG)_mxG=new Promise((res,rej)=>new THREE.GLTFLoader().load(MX.character,res,undefined,rej));
  return _mxG;
}
(async()=>{try{const r=await fetch('models/manifest.json');if(!r.ok)return;const m=await r.json();
  (m.animations||[]).forEach(k=>MX.clips[k]=true);MX.enabled=Object.keys(MX.clips).length>0;}catch(e){}})();
async function playerMx(wrap,key,opts={}){
  const gltf=await mxLoad(),root=gltf.scene,clip0=gltf.animations.find(a=>a.name===key);
  if(!clip0)throw new Error('no clip '+key);
  const T=THREE;
  const w=wrap.clientWidth||360,h=wrap.clientHeight||340;
  const renderer=makeRenderer(w,h,false);
  const cv=renderer.domElement;cv.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
  wrap.appendChild(cv);
  const scene=new T.Scene();
  scene.add(new T.HemisphereLight(0xe0e6ff,0x2a2a38,1.15));
  const sun=new T.DirectionalLight(0xffffff,1.4);sun.position.set(160,320,240);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=-230;sc.right=230;sc.top=260;sc.bottom=-120;sc.near=50;sc.far=900;sun.shadow.bias=-0.0006;scene.add(sun);
  const rim=new T.DirectionalLight(0xf5b301,1.0);rim.position.set(-220,160,-200);scene.add(rim);
  const rim2=new T.DirectionalLight(0xc8102e,.5);rim2.position.set(240,80,-160);scene.add(rim2);
  const floor=new T.Mesh(new T.CircleGeometry(300,64),new T.MeshStandardMaterial({color:0x23232d,roughness:.9,metalness:.05}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const ring=new T.Mesh(new T.RingGeometry(168,172,96),new T.MeshBasicMaterial({color:0xf5b301,transparent:true,opacity:.55,side:T.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.2;scene.add(ring);
  const key1=new T.DirectionalLight(0xffffff,1.6);key1.position.set(120,180,320);scene.add(key1);
  const fill=new T.DirectionalLight(0x9fb4ff,.9);fill.position.set(-200,120,200);scene.add(fill);
  // персонаж: нормализуем рост и единицы анимации
  const holder=new T.Group();scene.add(holder);
  if(!root.userData.mxPrepared){
    root.updateMatrixWorld(true);
    const box=new T.Box3().setFromObject(root),H=box.max.y-box.min.y;
    root.userData.H=H;root.userData.mxPrepared=true;
    root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.color.setRGB(2.4,2.4,2.6);m.roughness=.5;if(m.emissive)m.emissiveIntensity=0;m.emissiveMap=null;m.needsUpdate=true})}});
  }
  const H=root.userData.H,k=(175*MX.scale)/H;
  holder.scale.setScalar(k);holder.rotation.y=Math.PI/2;
  holder.add(root);
  const clip=clip0.clone();
  const animRoot=root;
  const mixer=new T.AnimationMixer(animRoot),action=mixer.clipAction(clip);action.play();
  const D=clip.duration;
  const cam=new T.PerspectiveCamera(32,w/h,5,3000);
  const st={speed:1,paused:false,t:0,last:performance.now(),reps:0,cyc:0,onPhase:null,onRep:null,
    az:.6,azT:.6,pol:.17,spin:false,drag:false,raf:0};
  let px=0;
  cv.addEventListener('pointerdown',e=>{st.drag=true;px=e.clientX;cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing'});
  cv.addEventListener('pointermove',e=>{if(!st.drag)return;st.azT-=(e.clientX-px)*.012;st.az=st.azT;px=e.clientX});
  const up=()=>{st.drag=false;cv.style.cursor='grab'};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  st.setView=a=>{st.spin=false;st.azT=a*Math.PI/180};
  const lowCam=(key==='pushup'||key==='plank');
  function loop(now){
    const dt=Math.min(.05,(now-st.last)/1000);st.last=now;
    if(!st.paused){
      st.t+=dt*st.speed;mixer.setTime(st.t%D);
      const c=st.t/D,cyc=c-Math.floor(c),ph=cyc<.5?0:1;
      if(ph!==st.cyc){st.cyc=ph;st.onPhase&&st.onPhase(ph)}
      const n=Math.floor(c);if(n!==st.reps){st.reps=n;st.onRep&&st.onRep(n)}
    }
    if(st.spin)st.azT+=dt*.7;
    if(!st.drag)st.az+=(st.azT-st.az)*Math.min(1,dt*6);
    const d=(lowCam?330:300)*1.22*(w/h<1.2?1.12:1),ty=lowCam?45:90;
    cam.position.set(d*Math.sin(st.az)*Math.cos(st.pol),ty+d*Math.sin(st.pol),d*Math.cos(st.az)*Math.cos(st.pol));cam.lookAt(0,ty,0);
    renderer.render(scene,cam);
    st.raf=requestAnimationFrame(loop);
  }
  mixer.setTime(0);st.raf=requestAnimationFrame(loop);
  st.stop=()=>{cancelAnimationFrame(st.raf);holder.remove();mixer.stopAllAction();renderer.dispose();try{renderer.forceContextLoss()}catch(e){}cv.remove()};
  return st;
}

// Автообнаружение: если есть models/character.fbx — включаем реалистичного персонажа и найденные анимации
(async()=>{
  try{
    const big=async u=>{const r=await fetch(u,{method:'HEAD'});return r.ok&&(+r.headers.get('content-length')||1e6)>50000};
    if(!(await big(MX.character)))return;
    const keys=Object.keys(EX);
    const ok=await Promise.all(keys.map(k=>big(`models/${k}.fbx`).catch(()=>false)));
    keys.forEach((k,i)=>{if(ok[i])MX.clips[k]=`models/${k}.fbx`});
    MX.enabled=Object.keys(MX.clips).length>0;
  }catch(e){}
})();
