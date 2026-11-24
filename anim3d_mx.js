// Реалистичный персонаж (Mixamo) в одном GLB с запечёнными анимациями.
// Чтобы добавить упражнения: скачай анимацию из Mixamo (FBX, Without Skin) и запиши в models/manifest.json.
const MX={enabled:false,character:'models/character.glb',clips:{},scale:1,gripSign:-1};
function mxHas(key){return !!(MX.enabled&&window.THREE&&THREE.GLTFLoader&&THREE.SkeletonUtils)}
let _mxG=null;
function mxLoad(){
  if(!_mxG)_mxG=new Promise((res,rej)=>new THREE.GLTFLoader().load(MX.character,res,undefined,rej));
  return _mxG;
}
MX.ready=(async()=>{try{const r=await fetch('models/manifest.json');if(!r.ok)return;const m=await r.json();
  (m.animations||[]).forEach(k=>MX.clips[k]=true);MX.enabled=Object.keys(MX.clips).length>0;}catch(e){}})();
async function playerMx(wrap,key,opts={}){
  if(!MX.clips[key])return playerMxProc(wrap,key,opts);
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
    adaptQuality(renderer,scene,st,dt);
    renderer.render(scene,cam);
    st.raf=requestAnimationFrame(loop);
  }
  mixer.setTime(0);st.raf=requestAnimationFrame(loop);
  st.stop=()=>{cancelAnimationFrame(st.raf);holder.remove();mixer.stopAllAction();renderer.dispose();try{renderer.forceContextLoss()}catch(e){}cv.remove()};
  return st;
}

// ---- Процедурная анимация скелета Mixamo по расчётным позам (для упражнений без готового клипа) ----
function _ik3(A,B,l1,l2,pole){
  const T=THREE,d=new T.Vector3().subVectors(B,A);let dist=d.length();const u=d.clone().normalize();
  dist=Math.min(dist,l1+l2-0.01);dist=Math.max(dist,Math.abs(l1-l2)+0.01);
  const a=(l1*l1-l2*l2+dist*dist)/(2*dist),h=Math.sqrt(Math.max(0,l1*l1-a*a));
  let pv=pole.clone();pv.addScaledVector(u,-pv.dot(u));if(pv.lengthSq()<1e-6)pv.set(1,0,0).addScaledVector(u,-u.x);pv.normalize();
  const mid=A.clone().addScaledVector(u,a).addScaledVector(pv,h),end=A.clone().addScaledVector(u,dist);
  return {mid,end};
}
async function mxRig(){
  const T=THREE,gltf=await mxLoad(),root=T.SkeletonUtils.clone(gltf.scene);
  const holder=new T.Group();holder.rotation.y=Math.PI/2;holder.add(root);
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{m.color.setRGB(2.4,2.4,2.6);m.roughness=.5;if(m.emissive)m.emissiveIntensity=0;m.emissiveMap=null;m.needsUpdate=true})}});
  const bones={};root.traverse(o=>{if(o.isBone)bones[o.name.replace(/^mixamorig:?/,'')]=o});
  const wp=b=>b.getWorldPosition(new T.Vector3());
  holder.updateMatrixWorld(true);
  const Lv0=wp(bones.LeftUpLeg).y-wp(bones.LeftFoot).y;
  holder.scale.setScalar(81.5/Lv0);holder.updateMatrixWorld(true);
  const minY=new T.Box3().setFromObject(root).min.y,ankleH=wp(bones.LeftFoot).y-minY;
  const chain={Hips:'Spine',Spine:'Spine1',Spine1:'Spine2',Spine2:'Neck',Neck:'Head',Head:'HeadTop_End',
    LeftUpLeg:'LeftLeg',LeftLeg:'LeftFoot',LeftFoot:'LeftToeBase',RightUpLeg:'RightLeg',RightLeg:'RightFoot',RightFoot:'RightToeBase',
    LeftArm:'LeftForeArm',LeftForeArm:'LeftHand',RightArm:'RightForeArm',RightForeArm:'RightHand'};
  const rest={};
  for(const n in chain){const b=bones[n],c=bones[chain[n]];if(!b||!c)continue;
    const wq=b.getWorldQuaternion(new T.Quaternion());
    rest[n]={lq:b.quaternion.clone(),dirLocal:wp(c).sub(wp(b)).normalize().applyQuaternion(wq.clone().invert()),len:wp(c).distanceTo(wp(b))};}
  const _fr=(()=>{const a=wp(bones.LeftFoot),t=wp(bones.LeftToeBase),h=new T.Vector2(t.x-a.x,t.z-a.z).length();return {drop:a.y-t.y,hor:h}})();
  // пальцы рук для хвата
  const fingers=[];
  ['Left','Right'].forEach(side=>['Thumb','Index','Middle','Ring','Pinky'].forEach(f=>[1,2,3].forEach(n=>{
    const b=bones[side+'Hand'+f+n];if(b)fingers.push({b,lq:b.quaternion.clone(),side,f,n})})));
  const hipsOff=wp(bones.Hips).sub(wp(bones.LeftUpLeg).add(wp(bones.RightUpLeg)).multiplyScalar(.5));
  function align(n,dir){
    const b=bones[n],r=rest[n];if(!b||!r)return;
    b.parent.updateWorldMatrix(true,false);
    const pq=b.parent.getWorldQuaternion(new T.Quaternion()),base=pq.clone().multiply(r.lq);
    const cur=r.dirLocal.clone().applyQuaternion(base);
    const nw=new T.Quaternion().setFromUnitVectors(cur,dir.clone().normalize()).multiply(base);
    b.quaternion.copy(pq.invert().multiply(nw));b.updateMatrixWorld(true);
  }
  const PALM=6;
  const gripOf=side=>{const hp=wp(bones[side+'Hand']),d=hp.clone().sub(wp(bones[side+'ForeArm'])).normalize();return hp.addScaledVector(d,PALM)};
  function grip(){return gripOf('Left').add(gripOf('Right')).multiplyScalar(.5)}
  function shifted(J,d){
    const c=v=>v.clone().add(d);
    return {P:J.P,hipC:c(J.hipC),shC:c(J.shC),legs:J.legs.map(l=>({hip:c(l.hip),knee:c(l.knee),ankle:c(l.ankle),toe:c(l.toe)})),
      arms:J.arms.map(a=>({sh:c(a.sh),el:c(a.el),wr:a.wr.clone()}))};
  }
  function apply(J){
    pose(J);
    const P=J.P;curl(!!(P&&(P.plate||P.cbar||P.pullbar||P.dipbar)));
    if(P&&(P.pullbar||P.dipbar)){ // снаряд неподвижен — подстраиваем тело так, чтобы ладони легли на перекладину
      const g=grip(),tgt=new T.Vector3(0,P.hand.y,0),dl=new T.Vector3(tgt.x-g.x,tgt.y-g.y,0);
      if(dl.length()>.05)pose(shifted(J,dl));
    }
  }
  function curl(on){
    fingers.forEach(({b,lq,side,f,n})=>{
      if(!on){b.quaternion.copy(lq);return}
      const base=f==='Thumb'?[20,25,25][n-1]:[70,80,60][n-1],sg=(side==='Left'?1:-1)*MX.gripSign;
      const q=new T.Quaternion().setFromAxisAngle(f==='Thumb'?new T.Vector3(0,0,1):new T.Vector3(0,0,1),sg*base*Math.PI/180);
      b.quaternion.copy(lq).multiply(q);
    });
  }
  function pose(J){
    const hips=bones.Hips;hips.parent.updateWorldMatrix(true,false);
    hips.position.copy(hips.parent.worldToLocal(J.hipC.clone().add(hipsOff)));hips.updateMatrixWorld(true);
    const u=new T.Vector3().subVectors(J.shC,J.hipC).normalize();
    ['Hips','Spine','Spine1','Spine2','Neck','Head'].forEach(n=>align(n,u));
    ['Left','Right'].forEach((side,i)=>{
      const lg=J.legs[i],A=wp(bones[side+'UpLeg']),B=lg.ankle.clone();B.y+=ankleH;
      const pole=lg.knee.clone().sub(lg.hip.clone().add(lg.ankle).multiplyScalar(.5));
      const r=_ik3(A,B,rest[side+'UpLeg'].len,rest[side+'Leg'].len,pole);
      align(side+'UpLeg',r.mid.clone().sub(A));align(side+'Leg',r.end.clone().sub(r.mid));
      {const v=lg.toe.clone().sub(lg.ankle),hl=Math.hypot(v.x,v.z)||1,sc=_fr.hor/hl;
       align(side+'Foot',new T.Vector3(v.x*sc,v.y-_fr.drop,v.z*sc));}
      const ar=J.arms[i],S=wp(bones[side+'Arm']);
      const pole2=ar.el.clone().sub(ar.sh.clone().add(ar.wr).multiplyScalar(.5));
      const r2=_ik3(S,ar.wr,rest[side+'Arm'].len,rest[side+'ForeArm'].len,pole2);
      align(side+'Arm',r2.mid.clone().sub(S));align(side+'ForeArm',r2.end.clone().sub(r2.mid));
    });
  }
  return {holder,apply,grip,info:()=>({grip:grip(),toeY:Math.min(wp(bones.LeftToeBase).y,wp(bones.RightToeBase).y),ankleH})};
}
async function playerMxProc(wrap,key,opts={}){
  const rig=await mxRig(),T=THREE;
  const pl=player3d(wrap,key,{mus:opts.mus,period:opts.period,bodyless:true,
    setup:scene=>{scene.add(rig.holder);
      const k1=new T.DirectionalLight(0xffffff,1.6);k1.position.set(120,180,320);scene.add(k1);
      const f=new T.DirectionalLight(0x9fb4ff,.9);f.position.set(-200,120,200);scene.add(f);},
    onPose:(J,a)=>{rig.apply(J);a.holdAt(rig.grip())}});
  const stop=pl.stop;pl.stop=()=>{rig.holder.removeFromParent();stop()};
  return pl;
}

// Миниатюра упражнения на реалистичном персонаже (кеш)
const _mxThumbs={};let _mxTR=null;
async function thumbMx(key,mus){
  if(_mxThumbs[key])return _mxThumbs[key];
  const T=THREE,rig=await mxRig();
  if(!_mxTR)_mxTR=makeRenderer(300,230,true);
  const a=Athlete3D(key,{mus,bodyless:true}),cam=new T.PerspectiveCamera(32,300/230,5,3000);
  a.scene.add(rig.holder);
  const k1=new T.DirectionalLight(0xffffff,1.6);k1.position.set(120,180,320);a.scene.add(k1);
  const f=new T.DirectionalLight(0x9fb4ff,.9);f.position.set(-200,120,200);a.scene.add(f);
  const J=a.pose(key==='plank'?0:.5);rig.apply(J);a.holdAt(rig.grip());
  camFor(cam,key,.55,.17,300/230);
  _mxTR.setSize(300,230,false);_mxTR.render(a.scene,cam);
  const url=_mxTR.domElement.toDataURL('image/png');
  rig.holder.removeFromParent();a.dispose();
  return _mxThumbs[key]=url;
}
