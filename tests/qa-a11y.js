const {chromium}=require('playwright');const fs=require('fs');
const axeSrc=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
pg.on('dialog',d=>d.accept());
await pg.goto((process.env.URL||'http://localhost:8123/index.html'));await pg.waitForTimeout(1500);
await pg.evaluate(()=>{window.__no3d=true;window.has3D=()=>false});
await pg.addScriptTag({content:axeSrc});
const states=[
 ['start',()=>{S.level=null;S.ob=null;render()}],
 ['today',()=>{S.level='advanced';S.prof.set=true;S.prog='a-ul4';store.set('onb',true);S.tab='plan';S.screen=null;render()}],
 ['food',()=>{S.tab='food';render()}],['progress',()=>{S.tab='prog';render()}],['more',()=>{S.tab='more';render()}],
 ['about',()=>{S.tab='about';render()}],['exercise',()=>{S.tab='plan';S.ex='squat';render()}],
 ['guide-intro',()=>{S.ex=null;S.tab='plan';startGuide('a-ul4',0)}]
];
const agg={};
for(const [name,fn] of states){
  await pg.evaluate(fn);await pg.waitForTimeout(500);
  const r=await pg.evaluate(async()=>{const res=await axe.run(document,{runOnly:['wcag2a','wcag2aa','best-practice']});return res.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,help:v.help,ex:v.nodes[0].html.slice(0,90)}))});
  console.log('\n##',name,'->',r.length,'issue types');
  r.forEach(v=>{console.log(` [${v.impact}] ${v.id} x${v.n}: ${v.help}\n     e.g. ${v.ex}`);agg[v.id]=(agg[v.id]||0)+v.n});
}
console.log('\nTOTAL by rule:',JSON.stringify(agg));await b.close()})();
