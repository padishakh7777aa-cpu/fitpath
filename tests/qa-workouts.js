const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});
const errs=[];pg.on('pageerror',x=>errs.push('PE '+x.message));pg.on('dialog',d=>d.accept());
await pg.goto((process.env.URL||'http://localhost:8123/index.html'));await pg.waitForTimeout(1200);
await pg.evaluate(()=>{window.__no3d=true;window.has3D=()=>false;store.set('onb',true);S.prof.w=80;S.prof.set=true});
const progs=await pg.evaluate(()=>PROGS.map(p=>({id:p.id,lvl:p.lvl,days:p.days.length})));
let total=0,bad=[];
for(const p of progs){
  for(let di=0;di<p.days;di++){
    await pg.evaluate(([id,di,lvl])=>{S.level=lvl;S.prog=id;store.set('pstart',{id,ts:Date.now()});S.log={};S.done={};S.g=null;S.screen=null;S.tab='plan';render();startGuide(id,di)},[p.id,di,p.lvl]);
    await pg.waitForTimeout(80);
    let steps=0,finished=false;
    for(let i=0;i<260;i++){
      const txt=await pg.evaluate(()=>document.body.innerText);
      if(/undefined|NaN|\[object/.test(txt)){bad.push(`${p.id} day${di}: bad text -> `+(txt.match(/.{0,30}(undefined|NaN|\[object).{0,30}/)||[''])[0].replace(/\n/g,' '));break}
      if(await pg.$('.stats')){finished=true;break}
      if(await pg.$('#gstart')){await pg.click('#gstart')}
      else if(await pg.$('#gdone')){await pg.click('#gdone');steps++}
      else if(await pg.$('#gtstart')){await pg.click('#gskip')}
      else if(await pg.$('#gnext')){await pg.click('#gnext')}
      else await pg.waitForTimeout(30);
    }
    total++;
    if(!finished&&!bad.some(x=>x.startsWith(p.id+' day'+di)))bad.push(`${p.id} day${di}: did not finish (steps ${steps})`);
  }
}
console.log('days tested:',total,'| problems:',bad.length);bad.forEach(x=>console.log(' -',x));
console.log('page errors:',errs.slice(0,5));await b.close()})();
