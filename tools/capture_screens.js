/* Снимает скриншоты приложения для публикации (BotFather, каталог). Данные демонстрационные.
   Запуск: python3 -m http.server 8123 ; node tools/capture_screens.js  → publish/screens/*.png (1080x1919) */
const {chromium}=require('playwright');const fs=require('fs');
const BASE=process.env.BASE||'http://localhost:8123';const OUT='publish/screens';fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:390,height:693},deviceScaleFactor:2.7692,serviceWorkers:'block'});
  const pg=await ctx.newPage();pg.on('dialog',d=>d.accept());
  await pg.goto(BASE+'/index.html');await pg.waitForTimeout(1500);
  // демонстрационные данные: активный пользователь с историей
  await pg.evaluate(()=>{
    const day=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
    S.level='advanced';S.prof={sex:'m',age:27,w:82,h:181,act:1.55,goal:'mass',set:true};store.set('prof',S.prof);store.set('level','advanced');store.set('onb',true);store.set('safety',true);
    S.prog='a-ul4';store.set('prog','a-ul4');store.set('pstart',{id:'a-ul4',ts:Date.now()-9*864e5});
    S.done={};[1,2,4,5,6,8,9,11,12,13].forEach((n,i)=>S.done[day(n)]=['Верх A (сила)','Низ A (сила)','Верх B (объём)','Низ B (объём)'][i%4]);store.set('done',S.done);
    S.log={};const now=Date.now();
    const add=(k,w0,step,r)=>{S.log[k]=[];for(let i=0;i<14;i++){const t=now-(13-i)*2*864e5-36e5;S.log[k].push({d:new Date(t).toISOString().slice(5,10),ts:t,w:w0+i*step,r})}};
    add('bench',70,1.9,6);add('squat',90,2.6,6);add('deadlift',110,3.1,5);add('row',60,1.6,8);add('ohp',42,1.1,7);
    store.set('log',S.log);
    S.bw={};for(let i=0;i<24;i++)S.bw[day(24-i)]=+(79.4+i*0.11+Math.sin(i/2.4)*.35).toFixed(1);store.set('bw',S.bw);
    S.ready=null;S.tab='plan';S.screen=null;S.ex=null;render();
  });
  const shot=async(name,wait=600)=>{await pg.waitForTimeout(wait);await pg.screenshot({path:`${OUT}/${name}.png`});console.log('✔',name)};
  // 1. Сегодня
  await shot('1-today',900);
  // 2. Тренировка с гидом (жим лёжа)
  await pg.evaluate(()=>{startGuide('a-ul4',0)});await pg.waitForTimeout(800);await pg.click('#gstart');
  for(let i=0;i<8;i++){const t=await pg.$eval('#gbody h1',x=>x.textContent).catch(()=>'');if(/жим лёжа/i.test(t)&&!(await pg.$('.tag.warn')))break;
    if(await pg.$('#gdone')){await pg.click('#gdone');await pg.waitForTimeout(120)}if(await pg.$('#gnext')){await pg.click('#gnext');await pg.waitForTimeout(120)}}
  await pg.waitForSelector('#gstage canvas',{timeout:60000}).catch(()=>{});
  await pg.waitForTimeout(2500);
  await pg.evaluate(()=>{if(GD.player){GD.player.setView&&GD.player.setView(35);GD.player.t=1.4;}});
  await shot('2-guide',1200);
  await pg.click('#gexit');await pg.waitForTimeout(400);
  // 3. Техника в 3D
  await pg.evaluate(()=>{S.screen=null;S.g=null;S.tab='tech';render()});
  await pg.waitForFunction(()=>document.querySelectorAll('[data-th] img').length>=10,null,{timeout:90000}).catch(()=>{});
  await shot('3-technique',800);
  // 4. Упражнение в 3D
  await pg.evaluate(()=>{S.tab='plan';S.ex='squat';render()});await pg.waitForSelector('#figwrap canvas',{timeout:60000}).catch(()=>{});await pg.waitForTimeout(2500);
  await pg.evaluate(()=>{if(activePlayer){activePlayer.setView&&activePlayer.setView(35);activePlayer.t=1.5}});
  await shot('4-exercise',1200);
  // 5. Питание
  await pg.evaluate(()=>{S.ex=null;S.tab='food';render()});await shot('5-nutrition');
  // 6. Прогресс
  await pg.evaluate(()=>{S.tab='prog';render()});await shot('6-progress');
  await b.close();
})();
