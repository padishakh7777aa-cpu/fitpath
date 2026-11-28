/* ===== Библиотека программ, режим тренировки, механика, биохакинг, инструменты ===== */
const progById=id=>PROGS.find(p=>p.id===id);
const fmtRest=s=>s>=60?(s%60?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:`${s/60} мин`):`${s} сек`;
const exKey=id=>id.startsWith('text:')?id.slice(5):id;
const exName=id=>id.startsWith('text:')?id.slice(5):lbl(id);
const hasAnim=id=>!id.startsWith('text:')&&EX[id];
function curProg(){let p=progById(S.prog);if(!p||false){p=PROGS.find(x=>x.lvl===S.level)||PROGS[0]}return p}
const lastW=k=>{const a=S.log[k];return a&&a.length?a[a.length-1].w:''};

/* ---------- План ---------- */
// Плановых недель разгрузки нет: единственное найденное контролируемое исследование (Coleman 2024) не показало пользы. Разгрузка по состоянию.
const DELOAD={};
function weekInfo(P){
  let st=store.get('pstart',null);
  if(!st||st.id!==P.id){st={id:P.id,ts:Date.now()};store.set('pstart',st)}
  const wk=Math.floor((Date.now()-st.ts)/(7*864e5))+1,dl=DELOAD[P.id]||[],isDL=dl.includes(wk),next=dl.find(x=>x>wk);
  return {wk,isDL,next,total:P.weeks};
}
function weekBanner(P){
  const w=weekInfo(P);
  if(w.isDL)return `<div class="warnbox"><b>⚠️ Неделя ${w.wk}: разгрузка</b><div class="hint" style="color:var(--text)">Сделай по 2 подхода на упражнение, вес −10%, запас повторов 3–4. Это не слабость: так мышцы и ЦНС восстанавливаются и растут дальше.</div></div>`;
  return `<div class="card"><div class="row sb"><b>Неделя ${w.wk}${w.wk<=w.total?' из '+w.total:''}</b><span class="tag ${w.next&&w.next-w.wk<=1?'warn':''}">${w.next?'до разгрузки: '+(w.next-w.wk)+' нед':'цикл завершён — оцени прогресс'}</span></div>
   <div style="height:6px;border-radius:3px;background:var(--line);margin-top:8px"><div style="height:6px;border-radius:3px;background:var(--accent);width:${Math.min(100,Math.round(w.wk/w.total*100))}%"></div></div></div>`;
}
function nextDayIdx(P){
  const ks=Object.keys(S.done).sort();if(!ks.length)return 0;
  const i=P.days.findIndex(d=>d.n===S.done[ks[ks.length-1]]);return i<0?0:(i+1)%P.days.length;
}
function greeting(){
  const h=new Date().getHours(),n=(()=>{try{return tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.first_name||''}catch(e){return ''}})();
  return (h<5?'Доброй ночи':h<12?'Доброе утро':h<18?'Добрый день':'Добрый вечер')+(n?', '+n:'')+'!';
}
function planScreen(){
  if(S.progPick)return progLibrary();
  const P=curProg(),nd=nextDayIdx(P),D=P.days[nd],doneToday=!!S.done[today()],target=P.freq,wc=Math.min(weekCount(),target),st=streak(),q=quoteOfDay(),w=weekInfo(P);
  const dots=[...Array(target)].map((_,i)=>`<span style="opacity:${i<wc?1:.28}">●</span>`).join('');
  const names=D.ex.slice(0,4).map(e=>exName(e.id)).join(' · ')+(D.ex.length>4?' …':'');
  let main;
  if(S.g)main=`<div class="card cta"><div class="hint">Ты в процессе</div><h1 style="margin:2px 0 8px">${guideDay(S.g).n}</h1><button class="btn xl" id="gresume">▶ Продолжить тренировку</button></div>`;
  else if(doneToday)main=`<div class="card cta"><div style="font-size:40px">✅</div><h1 style="margin:4px 0">На сегодня всё!</h1><div class="hint">Мышцы растут на отдыхе. Следующая тренировка: <b style="color:var(--text)">${D.n}</b></div></div>`;
  else main=`<div class="card cta"><div class="hint">Сегодня</div><h1 style="margin:2px 0 4px">${D.n}</h1>
    <div class="hint">${D.ex.length} ${plural(D.ex.length,['упражнение','упражнения','упражнений'])} · около ${gDur({pid:P.id,di:nd})} минут</div><div class="hint" style="margin:6px 0 12px">${names}</div>
    <button class="btn xl pulse" id="gstartnow" data-gstart="${nd}">▶ Начать тренировку</button>
    <div class="hint" style="margin-top:8px;text-align:center">Я покажу, что делать, и подскажу вес. Ничего считать не нужно.</div></div>`;
  return `<div class="row sb" style="margin:2px 0 8px"><b>${greeting()}</b><span class="flame">${st}🔥</span></div>
  ${w.isDL?'<div class="warnbox" style="font-size:13px"><b>Лёгкая неделя.</b> Сегодня работаем полегче — так мышцы восстанавливаются и растут.</div>':''}
  ${main}
  <div class="card" style="text-align:center"><div class="hint">На этой неделе</div><div class="dots">${dots}</div><div class="hint">${wc} из ${target} тренировок</div></div>
  <div class="quote">«${q[0]}»<div class="hint">${q[1]}</div></div>
  <details class="card"><summary>📋 Весь курс «${P.name}»</summary>
   ${P.days.map((d,di)=>`<div style="margin-top:10px"><b>${d.n}</b> <span class="hint">· ${d.focus}</span>
    <div class="hint">${d.ex.map(e=>hasAnim(e.id)?`<a href="#" data-ex="${e.id}" style="color:var(--accent);text-decoration:none">${exName(e.id)}</a>`:exName(e.id)).join(' · ')}</div></div>`).join('')}</details>
  <details class="card"><summary>ℹ️ О курсе</summary><p>${P.desc}</p><p class="hint"><b>Как растёт нагрузка:</b> ${P.prog}</p><p class="hint"><b>Научная основа:</b> ${P.science||''}</p>
   <button class="btn ghost small" id="pickprog">🔁 Другой курс</button></details>`;
}
function progLibrary(){
  const order=['beginner','advanced','pro'];
  return `<button class="back" id="closelib">‹ Назад</button><h1>Библиотека программ</h1><p class="hint">${PROGS.length} программ. Рекомендованные для твоего уровня помечены.</p>`+
  order.map(l=>`<h2>${LEVELS[l].ico} ${LEVELS[l].name}</h2>`+PROGS.filter(p=>p.lvl===l).map(p=>`<div class="card click" data-pick="${p.id}" ${p.id===S.prog?'style="border-color:var(--accent)"':''}>
   <div class="row sb"><b>${p.name}</b>${l===S.level?'<span class="tag ok">для тебя</span>':''}</div><div class="hint" style="color:var(--accent)">${p.tag}</div>
   <div class="hint">${p.freq} дн/нед · ${p.weeks} нед</div></div>`).join('')).join('');
}
function bindPlan(){
  document.querySelectorAll('[data-ex]').forEach(a=>a.onclick=e=>{e.preventDefault();hap();S.ex=a.dataset.ex;render()});
  const pp=$('#pickprog');if(pp)pp.onclick=()=>{S.progPick=true;render()};
  document.querySelectorAll('[data-gstart]').forEach(x=>x.onclick=()=>{hap('medium');startGuide(curProg().id,+x.dataset.gstart)});
  const gr=$('#gresume');if(gr)gr.onclick=()=>{S.screen='guide';render()};
  const fs=$('#freesess');if(fs)fs.onclick=()=>{hap('medium');startFree()};
  const fp=$('#findprog');if(fp)fp.onclick=()=>{S.screen='onb';render()};
  const cl=$('#closelib');if(cl)cl.onclick=()=>{S.progPick=false;render()};
  document.querySelectorAll('[data-pick]').forEach(c=>c.onclick=()=>{S.prog=c.dataset.pick;store.set('prog',S.prog);store.set('pstart',{id:S.prog,ts:Date.now()});S.progPick=false;hap('medium');toast('Программа выбрана');render()});
  document.querySelectorAll('[data-start]').forEach(b=>b.onclick=()=>{hap('medium');startSession(curProg().id,+b.dataset.start)});
  const r=$('#resume');if(r)r.onclick=()=>{S.screen='session';render()};
}

/* ---------- Режим тренировки ---------- */
const sessDay=ss=>ss.day||progById(ss.pid).days[ss.di];
function startFree(){S.sess={pid:'free',di:0,day:{n:'Свободная тренировка',focus:'',ex:[]},start:Date.now(),sets:{},free:true};store.set('sess',S.sess);S.screen='session';render()}
function startSession(pid,di){S.sess={pid,di,start:Date.now(),sets:{}};store.set('sess',S.sess);S.screen='session';render()}
function topReps(r){const n=String(r).replace(/–/g,'-').match(/\d+/g);if(!n||/отказ|блок/.test(r))return null;return Math.max(...n.map(Number))}
function sessionScreen(){
  const ss=S.sess,D=sessDay(ss),P={name:ss.free?'Свободная тренировка':progById(ss.pid).name,id:ss.pid};
  return `<button class="back" id="sback">‹ К программе</button><h1>${D.n}</h1><div class="hint">${P.name} · <span id="elapsed">0:00</span></div>
  ${ss.free?freeAddHtml():''}
  ${(!ss.free&&weekInfo(P).isDL)?'<div class="warnbox"><b>Неделя разгрузки</b>: 2 подхода на упражнение, вес −10%, запас повторов 3–4.</div>':''}
  ${D.ex.length?warmupHtml(D):''}
  ${D.ex.map((e,ei)=>{const k=exKey(e.id),lw=lastW(k);
   return `<div class="card"><div class="row sb"><b>${hasAnim(e.id)?`<a href="#" data-ex="${e.id}" style="color:var(--accent);text-decoration:none">▶ ${exName(e.id)}</a>`:exName(e.id)}</b><span class="tag">RIR ${e.rir}</span></div>
   <div class="hint">${e.s}×${e.r} · отдых ${fmtRest(e.rest)}${lw?` · прошлый вес ${lw} кг`:''}</div>${e.note?`<div class="hint">${e.note}</div>`:''}
   ${ss.free?`<button class="btn ghost small" data-addset="${ei}" style="margin-top:6px">+ подход</button> <button class="btn ghost small" data-delex="${ei}" style="margin-top:6px">✕ убрать</button>`:''}
   ${Array.from({length:e.s},(_,si)=>{const id=ei+'_'+si,d=ss.sets[id]||{};
    return `<div class="logrow set ${d.done?'ok':''}" data-id="${id}" data-ei="${ei}"><span class="hint" style="width:20px;align-self:center">${si+1}</span>
     <input type="number" inputmode="decimal" placeholder="${lw||'кг'}" value="${d.w??''}" ${d.done?'disabled':''}>
     <input type="number" inputmode="numeric" placeholder="повт" value="${d.r??''}" ${d.done?'disabled':''}>
     <button class="btn small" style="width:48px">${d.done?'✔':'○'}</button></div>`}).join('')}</div>`}).join('')}
  <button class="btn" id="finish">🏁 Завершить тренировку</button><button class="btn ghost" id="cancelsess" style="margin-top:8px">Отменить</button>`;
}
function bindSession(){
  const ss=S.sess,D=sessDay(ss),P={name:ss.free?'Свободная тренировка':progById(ss.pid).name,id:ss.pid};
  const upd=()=>{const e=$('#elapsed');if(!e)return;const s=Math.floor((Date.now()-ss.start)/1000);e.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
  upd();S._tick=setInterval(upd,1000);
  $('#sback').onclick=()=>{S.screen=null;render()};
  document.querySelectorAll('[data-ex]').forEach(a=>a.onclick=e=>{e.preventDefault();S.screen=null;S.ex=a.dataset.ex;render()});
  document.querySelectorAll('.set').forEach(row=>{
    const [wi,ri]=row.querySelectorAll('input'),btn=row.querySelector('button'),id=row.dataset.id,e=D.ex[+row.dataset.ei];
    const prefill=()=>{if(!wi.value&&wi.placeholder&&!isNaN(parseFloat(wi.placeholder)))wi.value=wi.placeholder};
    wi.addEventListener('focus',prefill);
    btn.onclick=()=>{
      if(ss.sets[id]&&ss.sets[id].done){ss.sets[id].done=false;wi.disabled=ri.disabled=false;row.classList.remove('ok');btn.textContent='○';store.set('sess',ss);return}
      prefill();const w=parseFloat(wi.value),r=parseInt(ri.value);
      if(!(w>=0)||!(r>0)){toast('Вес и повторы');return}
      ss.sets[id]={w,r,done:true};store.set('sess',ss);
      wi.disabled=ri.disabled=true;row.classList.add('ok');btn.textContent='✔';hap('medium');
      startRest(e.rest);
    };
  });
  const fa=$('#fx_add');if(fa)fa.onclick=()=>{
    const sel=$('#fx_sel').value,own=$('#fx_name').value.trim(),id=own?'text:'+own:sel;if(!id){toast('Выбери упражнение');return}
    ss.day.ex.push({id,s:3,r:'8–12',rir:2,rest:90,note:''});store.set('sess',ss);hap('medium');render()};
  document.querySelectorAll('[data-addset]').forEach(x=>x.onclick=()=>{ss.day.ex[+x.dataset.addset].s++;store.set('sess',ss);render()});
  document.querySelectorAll('[data-delex]').forEach(x=>x.onclick=()=>{const i=+x.dataset.delex;ss.day.ex.splice(i,1);const ns={};Object.keys(ss.sets).forEach(k=>{const [a,c]=k.split('_').map(Number);if(a<i)ns[k]=ss.sets[k];else if(a>i)ns[(a-1)+'_'+c]=ss.sets[k]});ss.sets=ns;store.set('sess',ss);render()});
  $('#finish').onclick=()=>finishSession();
  $('#cancelsess').onclick=()=>{if(confirm('Отменить тренировку? Данные не сохранятся.')){clearSess();S.screen=null;render()}};
}
function clearSess(){S.sess=null;store.set('sess',null);if(S._tick)clearInterval(S._tick);stopRest()}
function finishSession(){
  const ss=S.sess,D=sessDay(ss),P={name:ss.free?'Свободная тренировка':progById(ss.pid).name,id:ss.pid};let tonnage=0,sets=0;const sug=[];
  D.ex.forEach((e,ei)=>{
    const done=[];for(let si=0;si<e.s;si++){const d=ss.sets[ei+'_'+si];if(d&&d.done)done.push(d)}
    if(!done.length)return;sets+=done.length;
    const k=exKey(e.id),a=S.log[k]||(S.log[k]=[]);
    done.forEach(d=>{tonnage+=d.w*d.r;a.push({d:today().slice(5),ts:Date.now(),w:d.w,r:d.r,p:P.id})});
    const tr=topReps(e.r),allTop=tr&&done.length>=e.s&&done.every(d=>d.r>=tr);
    if(allTop)sug.push(`${exName(e.id)} → +2,5 кг (изоляция +1–2 кг)`);
  });
  store.set('log',S.log);
  if(!sets){toast('Нет выполненных подходов');return}
  S.done[today()]=D.n;store.set('done',S.done);
  const mins=Math.round((Date.now()-ss.start)/60000);
  clearSess();S.screen='summary';S.summary={name:D.n,tonnage:Math.round(tonnage),sets,mins,sug};
  hap('heavy');render();
}
function summaryScreen(){
  const s=S.summary;if(!s.ach)s.ach=newAchievements();
  return `<div class="hero"><div class="q">Lightweight, baby!</div><div class="tr">${s.name} выполнена</div></div>
  <div class="stats"><div><b>${s.sets}</b><span>${plural(s.sets,['подход','подхода','подходов'])}</span></div><div><b>${(s.tonnage/1000).toFixed(1)} т</b><span>тоннаж</span></div><div><b>${s.mins}'</b><span>минут</span></div></div>
  ${s.ach.length?`<h2>🏆 Новые достижения</h2>${s.ach.map(a=>`<div class="card" style="border-color:var(--accent)"><div class="row"><div style="font-size:34px">${a.ico}</div><div><b>${a.t}</b><div class="hint">${a.d}</div></div></div></div>`).join('')}`:''}
  ${s.sug.length?`<h2>В следующий раз</h2><div class="card"><ul>${s.sug.map(x=>`<li>${x}</li>`).join('')}</ul></div>`:'<div class="card hint">Закрой верх диапазона повторов во всех подходах — и приложение подскажет, когда повышать вес.</div>'}
  <button class="btn" id="share">📤 Поделиться</button><button class="btn ghost" id="sumok" style="margin-top:8px">Готово</button>`;
}

/* ---------- Таймер отдыха ---------- */
let _rest=null;
function stopRest(){if(_rest){clearInterval(_rest.i);_rest=null}const e=document.getElementById('rest');if(e)e.remove()}
function startRest(sec){
  stopRest();const end=Date.now()+sec*1000;
  const el=document.createElement('div');el.id='rest';
  el.innerHTML=`<div class="rt">Отдых <b id="rtv"></b></div><div><button id="rt30">+30</button><button id="rtx">Пропустить</button></div>`;
  document.body.appendChild(el);_rest={end};
  const tick=()=>{const left=Math.max(0,Math.ceil((_rest.end-Date.now())/1000));const v=document.getElementById('rtv');if(v)v.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
    if(left<=0){try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}try{tg&&tg.HapticFeedback.notificationOccurred('warning')}catch(e){}toast('Следующий подход!');stopRest()}};
  _rest.i=setInterval(tick,250);tick();
  $('#rt30').onclick=()=>{_rest.end+=30000};$('#rtx').onclick=stopRest;
}

/* ---------- Механика ---------- */
const gradeTag=g=>{const x=GRADE[g]||GRADE.opinion;return `<span class="tag ${x[1]}">${x[0]}</span>`};
const srcList=ids=>`<ol class="src">${ids.map(id=>{const s=SRC[id];if(!s)return '';return `<li>${s.u?`<a href="${s.u}" target="_blank" rel="noopener">${s.t}</a>`:s.t}${s.n?` <i>(${s.n})</i>`:''}</li>`}).join('')}</ol>`;
function mechScreen(){
  return `<h1>Как растут мышцы</h1>
  <p class="hint">Здесь только то, что подтверждено исследованиями, с оценкой надёжности и ссылками. Где данные расходятся или это мнение экспертов, так и написано.</p>
  ${MECH.map(m=>`<details class="card"><summary>${m.ico} ${m.t} ${gradeTag(m.grade)}</summary>
   <b>Что показывают исследования</b><ul>${m.find.map(t=>`<li>${t}</li>`).join('')}</ul>
   <b>Как использовать</b><ul>${m.use.map(t=>`<li>${t}</li>`).join('')}</ul>
   <b>Ограничения</b><ul class="hint">${m.limits.map(t=>`<li>${t}</li>`).join('')}</ul>
   <b>Источники</b>${srcList(m.src)}</details>`).join('')}
  <h2>Чему не стоит верить</h2>
  ${MYTHS.map(([t,d])=>`<details class="card"><summary>${t}</summary><p class="hint" style="color:var(--text)">${d}</p></details>`).join('')}
  <div class="hint">Оценка надёжности — моя классификация по типу источника: метаанализы, отдельные исследования, расходящиеся данные, мнение экспертов. Это не заменяет консультацию тренера или врача.</div>`;
}
function mechHtml(k){
  const m=EXM[k];if(!m)return '';
  const ul=a=>a&&a.length?`<ul>${a.map(t=>`<li>${t}</li>`).join('')}</ul>`:'';
  return `<h2>Механика</h2><div class="card"><b>Рычаги и техника</b>${ul(m.lever)}<b>Траектория</b><p class="hint">${m.bar}</p>
  ${m.inj&&m.inj.length?`<b>На что смотреть</b>${ul(m.inj)}`:''}${m.var&&m.var.length?`<b>Вариации</b>${ul(m.var)}`:''}</div>`;
}

/* ---------- Биохакинг ---------- */
function bioScreen(){
  const R=S.ready;
  return `<h1>Биохакинг</h1><p class="hint">Инструменты оптимизации восстановления и работоспособности. Здесь только то, что имеет разумные доказательства.</p>
  <div class="card"><b>⚡ Чек готовности сегодня</b><div class="hint">Простая эвристика на основе твоих ответов, не проверенная научная шкала.</div>
   <label>Сон, часов: <b id="v_sleep">7.5</b></label><input type="range" id="r_sleep" min="3" max="10" step="0.5" value="7.5">
   <label>Крепатура/усталость в мышцах: <b id="v_sore">2</b> (1 нет — 5 сильная)</label><input type="range" id="r_sore" min="1" max="5" value="2">
   <label>Стресс: <b id="v_str">2</b> (1 нет — 5 высокий)</label><input type="range" id="r_str" min="1" max="5" value="2">
   <label>Мотивация: <b id="v_mot">4</b> (1 нет — 5 высокая)</label><input type="range" id="r_mot" min="1" max="5" value="4">
   <label>Пульс покоя vs обычно: <b id="v_rhr">0</b> уд/мин</label><input type="range" id="r_rhr" min="-5" max="15" value="0">
   <button class="btn" id="ready" style="margin-top:10px">Оценить готовность</button><div id="readyout"></div></div>
  <div class="card"><b>🕐 Протокол дня</b><div class="hint">Практическое расписание на основе обычных рекомендаций (кофеин не поздно, еда до и после тренировки). Это не научный протокол.</div>
   <div class="grid2"><div><label>Подъём</label><input type="time" id="p_wake" value="07:00"></div><div><label>Тренировка</label><input type="time" id="p_train" value="18:00"></div></div>
   <label>Отбой</label><input type="time" id="p_bed" value="23:00"><button class="btn" id="proto" style="margin-top:10px">Построить расписание</button><div id="protoout"></div></div>
  ${BIO.map(m=>`<details class="card"><summary>${m.ico} ${m.t} ${gradeTag(m.grade)}</summary><b>Что известно</b><ul>${m.find.map(t=>`<li>${t}</li>`).join('')}</ul><b>Как использовать</b><ul>${m.use.map(t=>`<li>${t}</li>`).join('')}</ul><b>Ограничения</b><ul class="hint">${m.limits.map(t=>`<li>${t}</li>`).join('')}</ul>${m.src.length?`<b>Источники</b>${srcList(m.src)}`:''}</details>`).join('')}
  <h2>Анализы: на что смотреть</h2><div class="card"><table><tr><th>Показатель</th><th>Ориентир</th></tr>${LABS.map(l=>`<tr><td><b>${l[0]}</b><div class="hint">${l[2]}</div></td><td>${l[1]}</td></tr>`).join('')}</table>
  <div class="hint" style="margin-top:6px">Нормы зависят от лаборатории, пола и возраста. Интерпретировать результаты должен врач. Сдавай раз в год и при ухудшении самочувствия.</div></div>
  <h2>Добавки по доказательности</h2>${BIOSUP.map(t=>`<div class="card">${gradeTag(t.tier)}<table>${t.items.map(i=>`<tr><td><b>${i[0]}</b></td><td>${i[1]}<div class="hint">${i[2]}${i[3]&&SRC[i[3]]?` <a href="${SRC[i[3]].u||'#'}" target="_blank" rel="noopener" style="color:var(--accent)">источник</a>`:''}</div></td></tr>`).join('')}</table></div>`).join('')}
  <div class="hint">Перед добавками посоветуйся с врачом, особенно при хронических болезнях и приёме лекарств.</div>`;
}
function bindBio(){
  [['sleep','sleep'],['sore','sore'],['str','str'],['mot','mot'],['rhr','rhr']].forEach(([k])=>{const i=$('#r_'+k),v=$('#v_'+k);i.oninput=()=>v.textContent=i.value});
  $('#ready').onclick=()=>{
    const sl=+$('#r_sleep').value,so=+$('#r_sore').value,st=+$('#r_str').value,mo=+$('#r_mot').value,rh=+$('#r_rhr').value;
    let sc=(sl>=8?4:sl>=7?3:sl>=6?2:sl>=5?1:0)*2.5+(5-so)*1.5+(5-st)*1.5+mo*1.2;sc=Math.max(0,Math.min(100,Math.round(sc/ (10+6+6+6)*100)));
    if(rh>=8)sc-=15;else if(rh>=5)sc-=8;sc=Math.max(0,sc);
    const g=sc>=70?['ok','Зелёная зона','Тренируйся по плану. Можно пробивать рекорды в топ-сетах.']:sc>=45?['warn','Жёлтая зона','Тренируйся по плану, но RIR +1, без отказов. Объём можно сократить на 20%.']:['bad','Красная зона','Лучше лёгкая тренировка (объём −50%, RIR 3–4) или отдых/прогулка. Сон и еда — приоритет.'];
    $('#readyout').innerHTML=`<div class="${g[0]==='ok'?'card':g[0]==='warn'?'warnbox':'badbox'}" style="margin-top:10px"><b>${g[1]} · ${sc}/100</b><div class="hint" style="color:var(--text)">${g[2]}</div></div>`;hap('medium');
  };
  $('#proto').onclick=()=>{
    const m=s=>{const [h,mm]=s.split(':').map(Number);return h*60+mm},wake=m($('#p_wake').value);let train=m($('#p_train').value),bed=m($('#p_bed').value);
    if(train<wake)train+=1440;if(bed<=wake)bed+=1440;
    const f=t=>{t=((t%1440)+1440)%1440;return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')};
    const cut=bed-9*60;
    const ev=[[wake,'☀️ Свет 10–20 мин на улице/у окна, стакан воды 500 мл + щепотка соли'],[wake+90,'☕ Кофеин (если нужно) — после 90 мин с момента подъёма'],
     [train-150,'🍽 Основной приём: белок 30–40 г + углеводы + мало жиров'],[train-45,train-45<=cut?'⚡ Кофеин 3 мг/кг (по желанию) + цитруллин 6–8 г':'⚡ Без кофеина: уже поздно для сна — только цитруллин/вода'],
     [train,'🏋️ Тренировка: разминка 10 мин → работа 50–70 мин'],[train+90,'🍽 После: белок 30–40 г + углеводы, электролиты'],[bed-180,'🍽 Последний приём пищи'],
     [bed-120,'🚿 Тёплый душ/сауна, снизь температуру в комнате до 18 °C'],[bed-60,'🌙 Приглушить свет, без экранов; магний 200–400 мг, глицин 3 г (по желанию)'],[bed,'😴 Отбой. Цель 7–9 часов сна']];
    ev.sort((a,b)=>a[0]-b[0]);
    $('#protoout').innerHTML=`<table style="margin-top:8px">${ev.map(e=>`<tr><td style="width:56px"><b>${f(e[0])}</b></td><td>${e[1]}</td></tr>`).join('')}</table><div class="hint">Последняя доза кофеина — до ${f(cut)}.</div>`;hap('medium');
  };
}

function toolsScreen(){
  return `<h1>Инструменты</h1>
  <div class="card"><b>🏋️ Расчёт 1ПМ</b><div class="logrow"><input id="t_w" type="number" inputmode="decimal" placeholder="Вес, кг"><input id="t_r" type="number" inputmode="numeric" placeholder="Повторы"></div>
   <button class="btn" id="t_go" style="margin-top:8px">Рассчитать</button><div id="t_out"></div></div>
  <div class="card"><b>🧮 Блины на штангу</b><div class="logrow"><input id="p_w" type="number" inputmode="decimal" placeholder="Нужный вес, кг"><input id="p_bar" type="number" inputmode="decimal" placeholder="Гриф" value="20"></div>
   <button class="btn" id="p_go" style="margin-top:8px">Показать</button><div id="p_out"></div></div>
  <div class="card"><b>⏱ Таймер отдыха</b><div class="views" id="t_rest">${[60,90,120,180,240,300].map(s=>`<button data-s="${s}">${fmtRest(s)}</button>`).join('')}</div></div>
  <div class="card"><b>📋 Таблица RPE / RIR</b><table><tr><th>RPE</th><th>RIR</th><th>Смысл</th></tr><tr><td>10</td><td>0</td><td>Отказ</td></tr><tr><td>9</td><td>1</td><td>Ещё 1 повтор</td></tr><tr><td>8</td><td>2</td><td>Рабочая зона базы</td></tr><tr><td>7</td><td>3</td><td>Лёгкий рабочий</td></tr><tr><td>6</td><td>4+</td><td>Разминка</td></tr></table></div>`;
}
function bindTools(){
  $('#t_go').onclick=()=>{
    const w=parseFloat($('#t_w').value),r=parseInt($('#t_r').value);if(!(w>0)||!(r>0)||r>20){toast('Вес и повторы (1–20)');return}
    const e=w*(1+r/30),b=r<37?w*36/(37-r):e,orm=(e+b)/2;
    const rows=[[100,1],[95,2],[90,4],[85,6],[80,8],[75,10],[70,12],[65,15]].map(([p,rp])=>`<tr><td>${p}%</td><td><b>${(orm*p/100).toFixed(1)} кг</b></td><td class="hint">~${rp} повт.</td></tr>`).join('');
    $('#t_out').innerHTML=`<p style="margin-top:10px">1ПМ ≈ <b style="color:var(--accent);font-size:22px">${orm.toFixed(1)} кг</b></p><table>${rows}</table>`;hap('medium');
  };
  $('#p_go').onclick=()=>{
    const t=parseFloat($('#p_w').value),bar=parseFloat($('#p_bar').value)||20;if(!(t>bar)){toast('Вес больше грифа');return}
    let side=(t-bar)/2;const out=[];[25,20,15,10,5,2.5,1.25].forEach(p=>{const n=Math.floor(side/p+1e-6);if(n>0){out.push(`${n}×${p}`);side-=n*p}});
    $('#p_out').innerHTML=`<p style="margin-top:10px">На каждую сторону: <b>${out.join(' + ')||'—'}</b></p>${side>0.01?`<div class="hint">Остаток ${(side*2).toFixed(2)} кг не набирается блинами.</div>`:''}`;hap('medium');
  };
  document.querySelectorAll('#t_rest button').forEach(b=>b.onclick=()=>{startRest(+b.dataset.s);hap()});
}

/* ---------- Прогресс ---------- */
const e1rm=(w,r)=>w*(1+Math.min(r,12)/30);
function lineChart(pts,opt={}){
  if(pts.length<2)return '<div class="hint" style="padding:14px 0">Нужно минимум 2 записи, чтобы построить график.</div>';
  const W=340,H=130,P=26,xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),dy=(y1-y0)||1;
  const X=x=>P+(W-P-8)*((x-x0)/((x1-x0)||1)),Y=y=>H-18-(H-34)*((y-(y0-dy*.1))/(dy*1.2));
  const d=pts.map((p,i)=>(i?'L':'M')+X(p.x).toFixed(1)+','+Y(p.y).toFixed(1)).join(' ');
  const area=d+` L${X(x1).toFixed(1)},${H-18} L${X(x0).toFixed(1)},${H-18} Z`;
  const last=pts[pts.length-1],first=pts[0],diff=last.y-first.y;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto"><defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5b301" stop-opacity=".35"/><stop offset="1" stop-color="#f5b301" stop-opacity="0"/></linearGradient></defs>
  <path d="${area}" fill="url(#lg)"/><path d="${d}" fill="none" stroke="#f5b301" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${pts.map(p=>`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3" fill="#f5b301"/>`).join('')}
  <text x="${P}" y="12" fill="#9a968a" font-size="10">${y1.toFixed(1)}</text><text x="${P}" y="${H-22}" fill="#9a968a" font-size="10">${y0.toFixed(1)}</text>
  <text x="${P}" y="${H-4}" fill="#9a968a" font-size="10">${first.l||''}</text><text x="${W-8}" y="${H-4}" fill="#9a968a" font-size="10" text-anchor="end">${last.l||''}</text></svg>
  <div class="hint">${diff>=0?'▲':'▼'} ${Math.abs(diff).toFixed(1)} ${opt.unit||''} с первой записи</div>`;
}
function barChart(vals,labels){
  if(!vals.length||Math.max(...vals)===0)return '<div class="hint" style="padding:14px 0">Пока нет данных по тоннажу. Заверши хотя бы одну тренировку.</div>';
  const W=340,H=120,m=Math.max(...vals),bw=(W-20)/vals.length;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${vals.map((v,i)=>{const h=(H-30)*v/m;
   return `<rect x="${10+i*bw+4}" y="${H-18-h}" width="${bw-8}" height="${h}" rx="4" fill="${i===vals.length-1?'#f5b301':'#8a6a10'}"/><text x="${10+i*bw+bw/2}" y="${H-4}" fill="#9a968a" font-size="9" text-anchor="middle">${labels[i]}</text>${v?`<text x="${10+i*bw+bw/2}" y="${H-22-h}" fill="#f4f1e8" font-size="9" text-anchor="middle">${(v/1000).toFixed(1)}т</text>`:''}`}).join('')}</svg>`;
}
function weekStart(ts){const d=new Date(ts);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d.getTime()}
function progScreen(){
  const bw=S.bw||(S.bw=store.get('bw',{}));
  const bwPts=Object.keys(bw).sort().map(d=>({x:new Date(d).getTime(),y:bw[d],l:d.slice(5)}));
  const keys=Object.keys(S.log).filter(k=>(S.log[k]||[]).length);
  const sel=S.progEx&&keys.includes(S.progEx)?S.progEx:keys[0];
  S.progEx=sel;
  const exPts=sel?(()=>{const by={};S.log[sel].forEach((e,i)=>{const t=e.ts||i;const key=e.d+'|'+(e.ts?'':i);const v=e1rm(e.w,e.r);if(!by[e.d]||v>by[e.d].y)by[e.d]={x:Object.keys(by).length,y:v,l:e.d}});return Object.values(by)})():[];
  const now=Date.now(),ws=weekStart(now),weeks=[...Array(8)].map((_,i)=>ws-(7-i)*7*864e5),vol=weeks.map(()=>0);
  Object.values(S.log).forEach(a=>a.forEach(e=>{if(!e.ts)return;const w=weekStart(e.ts),i=weeks.indexOf(w);if(i>=0)vol[i]+=e.w*e.r}));
  const lab=weeks.map(w=>{const d=new Date(w);return d.getDate()+'.'+String(d.getMonth()+1).padStart(2,'0')});
  const lastBw=bwPts.length?+bwPts[bwPts.length-1].y.toFixed(1):'';
  return `<h1>Прогресс</h1>
  ${weeklyReport()}
  <div class="card"><b>⚖️ Вес тела</b>
   <div class="logrow"><input id="bw_in" type="number" inputmode="decimal" step="0.1" placeholder="Вес сегодня, кг" value=""><button class="btn small" id="bw_save" style="width:auto">Записать</button></div>
   ${lineChart(bwPts,{unit:'кг'})}${lastBw?`<div class="hint">Последняя запись: ${lastBw} кг. Смотри тренд по неделе, а не отдельный день.</div>`:''}</div>
  <div class="card"><b>💪 Сила по упражнению (расчётный 1ПМ)</b>
   ${keys.length?`<select id="pg_ex" style="margin:8px 0">${keys.map(k=>`<option value="${k}" ${k===sel?'selected':''}>${exName(k)}</option>`).join('')}</select>${lineChart(exPts,{unit:'кг'})}`:'<div class="hint" style="padding:10px 0">Заверши тренировку или запиши подход в карточке упражнения, и здесь появится график силы.</div>'}</div>
  <div class="card"><b>📊 Недельный тоннаж</b><div class="hint">Сумма вес × повторы за неделю, последние 8 недель.</div>${barChart(vol,lab)}</div>
  ${achGrid()}
  <div class="hint">Данные хранятся на твоём устройстве. 1ПМ — расчёт по формуле Эпли, ориентир, а не тест.</div>`;
}
function bindProg(){
  const s=$('#bw_save');if(s)s.onclick=()=>{const v=parseFloat($('#bw_in').value);if(!(v>20&&v<400)){toast('Введи вес в кг');return}
    const bw=S.bw||(S.bw=store.get('bw',{}));bw[today()]=v;store.set('bw',bw);hap('medium');toast('Записано');render()};
  const e=$('#pg_ex');if(e)e.onchange=()=>{S.progEx=e.value;render()};
}

const plural=(n,f)=>{n=Math.abs(n)%100;const m=n%10;return n>10&&n<20?f[2]:m===1?f[0]:m>=2&&m<=4?f[1]:f[2]};
function shareSummary(){
  const s=S.summary,txt=`💪 ${s.name}: ${s.sets} ${plural(s.sets,['подход','подхода','подходов'])}, ${(s.tonnage/1000).toFixed(1)} т тоннажа за ${s.mins} мин. Lightweight, baby! Тренируюсь в LIGHTWEIGHT.`;
  const url='https://t.me/share/url?url='+encodeURIComponent(location.href.split('#')[0].split('?')[0])+'&text='+encodeURIComponent(txt);
  try{if(tg&&tg.openTelegramLink){tg.openTelegramLink(url);return}}catch(e){}
  window.open(url,'_blank');
}

/* ---------- Подбор программы ---------- */
const GOALS=[['mass','💪 Набрать массу'],['strength','🏋️ Стать сильнее'],['cut','🔥 Похудеть и подтянуться']];
function recommend(goal,days,lvl){
  const strength=['a-str4','p-ul5','a-ul4','b-fb3','a-fb3'],mass=['a-ul4','a-fb3','a-ppl6','p-ul5','b-ul4','b-fb3'],cut=['b-fb3','a-fb3','a-ul4','b-ul4','p-fb2'];
  const pref={mass,strength,cut}[goal]||mass;
  return PROGS.map(p=>{
    let sc=0;const order=['beginner','advanced','pro'];
    sc+=p.lvl===lvl?50:Math.abs(order.indexOf(p.lvl)-order.indexOf(lvl))===1?10:-40;
    sc-=Math.abs(p.freq-days)*12;if(p.freq>days)sc-=25;
    const i=pref.indexOf(p.id);sc+=i>=0?20-i*3:0;
    return {p,sc};
  }).sort((x,y)=>y.sc-x.sc).slice(0,3).map(x=>x.p);
}
function onbScreen(){
  const o=S.onb||(S.onb={goal:'mass',days:4});
  return `<div class="hero"><div class="q">Давай подберём программу</div><div class="tr">Два вопроса — и я предложу лучшие варианты</div></div>
  <div class="card"><b>Какая у тебя цель?</b><div class="seg" id="ob_goal" style="flex-direction:column;margin-top:8px">${GOALS.map(([v,t])=>`<button data-v="${v}" class="${o.goal===v?'on':''}" style="padding:12px">${t}</button>`).join('')}</div>
  <b style="display:block;margin-top:14px">Сколько дней в неделю можешь тренироваться?</b><div class="seg" id="ob_days" style="margin-top:8px">${[3,4,5,6].map(d=>`<button data-v="${d}" class="${o.days===d?'on':''}">${d}</button>`).join('')}</div></div>
  <button class="btn" id="ob_go">Подобрать программу</button><button class="btn ghost" id="ob_skip" style="margin-top:8px">Пропустить</button>
  <div id="ob_out"></div>`;
}
function bindOnb(){
  const o=S.onb||(S.onb={goal:'mass',days:4});
  document.querySelectorAll('#ob_goal button').forEach(b=>b.onclick=()=>{o.goal=b.dataset.v;document.querySelectorAll('#ob_goal button').forEach(x=>x.classList.toggle('on',x===b));hap()});
  document.querySelectorAll('#ob_days button').forEach(b=>b.onclick=()=>{o.days=+b.dataset.v;document.querySelectorAll('#ob_days button').forEach(x=>x.classList.toggle('on',x===b));hap()});
  $('#ob_skip').onclick=()=>{store.set('onb',true);S.screen=null;render()};
  $('#ob_go').onclick=()=>{
    const rec=recommend(o.goal,o.days,S.level);hap('medium');
    $('#ob_out').innerHTML=`<h2>Подходит тебе</h2>`+rec.map((p,i)=>`<div class="card click" data-pick2="${p.id}" ${i===0?'style="border-color:var(--accent)"':''}>
     <div class="row sb"><b>${p.name}</b>${i===0?'<span class="tag ok">лучший выбор</span>':''}</div><div class="hint" style="color:var(--accent)">${p.tag}</div>
     <div class="hint">${p.freq} дн/нед · ${p.weeks} нед · ${LEVELS[p.lvl].name}</div></div>`).join('');
    document.querySelectorAll('[data-pick2]').forEach(c=>c.onclick=()=>{S.prog=c.dataset.pick2;store.set('prog',S.prog);store.set('pstart',{id:S.prog,ts:Date.now()});store.set('onb',true);S.screen=null;S.tab='plan';hap('medium');toast('Программа выбрана');render()});
    $('#ob_out').scrollIntoView({behavior:'smooth'});
  };
}

function warmupHtml(D){
  const e=D.ex[0],k=exKey(e.id),w=parseFloat(lastW(k));
  const r5=x=>Math.max(0,Math.round(x/2.5)*2.5);
  const rows=w>0?[[0.4,8],[0.6,5],[0.8,3]].map(([f,r])=>`<tr><td>${r5(w*f)} кг</td><td>× ${r}</td></tr>`).join(''):'<tr><td colspan="2" class="hint">Запиши первый подход, и я посчитаю разминку по твоему рабочему весу.</td></tr>';
  return `<details class="card"><summary>🔥 Разминка перед «${exName(e.id)}»</summary><div class="hint" style="margin:6px 0">5–7 минут кардио и мобильность, затем подводящие подходы с отдыхом 60 сек:</div><table>${rows}</table></details>`;
}

function freeAddHtml(){
  return `<div class="card"><b>➕ Добавить упражнение</b>
   <select id="fx_sel" style="margin-top:8px"><option value="">— выбери из списка —</option>${Object.keys(EX).map(k=>`<option value="${k}">${EX[k].name}</option>`).join('')}</select>
   <input id="fx_name" placeholder="…или впиши своё название" style="margin-top:8px">
   <button class="btn" id="fx_add" style="margin-top:8px">Добавить</button></div>`;
}

/* ---------- Достижения ---------- */
function totalTonnage(){let t=0;Object.values(S.log).forEach(a=>a.forEach(e=>t+=e.w*e.r));return t}
function bestW(k){return Math.max(0,...(S.log[k]||[]).map(e=>e.w))}
function prCount(){let n=0;Object.values(S.log).forEach(a=>{let m=0;a.forEach(e=>{const v=e1rm(e.w,e.r);if(m&&v>m*1.0001)n++;if(v>m)m=v})});return n}
function longestStreak(){const ks=Object.keys(S.done).sort();let best=0,cur=0,prev=null;ks.forEach(k=>{const d=new Date(k).getTime();cur=(prev&&Math.round((d-prev)/864e5)===1)?cur+1:1;prev=d;if(cur>best)best=cur});return best}
function achievements(){
  const w=Object.keys(S.done).length,t=totalTonnage(),st=longestStreak(),bw=Object.keys(S.bw||store.get('bw',{})).length;
  return [
   {id:'first',ico:'🥇',t:'Первый шаг',d:'Заверши первую тренировку',ok:w>=1},
   {id:'w5',ico:'💪',t:'Втягиваюсь',d:'5 тренировок',ok:w>=5},
   {id:'w25',ico:'🔥',t:'Режим зверя',d:'25 тренировок',ok:w>=25},
   {id:'w100',ico:'👑',t:'Легенда зала',d:'100 тренировок',ok:w>=100},
   {id:'st3',ico:'📅',t:'Три дня подряд',d:'Серия 3 дня',ok:st>=3},
   {id:'st7',ico:'⚡',t:'Неделя без пропусков',d:'Серия 7 дней',ok:st>=7},
   {id:'t10',ico:'🏗️',t:'10 тонн',d:'Суммарный тоннаж 10 т',ok:t>=10000},
   {id:'t100',ico:'🚛',t:'100 тонн',d:'Суммарный тоннаж 100 т',ok:t>=100000},
   {id:'pr1',ico:'📈',t:'Новый рекорд',d:'Улучши расчётный 1ПМ',ok:prCount()>=1},
   {id:'pr10',ico:'🚀',t:'Рекордсмен',d:'10 личных рекордов',ok:prCount()>=10},
   {id:'b100',ico:'🏋️',t:'Сотка в жиме',d:'Жим лёжа от 100 кг',ok:bestW('bench')>=100},
   {id:'s140',ico:'🦵',t:'Присед 140',d:'Присед от 140 кг',ok:bestW('squat')>=140},
   {id:'d180',ico:'⛓️',t:'Становая 180',d:'Становая от 180 кг',ok:bestW('deadlift')>=180},
   {id:'bw7',ico:'⚖️',t:'Контроль веса',d:'7 записей веса тела',ok:bw>=7}
  ];
}
function newAchievements(){
  const seen=store.get('ach',[]),all=achievements(),fresh=all.filter(a=>a.ok&&!seen.includes(a.id));
  if(fresh.length)store.set('ach',all.filter(a=>a.ok).map(a=>a.id));
  return fresh;
}
function achGrid(){
  const a=achievements(),n=a.filter(x=>x.ok).length;
  return `<div class="row sb"><h2 style="margin:0">🏆 Достижения</h2><span class="tag">${n}/${a.length}</span></div>
  <div class="ach">${a.map(x=>`<div class="a ${x.ok?'on':''}"><div class="i">${x.ico}</div><b>${x.t}</b><span>${x.d}</span></div>`).join('')}</div>`;
}
/* ---------- Итоги недели ---------- */
function weeklyReport(){
  const ws=weekStart(Date.now()),pw=ws-7*864e5;let ton=[0,0],sets=[0,0],pr=0;const days=[new Set(),new Set()];
  Object.values(S.log).forEach(a=>{let m=0;a.forEach(e=>{const v=e1rm(e.w,e.r);
    if(e.ts){const w=weekStart(e.ts),i=w===ws?0:w===pw?1:-1;if(i>=0){ton[i]+=e.w*e.r;sets[i]++;days[i].add(new Date(e.ts).toDateString());if(i===0&&m&&v>m*1.0001)pr++}}
    if(v>m)m=v})});
  const diff=ton[1]?Math.round((ton[0]-ton[1])/ton[1]*100):null;
  const verdict=sets[0]===0?'На этой неделе пока нет тренировок — самое время начать.':diff==null?'Отличное начало недели!':diff>=10?'Объём растёт — так держать.':diff<=-25?'Объём заметно ниже прошлой недели. Если это не разгрузка, стоит проверить сон и питание.':'Стабильная неделя — это тоже прогресс.';
  return `<div class="card"><b>📅 Итоги недели</b>
   <div class="stats" style="margin:8px 0"><div><b>${days[0].size}</b><span>тренировок</span></div><div><b>${(ton[0]/1000).toFixed(1)} т</b><span>тоннаж</span></div><div><b>${pr}</b><span>рекордов</span></div></div>
   <div class="hint">${diff==null?'':`К прошлой неделе: ${diff>=0?'▲':'▼'} ${Math.abs(diff)}% по тоннажу. `}${verdict}</div></div>`;
}

/* ---------- Простой старт: два вопроса ---------- */
function startScreen(){
  const o=S.ob||(S.ob={step:1});
  if(o.step===1)return `<div class="hero"><div class="q">Давай начнём</div><div class="tr">Два вопроса — и твоя тренировка готова</div></div>
   <h1>Какая у тебя цель?</h1>
   ${[['mass','💪','Набрать мышцы'],['cut','🔥','Похудеть и подтянуться'],['strength','🏋️','Стать сильнее']].map(([v,i,t])=>`<button class="big" data-goal="${v}"><span>${i}</span>${t}</button>`).join('')}<div class="hint" style="text-align:center;margin-top:10px">Приложение не заменяет врача. При проблемах со здоровьем сначала посоветуйся с врачом.</div>`;
  return `<button class="back" id="obback">‹ Назад</button><h1>Какой у тебя опыт?</h1>
   ${[['beginner','🌱','Только начинаю','Не тренировался или давно не ходил'],['advanced','🔥','Тренируюсь больше года','Знаю базовые упражнения'],['pro','🏆','Опытный атлет','Серьёзные веса, свой режим']].map(([v,i,t,d])=>`<button class="big" data-lvl="${v}"><span>${i}</span><div>${t}<small>${d}</small></div></button>`).join('')}`;
}
function bindStart(){
  const o=S.ob||(S.ob={step:1});
  document.querySelectorAll('[data-goal]').forEach(x=>x.onclick=()=>{o.goal=x.dataset.goal;o.step=2;hap();render()});
  const bk=$('#obback');if(bk)bk.onclick=()=>{o.step=1;render()};
  document.querySelectorAll('[data-lvl]').forEach(x=>x.onclick=()=>{
    hap('medium');const lvl=x.dataset.lvl,days={beginner:3,advanced:4,pro:5}[lvl];
    S.level=lvl;store.set('level',lvl);
    S.prof.goal=o.goal==='cut'?'cut':o.goal==='mass'?'mass':'keep';store.set('prof',S.prof);
    const p=recommend(o.goal,days,lvl)[0];S.prog=p.id;store.set('prog',p.id);store.set('pstart',{id:p.id,ts:Date.now()});store.set('onb',true);
    S.ob=null;S.tab='plan';S.screen=null;toast('Твой курс готов');render()});
}
/* ---------- Меню «Ещё» ---------- */
function moreScreen(){
  const items=[['tech','🎬','Техника упражнений','3D-показ каждого упражнения'],['food','🥗','Питание','Сколько есть и что'],['sup','💊','Спортпит','Что работает, а что нет'],['bio','🧬','Восстановление и сон','Режим дня, готовность'],['mech','🧠','Как растут мышцы','Простыми словами и подробно'],['tools','🧰','Инструменты','Калькуляторы, таймер'],['health','❤️','Здоровье','Анализы и безопасность'],['change','🔁','Сменить цель или опыт','Подобрать курс заново'],['about','ℹ️','О приложении','Версия, данные, условия']];
  return `<h1>Ещё</h1>${items.map(([id,i,t,d])=>`<div class="card click row" data-go="${id}" style="gap:14px"><div style="font-size:28px">${i}</div><div><b>${t}</b><div class="hint">${d}</div></div></div>`).join('')}
   <div class="card click row" id="invite" style="gap:14px"><div style="font-size:28px">🤝</div><div><b>Пригласить друга</b><div class="hint">Вместе тренироваться веселее</div></div></div>
   <div class="card click row" id="freeopen" style="gap:14px"><div style="font-size:28px">✍️</div><div><b>Свободная тренировка</b><div class="hint">Записать подходы самому</div></div></div>`;
}
function bindMore(){
  document.querySelectorAll('[data-go]').forEach(c=>c.onclick=()=>{hap();const id=c.dataset.go;
    if(id==='change'){S.level=null;S.ob=null;render();return}
    S.tab=id;render()});
  const f=$('#freeopen');if(f)f.onclick=()=>{hap('medium');startFree()};
  const iv=$('#invite');if(iv)iv.onclick=()=>{hap();const url='https://t.me/share/url?url='+encodeURIComponent(location.href.split('#')[0].split('?')[0])+'&text='+encodeURIComponent('Тренируюсь в LIGHTWEIGHT: приложение само ведёт по тренировке, подсказывает вес и отдых. Попробуй!');
    try{if(tg&&tg.openTelegramLink){tg.openTelegramLink(url);return}}catch(e){}window.open(url,'_blank')};
}

/* ---------- О приложении, данные, условия ---------- */
function aboutScreen(){
  return `<h1>О приложении</h1>
  <div class="card"><b>LIGHTWEIGHT</b> · версия ${APP_VERSION}<div class="hint">Тренировки с гидом, 3D-техника, питание и прогресс в Telegram.</div>
   <div class="hint" style="margin-top:6px">Неофициальный проект в духе легенды бодибилдинга. Не связан с Ронни Коулманом и не одобрен им.</div></div>
  <div class="card legal"><b>Здоровье и безопасность</b>
   <p>Приложение даёт общую информацию о тренировках и питании и <b>не заменяет врача</b>. Перед началом занятий проконсультируйся с врачом, если у тебя есть заболевания, травмы, беременность или ты давно не тренировался.</p>
   <p>Остановись и прекрати упражнение при боли в суставах, головокружении, боли в груди или одышке. Веса и подходы в приложении — ориентир, подбирай нагрузку по самочувствию.</p>
   <p>Раздел о гормональных препаратах содержит только информацию о рисках. Приложение не даёт схем и дозировок и не призывает к их применению.</p></div>
  <div class="card legal"><b>Конфиденциальность</b>
   <p>Мы не собираем и не передаём твои персональные данные, не используем рекламу и аналитику.</p>
   <p>Данные тренировок, питания и прогресса хранятся на твоём устройстве и в облачном хранилище Telegram, которое доступно только тебе. Твоё имя из Telegram используется только для приветствия на экране.</p></div>
  <div class="card"><b>Документы</b><div class="hint" style="margin:4px 0 8px"><a href="privacy.html" target="_blank" rel="noopener" style="color:var(--accent)">Политика конфиденциальности</a></div></div>
  <div class="card"><b>Твои данные</b>
   <div class="hint" style="margin:4px 0 8px">Скопируй резервную копию или полностью удали данные.</div>
   <button class="btn ghost" id="exp">📋 Скопировать данные</button>
   <button class="btn ghost" id="wipe" style="margin-top:8px;border-color:var(--bad);color:var(--bad)">🗑 Удалить все данные</button></div>`;
}
function bindAbout(){
  const ex=$('#exp');if(ex)ex.onclick=async()=>{
    const data={};Object.keys(localStorage).filter(k=>k.startsWith('fp_')).forEach(k=>{try{data[k]=JSON.parse(localStorage.getItem(k))}catch(e){data[k]=localStorage.getItem(k)}});
    const txt=JSON.stringify({app:'lightweight',version:APP_VERSION,exported:new Date().toISOString(),data});
    try{await navigator.clipboard.writeText(txt);toast('Скопировано')}catch(e){
      const t=document.createElement('textarea');t.value=txt;document.body.appendChild(t);t.select();try{document.execCommand('copy');toast('Скопировано')}catch(_){toast('Не удалось скопировать')}t.remove()}};
  const w=$('#wipe');if(w)w.onclick=()=>{
    if(!confirm('Удалить все данные: журнал, прогресс, настройки? Это нельзя отменить.'))return;
    Object.keys(localStorage).filter(k=>k.startsWith('fp_')).forEach(k=>localStorage.removeItem(k));
    try{if(cs&&cs.getKeys)cs.getKeys((e,keys)=>{if(!e&&keys&&keys.length)cs.removeItems(keys.filter(k=>k.startsWith('fp_')))})}catch(e){}
    toast('Данные удалены');setTimeout(()=>location.reload(),700)};
}
