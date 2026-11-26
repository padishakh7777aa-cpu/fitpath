const APP_VERSION='1.0.1';
// ---- ленивая загрузка 3D (three.js, персонаж): подгружается в фоне после первого экрана ----
const ASSET_Q=(()=>{try{const s=document.currentScript&&document.currentScript.src||'';return s.includes('?')?'?'+s.split('?')[1]:''}catch(e){return ''}})();
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=res;s.onerror=()=>rej(new Error('load '+src));document.head.appendChild(s)})}
let _p3d=null;
function load3D(){
  if(window.__no3d)return Promise.reject(new Error('3d disabled'));
  if(window.THREE&&typeof makeRenderer==='function')return Promise.resolve();
  if(!_p3d)_p3d=(async()=>{for(const f of ['vendor/three-bundle.js','anim3d.js','anim3d_mx.js'])await loadScript(f+ASSET_Q)})().catch(e=>{_p3d=null;throw e});
  return _p3d;
}
if(typeof has3D==='undefined')var has3D=()=>false;
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
const SUBTABS=['tech','mech','bio','tools','sup','health','about'];

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
  const map={plan:planScreen,tech:techScreen,mech:mechScreen,bio:bioScreen,food:foodScreen,prog:progScreen,tools:toolsScreen,sup:supScreen,health:healthScreen,about:aboutScreen,more:moreScreen};
  v.innerHTML=(SUBTABS.includes(S.tab)?'<button class="back" id="moreback">‹ Ещё</button>':'')+map[S.tab]()+`<div class="disc">Неофициальное приложение в духе легенды бодибилдинга. Не связано с Ронни Коулманом.</div>`;
  ({plan:bindPlan,tech:bindTech,mech:()=>{},bio:bindBio,food:bindFood,prog:bindProg,tools:bindTools,sup:()=>{},health:bindHealth,about:bindAbout,more:bindMore})[S.tab]();
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
  const fill=(e,url)=>{const im=new Image();im.src=url;e.innerHTML='';e.appendChild(im)};
  const svgThumb=(e,k)=>{const sv=document.createElementNS('http://www.w3.org/2000/svg','svg');e.innerHTML='';e.appendChild(sv);const f=makeFigure(sv);f.draw(k==='plank'?0:0.5,k)};
  // сразу лёгкие 2D-превью, потом заменяем 3D-картинками, когда движок догрузится
  els.forEach(e=>{try{svgThumb(e,e.dataset.th)}catch(err){}});
  (async()=>{
    let ok=false;
    try{await load3D();ok=has3D();if(ok&&MX.ready)await MX.ready}catch(err){ok=false}
    if(!ok)return;
    for(const e of els){
      if(!document.body.contains(e))return; // ушли с экрана
      const k=e.dataset.th;
      try{
        if(typeof mxHas==='function'&&mxHas(k)){try{fill(e,await thumbMx(k,MUS[k]));await new Promise(r=>setTimeout(r,16));continue}catch(err){console.warn('thumbMx',err)}}
        fill(e,thumb3d(k,MUS[k]));
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
  const wrap=$('#figwrap');let pl=null,pl2=null,sv2=null;
  const period=k==='plank'?5:3.6;
  const wire=()=>{
    activePlayer=pl;
    pl.onPhase=ph=>{$('#ph').textContent=e.phases[ph]};
    pl.onRep=n=>{$('#rp').textContent='Повтор '+(n+1)};
    $('#pp').onclick=function(){pl.paused=!pl.paused;this.textContent=pl.paused?'▶ Продолжить':'⏸ Пауза';hap()};
    $('#sp').onclick=function(){pl.speed=pl.speed===1?0.4:1;this.textContent=pl.speed===1?'🐢 Медленно':'🐇 Обычная';hap()};
  };
  // мгновенная 2D-анимация: показывается, пока 3D догружается (или если 3D недоступно)
  const show2D=()=>{
    if(pl2||S.ex!==k)return;
    sv2=document.createElementNS('http://www.w3.org/2000/svg','svg');sv2.style.cssText='position:absolute;inset:0;width:100%;height:100%';
    wrap.insertBefore(sv2,wrap.firstChild);pl2=player(sv2,k,{period});pl=pl2;$('#views').style.display='none';wire();
  };
  const swapTo=p=>{
    if(S.ex!==k){p.stop();return}
    if(pl2){pl2.stop();sv2.remove();pl2=null;sv2=null}
    $('#views').style.display='';pl=p;pl.setView&&pl.setView(35);wire();
  };
  const try3D=async()=>{
    try{if(typeof MX!=='undefined'&&MX.ready)await MX.ready}catch(err){}
    if(S.ex!==k)return;
    if(has3D()){
      try{if(typeof mxHas==='function'&&mxHas(k)){swapTo(await playerMx(wrap,k,{period,mus:MUS[k]}));return}}catch(err){console.warn('mx fail',err)}
      try{swapTo(player3d(wrap,k,{mus:MUS[k],period}));return}catch(err){}
    }
    show2D();
  };
  if(window.THREE&&typeof player3d==='function'){
    const ld=document.createElement('div');ld.className='hintdrag';ld.style.top='45%';ld.style.fontSize='13px';ld.textContent='Загружаю…';wrap.appendChild(ld);
    try3D().finally(()=>ld.remove());
  }else{
    show2D();
    load3D().then(try3D,()=>{});
  }
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
const GOALN={mass:'набор массы',cut:'похудение',keep:'поддержание формы'};
function mySupps(){
  const g=S.prof.goal,pick={
    mass:[['Креатин','5 г в день, в любое время','Больше силы и мышечной массы. Самая изученная добавка.'],['Протеин','1 порция (25–30 г), если не хватает белка из еды','Просто удобный источник белка, не обязателен.'],['Углеводы до тренировки','банан, рис или овсянка за 2–3 часа','Больше энергии на тяжёлые подходы.']],
    cut:[['Протеин','1 порция (25–30 г) вместо перекуса','Помогает не терять мышцы и меньше хотеть есть.'],['Креатин','5 г в день','Сохраняет силу на дефиците калорий.'],['Кофеин','чашка кофе за 30–40 минут до тренировки','Больше бодрости. Не пей после обеда.']],
    keep:[['Креатин','5 г в день','Сила и восстановление.'],['Омега-3','1–2 г в день с едой','Для сердца и суставов.'],['Витамин D','по анализу, обычно 1000–2000 МЕ осенью и зимой','Иммунитет и настроение.']]
  };
  if(S.level==='pro'&&g!=='cut')pick[g==='mass'?'mass':'keep'].splice(2,1,['Кофеин','3–6 мг на кг веса за 30–60 минут до тренировки','Работоспособность. Не после 15:00.']);
  return pick[g]||pick.keep;
}
function foodScreen(){
  const p=S.prof;
  if(!p.set){
    return `<div class="hero"><div class="q">Посчитаем питание</div><div class="tr">Один раз введи 4 цифры — дальше всё готово</div></div>
    <div class="card"><label>Пол</label><div class="seg" id="sexseg"><button data-v="m" class="${p.sex==='m'?'on':''}">Мужской</button><button data-v="f" class="${p.sex==='f'?'on':''}">Женский</button></div>
     <div class="grid2"><div><label>Возраст</label><input id="age" type="number" inputmode="numeric" value="${p.age}"></div><div><label>Вес, кг</label><input id="w" type="number" inputmode="decimal" value="${p.w}"></div></div>
     <label>Рост, см</label><input id="h" type="number" inputmode="numeric" value="${p.h}">
     <button class="btn xl" id="calc" style="margin-top:14px">Рассчитать</button></div>`;
  }
  const r=calcNutrition(p),v=S.meal||0,mp=mealPlan(r,v);
  const tips={beginner:['Белок в каждый приём пищи: мясо, рыба, яйца, творог.','Пей воду весь день: около '+r.water+' л.','Сладкое и фастфуд — редко, не каждый день.'],
    advanced:['Раздели белок на 3–5 приёмов по 25–40 г.','Основные углеводы ешь за 2–3 часа до и после тренировки.','Взвешивайся утром и смотри среднее за неделю.'],
    pro:['Следи за средним весом за неделю: набор 0,25–0,5%, сушка 0,5–1% в неделю.','Каждые 8–12 недель дефицита делай 1–2 недели на поддержании.','Углеводы концентрируй вокруг тренировок.']}[S.level];
  return `<div class="card cta"><div class="hint">Твоя норма на день · ${GOALN[p.goal]}</div>
   <h1 style="margin:2px 0 8px">${r.kcal} ккал</h1>
   <div class="macro"><div><b>${r.prot} г</b><span>белки</span></div><div><b>${r.fat} г</b><span>жиры</span></div><div><b>${r.carb} г</b><span>углеводы</span></div></div>
   <div class="hint">Вода: около ${r.water} л в день</div></div>
  <div class="row sb"><h2 style="margin:0">Что съесть сегодня</h2><button class="btn small ghost" id="shuffle">🔀 Другое</button></div>
  <div class="card meal"><table>${mp.map(m=>`<tr><td><b>${m.n}</b></td><td>${m.items.filter(x=>!/овощи/.test(x)).map(i=>`• ${i}`).join('<br>')}</td></tr>`).join('')}</table>
   <div class="hint" style="margin-top:6px">Вес указан в сыром или сухом виде. Добавляй овощи без ограничений.</div></div>
  <h2>Просто о питании</h2><div class="card"><ul>${tips.map(t=>`<li>${t}</li>`).join('')}</ul></div>
  <h2>Спортпит для тебя</h2>${mySupps().map(s=>`<div class="sup"><b>${s[0]}</b><div>${s[1]}</div><div class="hint">${s[2]}</div></div>`).join('')}
  <div class="hint" style="margin:6px 0"><a href="#" id="allsup" class="lnk">Весь список добавок и что не нужно</a></div>
  <details class="card"><summary>⚙️ Уточнить расчёт</summary>
   <label>Цель</label><div class="seg" id="goal">${[['mass','Набор массы'],['cut','Похудение'],['keep','Форма']].map(([x,t])=>`<button data-v="${x}" class="${p.goal===x?'on':''}">${t}</button>`).join('')}</div>
   <label>Сколько тренируешься</label><select id="act">${[[1.2,'Почти не двигаюсь'],[1.375,'1–3 тренировки в неделю'],[1.55,'3–5 тренировок в неделю'],[1.725,'6–7 тренировок в неделю']].map(([x,t])=>`<option value="${x}" ${p.act==x?'selected':''}>${t}</option>`).join('')}</select>
   <div class="grid2"><div><label>Возраст</label><input id="age" type="number" value="${p.age}"></div><div><label>Вес, кг</label><input id="w" type="number" value="${p.w}"></div></div>
   <label>Рост, см</label><input id="h" type="number" value="${p.h}"></details>
  <div class="hint">Это ориентир на 2–3 недели. Если вес не меняется, поменяй калории на 5–10%. При болезнях и беременности — только после врача.</div>`;
}
function bindFood(){
  const read=()=>{const p=S.prof;p.age=+$('#age').value||25;p.w=+$('#w').value||70;p.h=+$('#h').value||170;const ac=$('#act');if(ac)p.act=+ac.value;store.set('prof',p)};
  const redraw=()=>{const sc=window.scrollY;$('#view').innerHTML=foodScreen();bindFood();window.scrollTo(0,sc)};
  const c=$('#calc');
  if(c){document.querySelectorAll('#sexseg button').forEach(b=>b.onclick=()=>{S.prof.sex=b.dataset.v;document.querySelectorAll('#sexseg button').forEach(x=>x.classList.toggle('on',x===b));hap()});
    c.onclick=()=>{read();S.prof.set=true;store.set('prof',S.prof);hap('medium');redraw()};return}
  document.querySelectorAll('#goal button').forEach(b=>b.onclick=()=>{S.prof.goal=b.dataset.v;store.set('prof',S.prof);hap();redraw()});
  ['act','age','w','h'].forEach(i=>{const e=$('#'+i);if(e)e.onchange=()=>{read();redraw()}});
  const sh=$('#shuffle');if(sh)sh.onclick=()=>{S.meal=((S.meal||0)+1)%6;hap();redraw()};
  const as=$('#allsup');if(as)as.onclick=e=>{e.preventDefault();S.tab='sup';render()};
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
function showCrash(e){
  try{console.error('render crash',e)}catch(_){}
  const v=document.querySelector('#view');if(!v)return;
  v.innerHTML=`<div class="crash"><div class="e">😵</div><h1>Что-то пошло не так</h1><p class="hint">Не переживай, твои данные сохранены. Попробуй вернуться на главный экран.</p>
   <button class="btn" id="crashhome" style="margin-top:14px">На главный экран</button><button class="btn ghost" id="crashreload" style="margin-top:8px">Перезагрузить</button></div>`;
  const h=document.querySelector('#crashhome');if(h)h.onclick=()=>{S.ex=null;S.screen=null;S.progPick=false;S.tab='plan';try{guideCleanup&&guideCleanup()}catch(_){}render()};
  const r=document.querySelector('#crashreload');if(r)r.onclick=()=>location.reload();
}
(function(){const _r=render;render=function(){try{_r()}catch(e){showCrash(e)}syncBack()}})();
window.addEventListener('unhandledrejection',ev=>{try{console.warn('unhandled',ev.reason)}catch(_){}});
render();cloudSync();
// кэш для быстрых повторных запусков (где поддерживается)
try{if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{})}catch(e){}
// фоновая подгрузка 3D после первого экрана (если нет режима экономии трафика)
setTimeout(()=>{try{if(!(navigator.connection&&navigator.connection.saveData))load3D().catch(()=>{})}catch(e){}},900);
setTimeout(()=>{const s=$('#splash');if(s){s.classList.add('off');setTimeout(()=>s.remove(),500)}},1300);
