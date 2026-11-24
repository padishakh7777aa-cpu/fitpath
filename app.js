const tg=window.Telegram&&window.Telegram.WebApp;
if(tg){try{tg.ready();tg.expand();tg.setHeaderColor&&tg.setHeaderColor('#09090b');tg.setBackgroundColor&&tg.setBackgroundColor('#09090b');}catch(e){}}
const hap=t=>{try{tg&&tg.HapticFeedback&&tg.HapticFeedback.impactOccurred(t||'light')}catch(e){}};
const $=s=>document.querySelector(s);
const cs=tg&&tg.CloudStorage&&tg.isVersionAtLeast&&tg.isVersionAtLeast('6.9')?tg.CloudStorage:null;
const _csT={};
function csSave(k,v){
  if(!cs)return;clearTimeout(_csT[k]);
  _csT[k]=setTimeout(()=>{try{const s=JSON.stringify(v),n=Math.max(1,Math.ceil(s.length/3500));
    for(let i=0;i<n;i++)cs.setItem(`fp_${k}_${i}`,s.slice(i*3500,(i+1)*3500));cs.setItem(`fp_${k}_n`,String(n));}catch(e){}},1500);
}
function csLoad(k,cb){
  try{cs.getItem(`fp_${k}_n`,(e,n)=>{n=parseInt(n);if(e||!n)return cb(null);
    const keys=[...Array(n)].map((_,i)=>`fp_${k}_${i}`);
    cs.getItems(keys,(e2,res)=>{if(e2)return cb(null);try{cb(JSON.parse(keys.map(x=>res[x]||'').join('')))}catch(x){cb(null)}})})}catch(e){cb(null)}
}
const store={get(k,d){try{const v=localStorage.getItem('fp_'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('fp_'+k,JSON.stringify(v))}catch(e){}csSave(k,v)}};
// подтягиваем данные из облака Telegram (синхронизация между устройствами)
function cloudSync(){
  if(!cs)return;let changed=false,pending=0;
  const apply={log:v=>S.log=v,done:v=>S.done=v,bw:v=>S.bw=v,prof:v=>S.prof=v,prog:v=>S.prog=v,level:v=>S.level=v,onb:v=>0};
  ['log','done','bw','prof','prog','level'].forEach(k=>{pending++;csLoad(k,cv=>{
    if(cv!=null){const lv=store.get(k,null);
      const big=['log','done','bw'].includes(k);
      const richer=big?(JSON.stringify(cv).length>JSON.stringify(lv||{}).length):(lv==null);
      if(richer){try{localStorage.setItem('fp_'+k,JSON.stringify(cv))}catch(e){};apply[k](cv);changed=true}
      else csSave(k,lv);
    }else{const lv=store.get(k,null);if(lv!=null)csSave(k,lv)}
    if(--pending===0&&changed&&!S.sess&&!S.ex)render();})});
}
const today=()=>new Date().toISOString().slice(0,10);
const S={level:store.get('level',null),tab:'plan',ex:null,prof:store.get('prof',{sex:'m',age:25,w:75,h:178,act:1.55,goal:'mass'}),age18:false,done:store.get('done',{}),log:store.get('log',{}),view:35,prog:store.get('prog',null),sess:store.get('sess',null),g:store.get('gsess',null),snd:store.get('snd',true),screen:null,more:'tools'};
let activePlayer=null;
const stopPlayer=()=>{if(activePlayer){activePlayer.stop();activePlayer=null}};
const quoteOfDay=()=>QUOTES[Math.floor(Date.now()/864e5)%QUOTES.length];
function toast(t){const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.appendChild(e);try{tg&&tg.HapticFeedback&&tg.HapticFeedback.notificationOccurred('success')}catch(_){}setTimeout(()=>e.remove(),1800)}

const TABS=[['plan','🏠','Сегодня'],['food','🥗','Питание'],['prog','📈','Прогресс'],['more','☰','Ещё']];
const SUBTABS=['tech','mech','bio','tools','sup','health'];

function renderNav(){
  const n=$('#nav');
  const cur=SUBTABS.includes(S.tab)?'more':S.tab;
  n.innerHTML=TABS.map(([id,i,l])=>`<button data-t="${id}" class="${cur===id&&!S.ex?'on':''}"><span class="i">${i}</span>${l}</button>`).join('');
  n.querySelectorAll('button').forEach(b=>b.onclick=()=>{hap();S.tab=b.dataset.t;S.ex=null;S.screen=null;S.progPick=false;render()});
  n.style.display=(S.level&&S.screen!=='guide')?'flex':'none';
  const c=$('#levelChip');
  c.style.display='none';
  if(S.level)c.textContent=LEVELS[S.level].ico+' '+LEVELS[S.level].name;
  c.onclick=()=>{S.level=null;S.ex=null;render()};
}

function render(){
  if(S.screen!=='guide'&&typeof guideCleanup==='function')guideCleanup();
  stopPlayer();if(S._tick){clearInterval(S._tick);S._tick=null}
  renderNav();
  const v=$('#view');
  window.scrollTo(0,0);
  if(!S.level){v.innerHTML=startScreen();bindStart();return}
  if(S.ex){v.innerHTML=exScreen(S.ex);bindEx(S.ex);return}
  if(S.screen==='onb'){v.innerHTML=onbScreen();bindOnb();return}
  if(S.screen==='guide'&&S.g){v.innerHTML=guideScreen();bindGuide();return}
  if(S.screen==='session'&&S.sess){v.innerHTML=sessionScreen();bindSession();return}
  if(S.screen==='summary'&&S.summary){v.innerHTML=summaryScreen();$('#sumok').onclick=()=>{S.screen=null;S.summary=null;render()};$('#share').onclick=()=>shareSummary();return}
  const map={plan:planScreen,tech:techScreen,mech:mechScreen,bio:bioScreen,food:foodScreen,prog:progScreen,tools:toolsScreen,sup:supScreen,health:healthScreen,more:moreScreen};
  v.innerHTML=(SUBTABS.includes(S.tab)?'<button class="back" id="moreback">‹ Ещё</button>':'')+map[S.tab]()+`<div class="disc">Неофициальное приложение в духе легенды бодибилдинга. Не связано с Ронни Коулманом.</div>`;
  ({plan:bindPlan,tech:bindTech,mech:()=>{},bio:bindBio,food:bindFood,prog:bindProg,tools:bindTools,sup:()=>{},health:bindHealth,more:bindMore})[S.tab]();
  const mb=$('#moreback');if(mb)mb.onclick=()=>{S.tab='more';render()};
}

/* ---------- Выбор уровня ---------- */
function levelScreen(){
  const q=quoteOfDay();
  return `<div class="hero"><div class="q">${q[0]}</div><div class="tr">${q[1]}</div></div>
  <h1>Выбери свой уровень</h1><p class="hint">Программа, питание и советы подстроятся под тебя. Уровень можно сменить в любой момент.</p>`+
  Object.values(LEVELS).map(l=>`<div class="card click lvl" data-l="${l.id}"><div class="ico">${l.ico}</div><div><b>${l.name}</b> <span class="tag">${l.tag}</span><div class="hint">${l.desc}</div></div></div>`).join('');
}
function bindLevel(){
  document.querySelectorAll('[data-l]').forEach(c=>c.onclick=()=>{hap('medium');S.level=c.dataset.l;store.set('level',S.level);S.prog=null;store.set('prog',null);S.tab='plan';S.screen=store.get('onb',false)?null:'onb';render()});
}

function weekCount(){const now=Date.now();return Object.keys(S.done).filter(d=>now-new Date(d).getTime()<7*864e5).length}
function streak(){let n=0,d=new Date();if(!S.done[today()])d.setDate(d.getDate()-1);
  for(;;){const k=d.toISOString().slice(0,10);if(S.done[k]){n++;d.setDate(d.getDate()-1)}else break}return n}

/* ---------- Техника ---------- */
function techScreen(){
  return `<h1>Техника в 3D</h1><p class="hint">Крути атлета пальцем, смотри движение со всех сторон. Подсвечиваются работающие мышцы.</p>
  <div class="exlist">${Object.keys(EX).map(k=>`<div class="card click" data-ex="${k}"><div class="th" data-th="${k}" style="min-height:80px"></div><b>${EX[k].name}</b><div class="hint">${EX[k].muscles}</div></div>`).join('')}</div>`;
}
function bindTech(){
  const els=[...document.querySelectorAll('[data-th]')];
  const ok=has3D();
  const fill=(e,url)=>{const im=new Image();im.src=url;e.innerHTML='';e.appendChild(im)};
  const svgThumb=(e,k)=>{const sv=document.createElementNS('http://www.w3.org/2000/svg','svg');e.appendChild(sv);const f=makeFigure(sv);f.draw(k==='plank'?0:0.5,k)};
  (async()=>{
    try{if(MX.ready)await MX.ready}catch(e){}
    for(const e of els){
      if(!document.body.contains(e))return; // ушли с экрана
      const k=e.dataset.th;
      try{
        if(ok&&typeof mxHas==='function'&&mxHas(k)){try{fill(e,await thumbMx(k,MUS[k]));await new Promise(r=>setTimeout(r,16));continue}catch(err){console.warn('thumbMx',err)}}
        if(ok)fill(e,thumb3d(k,MUS[k]));else svgThumb(e,k);
      }catch(err){}
      await new Promise(r=>setTimeout(r,16));
    }
  })();
  document.querySelectorAll('[data-ex]').forEach(c=>c.onclick=()=>{hap();S.ex=c.dataset.ex;render()});
}
function logHtml(k){
  const h=(S.log[k]||[]).slice(-4).reverse();
  return `<h2>Дневник</h2><div class="card"><div class="hint">Записывай рабочий подход — приложение запомнит твои рекорды.</div>
  <div class="logrow"><input id="lw" type="number" inputmode="decimal" placeholder="Вес, кг"><input id="lr" type="number" inputmode="numeric" placeholder="Повторы"></div>
  <button class="btn" id="lsave" style="margin-top:8px">Записать подход</button>
  <div class="hist" id="hist">${histHtml(k)}</div></div>`;
}
function histHtml(k){
  const a=S.log[k]||[];if(!a.length)return 'Пока нет записей.';
  const pr=a.reduce((m,x)=>x.w>m.w?x:m,a[0]);
  return `🏆 Рекорд: <b>${pr.w} кг × ${pr.r}</b><br>`+a.slice(-4).reverse().map(x=>`${x.d}: ${x.w} кг × ${x.r}`).join('<br>');
}
function exScreen(k){
  const e=EX[k];
  const mus={legs:'Ноги',glutes:'Ягодицы',back:'Спина',chest:'Грудь',shoulders:'Плечи',arms:'Руки',abs:'Пресс'};
  return `<button class="back" id="back">‹ Назад</button><h1>${e.name}</h1><div>${(MUS[k]||[]).map(m=>`<span class="tag warn">${mus[m]}</span>`).join('')}<span class="hint">${e.muscles}</span></div>
  <div class="stage3" id="figwrap"><div class="phase" id="ph">${e.phases[0]}</div><div class="reps" id="rp">Повтор 1</div><div class="hintdrag">☝ покрути пальцем</div></div>
  <div class="views" id="views"><button data-v="0">Сбоку</button><button data-v="35" class="on">3/4</button><button data-v="90">Спереди</button><button data-v="spin">⟳ Вращать</button></div>
  <div class="ctrl"><button class="btn ghost small" id="pp">⏸ Пауза</button><button class="btn ghost small" id="sp">🐢 Медленно</button></div>
  <h2>Как делать</h2><div class="card"><ol style="padding-left:20px;margin:0">${e.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div>${mechHtml(k)}
  <h2>Частые ошибки</h2><div class="card">${e.mistakes.map(m=>`<span class="tag bad">${m}</span>`).join('')}</div>
  <div class="card"><b>Темп:</b> ${e.tempo}</div>${logHtml(k)}`;
}
function bindEx(k){
  const e=EX[k];
  $('#back').onclick=()=>{S.ex=null;render()};
  const wrap=$('#figwrap');let pl;
  const period=k==='plank'?5:3.6;
  const wire=()=>{
    activePlayer=pl;
    pl.onPhase=ph=>{$('#ph').textContent=e.phases[ph]};
    pl.onRep=n=>{$('#rp').textContent='Повтор '+(n+1)};
    $('#pp').onclick=function(){pl.paused=!pl.paused;this.textContent=pl.paused?'▶ Продолжить':'⏸ Пауза';hap()};
    $('#sp').onclick=function(){pl.speed=pl.speed===1?0.4:1;this.textContent=pl.speed===1?'🐢 Медленно':'🐇 Обычная';hap()};
  };
  const fallback=()=>{
    if(S.ex!==k||activePlayer)return;
    try{if(has3D()){pl=player3d(wrap,k,{mus:MUS[k],period});pl.setView(35);wire();return}}catch(err){}
    const sv=document.createElementNS('http://www.w3.org/2000/svg','svg');sv.style.cssText='width:100%;height:100%';wrap.insertBefore(sv,wrap.firstChild);pl=player(sv,k,{period});$('#views').style.display='none';wire();
  };
  if(has3D()&&typeof mxHas==='function'&&mxHas(k)){
    const ld=document.createElement('div');ld.className='hintdrag';ld.style.top='45%';ld.style.fontSize='13px';ld.textContent='Загружаю модель…';wrap.appendChild(ld);
    playerMx(wrap,k,{period,mus:MUS[k]}).then(p=>{ld.remove();if(S.ex!==k){p.stop();return}pl=p;pl.setView(35);wire();}).catch(err=>{ld.remove();console.warn('mx fail',err);fallback()});
  }else fallback();
  document.querySelectorAll('#views button').forEach(b=>b.onclick=()=>{hap();
    document.querySelectorAll('#views button').forEach(x=>x.classList.remove('on'));b.classList.add('on');
    if(!pl)return;if(b.dataset.v==='spin'){pl.spin=!pl.spin}else{pl.setView(+b.dataset.v)}
    if(b.dataset.v==='spin'&&!pl.spin)b.classList.remove('on')});
  $('#lsave').onclick=()=>{
    const w=parseFloat($('#lw').value),r=parseInt($('#lr').value);
    if(!(w>=0)||!(r>0)){toast('Введи вес и повторы');return}
    const a=S.log[k]||(S.log[k]=[]);const prev=a.reduce((m,x)=>Math.max(m,x.w),0);
    a.push({d:today().slice(5),ts:Date.now(),w,r});store.set('log',S.log);hap('medium');
    $('#hist').innerHTML=histHtml(k);
    toast(w>prev&&prev>0?'Новый рекорд! Yeah buddy!':'Light weight!');
  };
}

/* ---------- Питание ---------- */
function calcNutrition(p){
  const bmr=10*p.w+6.25*p.h-5*p.age+(p.sex==='m'?5:-161);
  const tdee=bmr*p.act;
  const delta={mass:{beginner:.12,advanced:.08,pro:.05},cut:{beginner:-.2,advanced:-.2,pro:-.15},keep:{beginner:0,advanced:0,pro:0}}[p.goal][S.level];
  const kcal=Math.round(tdee*(1+delta));
  const prot=Math.round(p.w*(p.goal==='cut'?2.2:1.8));
  const fat=Math.round(p.w*(p.goal==='cut'?0.8:0.9));
  const carb=Math.max(0,Math.round((kcal-prot*4-fat*9)/4));
  return {bmr:Math.round(bmr),tdee:Math.round(tdee),kcal,prot,fat,carb,water:(p.w*0.035).toFixed(1)};
}
const r5=x=>Math.max(5,Math.round(x/5)*5);
function mealPlan(r,variant){
  const meals=[['Завтрак',.25,0],['Обед',.3,1],['Перекус / до тренировки',.2,2],['Ужин',.25,3]];
  const pick=(arr,i)=>arr[(i+variant)%arr.length];
  return meals.map(([n,f,i])=>{
    const P=r.prot*f,C=r.carb*f,F=r.fat*f;
    const pf=pick(i===0?[FOODS.protein[4],FOODS.protein[5]]:FOODS.protein.slice(0,4),i),cf=pick(i===0?[FOODS.carb[2]]:[FOODS.carb[0],FOODS.carb[1],FOODS.carb[3],FOODS.carb[4]],i),ff=pick(FOODS.fat,i);
    const pg=r5(P/(pf[1]/100)*.85),cg=r5((C-pg*pf[2]/100)/(cf[2]/100)),fatLeft=F-pg*pf[3]/100-cg*cf[3]/100;
    const fg=fatLeft>3?r5(fatLeft/(ff[3]/100)):0;
    return {n,items:[`${pg} г ${pf[0]}`,`${cg} г ${cf[0]}`,...(fg?[`${fg} г ${ff[0]}`]:[]),'овощи / зелень без ограничений'],f};
  });
}
function foodScreen(){
  const p=S.prof,r=calcNutrition(p),v=S.meal||0;
  const lvlTips={
    beginner:['Без сложных схем: тарелка = ½ овощи, ¼ белок, ¼ крупы.','Белок в каждый приём пищи, 3–4 приёма в день.','Сладкие напитки и фастфуд — максимум 1–2 раза в неделю.'],
    advanced:['Распредели белок на 3–5 приёмов по 25–40 г.','Углеводы концентрируй вокруг тренировки (за 2–3 ч до и после).','Раз в 2–3 недели при сушке — 1–2 дня на поддержании калорий.'],
    pro:['Перерывы в диете: 1–2 недели на поддержании через каждые 8–12 недель дефицита.','Рефиды с углеводами 1–2 раза в неделю при глубокой сушке.','Скорость изменения веса: набор 0,25–0,5%/нед., сушка 0,5–1%/нед.']
  }[S.level];
  const mp=mealPlan(r,v);
  return `<h1>Питание под цель</h1>
  <div class="card">
    <label>Цель</label>
    <div class="seg" id="goal">${[['mass','Набор массы'],['cut','Похудение'],['keep','Поддержание']].map(([x,t])=>`<button data-v="${x}" class="${p.goal===x?'on':''}">${t}</button>`).join('')}</div>
    <div class="grid2"><div><label>Пол</label><select id="sex"><option value="m" ${p.sex==='m'?'selected':''}>Мужской</option><option value="f" ${p.sex==='f'?'selected':''}>Женский</option></select></div>
    <div><label>Возраст</label><input id="age" type="number" value="${p.age}"></div>
    <div><label>Вес, кг</label><input id="w" type="number" value="${p.w}"></div>
    <div><label>Рост, см</label><input id="h" type="number" value="${p.h}"></div></div>
    <label>Активность</label><select id="act">${[[1.2,'Сидячий образ жизни'],[1.375,'1–3 тренировки в неделю'],[1.55,'3–5 тренировок в неделю'],[1.725,'6–7 тренировок в неделю']].map(([x,t])=>`<option value="${x}" ${p.act==x?'selected':''}>${t}</option>`).join('')}</select>
  </div>
  <div class="card"><div class="row sb"><b>Твой план на день</b><span class="hint">BMR ${r.bmr} · TDEE ${r.tdee}</span></div>
    <div class="macro"><div><b>${r.kcal}</b><span>ккал</span></div><div><b>${r.prot} г</b><span>белки</span></div><div><b>${r.fat} г</b><span>жиры</span></div><div><b>${r.carb} г</b><span>углеводы</span></div></div>
    <div class="hint">Вода ≈ ${r.water} л в день. Дефицит/профицит подобран под твой уровень.</div></div>
  <div class="row sb"><h2>Готовое меню на день</h2><button class="btn small ghost" id="shuffle">🔀 Другое</button></div>
  <div class="card meal"><table>${mp.map(m=>`<tr><td><b>${m.n}</b><div class="hint">≈ ${Math.round(r.kcal*m.f)} ккал</div></td><td>${m.items.map(i=>`• ${i}`).join('<br>')}</td></tr>`).join('')}</table>
  <div class="hint" style="margin-top:6px">Веса указаны в сыром/сухом виде. Меню подгоняется под твои калории и БЖУ.</div></div>
  <h2>Что выбирать</h2>
  <div class="card"><b>Белок</b><div class="hint">Курица, индейка, говядина, рыба, яйца, творог, греческий йогурт, тофу, бобовые.</div>
  <b>Сложные углеводы</b><div class="hint">Гречка, рис, овсянка, цельнозерновой хлеб, картофель, макароны твёрдых сортов, фрукты.</div>
  <b>Полезные жиры</b><div class="hint">Оливковое масло, орехи, авокадо, жирная рыба, семена.</div></div>
  <h2>Советы для уровня</h2><div class="card"><ul>${lvlTips.map(t=>`<li>${t}</li>`).join('')}</ul></div>
  <h2>Режим дня</h2><div class="card"><table>
    <tr><td>07:30</td><td>Завтрак + вода 500 мл</td></tr><tr><td>12:30</td><td>Обед (белок + сложные углеводы)</td></tr>
    <tr><td>за 2 ч до</td><td>Основной приём пищи перед тренировкой</td></tr><tr><td>за 30 мин</td><td>Кофеин (по желанию, п. «Добавки»)</td></tr>
    <tr><td>после</td><td>Белок 25–40 г + углеводы</td></tr><tr><td>22:30</td><td>Сон 7–9 часов</td></tr></table></div>
  <div class="hint">Взвешивайся утром, смотри среднее по неделе: нет динамики — меняй калории на 5–10%. При заболеваниях и беременности — только после врача.</div>`;
}
function bindFood(){
  const upd=()=>{
    const p=S.prof;
    p.sex=$('#sex').value;p.age=+$('#age').value||25;p.w=+$('#w').value||70;p.h=+$('#h').value||170;p.act=+$('#act').value;
    store.set('prof',p);
    const scroll=window.scrollY;
    $('#view').innerHTML=foodScreen();bindFood();window.scrollTo(0,scroll);
  };
  document.querySelectorAll('#goal button').forEach(b=>b.onclick=()=>{S.prof.goal=b.dataset.v;store.set('prof',S.prof);hap();$('#view').innerHTML=foodScreen();bindFood()});
  $('#shuffle').onclick=()=>{S.meal=((S.meal||0)+1)%6;hap();const sc=window.scrollY;$('#view').innerHTML=foodScreen();bindFood();window.scrollTo(0,sc)};
  ['sex','act','age','w','h'].forEach(i=>$('#'+i).onchange=upd);
}

/* ---------- Добавки ---------- */
function supScreen(){
  const rate={ok:['Доказано','ok','sup'],mid:['Опционально','warn','sup mid'],no:['Не нужно','bad','sup no']};
  const goalBy={
    beginner:'Новичку нужны только: белок из еды (при необходимости протеин) и креатин по желанию. Остальное — потом.',
    advanced:'Базовый набор: протеин (по необходимости), креатин, омега-3, витамин D (по анализу), кофеин до тренировки.',
    pro:'Добавки — тонкая настройка: креатин, кофеин, цитруллин/бета-аланин по задачам, регулярный контроль анализов.'
  }[S.level];
  return `<h1>Спортпит: что реально работает</h1><div class="card">${goalBy}</div>
  ${SUPPS.map(s=>`<div class="${rate[s.rate][2]}"><div class="row sb"><b>${s.n}</b><span class="tag ${rate[s.rate][1]}">${rate[s.rate][0]}</span></div><div>${s.dose}</div><div class="hint">${s.why}</div></div>`).join('')}
  <h2>Когда что принимать</h2><div class="card"><table>
   <tr><td>Утром</td><td>Витамин D3 и омега-3 с едой, креатин</td></tr>
   <tr><td>За 30–60 мин до</td><td>Кофеин, цитруллин (по желанию)</td></tr>
   <tr><td>После</td><td>Протеин, если не хватает белка из еды</td></tr>
   <tr><td>Вечером</td><td>Магний</td></tr></table></div>
  <div class="hint">Перед приёмом добавок проконсультируйся с врачом, особенно при хронических заболеваниях и приёме лекарств.</div>`;
}

/* ---------- Здоровье ---------- */
function healthScreen(){
  const b=HEALTH.base;
  let html=`<h1>${b.title}</h1><div class="card"><ul>${b.points.map(p=>`<li>${p}</li>`).join('')}</ul></div>
  <h2>Словарь</h2>${GLOSS.map(([t,d])=>`<details class="card"><summary>${t}</summary><div class="hint">${d}</div></details>`).join('')}`;
  if(S.level==='pro'){
    const h=HEALTH.pro;
    html+=`<h2>Фармакология: честный разговор</h2>
    <div class="warnbox">${h.pharmaIntro}</div>`;
    if(!S.age18){
      html+=`<div class="card"><p>Раздел о рисках и контроле здоровья — только для совершеннолетних.</p><button class="btn" id="age">Мне есть 18 лет</button></div>`;
    }else{
      html+=`<h3>Основные риски</h3>${h.risks.map(([t,d])=>`<div class="card"><b>${t}</b><div class="hint">${d}</div></div>`).join('')}
      <h3>Анализы и контроль</h3><div class="card"><ul>${h.labs.map(l=>`<li>${l}</li>`).join('')}</ul></div>
      <h3>Когда срочно к врачу / вызывать скорую</h3><div class="badbox"><ul>${h.red.map(r=>`<li>${r}</li>`).join('')}</ul></div>
      <h3>Что можно сделать вместо этого</h3><div class="card"><ul>${h.alt.map(a=>`<li>${a}</li>`).join('')}</ul></div>`;
    }
  }
  return html;
}
function bindHealth(){const b=$('#age');if(b)b.onclick=()=>{S.age18=true;render()}}

// восстановление 3D после «усыпления» видеоконтекста (сворачивание приложения)
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||!window.__ctxLost)return;
  window.__ctxLost=false;
  try{if(S.screen==='guide'&&S.g){if(typeof GD!=='undefined'){GD.key=null}updateGuide()}else if(S.ex||S.tab==='tech'){render()}}catch(e){}
});
// родная кнопка «Назад» Telegram
function goBack(){
  if(S.screen==='guide'){const x=$('#gexit');if(x)x.click();return}
  if(S.screen==='summary'){S.screen=null;S.summary=null;render();return}
  if(S.screen==='session'){S.screen=null;render();return}
  if(S.ex){S.ex=null;render();return}
  if(S.progPick){S.progPick=false;render();return}
  if(typeof SUBTABS!=='undefined'&&SUBTABS.includes(S.tab)){S.tab='more';render();return}
}
function syncBack(){
  try{if(!tg||!tg.BackButton)return;
    const need=!!(S.level&&(S.ex||S.progPick||S.screen||(SUBTABS.includes(S.tab))));
    need?tg.BackButton.show():tg.BackButton.hide();}catch(e){}
}
try{if(tg&&tg.BackButton)tg.BackButton.onClick(goBack)}catch(e){}
(function(){const _r=render;render=function(){_r();syncBack()}})();
render();cloudSync();
setTimeout(()=>{const s=$('#splash');if(s){s.classList.add('off');setTimeout(()=>s.remove(),500)}},1300);
