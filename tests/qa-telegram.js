/* Проверка интеграции с НАСТОЯЩИМ Telegram WebApp SDK (из npm @twa-dev/sdk).
   Стенд эмулирует клиент Telegram: принимает сообщения SDK (postMessage) и отвечает на них, как настоящий клиент.
   Запуск: npm i -D playwright @twa-dev/sdk ; node tests/qa-telegram.js */
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const BASE=process.env.BASE||'http://localhost:8123';
const SDK=fs.readFileSync(path.join(path.dirname(require.resolve('@twa-dev/sdk')),'telegram-web-apps.js'),'utf8');
const user=encodeURIComponent(JSON.stringify({id:42,first_name:'Тест',language_code:'ru'}));
const initData=encodeURIComponent('user='+user+'&auth_date=1700000000&hash=abc');
const HASH=`#tgWebAppData=${initData}&tgWebAppVersion=8.0&tgWebAppPlatform=android&tgWebAppThemeParams=${encodeURIComponent(JSON.stringify({bg_color:'#09090b',text_color:'#f4f1e8'}))}`;
const HOST=`<!doctype html><meta charset=utf-8><body style="margin:0"><iframe id="app" style="width:390px;height:800px;border:0" src="/index.html${HASH}"></iframe>
<script>
window.events=[];window.kv={};
const f=document.getElementById('app');
window.toApp=(eventType,eventData)=>f.contentWindow.postMessage(JSON.stringify({eventType,eventData}),'*');
addEventListener('message',e=>{
  if(e.source!==f.contentWindow)return;let m;try{m=JSON.parse(e.data)}catch(_){return}
  events.push(m);
  if(m.eventType==='web_app_invoke_custom_method'){
    const {req_id,method,params}=m.eventData;let result;
    if(method==='saveStorageValue'){kv[params.key]=params.value;result=true}
    else if(method==='getStorageValues'){result={};params.keys.forEach(k=>result[k]=kv[k]||'')}
    else if(method==='getStorageKeys'){result=Object.keys(kv)}
    else if(method==='deleteStorageValues'){params.keys.forEach(k=>delete kv[k]);result=true}
    setTimeout(()=>toApp('custom_method_invoked',{req_id,result}),5);
  }
});
</script>`;
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:390,height:840},serviceWorkers:'block'});
  await ctx.route('https://telegram.org/js/telegram-web-app.js',r=>r.fulfill({contentType:'application/javascript',body:SDK}));
  await ctx.route(BASE+'/host.html',r=>r.fulfill({contentType:'text/html',body:HOST}));
  const pg=await ctx.newPage();const errs=[];pg.on('pageerror',x=>errs.push('PE '+x.message));
  pg.on('dialog',d=>d.accept());
  let pass=0,fail=0;const ok=(name,cond,extra='')=>{cond?pass++:fail++;console.log((cond?'  ✔ ':'  ✘ ')+name+(extra?'  '+extra:''))};
  await pg.goto(BASE+'/host.html');await pg.waitForTimeout(2500);
  const fr=()=>pg.frames().find(f=>/index\.html/.test(f.url()));
  const ev=(t)=>pg.evaluate(t=>window.events.filter(e=>e.eventType===t).map(e=>e.eventData),t);
  await fr().evaluate(()=>{window.__no3d=true});

  console.log('Запуск и тема');
  ok('SDK загружен и определил версию',await fr().evaluate(()=>Telegram.WebApp.version==='8.0'&&Telegram.WebApp.platform==='android'));
  ok('приложение отправило ready',(await ev('web_app_ready')).length>=1);
  ok('приложение отправило expand',(await ev('web_app_expand')).length>=1);
  ok('цвет шапки установлен',(await ev('web_app_set_header_color')).length>=1);

  console.log('Старт и имя пользователя');
  await fr().click('[data-goal="mass"]');await fr().click('[data-lvl="beginner"]');await pg.waitForTimeout(500);
  ok('приветствие содержит имя из Telegram',await fr().evaluate(()=>document.body.innerText.includes('Тест')));

  console.log('Кнопка «Назад»');
  const lastBack=async()=>{const a=await ev('web_app_setup_back_button');return a.length?a[a.length-1].is_visible:null};
  ok('на главном экране скрыта',(await lastBack())!==true);
  await fr().evaluate(()=>{S.ex='squat';render()});await pg.waitForTimeout(400);
  ok('в упражнении показана',(await lastBack())===true);
  await pg.evaluate(()=>window.toApp('back_button_pressed',{}));await pg.waitForTimeout(400);
  ok('нажатие «Назад» возвращает на главный экран',await fr().evaluate(()=>!S.ex&&S.tab==='plan'));
  ok('после возврата скрыта',(await lastBack())!==true);

  console.log('Тренировка с гидом');
  await fr().click('#gstartnow');await pg.waitForTimeout(700);
  const lastClose=async()=>{const a=await ev('web_app_setup_closing_behavior');return a.length?a[a.length-1].need_confirmation:null};
  ok('включено подтверждение закрытия',(await lastClose())===true);
  await fr().click('#gstart');await pg.waitForTimeout(300);
  for(let i=0;i<4;i++){if(await fr().$('#gdone')){await fr().click('#gdone');await pg.waitForTimeout(150)}if(await fr().$('#gnext')){await fr().click('#gnext');await pg.waitForTimeout(150)}}
  ok('кнопки вызывают вибрацию (haptic)',(await ev('web_app_trigger_haptic_feedback')).length>=3);
  await pg.evaluate(()=>window.toApp('back_button_pressed',{}));await pg.waitForTimeout(400);
  ok('«Назад» в тренировке завершает её (подтверждение принято)',await fr().evaluate(()=>S.screen!=='guide'));
  ok('подтверждение закрытия выключено после выхода',(await lastClose())===false);

  console.log('Облачное хранилище');
  await fr().evaluate(()=>{S.log={bench:[{d:'11-26',ts:Date.now(),w:100,r:5}]};store.set('log',S.log);store.set('bw',{'2026-11-26':80.5})});
  await pg.waitForTimeout(2500);
  const kvKeys=await pg.evaluate(()=>Object.keys(window.kv));
  ok('данные записаны в CloudStorage',kvKeys.some(k=>k.startsWith('fp_log_'))&&kvKeys.some(k=>k.startsWith('fp_bw_')),kvKeys.join(','));
  // имитируем новое устройство: стираем локальные данные приложения и перезагружаем
  await fr().evaluate(()=>{Object.keys(localStorage).filter(k=>k.startsWith('fp_')).forEach(k=>localStorage.removeItem(k))});
  await pg.evaluate(()=>{document.getElementById('app').contentWindow.location.reload()});await pg.waitForTimeout(3500);
  ok('после «смены устройства» данные восстановлены из облака',await fr().evaluate(()=>S.log&&S.log.bench&&S.log.bench[0].w===100&&S.level==='beginner'));

  console.log('Поделиться');
  await fr().evaluate(()=>{S.screen='summary';S.summary={name:'Грудь',tonnage:5200,sets:12,mins:55,sug:[],ach:[]};render()});await pg.waitForTimeout(300);
  await fr().click('#share');await pg.waitForTimeout(300);
  const links=await ev('web_app_open_tg_link');
  ok('«Поделиться» открывает ссылку Telegram',links.length>=1&&/share\/url/.test(JSON.stringify(links[0])));

  console.log('\nИтого:',pass,'успешно,',fail,'ошибок; ошибок страницы:',errs.length);errs.slice(0,5).forEach(x=>console.log(' -',x));
  await b.close();process.exit(fail||errs.length?1:0);
})();
