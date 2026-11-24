// 3D-атлет на three.js. Использует те же позы POSES (вид сбоку), достраивая ось Z.
function has3D(){try{const c=document.createElement('canvas');return !!(window.THREE&&(c.getContext('webgl2')||c.getContext('webgl')))}catch(e){return false}}

const CAM={ // цель камеры и дистанция по упражнениям
  dips:{tx:0,ty:120,d:370},pulldown:{tx:0,ty:115,d:380},hipthrust:{tx:-10,ty:40,d:300},pushdown:{tx:5,ty:100,d:340},
  incline:{tx:-25,ty:60,d:320},legpress:{tx:10,ty:65,d:330},lateral:{tx:0,ty:100,d:340},
  default:{tx:-5,ty:88,d:330},pushup:{tx:-65,ty:40,d:360},plank:{tx:-65,ty:40,d:360},
  bench:{tx:-25,ty:50,d:300},pullup:{tx:0,ty:120,d:400},bridge:{tx:-10,ty:30,d:280},
  ohp:{tx:0,ty:105,d:380},curl:{tx:0,ty:90,d:320},row:{tx:0,ty:70,d:320},calf:{tx:0,ty:80,d:330}
};
const GOLD=0xf5b301;

function Athlete3D(key,opts={}){
  const T=THREE,Y=new T.Vector3(0,1,0),Zax=new T.Vector3(0,0,1);
  const scene=new T.Scene();
  const group=new T.Group();scene.add(group);
  // --- свет
  scene.add(new T.HemisphereLight(0xe0e6ff,0x2a2a38,1.25));
  const sun=new T.DirectionalLight(0xffffff,1.25);sun.position.set(160,320,240);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=-230;sc.right=230;sc.top=260;sc.bottom=-120;sc.near=50;sc.far=900;sun.shadow.bias=-0.0006;scene.add(sun);
  const rim=new T.DirectionalLight(GOLD,.9);rim.position.set(-220,160,-200);scene.add(rim);
  const rim2=new T.DirectionalLight(0xc8102e,.45);rim2.position.set(240,80,-160);scene.add(rim2);
  // --- пол
  const floor=new T.Mesh(new T.CircleGeometry(300,64),new T.MeshStandardMaterial({color:0x23232d,roughness:.9,metalness:.05}));
  floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const ring=new T.Mesh(new T.RingGeometry(168,172,96),new T.MeshBasicMaterial({color:GOLD,transparent:true,opacity:.55,side:T.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.2;scene.add(ring);
  const mat=(c,r=.55,m=0)=>new T.MeshPhysicalMaterial({color:c,roughness:r,metalness:m,clearcoat:.35,clearcoatRoughness:.5});
  const SKIN=0xa9714a; // тёмный загар
  const skinFor={};const skin=g=>skinFor[g]||(skinFor[g]=mat(SKIN,.42));
  const shorts=mat(0x0c0c10,.7),gold=mat(GOLD,.35,.6),hairM=mat(0x0a0a0a,.9),shoeM=mat(0xf2f2f5,.5),shoeD=mat(0x111115,.6),steel=mat(0xb9bfca,.3,.9),plateM=mat(0x16161c,.4,.5);
  const add=(m,g)=>{m.castShadow=true;m.receiveShadow=false;(g||group).add(m);return m};
  const seg=(r1,r2,m,g)=>{const geo=new T.CylinderGeometry(r2,r1,1,22,1);geo.translate(0,.5,0);return add(new T.Mesh(geo,m),g)};
  const ball=(r,m,sx=1,sy=1,sz=1)=>{const o=add(new T.Mesh(new T.SphereGeometry(r,24,18),m));o.scale.set(sx,sy,sz);return o};
  const place=(m,a,b)=>{const d=new T.Vector3().subVectors(b,a),Ln=d.length()||.001;m.position.copy(a);m.scale.set(1,Ln,1);m.quaternion.setFromUnitVectors(Y,d.normalize())};
  const V=(x,y,z)=>new T.Vector3(x,y,z);

  // --- сегменты тела
  const S=[-1,1];
  const thighS=S.map(()=>seg(14,8.6,skin('legs'))),shinS=S.map(()=>seg(8.4,5,skin('legs'))),
        kneeS=S.map(()=>ball(8,skin('legs'))),calfS=S.map(()=>ball(7.8,skin('legs'),1,1.6,1)),
        shortS=S.map(()=>seg(15,12.5,shorts)),footS=S.map(()=>seg(5.2,4.6,shoeM)),toeS=S.map(()=>ball(5,shoeM,1,.9,1)),soleS=S.map(()=>seg(5.4,4.9,shoeD)),
        uarmS=S.map(()=>seg(8.2,6,skin('arms'))),farmS=S.map(()=>seg(6.8,4.6,skin('arms'))),
        elbS=S.map(()=>ball(6,skin('arms'))),bicS=S.map(()=>ball(8,skin('arms'),1.15,1.7,1.05)),handS=S.map(()=>ball(5,skin('arms'),1,1.1,.9)),
        deltS=S.map(()=>ball(11.5,skin('shoulders'))),
        pecS=S.map(()=>ball(1,skin('chest'))),
        absS=[0,1,2].map(()=>S.map(()=>ball(1,skin('abs'))));
  const pelvis=ball(1,shorts),lats=ball(1,skin('back')),chestB=ball(1,skin('chest')),waist=ball(1,skin('abs')),trap=ball(1,skin('back'));
  const neck=seg(8,7.2,skin('shoulders')),head=ball(10,mat(SKIN,.45),1.02,1.12,.92),hair=add(new T.Mesh(new T.SphereGeometry(11,24,14,0,Math.PI*2,0,Math.PI*.52),hairM));
  const brow=ball(2.2,mat(0x2a1a10,.8),.7,.4,2.6),nose=ball(1.9,mat(SKIN,.5),1,1.2,.9),eyeS=S.map(()=>ball(1,mat(0x0a0a0a,.2),.9,.9,.9)),ear=S.map(()=>ball(2.4,mat(SKIN,.5),.6,1,.5));
  // реквизит
  const props=new T.Group();scene.add(props);
  const dyn=new T.Group();scene.add(dyn);
  const cableM=seg(.7,.7,steel,dyn),cbarM=new T.Mesh(new T.CylinderGeometry(1.5,1.5,86,14),steel);cbarM.rotation.x=Math.PI/2;cbarM.castShadow=true;dyn.add(cbarM);
  cableM.visible=false;cbarM.visible=false;
  const plat=new T.Mesh(new T.BoxGeometry(5,60,76),mat(0x3a3a46,.5,.6));plat.castShadow=true;plat.visible=false;dyn.add(plat);
  const dbs=[0,1].map(()=>{const g=new T.Group();const h=new T.Mesh(new T.CylinderGeometry(1.6,1.6,14,12),steel);h.rotation.z=Math.PI/2;g.add(h);
    [-1,1].forEach(k=>{const hd=new T.Mesh(new T.CylinderGeometry(6,6,6,20),plateM);hd.rotation.z=Math.PI/2;hd.position.x=k*8;hd.castShadow=true;g.add(hd)});g.visible=false;dyn.add(g);return g});
  const bar=new T.Group();group.add(bar);bar.visible=false;
  const barM=add(new T.Mesh(new T.CylinderGeometry(1.5,1.5,230,16),steel),bar);barM.rotation.x=Math.PI/2;
  [-1,1].forEach(s=>{
    [[84,4.5,22],[90.5,3.5,17],[96,2.6,12]].forEach(([z,t,r],i)=>{
      const p=add(new T.Mesh(new T.CylinderGeometry(r,r,t,40),i===0?plateM:mat(i===1?0xc8102e:0x2a2a33,.45,.5)),bar);p.rotation.x=Math.PI/2;p.position.z=s*z;
      const e=add(new T.Mesh(new T.TorusGeometry(r-.6,.7,8,40),gold),bar);e.position.z=s*(z+s*t/2);
    });
    const c=add(new T.Mesh(new T.CylinderGeometry(3.2,3.2,5,16),steel),bar);c.rotation.x=Math.PI/2;c.position.z=s*79;
  });
  let propsBuilt=false;
  function buildProps(P){
    if(propsBuilt)return;propsBuilt=true;
    const box=(w,h,d,c,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(c,.6,.2));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;props.add(m);return m};
    if(P.bench){box(140,10,36,0x1d1d24,-25,22,0);box(138,3,34,0xc8102e,-25,27.5,0);
      [-85,35].forEach(x=>[-14,14].forEach(z=>box(5,17,5,0x3a3a46,x,8.5,z)));
      [-1,1].forEach(s=>{box(6,120,6,0x2b2b34,-72,60,s*55);box(18,5,6,GOLD,-72,56,s*55);box(34,5,6,0x2b2b34,-72,2,s*55)});}
    if(P.pullbar){const b=P.hand.y;
      [-1,1].forEach(s=>{box(8,b+30,8,0x2b2b34,0,(b+30)/2,s*105);box(60,6,40,0x2b2b34,0,3,s*105)});
      const br=new T.Mesh(new T.CylinderGeometry(1.9,1.9,215,18),steel);br.rotation.x=Math.PI/2;br.position.set(0,b,0);br.castShadow=true;props.add(br);
      box(10,6,230,0x2b2b34,0,b+30,0);}
    if(P.incline){const a=30*Math.PI/180,pad=box(130,9,34,0x1d1d24,0,0,0);pad.rotation.z=-a;pad.position.set(-30,38,0);
      const red=box(128,3,32,0xc8102e,0,0,0);red.rotation.z=-a;red.position.set(-30+Math.sin(a)*5,38+Math.cos(a)*5,0);
      const seat=box(30,9,34,0x1d1d24,6,26,0);[-1,1].forEach(z=>box(5,28,5,0x3a3a46,-50,14,z*12));box(5,26,5,0x3a3a46,8,13,0);
      [-1,1].forEach(sd=>{box(6,150,6,0x2b2b34,-56,75,sd*58);box(18,5,6,GOLD,-56,95,sd*58)});}
    if(P.legpress){const rs=box(40,10,34,0x1d1d24,-30,24,0);rs.position.set(-31,30,0);
      const pad=box(70,9,34,0x1d1d24,0,0,0);pad.rotation.z=50*Math.PI/180;pad.position.set(-38,58,0);
      const red=box(68,3,32,0xc8102e,0,0,0);red.rotation.z=50*Math.PI/180;red.position.set(-38+Math.sin(50*Math.PI/180)*5,58+Math.cos(50*Math.PI/180)*5,0);
      [-1,1].forEach(sd=>{const rail=box(190,5,6,0x2b2b34,0,0,0);rail.rotation.z=45*Math.PI/180;rail.position.set(40,80,sd*44);box(6,60,6,0x2b2b34,-60,30,sd*44);box(6,30,6,0x2b2b34,120,15,sd*44)});}
    if(P.bench2){box(46,38,36,0x1d1d24,-62,19,0);box(44,3,34,0xc8102e,-62,38.5,0)}
    if(P.dipbar){[-1,1].forEach(s=>{const br=new T.Mesh(new T.CylinderGeometry(1.9,1.9,76,16),steel);br.rotation.z=Math.PI/2;br.position.set(0,112,s*26);br.castShadow=true;props.add(br);
      box(7,112,7,0x2b2b34,-36,56,s*26);box(30,5,30,0x2b2b34,-36,2,s*26)});}
    if(P.seat){box(34,10,34,0x1d1d24,-10,40,0);box(8,40,8,0x2b2b34,-10,20,0);
      box(10,250,14,0x2b2b34,-70,125,0);box(96,10,14,0x2b2b34,-24,245,0);
      box(6,40,30,0x3a3a46,28,32,0);}
    if(P.cable&&!P.seat){box(10,250,14,0x2b2b34,-60,125,0);box(86,10,14,0x2b2b34,-18,245,0)}
  }

  let lastP=null;
  function holdAt(v){
    const P=lastP;if(!P||P.pullbar||P.dipbar)return;
    if(P.plate){bar.visible=true;bar.position.set(v.x,v.y,0)}
    if(P.cbar){cbarM.position.set(v.x,v.y,0);if(P.cable)place(cableM,V(P.cable.x,P.cable.y,0),V(v.x,v.y,0))}
  }
  const MUS={legs:[],glutes:[],back:[],chest:[],shoulders:[],arms:[],abs:[]};
  const mats={legs:skin('legs'),back:skin('back'),chest:skin('chest'),shoulders:skin('shoulders'),arms:skin('arms'),abs:skin('abs')};
  const hl=(opts.mus||[]).reduce((o,k)=>(o[k]=1,o),{});
  function glow(p){
    const e=.04+.32*Math.sin(Math.PI*p);
    for(const k in mats){const m=mats[k];m.emissive.setHex(hl[k]||(k==='back'&&hl.glutes)?0xff3a14:0x000000);m.emissiveIntensity=hl[k]?e:0;}
    pelvis.material.emissive.setHex(hl.glutes?0xff3a14:0);pelvis.material.emissiveIntensity=hl.glutes?e:0;
  }

  const FW=1;
  function pose(p){
    const P=POSES[key](p);buildProps(P);
    const sP=V(P.shoulder.x,P.shoulder.y,0),hP=V(P.hip.x,P.hip.y,0);
    const J={legs:[],arms:[],hipC:hP.clone(),shC:sP.clone(),P};lastP=P;
    const u=new T.Vector3().subVectors(sP,hP).normalize();
    const ang=Math.atan2(-u.x,u.y),q=new T.Quaternion().setFromAxisAngle(Zax,ang);
    const loc=(f,h,z)=>V(hP.x,hP.y,0).add(new T.Vector3(f,h,0).applyQuaternion(q)).setZ(z); // точка в системе корпуса
    const tl=new T.Vector3().subVectors(sP,hP).length();
    const ell=(m,f,h,z,sx,sy,sz)=>{m.position.copy(loc(f,h,z));m.quaternion.copy(q);m.scale.set(sx,sy,sz)};
    // торс
    ell(pelvis,0,2,0,11,10,16);ell(waist,0,tl*.32,0,10,13,13);
    ell(lats,-3,tl*.72,0,10.5,19,30);ell(chestB,1.5,tl*.74,0,12.5,15,25);
    S.forEach((s,i)=>{ell(pecS[i],8.5,tl*.78,s*11.5,7,8.8,12.5);
      [0,1,2].forEach(r=>ell(absS[r][i],9.2,tl*(.2+r*.12),s*3.6,2.6,4.2,4.2));});
    ell(trap,-2,tl*.94,0,9.5,10,21);
    // голова
    const hc=loc(0,tl+17,0),fwd=new T.Vector3(1,0,0).applyQuaternion(q);
    place(neck,loc(0,tl-2,0),loc(0,tl+11,0));
    head.position.copy(hc);head.quaternion.copy(q);
    hair.position.copy(hc).addScaledVector(Y.clone().applyQuaternion(q),2);hair.quaternion.copy(q);hair.rotation.z+=0;
    brow.position.copy(hc).add(fwd.clone().multiplyScalar(9.2)).addScaledVector(Y.clone().applyQuaternion(q),3.2);brow.quaternion.copy(q);
    nose.position.copy(hc).add(fwd.clone().multiplyScalar(10.8)).addScaledVector(Y.clone().applyQuaternion(q),-.8);nose.quaternion.copy(q);
    S.forEach((s,i)=>{eyeS[i].position.copy(hc).add(fwd.clone().multiplyScalar(9.2)).addScaledVector(Y.clone().applyQuaternion(q),1.4).setZ(s*3.6);ear[i].position.copy(hc).addScaledVector(fwd,-1).setZ(s*9.8);ear[i].quaternion.copy(q)});
    // ноги
    S.forEach((s,i)=>{
      const footT=P.foot2?(i===0?P.foot:P.foot2):P.foot;
      const hipP=V(P.hip.x,P.hip.y,s*10),ft=V(footT.x,footT.y,s*14);
      const lg=ik(P.hip,footT,TH,SH,P.legDir);
      const kn=V(lg.mid.x,lg.mid.y,s*13),an=V(lg.end.x,lg.end.y,s*14);
      place(thighS[i],hipP,kn);place(shinS[i],kn,an);kneeS[i].position.copy(kn);
      const mid=kn.clone().lerp(an,.3);calfS[i].position.copy(mid).add(new T.Vector3(-3,0,0));
      const dir=new T.Vector3().subVectors(an,kn).normalize();calfS[i].quaternion.setFromUnitVectors(Y,dir);
      place(shortS[i],hipP,hipP.clone().lerp(kn,.5));
      // стопа
      const a=((P.footAng||0)*Math.PI/180),L=P.toe?9:17;
      const ang2=P.toe?-.28:-a;
      const toeV=V(an.x+Math.cos(ang2)*L,an.y+Math.sin(ang2)*L,an.z),heel=V(an.x-4,an.y-3,an.z);
      J.legs[i]={hip:hipP.clone(),knee:kn.clone(),ankle:an.clone(),toe:toeV.clone()};
      place(footS[i],heel,toeV);toeS[i].position.copy(toeV);
      place(soleS[i],heel.clone().add(V(0,-3.2,0)),toeV.clone().add(V(0,-3.2,0)));
      soleS[i].scale.x=soleS[i].scale.z=1;
    });
    // руки
    S.forEach((s,i)=>{
      const grip=P.dipbar?26:P.cbar?(P.seat?40:12):P.pullbar?36:P.bench?37:P.plate?32:28,flare=P.bench?-6:P.pullbar?0:P.toe?5:3;
      const shP=V(P.shoulder.x,P.shoulder.y,s*28),hd=V(P.hand.x,P.hand.y,s*grip);
      let el,wr;
      if(P.lateral){const th=(8+80*P.lat)*Math.PI/180;
        el=shP.clone().add(V(.03*UA,-UA*Math.cos(th),s*UA*Math.sin(th)));wr=el.clone().add(V(.18*FA,-FA*Math.cos(th*.95),s*FA*Math.sin(th*.95)));}
      else{const ar=P.elbow?{mid:P.elbow,end:P.hand}:ik(P.shoulder,P.hand,UA,FA,P.armDir);
        el=V(ar.mid.x,ar.mid.y,s*(28+(grip-28)*.5+flare));wr=V(ar.end.x,ar.end.y,s*grip);}
      J.arms[i]={sh:shP.clone(),el:el.clone(),wr:wr.clone()};
      place(uarmS[i],shP,el);place(farmS[i],el,wr);elbS[i].position.copy(el);handS[i].position.copy(wr);
      deltS[i].position.copy(shP);
      bicS[i].position.copy(shP.clone().lerp(el,.45)).add(V(0,0,0));bicS[i].quaternion.setFromUnitVectors(Y,new T.Vector3().subVectors(el,shP).normalize());
      dbs[i].visible=!!P.lateral;if(P.lateral)dbs[i].position.copy(wr);
      if(i===1&&P.plate){bar.visible=true;bar.position.set(wr.x,wr.y,0);}
      if(i===1&&!P.plate)bar.visible=false;
      if(i===1){const hm=V(wr.x,wr.y,0);cbarM.visible=!!P.cbar;if(P.cbar)cbarM.position.copy(hm);
        cableM.visible=!!P.cable;if(P.cable)place(cableM,V(P.cable.x,P.cable.y,0),hm);}
    });
    plat.visible=!!P.legpress;if(P.legpress){plat.position.set(P.foot.x+.7071*7,P.foot.y+.7071*7,0);plat.rotation.z=45*Math.PI/180}
    glow(p);
    return J;
  }
  if(opts.bodyless)group.children.forEach(c=>{if(c!==bar)c.visible=false});
  return {scene,group,pose,holdAt,dispose(){scene.traverse(o=>{if(o.geometry)o.geometry.dispose()})}};
}

window.__ctxLost=false;
// если кадры долго идут медленно — снижаем качество (разрешение и тени)
function adaptQuality(renderer,scene,st,dt){
  if(st._aq===undefined){st._aq=0;st._sum=0;st._n=0}
  if(st._aq)return;
  st._sum+=dt;st._n++;
  if(st._n>=90){
    if(st._sum/st._n>0.042){renderer.setPixelRatio(1);renderer.shadowMap.enabled=false;
      scene.traverse(o=>{if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.needsUpdate=true)}});
      renderer.setSize(renderer.domElement.clientWidth||300,renderer.domElement.clientHeight||300,false);}
    st._aq=1;
  }
}
function makeRenderer(w,h,thumb){
  const r=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:!!thumb});
  r.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();window.__ctxLost=true});
  r.setPixelRatio(Math.min(window.devicePixelRatio||1,2));r.setSize(w,h);
  r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.outputColorSpace=THREE.SRGBColorSpace;
  r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.05;
  return r;
}
function camFor(cam,key,az,pol,aspect){
  const c=CAM[key]||CAM.default,d=c.d*1.22*(aspect<1.2?1.12:1);
  cam.position.set(c.tx+d*Math.sin(az)*Math.cos(pol),c.ty+d*Math.sin(pol),d*Math.cos(az)*Math.cos(pol));
  cam.lookAt(c.tx,c.ty,0);
}

// Интерактивный 3D-плеер
function player3d(wrap,key,opts={}){
  const w=wrap.clientWidth||360,h=wrap.clientHeight||340;
  const renderer=makeRenderer(w,h,false);
  const cv=renderer.domElement;cv.style.cssText='width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab';
  wrap.appendChild(cv);
  const ath=Athlete3D(key,{mus:opts.mus,bodyless:opts.bodyless});
  if(opts.setup)opts.setup(ath.scene);
  const cam=new THREE.PerspectiveCamera(32,w/h,5,3000);
  const st={speed:1,paused:false,t:0,last:performance.now(),reps:0,cyc:0,onPhase:null,onRep:null,period:opts.period||3.6,
    az:.5,azT:.5,pol:.17,spin:false,drag:false,raf:0};
  let px=0;
  cv.addEventListener('pointerdown',e=>{st.drag=true;px=e.clientX;cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing'});
  cv.addEventListener('pointermove',e=>{if(!st.drag)return;st.azT-=(e.clientX-px)*.012;st.az=st.azT;px=e.clientX});
  const up=()=>{st.drag=false;cv.style.cursor='grab'};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  st.setView=a=>{st.spin=false;st.azT=a*Math.PI/180};
  function loop(now){
    const dt=Math.min(.05,(now-st.last)/1000);st.last=now;
    if(!st.paused){
      st.t+=dt*st.speed;const c=st.t/st.period,cyc=c-Math.floor(c),p=.5-.5*Math.cos(2*Math.PI*cyc);
      const J=ath.pose(p);if(opts.onPose)opts.onPose(J,ath);
      const ph=cyc<.5?0:1;if(ph!==st.cyc){st.cyc=ph;st.onPhase&&st.onPhase(ph)}
      const n=Math.floor(c);if(n!==st.reps){st.reps=n;st.onRep&&st.onRep(n)}
    }
    if(st.spin){st.azT+=dt*.7}
    if(!st.drag)st.az+=(st.azT-st.az)*Math.min(1,dt*6);
    camFor(cam,key,st.az,st.pol,w/h);
    adaptQuality(renderer,ath.scene,st,dt);
    renderer.render(ath.scene,cam);
    st.raf=requestAnimationFrame(loop);
  }
  {const J0=ath.pose(0);if(opts.onPose)opts.onPose(J0,ath);}st.raf=requestAnimationFrame(loop);
  st.stop=()=>{cancelAnimationFrame(st.raf);ath.dispose();renderer.dispose();try{renderer.forceContextLoss()}catch(e){}cv.remove()};
  return st;
}

// Миниатюры: один общий рендерер, кеш dataURL
const _thumbs={};let _thr=null;
function thumb3d(key,mus){
  if(_thumbs[key])return _thumbs[key];
  if(!_thr)_thr=makeRenderer(300,230,true);
  const a=Athlete3D(key,{mus}),cam=new THREE.PerspectiveCamera(32,300/230,5,3000);
  a.pose(key==='plank'?0:.5);camFor(cam,key,.55,.17,300/230);
  _thr.setSize(300,230,false);_thr.render(a.scene,cam);
  const url=_thr.domElement.toDataURL('image/png');a.dispose();
  return _thumbs[key]=url;
}
