const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
const errs=[];pg.on('pageerror',x=>errs.push('PE '+x.message));pg.on('dialog',d=>d.accept());
await pg.goto((process.env.URL||'http://localhost:8123/index.html'));await pg.waitForTimeout(1200);
await pg.evaluate(()=>{window.__no3d=true;window.has3D=()=>false});
const bad=[];let n=0;
for(const lvl of ['beginner','advanced','pro'])for(const goal of ['mass','cut','keep'])for(const sex of ['m','f']){
  const screens=await pg.evaluate(([lvl,goal,sex])=>{
    S.level=lvl;S.prof={sex,age:28,w:sex==='m'?82:61,h:sex==='m'?180:166,act:1.55,goal,set:true};store.set('onb',true);S.prog=null;S.g=null;S.sess=null;S.ex=null;S.screen=null;S.progPick=false;S.age18=true;
    const out=[];
    for(const t of ['plan','food','prog','more','tech','mech','bio','tools','sup','health','about']){
      S.tab=t;S.screen=null;S.ex=null;
      try{render();out.push([t,document.body.innerText])}catch(e){out.push([t,'EXC '+e.message])}
    }
    for(const k of Object.keys(EX)){S.tab='tech';S.ex=k;try{render();out.push(['ex:'+k,document.body.innerText])}catch(e){out.push(['ex:'+k,'EXC '+e.message])}}
    return out},[lvl,goal,sex]);
  for(const [name,txt] of screens){n++;
    const m=txt.match(/.{0,25}(undefined|NaN|\[object|EXC ).{0,30}/);
    if(m)bad.push(`${lvl}/${goal}/${sex} ${name}: ${m[0].replace(/\n/g,' ')}`)}
}
console.log('screens checked:',n,'| problems:',bad.length);[...new Set(bad)].slice(0,12).forEach(x=>console.log(' -',x));
console.log('page errors:',errs.slice(0,5));await b.close()})();
