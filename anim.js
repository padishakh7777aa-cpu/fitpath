// Скелетная анимация упражнений (вид сбоку). p: 0..1 — прогресс движения.
const TL=55, TH=45, SH=45, UA=32, FA=30;
const L=(a,b,p)=>a+(b-a)*p;
const sh=(hip,ang)=>{const r=ang*Math.PI/180;return {x:hip.x+TL*Math.sin(r),y:hip.y+TL*Math.cos(r)}};

// двухзвенная IK: возвращает {mid,end}
function ik(A,B,l1,l2,dir){
  let dx=B.x-A.x, dy=B.y-A.y, d=Math.hypot(dx,dy)||0.001;
  const maxd=l1+l2-0.5, mind=Math.abs(l1-l2)+1;
  const dd=Math.min(maxd,Math.max(mind,d));
  const ux=dx/d, uy=dy/d;
  const end={x:A.x+ux*dd,y:A.y+uy*dd};
  const a=(l1*l1-l2*l2+dd*dd)/(2*dd);
  const h=Math.sqrt(Math.max(0,l1*l1-a*a));
  let px=-uy, py=ux;
  if(px*dir<0){px=-px;py=-py}
  return {mid:{x:A.x+ux*a+px*h,y:A.y+uy*a+py*h},end};
}

const POSES={
  squat:p=>{const hip={x:L(-4,-40,p),y:L(88,44,p)},s=sh(hip,L(4,45,p));
    return {foot:{x:0,y:0},hip,shoulder:s,hand:{x:s.x+26,y:s.y-8},legDir:1,armDir:1,cx:150}},
  lunge:p=>{const y=L(80,48,p),hip={x:0,y:y},s=sh(hip,3);
    return {foot:{x:28,y:0},foot2:{x:-38,y:0},hip,shoulder:s,hand:{x:8,y:y+2},legDir:1,armDir:-1,cx:150}},
  pushup:p=>{const h=L(62,14,p),F={x:-137,y:2},S={x:F.x+Math.sqrt(145*145-(h-2)**2),y:h};
    const k=89.5/145,hip={x:F.x+(S.x-F.x)*k,y:F.y+(S.y-F.y)*k};
    return {foot:F,hip,shoulder:S,hand:{x:0,y:0},legDir:1,armDir:-1,toe:true,cx:225}},
  plank:p=>{const h=60+2*p,F={x:-137,y:2},S={x:F.x+Math.sqrt(145*145-(h-2)**2),y:h};
    const k=89.5/145,hip={x:F.x+(S.x-F.x)*k,y:F.y+(S.y-F.y)*k};
    return {foot:F,hip,shoulder:S,hand:{x:0,y:0},legDir:1,armDir:-1,toe:true,cx:225}},
  deadlift:p=>{const q=p,hip={x:L(-42,-3,q),y:L(47,89,q)},s=sh(hip,L(50,5,q));
    return {foot:{x:0,y:0},hip,shoulder:s,hand:{x:s.x,y:s.y-61},legDir:1,armDir:1,plate:true,cx:150}},
  bench:p=>{const hip={x:0,y:30},s={x:-55,y:30};
    return {foot:{x:38,y:0},hip,shoulder:s,hand:{x:L(-52,-54,p),y:L(44,90,p)},legDir:1,armDir:1,plate:true,bench:true,cx:175}},
  ohp:p=>{const hip={x:-2,y:89},s=sh(hip,L(0,-3,p));
    return {foot:{x:0,y:0},hip,shoulder:s,hand:{x:s.x+L(6,2,p),y:s.y+L(4,62,p)},legDir:1,armDir:1,plate:true,cx:150}},
  pullup:p=>{const hy=L(151,205,p),s={x:L(2,4,p),y:hy},hip={x:s.x+2,y:s.y-55};
    return {foot:{x:hip.x-14,y:hip.y-87},hip,shoulder:s,hand:{x:0,y:212},legDir:1,armDir:-1,pullbar:true,cx:150}},
  row:p=>{const hip={x:-30,y:62},s=sh(hip,65);
    return {foot:{x:0,y:0},hip,shoulder:s,hand:{x:L(s.x,-2,p),y:L(s.y-60,62,p)},legDir:1,armDir:-1,plate:true,cx:150}},
  rdl:p=>{const hip={x:L(-3,-38,p),y:L(89,78,p)},s=sh(hip,L(5,70,p));
    return {foot:{x:0,y:0},hip,shoulder:s,hand:{x:s.x,y:s.y-61},legDir:1,armDir:1,plate:true,cx:150}},
  curl:p=>{const hip={x:-2,y:89},s=sh(hip,0),th=L(5,150,p)*Math.PI/180,el={x:-2,y:112};
    return {foot:{x:0,y:0},hip,shoulder:s,elbow:el,hand:{x:el.x+30*Math.sin(th),y:el.y-30*Math.cos(th)},legDir:1,armDir:-1,plate:true,cx:150}},
  calf:p=>{const hip={x:-2,y:89+10*p},s=sh(hip,0);
    return {foot:{x:0,y:10*p},hip,shoulder:s,hand:{x:s.x+4,y:s.y-60},legDir:1,armDir:-1,footAng:L(0,35,p),cx:150}},
  dips:p=>{const a=L(2,25,p)*Math.PI/180,sy=L(172,128,p),sx=L(0,6,p),s={x:sx,y:sy},hip={x:sx-55*Math.sin(a),y:sy-55*Math.cos(a)};
    return {foot:{x:hip.x-26,y:hip.y-62},hip,shoulder:s,hand:{x:0,y:112},legDir:1,armDir:-1,dipbar:true,cx:150}},
  pulldown:p=>{const hip={x:-8,y:48},s=sh(hip,-8),top={x:s.x+2,y:s.y+60},bot={x:s.x+14,y:s.y+6};
    return {foot:{x:28,y:0},hip,shoulder:s,hand:{x:L(top.x,bot.x,p),y:L(top.y,bot.y,p)},legDir:1,armDir:-1,cbar:true,cable:{x:-4,y:240},seat:true,cx:150}},
  hipthrust:p=>{const sx=-52,sy=46,th=L(-33,4,p)*Math.PI/180,hip={x:sx+55*Math.cos(th),y:sy+55*Math.sin(th)};
    return {foot:{x:32,y:0},hip,shoulder:{x:sx,y:sy},hand:{x:hip.x+2,y:hip.y+9},legDir:1,armDir:1,plate:true,bench2:true,cx:175}},
  pushdown:p=>{const hip={x:-2,y:89},s=sh(hip,4),el={x:s.x+4,y:s.y-32},ph=L(100,2,p)*Math.PI/180;
    return {foot:{x:0,y:0},hip,shoulder:s,elbow:el,hand:{x:el.x+30*Math.sin(ph),y:el.y-30*Math.cos(ph)},legDir:1,armDir:-1,cable:{x:14,y:236},cbar:true,cx:150}},
  incline:p=>{const a=30*Math.PI/180,hip={x:0,y:34},s={x:hip.x-55*Math.cos(a),y:hip.y+55*Math.sin(a)},n={x:Math.sin(a),y:Math.cos(a)},
    bot={x:s.x+n.x*16+4,y:s.y+n.y*16},top={x:s.x+2,y:s.y+60};
    return {foot:{x:36,y:0},hip,shoulder:s,hand:{x:L(bot.x,top.x,p),y:L(bot.y,top.y,p)},legDir:1,armDir:1,plate:true,incline:true,cx:175}},
  legpress:p=>{const hip={x:-14,y:34},d=L(50,86,p),foot={x:hip.x+.7071*d,y:hip.y+.7071*d},s={x:hip.x-55*Math.cos(50*Math.PI/180),y:hip.y+55*Math.sin(50*Math.PI/180)};
    return {foot,hip,shoulder:s,hand:{x:hip.x-8,y:hip.y+12},legDir:-1,armDir:1,footAng:-135,legpress:true,cx:150}},
  lateral:p=>{const hip={x:-2,y:89},s=sh(hip,3);
    return {foot:{x:0,y:0},hip,shoulder:s,hand:{x:s.x,y:s.y-60},legDir:1,armDir:1,lateral:true,lat:p,cx:150}},
  ohext:p=>{const hip={x:-2,y:89},s=sh(hip,3),el={x:s.x+3,y:s.y+34},ph=L(0,140,p)*Math.PI/180;
    return {foot:{x:0,y:0},hip,shoulder:s,elbow:el,hand:{x:el.x-30*Math.sin(ph),y:el.y+30*Math.cos(ph)},legDir:1,armDir:1,plate:true,cx:150}},
  skull:p=>{const hip={x:0,y:30},sh0={x:-55,y:30},el={x:-55,y:62},ph=L(0,100,p)*Math.PI/180;
    return {foot:{x:38,y:0},hip,shoulder:sh0,elbow:el,hand:{x:el.x-30*Math.sin(ph),y:el.y+30*Math.cos(ph)},legDir:1,armDir:1,plate:true,bench:true,cx:175}},
  legext:p=>{const hip={x:-8,y:48},kn={x:37,y:44},ps=L(-85,-6,p)*Math.PI/180,s=sh(hip,-5);
    return {foot:{x:kn.x+45*Math.cos(ps),y:kn.y+45*Math.sin(ps)},hip,shoulder:s,hand:{x:hip.x+6,y:hip.y+8},legDir:1,armDir:1,legmach:true,cx:150}},
  legcurl:p=>{const hip={x:-8,y:48},kn={x:37,y:44},ps=L(-8,-100,p)*Math.PI/180,s=sh(hip,-5);
    return {foot:{x:kn.x+45*Math.cos(ps),y:kn.y+45*Math.sin(ps)},hip,shoulder:s,hand:{x:hip.x+6,y:hip.y+8},legDir:1,armDir:1,legmach:true,cx:150}},
  facepull:p=>{const hip={x:-2,y:89},s=sh(hip,0);
    return {foot:{x:0,y:0},hip,shoulder:s,hand:{x:L(s.x+58,s.x+16,p),y:L(s.y-4,s.y+6,p)},legDir:1,armDir:-1,flareZ:14,cable:{x:80,y:s.y+2},colX:98,cbar:true,cx:150}},
  bridge:p=>{const s={x:-55,y:6},th=L(2,45,p)*Math.PI/180,hip={x:s.x+TL*Math.cos(th),y:s.y+TL*Math.sin(th)};
    return {foot:{x:35,y:0},hip,shoulder:s,hand:{x:s.x+61,y:s.y-4},legDir:1,armDir:1,cx:185}},
};

const NS='http://www.w3.org/2000/svg';
const GY=250;
const SKIN='#e3b08a',SKIN_D='#c48a62',SKIN_F='#a8734f',HAIR='#2e211b',SHIRT='#2f7bff',SHIRT_F='#1f4fae',SHORT='#23283a',SHORT_F='#171b28';
function el(n,a,parent){const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);if(parent)parent.appendChild(e);return e}

function smooth(pts){ // замкнутая сглаженная кривая через точки (svg-координаты)
  const n=pts.length,m=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  let s=`M${m(pts[0],pts[1]).map(v=>v.toFixed(1))}`;
  for(let i=1;i<=n;i++){const p1=pts[i%n],p2=pts[(i+1)%n],mm=m(p1,p2);
    s+=`Q${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${mm[0].toFixed(1)},${mm[1].toFixed(1)}`}
  return s+'Z';
}

function makeFigure(svg){
  svg.setAttribute('viewBox','20 8 260 262');
  svg.innerHTML='';
  const defs=el('defs',{},svg);
  const fl=el('linearGradient',{id:'fl',x1:0,y1:0,x2:0,y2:1},defs);
  el('stop',{offset:0,'stop-color':'#2b303d'},fl);el('stop',{offset:1,'stop-color':'#161922'},fl);
  const wl=el('linearGradient',{id:'wl',x1:0,y1:0,x2:0,y2:1},defs);
  el('stop',{offset:0,'stop-color':'#1a1f2b'},wl);el('stop',{offset:1,'stop-color':'#232938'},wl);
  const flt=el('filter',{id:'sh',x:'-20%',y:'-20%',width:'140%',height:'140%'},defs);
  el('feDropShadow',{dx:0,dy:2,stdDeviation:2,'flood-opacity':.35},flt);
  // зал
  el('rect',{x:0,y:-30,width:300,height:GY+30,fill:'url(#wl)'},svg);
  for(let x=20;x<300;x+=60)el('rect',{x,y:-30,width:2,height:GY+30,fill:'rgba(255,255,255,.035)'},svg);
  el('rect',{x:0,y:GY,width:300,height:30,fill:'url(#fl)'},svg);
  el('rect',{x:0,y:GY,width:300,height:2,fill:'rgba(255,255,255,.18)'},svg);
  const shadow=el('ellipse',{cy:GY+6,rx:55,ry:5,fill:'rgba(0,0,0,.4)'},svg);
  const props=el('g',{},svg);
  const g=el('g',{filter:'url(#sh)'},svg);
  const P_=(fill,stroke)=>el('path',{fill,stroke:stroke||'rgba(0,0,0,.28)','stroke-width':.8,'stroke-linejoin':'round'},g);
  // порядок слоёв
  const fLeg=P_(SKIN_F),fShoe=P_('#cfd3dc'),fShort=P_(SHORT_F),fArm=P_(SKIN_F),fFore=P_(SKIN_F),fHand=el('circle',{r:4.2,fill:SKIN_F},g);
  const torso=P_(SHIRT),torsoShade=P_(SHIRT_F,'none'),waist=P_(SHORT);
  const thigh=P_(SKIN),shin=P_(SKIN),shoe=P_('#f1f3f8'),sole=P_('#3ea6ff','none'),shortT=P_(SHORT);
  const neck=P_(SKIN_D),hair=el('circle',{r:10.6,fill:HAIR},g),face=el('circle',{r:9.2,fill:SKIN},g),ear=el('circle',{r:2.3,fill:SKIN_D},g),eye=el('circle',{r:1.15,fill:'#222'},g);
  const uArm=P_(SKIN),fArm2=P_(SKIN),delt=el('circle',{r:7.4,fill:SKIN},g),hand=el('circle',{r:4.4,fill:SKIN},g);
  const plateG=el('g',{display:'none'},g);
  el('circle',{r:19,fill:'#2a2d38',stroke:'#0e1016','stroke-width':1.5},plateG);
  el('circle',{r:14,fill:'none',stroke:'#4b5160','stroke-width':1.5},plateG);
  el('circle',{r:9,fill:'none',stroke:'#3a3f4d','stroke-width':1},plateG);
  el('circle',{r:4,fill:'#c9ced8',stroke:'#7b8190','stroke-width':1},plateG);
  const arc=el('path',{d:'M-15,-8 A17,17 0 0 1 -6,-16',fill:'none',stroke:'rgba(255,255,255,.35)','stroke-width':1.6,'stroke-linecap':'round'},plateG);

  let cx=150,built=false;
  const T=p=>[p.x+cx,GY-6-p.y];
  const add=(a,b,k=1)=>({x:a.x+b.x*k,y:a.y+b.y*k});
  const limb=(a,b,ws,wasEnd)=>{
    const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,u={x:dx/d,y:dy/d},n={x:-u.y,y:u.x};
    const L_=[],R_=[];
    ws.forEach(([t,w])=>{const c={x:a.x+dx*t,y:a.y+dy*t};L_.push(T(add(c,n,w)));R_.push(T(add(c,n,-w)));});
    const w0=ws[0][1],w1=ws[ws.length-1][1];
    const pts=[T(add(a,u,-w0*.85)),...L_,T(add(b,u,w1*.85)),...R_.reverse()];
    return smooth(pts);
  };
  const TW=[[0,10,11],[.18,10,11],[.45,9.5,9.5],[.8,15,12],[1,10,9]];
  const tw=t=>{for(let i=0;i<TW.length-1;i++){const A=TW[i],B=TW[i+1];if(t<=B[0]){const k=(t-A[0])/(B[0]-A[0]);return[A[1]+(B[1]-A[1])*k,A[2]+(B[2]-A[2])*k]}}return[TW[4][1],TW[4][2]]};
  const torsoP=(hip,sho,t0,t1,extra=0)=>{
    const dx=sho.x-hip.x,dy=sho.y-hip.y,d=Math.hypot(dx,dy),u={x:dx/d,y:dy/d},f={x:u.y,y:-u.x};
    const F=[],B=[];
    for(let i=0;i<=6;i++){const t=t0+(t1-t0)*i/6,c={x:hip.x+dx*t,y:hip.y+dy*t},w=tw(t);
      F.push(T(add(c,f,w[0]+extra)));B.push(T(add(c,f,-(w[1]+extra))));}
    const cB=T(add(hip,u,t0<=0?-6:0)),cT=T(add(sho,u,t1>=1?5:0));
    return smooth([...F,cT,...B.reverse(),cB].filter((p,i,a)=>i<a.length));
  };
  const shoeP=(ank,toe)=>{const a={x:ank.x-(toe?0:4),y:ank.y+(toe?0:-.5)},b=toe?{x:ank.x+9,y:ank.y-3}:{x:ank.x+17,y:ank.y-.5};
    return limb(a,b,[[0,5.2],[.5,5.4],[1,4.3]])};

  function draw(p,key){
    const P=POSES[key](p);cx=P.cx;
    if(!built){built=true;
      if(P.bench){el('rect',{x:cx-92,y:GY-26,width:130,height:9,rx:4,fill:'#3b4153',stroke:'#0e1016'},props);
        el('rect',{x:cx-92,y:GY-26,width:130,height:3,rx:2,fill:'rgba(255,255,255,.12)'},props);
        [-78,22].forEach(x=>el('rect',{x:cx+x-3,y:GY-17,width:6,height:17,fill:'#555c70'},props));
        // стойки
        el('rect',{x:cx-76,y:GY-110,width:5,height:110,fill:'#454b5d'},props);el('rect',{x:cx-76,y:GY-64,width:16,height:5,fill:'#6b7288'},props);}
      if(P.pullbar){const b=T({x:0,y:212});
        el('rect',{x:cx-100,y:b[1]-30,width:200,height:8,rx:3,fill:'#3b4153'},props);
        [-90,90].forEach(x=>el('rect',{x:cx+x-3,y:b[1]-26,width:6,height:GY-b[1]+26,fill:'#2f3545'},props));
        el('rect',{x:cx-92,y:b[1]-4,width:184,height:6,rx:3,fill:'#aeb4c2',stroke:'#6b7288'},props);}
      if(P.plate&&!P.bench&&!P.pullbar){}
    }
    const leg=ik(P.hip,P.foot,TH,SH,P.legDir);
    const arm=P.elbow?{mid:P.elbow,end:P.hand}:ik(P.shoulder,P.hand,UA,FA,P.armDir);
    const farFoot=P.foot2||{x:P.foot.x-7,y:P.foot.y};
    const farLeg=ik(P.hip,farFoot,TH,SH,P.legDir);
    const off={x:-5,y:0};
    const fArmI=ik(add(P.shoulder,off),add(P.hand,off),UA,FA,P.armDir);
    // дальние конечности
    fLeg.setAttribute('d',limb(P.hip,farLeg.mid,[[0,11],[.5,9.5],[1,7]])+limb(farLeg.mid,farLeg.end,[[0,7],[.3,7.6],[1,4.5]]));
    fShoe.setAttribute('d',shoeP(farLeg.end,P.toe));
    fShort.setAttribute('d',limb(P.hip,add(P.hip,{x:farLeg.mid.x-P.hip.x,y:farLeg.mid.y-P.hip.y},.45),[[0,11.8],[1,9.6]]));
    fArm.setAttribute('d',limb(add(P.shoulder,off),fArmI.mid,[[0,6.4],[.5,6.8],[1,5]]));
    fFore.setAttribute('d',limb(fArmI.mid,fArmI.end,[[0,5.2],[.4,5.4],[1,4]]));
    const fh=T(fArmI.end);fHand.setAttribute('cx',fh[0]);fHand.setAttribute('cy',fh[1]);
    // торс
    torso.setAttribute('d',torsoP(P.hip,P.shoulder,.16,1));
    torsoShade.setAttribute('d',torsoP(P.hip,P.shoulder,.16,1)); torsoShade.setAttribute('opacity',0);
    waist.setAttribute('d',torsoP(P.hip,P.shoulder,0,.22,.8));
    // ближняя нога
    thigh.setAttribute('d',limb(P.hip,leg.mid,[[0,11.6],[.5,9.8],[1,7.2]]));
    shin.setAttribute('d',limb(leg.mid,leg.end,[[0,7],[.3,7.9],[1,4.6]]));
    shoe.setAttribute('d',shoeP(leg.end,P.toe));
    const so=P.toe?{x:leg.end.x+3,y:leg.end.y-5.5}:{x:leg.end.x+1,y:leg.end.y-5};
    sole.setAttribute('d',P.toe?'':limb({x:leg.end.x-4,y:leg.end.y-5.3},{x:leg.end.x+17,y:leg.end.y-5.3},[[0,1.6],[1,1.6]]));
    shortT.setAttribute('d',limb(P.hip,add(P.hip,{x:leg.mid.x-P.hip.x,y:leg.mid.y-P.hip.y},.45),[[0,12.2],[1,10]]));
    // голова и шея
    const ux=P.shoulder.x-P.hip.x,uy=P.shoulder.y-P.hip.y,ul=Math.hypot(ux,uy),u={x:ux/ul,y:uy/ul},f={x:u.y,y:-u.x};
    const hc=add(P.shoulder,u,17);
    neck.setAttribute('d',limb(add(P.shoulder,u,2),add(P.shoulder,u,12),[[0,5.2],[1,4.6]]));
    const h1=T(add(add(hc,f,-1.2),u,1.6)),h2=T(add(add(hc,f,1.4),u,-.4)),e1=T(add(hc,f,-1.5)),e2=T(add(add(hc,f,5.2),u,1.5));
    hair.setAttribute('cx',h1[0]);hair.setAttribute('cy',h1[1]);face.setAttribute('cx',h2[0]);face.setAttribute('cy',h2[1]);
    ear.setAttribute('cx',e1[0]);ear.setAttribute('cy',e1[1]);eye.setAttribute('cx',e2[0]);eye.setAttribute('cy',e2[1]);
    // ближняя рука
    uArm.setAttribute('d',limb(P.shoulder,arm.mid,[[0,7.6],[.45,7.2],[1,5.4]]));
    fArm2.setAttribute('d',limb(arm.mid,arm.end,[[0,5.6],[.4,5.8],[1,4.2]]));
    const ds=T(P.shoulder);delt.setAttribute('cx',ds[0]);delt.setAttribute('cy',ds[1]);
    const hn=T(arm.end);hand.setAttribute('cx',hn[0]);hand.setAttribute('cy',hn[1]);
    if(P.plate){plateG.setAttribute('display','');plateG.setAttribute('transform',`translate(${hn[0]},${hn[1]})`);}
    const sx=T({x:(P.hip.x+leg.end.x)/2,y:0});shadow.setAttribute('cx',sx[0]);shadow.setAttribute('rx',P.toe?85:P.bench?70:48);
    if(P.toe)shadow.setAttribute('cx',cx-60);
  }
  return {draw:(p,key)=>draw(p,key)};
}

// Проигрыватель: тайм-цикл, пауза, скорость, подписи фаз
/* Темп из карточки упражнения (EX.tempo) управляет скоростью анимации: фаза 1 · пауза · фаза 2.
   Формат: «2 сек вниз · пауза · 1 сек вверх». Первая часть соответствует первой фазе (EX.phases[0]). */
function parseTempo(str){
  if(!str||/Статика/i.test(str))return null;
  const seg=str.split('·').map(s=>s.trim()),mv=[];let pause=0;
  seg.forEach(s=>{
    if(/пауза/i.test(s)){const m=s.match(/(\d+(?:[.,]\d+)?)/);pause=m?+m[1].replace(',','.'):1;return}
    const r=s.match(/(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)/),n=s.match(/(\d+(?:[.,]\d+)?)/);
    mv.push(r?(+r[1].replace(',','.')+ +r[2].replace(',','.'))/2:n?+n[1].replace(',','.'):/мощно|взрывно/i.test(s)?.8:/контролир/i.test(s)?2:1.5);
  });
  if(mv.length<2)return null;
  const dir=s=>(s.match(/вниз|вверх|к лицу|назад|вперёд/i)||[''])[0].toLowerCase();
  return {t0:mv[0],pause:pause,t1:mv[1],d0:dir(seg[0]),d1:dir(seg[seg.length-1])};
}
function tempoFor(key){
  const e=typeof EX!=='undefined'&&EX[key];const tp=e&&parseTempo(e.tempo);if(!tp||key==='plank')return null;
  const tail=.35,T=tp.t0+tp.pause+tp.t1+tail,ez=u=>.5-.5*Math.cos(Math.PI*Math.min(1,Math.max(0,u)));
  if(e.tempoSwap){const u=tp.t1,dn=tp.t0,top=tail;
    return {T,p:cyc=>{const t=cyc*T;
      if(t<u)return ez(t/u);
      if(t<u+top)return 1;
      if(t<u+top+dn)return 1-ez((t-u-top)/dn);
      return 0},
    ph:cyc=>cyc*T<u+top?0:1,info:tp};}
  return {T,p:cyc=>{const t=cyc*T;
      if(t<tp.t0)return ez(t/tp.t0);
      if(t<tp.t0+tp.pause)return 1;
      if(t<tp.t0+tp.pause+tp.t1)return 1-ez((t-tp.t0-tp.pause)/tp.t1);
      return 0},
    ph:cyc=>cyc*T<tp.t0+tp.pause?0:1,info:tp};
}
function player(svg,key,opts={}){
  const fig=makeFigure(svg);const draw=p=>fig.draw(p,key);
  const tp=opts.tempo===false?null:tempoFor(key);
  const st={speed:1,paused:false,t:0,last:performance.now(),reps:0,raf:0,cyc:0,onPhase:null,onRep:null,period:tp?tp.T:(opts.period||3.6),hold:key==='plank'};
  function loop(now){
    const dt=(now-st.last)/1000;st.last=now;
    if(!st.paused){
      st.t+=dt*st.speed;
      const c=(st.t/st.period);
      const cyc=c-Math.floor(c);
      const p=tp?tp.p(cyc):0.5-0.5*Math.cos(2*Math.PI*cyc);
      draw(p);
      const ph=tp?tp.ph(cyc):(cyc<0.5?0:1);
      if(ph!==st.cyc){st.cyc=ph;st.onPhase&&st.onPhase(ph);}
      const n=Math.floor(c);
      if(n!==st.reps){st.reps=n;st.onRep&&st.onRep(n);}
    }
    st.raf=requestAnimationFrame(loop);
  }
  st.raf=requestAnimationFrame(loop);
  st.stop=()=>cancelAnimationFrame(st.raf);
  st.draw=draw;
  return st;
}
