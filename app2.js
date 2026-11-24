/* ===== Библиотека программ, режим тренировки, механика, биохакинг, инструменты ===== */
const progById=id=>PROGS.find(p=>p.id===id);
const fmtRest=s=>s>=60?(s%60?`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:`${s/60} мин`):`${s} сек`;
const exKey=id=>id.startsWith('text:')?id.slice(5):id;
const exName=id=>id.startsWith('text:')?id.slice(5):lbl(id);
const hasAnim=id=>!id.startsWith('text:')&&EX[id];
function curProg(){let p=progById(S.prog);if(!p||false){p=PROGS.find(x=>x.lvl===S.level)||PROGS[0]}return p}
const lastW=k=>{const a=S.log[k];return a&&a.length?a[a.length-1].w:''};

/* ---------- План ---------- */
const DELOAD={'b-full3':[5,9],'b-ul4':[6,12],'a-ul4':[5,10],'a-ppl6':[4,8],'a-arnold':[4,8],'a-pb5':[6,12],'p-heavy':[6,12],'p-hit':[7],'p-dup':[4,8,12],'p-spec':[7],'p-peak':[4,8,12]};
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
function planScreen(){
  if(S.progPick)return progLibrary();
  const P=curProg(),q=quoteOfDay(),target=P.freq,total=Object.keys(S.done).length,nd=nextDayIdx(P),doneToday=!!S.done[today()];
  return `<div class="hero"><div class="q">${q[0]}</div><div class="tr">${q[1]}</div></div>
  ${S.g?`<div class="card" style="border-color:var(--accent)"><b>Тренировка с гидом в процессе</b><div class="hint">${guideDay(S.g).n}</div><button class="btn" id="gresume" style="margin-top:8px">▶ Продолжить</button></div>`:
   (doneToday?`<div class="card"><b>✅ Сегодня ты уже потренировался</b><div class="hint">Отдых тоже часть программы. Следующая: ${P.days[nd].n}</div></div>`:
   `<div class="card cta"><div class="hint">Твоя тренировка на сегодня</div><h1 style="margin:2px 0 4px">${P.days[nd].n}</h1><div class="hint">${P.days[nd].focus} · ${P.days[nd].ex.length} упражнений · ~${gDur({pid:P.id,di:nd})} мин</div>
    <button class="btn" id="gstartnow" data-gstart="${nd}" style="margin-top:10px;font-size:17px;padding:14px">▶ Начать тренировку</button>
    <div class="hint" style="margin-top:6px">Покажу каждое упражнение, подскажу вес и отдых. Тебе — только делать.</div></div>`)}
  ${weekBanner(P)}
  <div class="stats"><div><b>${weekCount()}/${target}</b><span>за неделю</span></div><div><b>${streak()}🔥</b><span>дней подряд</span></div><div><b>${total}</b><span>всего тренировок</span></div></div>
  <div class="card"><div class="row sb"><span class="tag">${LEVELS[P.lvl].name}</span><span class="hint">${P.freq} дн/нед · ${P.weeks} нед</span></div>
   <h1 style="margin:8px 0 2px">${P.name}</h1><div class="hint" style="color:var(--accent)">${P.tag}</div>
   <p>${P.desc}</p><p class="hint"><b>Для кого:</b> ${P.who}</p>
   <button class="btn ghost small" id="pickprog">🔁 Сменить</button> <button class="btn ghost small" id="findprog">🎯 Подобрать</button></div>
  ${S.sess?`<div class="card" style="border-color:var(--accent)"><b>Идёт тренировка</b><div class="hint">${sessDay(S.sess).n}</div><button class="btn small" id="resume" style="margin-top:8px">▶ Продолжить</button></div>`:''}
  ${P.days.map((d,di)=>`<div class="card" ${di===nd&&!doneToday?'style="border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset"':''}><div class="row sb"><b>${di===nd&&!doneToday?'⭐ Сегодня: ':''}${d.n}</b><span class="tag warn">${d.focus}</span></div>
   <table>${d.ex.map(e=>`<tr><td>${hasAnim(e.id)?`<a href="#" data-ex="${e.id}" style="color:var(--accent);text-decoration:none">▶ ${exName(e.id)}</a>`:exName(e.id)}${e.note?`<div class="hint">${e.note}</div>`:''}</td>
   <td style="white-space:nowrap;text-align:right"><b>${e.s}×${e.r}</b><div class="hint">RIR ${e.rir} · ${fmtRest(e.rest)}</div></td></tr>`).join('')}</table>
   <button class="btn" data-gstart="${di}" style="margin-top:10px">▶ Начать с подсказками</button><button class="btn ghost small" data-start="${di}" style="margin-top:8px">Ручной ввод</button></div>`).join('')}
  <button class="btn ghost" id="freesess">➕ Свободная тренировка (без программы)</button>
  <h2>Прогрессия</h2><div class="card">${P.prog}</div>
  <h2>Разгрузка</h2><div class="card">${P.deload}</div>
  <h2>Важно</h2><div class="card"><ul>${P.notes.map(n=>`<li>${n}</li>`).join('')}</ul></div>`;
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
  const s=S.summary;
  return `<div class="hero"><div class="q">Lightweight, baby!</div><div class="tr">${s.name} выполнена</div></div>
  <div class="stats"><div><b>${s.sets}</b><span>${plural(s.sets,['подход','подхода','подходов'])}</span></div><div><b>${(s.tonnage/1000).toFixed(1)} т</b><span>тоннаж</span></div><div><b>${s.mins}'</b><span>минут</span></div></div>
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
const lv=l=>`<span class="tag ${l==='A'?'ok':l==='B'?'warn':'bad'}">уровень ${l}</span>`;
function mechScreen(){
  return `<h1>Механика роста</h1><p class="hint">Научная база: как устроены рычаги, нагрузка и прогрессия. Уровень доказательности: A — сильные данные, B — умеренные.</p>
  ${MECH.map(m=>`<details class="card"><summary>${m.ico} ${m.t} ${lv(m.lvl)}</summary>${m.p.map(t=>`<p class="hint" style="color:var(--text)">${t}</p>`).join('')}</details>`).join('')}
  <h2>Объём: подходов в неделю на группу</h2><div class="card"><table><tr><th>Группа</th><th>MEV</th><th>MAV</th><th>MRV</th></tr>
  ${VOLUME.map(v=>`<tr><td>${v[0]}</td><td>${v[1]}</td><td><b>${v[2]}</b></td><td>${v[3]}</td></tr>`).join('')}</table>
  <div class="hint" style="margin-top:6px">MEV — минимум для роста, MAV — рабочий диапазон, MRV — предел восстановления. Начинай с MEV+2 и поднимай по неделям.</div></div>
  <h2>Недельная схема объёма</h2><div class="card"><ul><li>Неделя 1: старт, RIR 3.</li><li>Недели 2–4: +1 подход на группу в неделю, RIR 2→1.</li><li>Неделя 5: пик объёма, RIR 0–1 на изоляции.</li><li>Неделя 6: разгрузка (−40–50% объёма).</li></ul></div>`;
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
  <div class="card"><b>⚡ Чек готовности сегодня</b>
   <label>Сон, часов: <b id="v_sleep">7.5</b></label><input type="range" id="r_sleep" min="3" max="10" step="0.5" value="7.5">
   <label>Крепатура/усталость в мышцах: <b id="v_sore">2</b> (1 нет — 5 сильная)</label><input type="range" id="r_sore" min="1" max="5" value="2">
   <label>Стресс: <b id="v_str">2</b> (1 нет — 5 высокий)</label><input type="range" id="r_str" min="1" max="5" value="2">
   <label>Мотивация: <b id="v_mot">4</b> (1 нет — 5 высокая)</label><input type="range" id="r_mot" min="1" max="5" value="4">
   <label>Пульс покоя vs обычно: <b id="v_rhr">0</b> уд/мин</label><input type="range" id="r_rhr" min="-5" max="15" value="0">
   <button class="btn" id="ready" style="margin-top:10px">Оценить готовность</button><div id="readyout"></div></div>
  <div class="card"><b>🕐 Протокол дня</b><div class="hint">Укажи время — получишь расписание кофеина, питания и сна.</div>
   <div class="grid2"><div><label>Подъём</label><input type="time" id="p_wake" value="07:00"></div><div><label>Тренировка</label><input type="time" id="p_train" value="18:00"></div></div>
   <label>Отбой</label><input type="time" id="p_bed" value="23:00"><button class="btn" id="proto" style="margin-top:10px">Построить расписание</button><div id="protoout"></div></div>
  ${BIO.map(b=>`<details class="card"><summary>${b.ico} ${b.t} ${lv(b.lvl)}</summary>${b.p.map(t=>`<p class="hint" style="color:var(--text)">${t}</p>`).join('')}</details>`).join('')}
  <h2>Анализы: на что смотреть</h2><div class="card"><table><tr><th>Показатель</th><th>Ориентир</th></tr>${LABS.map(l=>`<tr><td><b>${l[0]}</b><div class="hint">${l[2]}</div></td><td>${l[1]}</td></tr>`).join('')}</table>
  <div class="hint" style="margin-top:6px">Нормы зависят от лаборатории, пола и возраста. Интерпретировать результаты должен врач. Сдавай раз в год и при ухудшении самочувствия.</div></div>
  <h2>Добавки по доказательности</h2>${BIOSUP.map(t=>`<div class="card"><span class="tag ${t.tier==='A'?'ok':t.tier==='B'?'warn':'bad'}">Уровень ${t.tier}</span><table>${t.items.map(i=>`<tr><td><b>${i[0]}</b></td><td>${i[1]}<div class="hint">${i[2]}</div></td></tr>`).join('')}</table></div>`).join('')}
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

/* ---------- Ещё: инструменты / добавки / здоровье ---------- */
function moreScreen(){
  const t=S.more||'tools';
  const seg=`<div class="seg" id="moreseg">${[['tools','🧰 Инстр.'],['prog','📈 Прогресс'],['sup','💊 Спортпит'],['health','❤️ Здоровье']].map(([v,n])=>`<button data-v="${v}" class="${t===v?'on':''}">${n}</button>`).join('')}</div>`;
  return seg+(t==='tools'?toolsScreen():t==='prog'?progScreen():t==='sup'?supScreen():healthScreen());
}
function bindMore(){
  document.querySelectorAll('#moreseg button').forEach(b=>b.onclick=()=>{S.more=b.dataset.v;hap();render()});
  const t=S.more||'tools';if(t==='tools')bindTools();if(t==='prog')bindProg();if(t==='health')bindHealth();
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
  <div class="card"><b>⚖️ Вес тела</b>
   <div class="logrow"><input id="bw_in" type="number" inputmode="decimal" step="0.1" placeholder="Вес сегодня, кг" value=""><button class="btn small" id="bw_save" style="width:auto">Записать</button></div>
   ${lineChart(bwPts,{unit:'кг'})}${lastBw?`<div class="hint">Последняя запись: ${lastBw} кг. Смотри тренд по неделе, а не отдельный день.</div>`:''}</div>
  <div class="card"><b>💪 Сила по упражнению (расчётный 1ПМ)</b>
   ${keys.length?`<select id="pg_ex" style="margin:8px 0">${keys.map(k=>`<option value="${k}" ${k===sel?'selected':''}>${exName(k)}</option>`).join('')}</select>${lineChart(exPts,{unit:'кг'})}`:'<div class="hint" style="padding:10px 0">Заверши тренировку или запиши подход в карточке упражнения, и здесь появится график силы.</div>'}</div>
  <div class="card"><b>📊 Недельный тоннаж</b><div class="hint">Сумма вес × повторы за неделю, последние 8 недель.</div>${barChart(vol,lab)}</div>
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
  const strength=['a-pb5','p-peak','p-dup','b-full3','p-heavy'],mass=['a-ppl6','a-arnold','a-ul4','b-ul4','p-heavy','p-spec','p-hit'],cut=['a-ul4','b-full3','b-ul4','a-ppl6','p-dup'];
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
