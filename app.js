const tg=window.Telegram&&window.Telegram.WebApp;
if(tg){try{tg.ready();tg.expand();}catch(e){}}
const hap=t=>{try{tg&&tg.HapticFeedback&&tg.HapticFeedback.impactOccurred(t||'light')}catch(e){}};
const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem('fp_'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('fp_'+k,JSON.stringify(v))}catch(e){}}};

const S={level:store.get('level',null),tab:'plan',ex:null,prof:store.get('prof',{sex:'m',age:25,w:75,h:178,act:1.55,goal:'mass'}),age18:false};
let activePlayer=null;
const stopPlayer=()=>{if(activePlayer){activePlayer.stop();activePlayer=null}};

const TABS=[['plan','🏋️','План'],['tech','🎬','Техника'],['food','🥗','Питание'],['sup','💊','Добавки'],['health','❤️','Здоровье']];

function renderNav(){
  const n=$('#nav');
  n.innerHTML=TABS.map(([id,i,l])=>`<button data-t="${id}" class="${S.tab===id&&!S.ex?'on':''}"><span class="i">${i}</span>${l}</button>`).join('');
  n.querySelectorAll('button').forEach(b=>b.onclick=()=>{hap();S.tab=b.dataset.t;S.ex=null;render()});
  n.style.display=S.level?'flex':'none';
  const c=$('#levelChip');
  c.style.display=S.level?'block':'none';
  if(S.level)c.textContent=LEVELS[S.level].ico+' '+LEVELS[S.level].name;
  c.onclick=()=>{S.level=null;S.ex=null;render()};
}

function render(){
  stopPlayer();
  renderNav();
  const v=$('#view');
  window.scrollTo(0,0);
  if(!S.level){v.innerHTML=levelScreen();bindLevel();return}
  if(S.ex){v.innerHTML=exScreen(S.ex);bindEx(S.ex);return}
  const map={plan:planScreen,tech:techScreen,food:foodScreen,sup:supScreen,health:healthScreen};
  v.innerHTML=map[S.tab]();
  ({plan:bindPlan,tech:bindTech,food:bindFood,sup:()=>{},health:bindHealth})[S.tab]();
}

/* ---------- Выбор уровня ---------- */
function levelScreen(){
  return `<h1>Выбери свой уровень</h1><p class="hint">Программа, питание и советы подстроятся под тебя. Уровень можно сменить в любой момент.</p>`+
  Object.values(LEVELS).map(l=>`<div class="card click lvl" data-l="${l.id}"><div class="ico">${l.ico}</div><div><b>${l.name}</b><div class="hint">${l.desc}</div></div></div>`).join('');
}
function bindLevel(){
  document.querySelectorAll('[data-l]').forEach(c=>c.onclick=()=>{hap('medium');S.level=c.dataset.l;store.set('level',S.level);S.tab='plan';render()});
}

/* ---------- План ---------- */
function exLabel(id){return id.startsWith('text:')?id.slice(5):EX[id].name}
function planScreen(){
  const P=PROGRAMS[S.level];
  return `<h1>${P.title}</h1><p>${P.intro}</p>
  <div class="card"><b>Разминка</b><div class="hint">${P.warm}</div></div>`+
  P.days.map(d=>`<div class="card"><b>${d.name}</b><table>${d.items.map(([id,sr,note])=>{
    const anim=!id.startsWith('text:');
    return `<tr><td>${anim?`<a href="#" data-ex="${id}" style="color:var(--accent);text-decoration:none">▶ ${exLabel(id)}</a>`:exLabel(id)}${note?`<div class="hint">${note}</div>`:''}</td><td style="white-space:nowrap"><b>${sr}</b></td></tr>`}).join('')}</table></div>`).join('')+
  `<h2>Правила прогресса</h2><div class="card"><ul>${P.rules.map(r=>`<li>${r}</li>`).join('')}</ul></div>`;
}
function bindPlan(){document.querySelectorAll('[data-ex]').forEach(a=>a.onclick=e=>{e.preventDefault();hap();S.ex=a.dataset.ex;render()})}

/* ---------- Техника ---------- */
function techScreen(){
  return `<h1>Техника в анимации</h1><p class="hint">Нажми на упражнение: смотри движение в замедлении, читай чек-лист и частые ошибки.</p>
  <div class="exlist">${Object.keys(EX).map(k=>`<div class="card click" data-ex="${k}"><svg data-th="${k}"></svg><b>${EX[k].name}</b><div class="hint">${EX[k].muscles}</div></div>`).join('')}</div>`;
}
function bindTech(){
  document.querySelectorAll('svg[data-th]').forEach(s=>{const k=s.dataset.th;const f=makeFigure(s);f.draw(k==='plank'?0:0.5,k)});
  document.querySelectorAll('[data-ex]').forEach(c=>c.onclick=()=>{hap();S.ex=c.dataset.ex;render()});
}
function exScreen(k){
  const e=EX[k];
  return `<button class="back" id="back">‹ Назад</button><h1>${e.name}</h1><div class="hint">${e.muscles}</div>
  <div class="stage"><div class="phase" id="ph">${e.phases[0]}</div><div class="reps" id="rp">Повтор 1</div><svg id="fig"></svg></div>
  <div class="ctrl"><button class="btn ghost small" id="pp">⏸ Пауза</button><button class="btn ghost small" id="sp">🐢 Медленно</button></div>
  <h2>Как делать</h2><div class="card"><ol style="padding-left:20px;margin:0">${e.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div>
  <h2>Частые ошибки</h2><div class="card">${e.mistakes.map(m=>`<span class="tag bad">${m}</span>`).join('')}</div>
  <div class="card"><b>Темп:</b> ${e.tempo}</div>`;
}
function bindEx(k){
  const e=EX[k];
  $('#back').onclick=()=>{S.ex=null;render()};
  const pl=player($('#fig'),k,{period:k==='plank'?5:3.6});
  activePlayer=pl;
  pl.onPhase=ph=>{$('#ph').textContent=e.phases[ph]};
  pl.onRep=n=>{$('#rp').textContent='Повтор '+(n+1)};
  $('#pp').onclick=function(){pl.paused=!pl.paused;this.textContent=pl.paused?'▶ Продолжить':'⏸ Пауза';hap()};
  $('#sp').onclick=function(){pl.speed=pl.speed===1?0.4:1;this.textContent=pl.speed===1?'🐢 Медленно':'🐇 Обычная';hap()};
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
function foodScreen(){
  const p=S.prof,r=calcNutrition(p);
  const lvlTips={
    beginner:['Без сложных схем: тарелка = ½ овощи, ¼ белок, ¼ крупы.','Белок в каждый приём пищи, 3–4 приёма в день.','Сладкие напитки и фастфуд — максимум 1–2 раза в неделю.'],
    advanced:['Распредели белок на 3–5 приёмов по 25–40 г.','Углеводы концентрируй вокруг тренировки (за 2–3 ч до и после).','Раз в 2–3 недели при сушке — 1–2 дня на поддержании калорий.'],
    pro:['Перерывы в диете: 1–2 недели на поддержании через каждые 8–12 недель дефицита.','Рефиды с углеводами 1–2 раза в неделю при глубокой сушке.','Скорость изменения веса: набор 0,25–0,5%/нед., сушка 0,5–1%/нед.']
  }[S.level];
  const split=[['Завтрак',.25],['Обед',.3],['Перекус / до тренировки',.2],['Ужин',.25]];
  return `<h1>Питание под цель</h1>
  <div class="card">
    <label>Цель</label>
    <div class="seg" id="goal">${[['mass','Набор массы'],['cut','Похудение'],['keep','Поддержание']].map(([v,t])=>`<button data-v="${v}" class="${p.goal===v?'on':''}">${t}</button>`).join('')}</div>
    <div class="grid2"><div><label>Пол</label><select id="sex"><option value="m" ${p.sex==='m'?'selected':''}>Мужской</option><option value="f" ${p.sex==='f'?'selected':''}>Женский</option></select></div>
    <div><label>Возраст</label><input id="age" type="number" value="${p.age}"></div>
    <div><label>Вес, кг</label><input id="w" type="number" value="${p.w}"></div>
    <div><label>Рост, см</label><input id="h" type="number" value="${p.h}"></div></div>
    <label>Активность</label><select id="act">${[[1.2,'Сидячий образ жизни'],[1.375,'1–3 тренировки в неделю'],[1.55,'3–5 тренировок в неделю'],[1.725,'6–7 тренировок в неделю']].map(([v,t])=>`<option value="${v}" ${p.act==v?'selected':''}>${t}</option>`).join('')}</select>
  </div>
  <div class="card"><div class="row sb"><b>Твой план на день</b><span class="hint">BMR ${r.bmr} · TDEE ${r.tdee}</span></div>
    <div class="macro"><div><b>${r.kcal}</b><span>ккал</span></div><div><b>${r.prot} г</b><span>белки</span></div><div><b>${r.fat} г</b><span>жиры</span></div><div><b>${r.carb} г</b><span>углеводы</span></div></div>
    <div class="hint">Вода ≈ ${r.water} л в день. Дефицит/профицит подобран под твой уровень.</div></div>
  <h2>Как разложить по приёмам</h2><div class="card"><table>${split.map(([n,f])=>`<tr><td>${n}</td><td><b>${Math.round(r.kcal*f)} ккал</b><div class="hint">Б ${Math.round(r.prot*f)} · Ж ${Math.round(r.fat*f)} · У ${Math.round(r.carb*f)}</div></td></tr>`).join('')}</table></div>
  <h2>Что выбирать</h2>
  <div class="card"><b>Белок</b><div class="hint">Курица, индейка, говядина, рыба, яйца, творог, греческий йогурт, тофу, бобовые.</div>
  <b>Сложные углеводы</b><div class="hint">Гречка, рис, овсянка, цельнозерновой хлеб, картофель, макароны твёрдых сортов, фрукты.</div>
  <b>Полезные жиры</b><div class="hint">Оливковое масло, орехи, авокадо, жирная рыба, семена.</div></div>
  <h2>Советы для уровня</h2><div class="card"><ul>${lvlTips.map(t=>`<li>${t}</li>`).join('')}</ul></div>
  <div class="hint">Это ориентир на 2–3 недели. Взвешивайся утром, смотри среднее по неделе: нет динамики — меняй калории на 5–10%. При заболеваниях и беременности — только после врача.</div>`;
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
  ['sex','act'].forEach(i=>$('#'+i).onchange=upd);
  ['age','w','h'].forEach(i=>$('#'+i).onchange=upd);
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
  <div class="hint">Перед приёмом добавок проконсультируйся с врачом, особенно при хронических заболеваниях и приёме лекарств.</div>`;
}

/* ---------- Здоровье ---------- */
function healthScreen(){
  const b=HEALTH.base;
  let html=`<h1>${b.title}</h1><div class="card"><ul>${b.points.map(p=>`<li>${p}</li>`).join('')}</ul></div>`;
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

render();
