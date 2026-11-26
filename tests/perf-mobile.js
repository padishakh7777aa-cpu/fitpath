/* Загрузка в эмуляции мобильных условий: замедление процессора и сети.
   Эмуляция приблизительна: GPU не замедляется, 3D считается программно, поэтому цифры 3D — верхняя оценка стоимости. */
const {chromium,devices}=require('playwright');
const BASE=process.env.BASE||'http://localhost:8123';
const NETS={'Wi-Fi':null,'Fast 3G':{latency:150,down:1.6e6/8,up:750e3/8},'Slow 3G':{latency:400,down:400e3/8,up:400e3/8}};
const CPUS=[1,4,6];
(async()=>{
  const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const rows=[];
  for(const [nn,net] of Object.entries(NETS))for(const cpu of CPUS){
    if(nn==='Wi-Fi'&&cpu===6)continue;
    const ctx=await b.newContext({...devices['Pixel 5'],serviceWorkers:'block'});
    const pg=await ctx.newPage();const cdp=await ctx.newCDPSession(pg);
    await cdp.send('Network.enable');
    if(net)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:net.latency,downloadThroughput:net.down,uploadThroughput:net.up});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
    let bytes=0;pg.on('response',async r=>{try{const h=r.headers()['content-length'];bytes+=h?+h:0}catch(e){}});
    const t0=Date.now();
    await pg.addInitScript(()=>{window.__t={};new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.name==='first-contentful-paint')window.__t.fcp=Math.round(e.startTime)}).observe({type:'paint',buffered:true})});
    await pg.goto('http://'+new URL(BASE).host+'/index.html',{waitUntil:'domcontentloaded',timeout:120000});
    const dcl=Date.now()-t0;
    await pg.waitForSelector('[data-goal]',{timeout:120000});const tStart=Date.now()-t0; // можно нажимать «цель»
    const bytesFirst=bytes;
    await pg.click('[data-goal="mass"]');await pg.click('[data-lvl="beginner"]');
    await pg.waitForSelector('#gstartnow',{timeout:60000});const tToday=Date.now()-t0;
    // 3D: время до появления canvas в тренировке
    const t1=Date.now();
    await pg.click('#gstartnow');await pg.waitForSelector('#gstart',{timeout:60000});await pg.click('#gstart');
    let tAnim=null,t3d=null;try{await pg.waitForSelector('#gstage svg, #gstage canvas',{timeout:90000});tAnim=Date.now()-t1}catch(e){}
    try{await pg.waitForSelector('#gstage canvas',{timeout:120000});t3d=Date.now()-t1}catch(e){}
    // кадры за 3 секунды
    const fps=await pg.evaluate(()=>new Promise(res=>{let n=0;const s=performance.now();(function f(){n++;if(performance.now()-s<3000)requestAnimationFrame(f);else res(Math.round(n/3))})()}));
    const fcp=await pg.evaluate(()=>window.__t&&window.__t.fcp||null);
    rows.push({net:nn,cpu:cpu+'x',fcp,interactive:tStart,today:tToday,anim:tAnim,'3d_ready':t3d,fps,kbFirst:Math.round(bytesFirst/1024)});
    await ctx.close();
  }
  console.log('Условия           FCP(мс)  можно нажимать(мс)  экран «Сегодня»(мс)  анимация видна(мс)  3D готов(мс)  КБ при открытии');
  rows.forEach(r=>console.log(`${(r.net+' CPU '+r.cpu).padEnd(17)} ${String(r.fcp).padStart(7)} ${String(r.interactive).padStart(18)} ${String(r.today).padStart(20)} ${String(r.anim).padStart(19)} ${String(r['3d_ready']).padStart(13)} ${String(r.kbFirst).padStart(16)}`));
  await b.close();
})();
