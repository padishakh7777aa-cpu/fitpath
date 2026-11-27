/* Аудит механики упражнений: темп совпадает с направлением первой фазы, позы существуют для каждого упражнения,
   точки тела не уходят под пол, координаты конечные, движение непрерывное.
   Запуск: node tests/biomech-audit.js */
const fs=require('fs'),vm=require('vm');
const ctx={console,Math,document:{createElementNS:()=>({})},window:{},performance:{now:()=>0},requestAnimationFrame:()=>0};ctx.window=ctx;vm.createContext(ctx);
['data.js','anim.js'].forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8').replace(/^const /gm,'var '),ctx));
const {EX,POSES}=ctx;let bad=0;const fail=m=>{bad++;console.log('  ✘ '+m)};
const dirOf=s=>((s||'').match(/вниз|вверх|к лицу|назад|вперёд|к груди|к себе/i)||[''])[0].toLowerCase();
Object.keys(EX).forEach(k=>{
  if(typeof POSES[k]!=='function'){fail(k+': нет позы в anim.js');return}
  // 1. темп соответствует первой фазе
  const tp=ctx.parseTempo(EX[k].tempo);
  if(tp){const a=dirOf(EX[k].phases[0]),b=dirOf(EX[k].tempo.split('·')[0]);
    if(EX[k].tempoSwap){if(a===b)fail(`${k}: помечен tempoSwap, но направления совпадают`)}else if(a&&b&&a!==b)fail(`${k}: первая часть темпа «${b}», а первая фаза «${a}»`);}
  // 2. геометрия
  let prev=null;
  for(let i=0;i<=40;i++){
    const p=i/40,P=POSES[k](p);
    ['foot','hip','shoulder','hand'].forEach(n=>{
      const q=P[n];if(!q||!isFinite(q.x)||!isFinite(q.y)){fail(`${k}@${p}: нет/нечисло ${n}`);return}
      if(q.y<-2&&!(k==='plank'||k==='pushup'))fail(`${k}@${p}: ${n} под полом (y=${q.y.toFixed(1)})`);
    });
    if(prev){const dh=Math.hypot(P.hand.x-prev.hand.x,P.hand.y-prev.hand.y);if(dh>40)fail(`${k}@${p}: скачок кисти ${dh.toFixed(0)}`)}
    prev=P;
  }
});
console.log(bad?`\nНарушений: ${bad}`:'Механика: нарушений нет ('+Object.keys(EX).length+' упражнений)');process.exit(bad?1:0);
