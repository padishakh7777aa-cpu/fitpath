/* ===== Тренировка с гидом: приложение ведёт по шагам, человеку остаётся только делать ===== */
const GD={player:null,key:null,rest:null,timer:null,token:0};
const RATIO={squat:[.6,.9,1.2],bench:[.5,.8,1],deadlift:[.7,1.1,1.5],ohp:[.35,.55,.7],row:[.4,.6,.8],rdl:[.5,.8,1],curl:[.2,.3,.4],hipthrust:[.6,1,1.5],calf:[.5,.8,1],lunge:[.3,.45,.6],pulldown:[.5,.7,.9],pushdown:[.25,.4,.5]};
const BWEX=['pushup','plank','pullup','dips'];
const lvI=()=>({beginner:0,advanced:1,pro:2}[S.level]||0);
const r25=x=>Math.max(0,Math.round(x/2.5)*2.5);
function plain(s){
  return String(s||'').replace(/топ-сет/gi,'тяжёлый подход').replace(/back-off/gi,'облегчённый подход').replace(/RIR\s*([0-9–-]+)/g,'запас $1 повт.')
    .replace(/дропсет\w*/gi,'подход со снижением веса').replace(/суперсет\w*/gi,'два упражнения подряд').replace(/Предутомление/gi,'Разогрев мышцы перед основным упражнением').replace(/ЦНС/g,'нервная система').replace(/\bAMRAP\b/gi,'максимум');
}
function blockReps(){const w=weekInfo(curProg()).wk;return w<=4?'6':w<=8?'4':'3'}
function repsText(r){
  let s=String(r);if(/по блоку/.test(s))s=blockReps();
  s=s.split('@')[0].replace(/топ-сет|back-off/gi,'').replace(/макс(?!\w)/g,'максимум').replace(/\s+/g,' ').trim();
  return s;
}
const fw=w=>(w%1===0?String(w):String(w).replace('.',','));

function parseR(r){
  let s=String(r).split('@')[0].replace(/–/g,'-');const nums=s.match(/\d+/g)||[];
  if(/по блоку/.test(r)){const n=+blockReps();return {lo:n,hi:n,timed:false,open:false}}
  if(!nums.length)return {lo:8,hi:10,timed:false,open:true};
  return {lo:+nums[0],hi:+nums[nums.length-1],timed:/сек/.test(r),open:/отказ|макс/.test(r)};
}
function suggestWeight(e,key){
  if(BWEX.includes(key))return 0;
  const a=S.log[key]||[];
  if(a.length){
    const lastD=a[a.length-1].d,sess=a.filter(x=>x.d===lastD),w=Math.max(...sess.map(x=>x.w)),pr=parseR(e.r);
    const hard=sess.some(x=>x.fb==='hard'),ok=sess.every(x=>x.r>=pr.hi)&&!hard;
    const inc=['curl','pushdown'].includes(key)?1.25:2.5;
    return ok?w+inc:hard?Math.max(0,w-2.5):w;
  }
  const ratio=RATIO[key];
  if(ratio&&S.prof&&S.prof.w)return r25(S.prof.w*ratio[lvI()]);
  return null;
}
/* звук */
let _ac=null;
function beep(f=880,d=.12,v=.15){
  if(S.snd===false)return;
  try{_ac=_ac||new (window.AudioContext||window.webkitAudioContext)();if(_ac.state==='suspended')_ac.resume();
    const o=_ac.createOscillator(),gn=_ac.createGain();o.frequency.value=f;o.type='sine';gn.gain.value=v;o.connect(gn);gn.connect(_ac.destination);
    o.start();gn.gain.exponentialRampToValueAtTime(.0001,_ac.currentTime+d);o.stop(_ac.currentTime+d+.02)}catch(e){}
}
function guideDay(g){return progById(g.pid).days[g.di]}
function buildSteps(g){
  const D=guideDay(g),steps=[];
  D.ex.forEach((e,ei)=>{
    const key=exKey(e.id),pr=parseR(e.r),base=g.w[ei]??g.base[ei];
    if(ei===0&&base>0&&!pr.timed)[[.4,8],[.6,5],[.8,3]].forEach(([f,r])=>steps.push({t:'warm',ei,w:r25(base*f),r,rest:40}));
    for(let si=0;si<e.s;si++)steps.push({t:'work',ei,si,sets:e.s,r:pr.timed?pr.hi:Math.min(pr.hi,pr.open?pr.hi:pr.hi),rest:e.rest,pr});
  });
  return steps;
}
function startGuide(pid,di){
  const P=progById(pid),D=P.days[di],base={};
  D.ex.forEach((e,ei)=>{const k=exKey(e.id),w=suggestWeight(e,k);base[ei]=w==null?0:w});
  S.g={pid,di,start:Date.now(),i:0,phase:'intro',w:{},base,unk:D.ex.map((e,ei)=>suggestWeight(e,exKey(e.id))==null),res:[],cur:{}};
  store.set('gsess',S.g);S.screen='guide';render();
}
function gDur(g){const D=guideDay(g);let s=0;D.ex.forEach(e=>{s+=e.s*(45+e.rest)});return Math.round(s/60)}

/* ---------- экран ---------- */
function guideScreen(){
  return `<div id="gtop"><button class="back" id="gexit" style="margin:0">✕ Выйти</button><div class="hint" id="gstep"></div><button class="chip" id="gsnd">${S.snd===false?'🔇':'🔊'}</button></div>
  <div id="gprog"><div id="gprogbar"></div></div>
  <div class="stage3" id="gstage" style="height:250px"><div class="phase" id="gph"></div></div>
  <div id="gbody"></div>`;
}
let _wl=null;
async function keepAwake(on){
  try{
    if(on){if(navigator.wakeLock&&!_wl)_wl=await navigator.wakeLock.request('screen')}
    else if(_wl){await _wl.release();_wl=null}
  }catch(e){_wl=null}
  try{if(tg){on?tg.enableClosingConfirmation&&tg.enableClosingConfirmation():tg.disableClosingConfirmation&&tg.disableClosingConfirmation()}}catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&S.screen==='guide'&&!_wl)keepAwake(true)});
function bindGuide(){
  const g=S.g;keepAwake(true);
  $('#gexit').onclick=()=>{
    if(g.res.some(x=>x.t==='work')){if(confirm('Завершить тренировку? Выполненные подходы сохранятся.'))finishGuided()}
    else if(confirm('Выйти без сохранения?')){guideCleanup();S.g=null;store.set('gsess',null);S.screen=null;render()}};
  const sb=$('#gsnd');if(sb)sb.onclick=()=>{S.snd=S.snd===false;store.set('snd',S.snd);sb.textContent=S.snd===false?'🔇':'🔊';if(S.snd!==false)beep(880,.1)};
  updateGuide();
}
function guideCleanup(){
  GD.token++;keepAwake(false);
  if(GD.player){try{GD.player.stop()}catch(e){}GD.player=null;GD.key=null}
  if(GD.timer){clearInterval(GD.timer);GD.timer=null}
  if(typeof stopRest==='function')stopRest();
}
async function setStage(key){
  if(GD.key===key)return;
  GD.key=key;const tk=++GD.token;
  if(GD.player){try{GD.player.stop()}catch(e){}GD.player=null}
  const wrap=$('#gstage');if(!wrap)return;
  [...wrap.querySelectorAll('canvas,svg,.gph')].forEach(n=>n.remove());
  const ph=$('#gph'),e=EX[key];
  if(!e){ph.textContent='';const d=document.createElement('div');d.className='gph';d.style.cssText='position:absolute;inset:0;display:grid;place-items:center;font-size:56px';d.textContent='🏋️';wrap.appendChild(d);return}
  ph.textContent=e.phases[0];
  const period=key==='plank'?5:3.6;let pl=null;
  try{if(has3D()&&typeof mxHas==='function'){if(MX.ready)await MX.ready;
      if(mxHas(key))pl=await playerMx(wrap,key,{period,mus:MUS[key]});}}catch(err){pl=null}
  if(tk!==GD.token){if(pl)pl.stop();return}
  if(!pl){try{if(has3D())pl=player3d(wrap,key,{mus:MUS[key],period})}catch(err){pl=null}}
  if(!pl){const sv=document.createElementNS('http://www.w3.org/2000/svg','svg');sv.style.cssText='width:100%;height:100%';wrap.insertBefore(sv,wrap.firstChild);pl=player(sv,key,{period})}
  if(tk!==GD.token){pl.stop();return}
  pl.setView&&pl.setView(35);pl.onPhase=p=>{const x=$('#gph');if(x)x.textContent=e.phases[p]};
  GD.player=pl;
}
function stepLabel(g,steps){
  const s=steps[g.i];if(!s)return '';const D=guideDay(g);
  return `Упражнение ${s.ei+1} из ${D.ex.length}`;
}
function updateGuide(){
  const g=S.g;if(!g||S.screen!=='guide')return;
  const steps=buildSteps(g),D=guideDay(g);
  $('#gprogbar').style.width=Math.round(g.i/Math.max(1,steps.length)*100)+'%';
  if(g.phase==='intro'){$('#gstep').textContent='Обзор тренировки';setStage(exKey(D.ex[0].id));return gIntro(g,D,steps)}
  const s=steps[g.i];
  if(!s){return finishGuided()}
  $('#gstep').textContent=stepLabel(g,steps);
  if(g.phase==='rest'){const nx=steps[g.i+1];setStage(exKey(D.ex[(nx||s).ei].id));return gRest(g,D,steps,s,nx)}
  setStage(exKey(D.ex[s.ei].id));gWork(g,D,steps,s);
}
function gIntro(g,D,steps){
  $('#gbody').innerHTML=`<h1 style="margin:12px 0 4px">${D.n}</h1><div class="hint">${D.ex.length} ${plural(D.ex.length,['упражнение','упражнения','упражнений'])} · около ${gDur(g)} минут</div>
  <button class="btn xl pulse" id="gstart" style="margin:12px 0">▶ Погнали!</button>
  <div class="card"><table>${D.ex.map((e,ei)=>{const w=g.base[ei],k=exKey(e.id),bw=BWEX.includes(k);
    return `<tr><td><b>${exName(e.id)}</b><div class="hint">${e.s} ${plural(e.s,['подход','подхода','подходов'])} по ${repsText(e.r)}</div></td><td style="text-align:right;white-space:nowrap">${bw?'вес тела':g.unk[ei]?'подберём':'<b>'+fw(w)+' кг</b>'}</td></tr>`}).join('')}</table></div>
  <div class="hint" style="text-align:center">Просто делай то, что показываю. Вес и отдых я подскажу.</div>`;
  $('#gstart').onclick=()=>{hap('medium');beep(880,.08);g.phase='step';store.set('gsess',g);updateGuide()};
}
function gWork(g,D,steps,s){
  const e=D.ex[s.ei],k=exKey(e.id),ex=EX[k],bw=BWEX.includes(k),warm=s.t==='warm';
  const w=warm?s.w:(g.w[s.ei]??g.base[s.ei]),pr=s.pr||{},timed=!warm&&pr.timed;
  g.cur={w:w||0,r:s.r};
  const unk=g.unk[s.ei]&&!warm&&!bw&&!timed&&!(g.w[s.ei]>0);
  const big=()=>timed?`${s.r} секунд`:`${bw?(g.cur.w>0?'+'+fw(g.cur.w)+' кг':'вес тела'):fw(g.cur.w)+' кг'} × ${g.cur.r}`;
  $('#gbody').innerHTML=`
   <div class="row sb" style="margin-top:12px"><h1 style="margin:0">${exName(e.id)}</h1><span class="tag ${warm?'warn':''}">${warm?'Разминка':`${s.si+1} из ${s.sets}`}</span></div>
   <div class="bigline" id="gbig">${unk?'Выбери вес':big()}</div>
   <div class="hint" style="text-align:center">${warm?'Лёгкий подход для разогрева':`${/отказ/.test(e.r)?'Делай '+repsText(e.r).replace(/\s*до отказа/,'')+' повторений, пока не почувствуешь, что почти предел — с хорошей техникой':'Сделай '+repsText(e.r)+' повторений. Остановись, когда останется ещё '+e.rir+' в запасе'}.`}</div>
   ${e.note&&!warm?`<div class="hint" style="text-align:center;margin-top:4px">💡 ${plain(e.note)}</div>`:''}
   ${timed?`<div class="card" style="text-align:center"><div id="gtimer" style="font-family:Impact,sans-serif;font-size:64px;color:var(--accent)">${s.r}</div><button class="btn xl" id="gtstart">⏱ Старт</button></div>`:
   `<div class="gsteppers" id="gst" style="${unk?'':'display:none'}">
     <div class="gst"><span class="hint">${bw?'Добавить вес, кг':'Вес, кг'}</span><div><button data-d="w-2.5">−</button><b id="gw">${fw(g.cur.w)}</b><button data-d="w+2.5">+</button></div></div>
     <div class="gst"><span class="hint">Повторы</span><div><button data-d="r-1">−</button><b id="gr">${s.r}</b><button data-d="r+1">+</button></div></div></div>
   ${unk?`<div class="hint" style="margin:4px 0 8px">Не знаю твой стартовый вес. Подбери такой, чтобы закончить с запасом — дальше я запомню.</div>`:''}
   <button class="btn xl" id="gdone">✔ Сделал</button>
   ${unk?'':'<div style="text-align:center;margin-top:8px"><a href="#" id="gedit" class="lnk">Изменить вес или повторы</a></div>'}`}
   ${ex&&!warm?`<details class="card"><summary>📖 Как делать правильно</summary><ol style="padding-left:20px;margin:8px 0">${ex.steps.map(x=>`<li>${x}</li>`).join('')}</ol><div>${ex.mistakes.map(m=>`<span class="tag bad">${m}</span>`).join('')}</div></details>`:''}
   <div style="text-align:center;margin-top:10px"><a href="#" id="gskip" class="lnk">Пропустить упражнение</a></div>`;
  const cur=g.cur,gb=$('#gbig');
  const ge=$('#gedit');if(ge)ge.onclick=ev=>{ev.preventDefault();$('#gst').style.display='grid';ge.remove()};
  document.querySelectorAll('.gsteppers [data-d]').forEach(b=>b.onclick=()=>{
    const k2=b.dataset.d[0],v=parseFloat(b.dataset.d.slice(1));hap();
    if(k2==='w'){cur.w=Math.max(0,+(cur.w+v).toFixed(2));$('#gw').textContent=fw(cur.w)}else{cur.r=Math.max(1,cur.r+v);$('#gr').textContent=cur.r}
    if(gb)gb.textContent=big()});
  const done=r=>{hap('heavy');g.res.push({t:s.t,ei:s.ei,si:s.si,w:cur.w,r:r??cur.r,fb:null});
    if(!warm)g.w[s.ei]=cur.w;g.phase='rest';g.restEnd=Date.now()+(s.rest||60)*1000;g.restTotal=(s.rest||60);store.set('gsess',g);updateGuide()};
  const bd=$('#gdone');if(bd)bd.onclick=()=>done();
  const ts=$('#gtstart');if(ts)ts.onclick=()=>{let left=s.r;ts.disabled=true;const el=$('#gtimer');
    GD.timer=setInterval(()=>{left--;el.textContent=left;if(left<=3&&left>0)beep(660,.1);if(left<=0){clearInterval(GD.timer);GD.timer=null;beep(1040,.4,.2);done(s.r)}},1000)};
  $('#gskip').onclick=ev=>{ev.preventDefault();let j=g.i;while(steps[j]&&steps[j].ei===s.ei)j++;g.i=j;g.phase='step';store.set('gsess',g);updateGuide()};
}
function gRest(g,D,steps,s,nx){
  const last=g.res[g.res.length-1],ne=nx?D.ex[nx.ei]:null;
  const nw=nx?(nx.t==='warm'?nx.w:(g.w[nx.ei]??g.base[nx.ei])):0;
  $('#gbody').innerHTML=`<div style="text-align:center;margin-top:10px"><div class="hint">Отдых</div>
   <div class="ring" id="gring"><div class="ringin"><b id="gcount">0:00</b></div></div></div>
   ${nx?`<div class="card"><div class="hint">Дальше</div><b>${exName(ne.id)}</b><div class="hint">${nx.t==='warm'?'Разминка':`Подход ${nx.si+1}/${nx.sets}`} · ${BWEX.includes(exKey(ne.id))?'вес тела':fw(nw)+' кг'} × ${nx.r}${parseR(ne.r).timed?' сек':''}</div></div>`:`<div class="card"><b>Это был последний подход 🎉</b><div class="hint">Нажми «Завершить», чтобы увидеть итоги.</div></div>`}
   ${last&&last.t==='work'?`<div class="card"><div class="hint" style="margin-bottom:6px">Как был подход?</div><div class="seg" id="gfb"><button data-f="hard">😅 Тяжело</button><button data-f="ok" class="on">👌 Нормально</button><button data-f="easy">😎 Легко</button></div></div>`:''}
   <div class="row" style="gap:8px"><button class="btn ghost" id="g30">+30 сек</button><button class="btn" id="gnext">${nx?'Дальше →':'🏁 Завершить'}</button></div>`;
  const fb=last&&last.t==='work'?last:null;
  document.querySelectorAll('#gfb button').forEach(b=>b.onclick=()=>{
    hap();document.querySelectorAll('#gfb button').forEach(x=>x.classList.toggle('on',x===b));
    fb.fb=b.dataset.f;const ei=fb.ei,more=nx&&nx.ei===ei&&nx.t==='work';
    if(more){const cw=g.w[ei]??0;if(b.dataset.f==='hard')g.w[ei]=Math.max(0,cw-2.5);else if(b.dataset.f==='easy')g.w[ei]=cw+2.5;else g.w[ei]=cw;updateNextCard(g,D,steps)}
    store.set('gsess',g)});
  const adv=()=>{if(GD.timer){clearInterval(GD.timer);GD.timer=null}g.i++;g.phase='step';g.restEnd=null;store.set('gsess',g);updateGuide()};
  $('#gnext').onclick=adv;$('#g30').onclick=()=>{g.restEnd+=30000;g.restTotal+=30};
  const tick=()=>{
    const left=Math.max(0,Math.ceil((g.restEnd-Date.now())/1000)),c=$('#gcount'),ring=$('#gring');if(!c||!ring)return;
    c.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
    ring.style.setProperty('--p',Math.max(0,Math.min(100,left/g.restTotal*100))+'%');
    if(left<=3&&left>0&&g._lb!==left){g._lb=left;beep(660,.1);try{tg&&tg.HapticFeedback.impactOccurred('light')}catch(e){}}
    if(left<=0){beep(1040,.4,.2);try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}try{tg&&tg.HapticFeedback.notificationOccurred('warning')}catch(e){}adv()}
  };
  if(GD.timer)clearInterval(GD.timer);GD.timer=setInterval(tick,250);tick();
}
function updateNextCard(g,D,steps){
  // обновляем строку «Дальше» после выбора «тяжело/легко»
  const nx=steps[g.i+1];if(!nx||nx.t!=='work')return;const ne=D.ex[nx.ei],nw=g.w[nx.ei]??g.base[nx.ei];
  const card=document.querySelector('#gbody .card .hint:nth-child(3)');
  if(card)card.textContent=`Подход ${nx.si+1}/${nx.sets} · ${BWEX.includes(exKey(ne.id))?'вес тела':fw(nw)+' кг'} × ${nx.r}${parseR(ne.r).timed?' сек':''}`;
}
function finishGuided(){
  const g=S.g,P=progById(g.pid),D=guideDay(g);
  const work=g.res.filter(x=>x.t==='work');
  if(!work.length){guideCleanup();S.g=null;store.set('gsess',null);S.screen=null;render();return}
  let tonnage=0;const sug=[],by={};
  work.forEach(x=>{(by[x.ei]=by[x.ei]||[]).push(x)});
  Object.keys(by).forEach(ei=>{
    const e=D.ex[+ei],k=exKey(e.id),a=S.log[k]||(S.log[k]=[]),pr=parseR(e.r);
    by[ei].forEach(x=>{tonnage+=x.w*x.r;a.push({d:today().slice(5),ts:Date.now(),w:x.w,r:x.r,p:P.id,fb:x.fb||'ok'})});
    const ok=by[ei].length>=e.s&&by[ei].every(x=>x.r>=pr.hi&&x.fb!=='hard');
    if(ok&&!BWEX.includes(k))sug.push(`${exName(e.id)} → +${['curl','pushdown'].includes(k)?'1,25':'2,5'} кг`);
    if(by[ei].some(x=>x.fb==='hard'))sug.push(`${exName(e.id)}: было тяжело — в следующий раз вес чуть ниже`);
  });
  store.set('log',S.log);S.done[today()]=D.n;store.set('done',S.done);
  const mins=Math.max(1,Math.round((Date.now()-g.start)/60000));
  S.summary={name:D.n,tonnage:Math.round(tonnage),sets:work.length,mins,sug};
  guideCleanup();S.g=null;store.set('gsess',null);S.screen='summary';hap('heavy');render();
}
