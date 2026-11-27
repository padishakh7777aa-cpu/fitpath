/* Аудит объёма программ: подходов в неделю на мышечную группу против ориентиров из раздела «Механика».
   Запуск: node tests/volume-audit.js */
const fs=require('fs'),vm=require('vm');const ctx={console};vm.createContext(ctx);
['data.js','programs.js','knowledge.js'].forEach(f=>vm.runInContext(fs.readFileSync(f,'utf8').replace(/^const /gm,'var '),ctx));
const ID={squat:['quads'],lunge:['quads'],legpress:['quads'],legext:['quads'],deadlift:['back','hams'],rdl:['hams'],legcurl:['hams'],bridge:['glutes'],hipthrust:['glutes'],
 bench:['chest'],incline:['chest'],pushup:['chest'],dips:['chest'],ohp:['delts'],lateral:['delts'],facepull:['delts'],row:['back'],pullup:['back'],pulldown:['back'],
 curl:['biceps'],skull:['triceps'],pushdown:['triceps'],ohext:['triceps'],calf:['calves'],plank:['abs']};
const TX=[[/Разгибания на блоке|Трицепс|Французский|Руки суперсетом/i,['triceps','biceps']],[/Бицепс|Молотки/i,['biceps']],[/Махи|Обратные разведения|Face-pull|Тяга к лицу/i,['delts']],
 [/Жим гантелей сидя|Жим стоя/i,['delts']],[/Сведения|Разведения|Брусья|Жим на наклонной|Жим гантелей на наклонной/i,['chest']],[/Пулловер|Тяга|Подтягивания/i,['back']],
 [/Сгибания ног/i,['hams']],[/Гиперэкстензия/i,['back','glutes']],[/Скручивания/i,['abs']],[/Болгарские|Жим ногами|Разгибания ног/i,['quads']],[/Румынская/i,['hams']],[/Подъёмы на носки/i,['calves']]];
const groups=e=>{if(!e.id.startsWith('text:'))return ID[e.id]||[];const n=e.id.slice(5);for(const [re,g] of TX)if(re.test(n))return g;return[]};
const RNG={chest:[8,12,22],back:[8,14,25],quads:[6,12,20],hams:[4,10,20],glutes:[0,4,16],delts:[8,16,26],biceps:[8,14,26],triceps:[6,10,18],calves:[8,12,20],abs:[0,16,25]};
const names={chest:'Грудь',back:'Спина',quads:'Квадр.',hams:'Бицепс бедра',glutes:'Ягодицы',delts:'Плечи',biceps:'Бицепс',triceps:'Трицепс',calves:'Икры',abs:'Пресс'};
const BY_DESIGN={'b-fb3':'новичку достаточно меньше минимума','p-fb2':'программа поддержания, не для роста'};
let warn=0,explained=0;const lines=[];
ctx.PROGS.forEach(p=>{
  const w={};let unk=[];
  const rep=Math.max(1,p.freq/p.days.length); // дни, описанные один раз, но выполняемые несколько раз в неделю
  p.days.forEach(d=>d.ex.forEach(e=>{const g=groups(e);if(!g.length)unk.push(e.id);const s=(+e.s||0)*rep;g.forEach(k=>w[k]=(w[k]||0)+s)}));
  const hit=p.id==='p-fb2';const row=[];
  for(const k of Object.keys(RNG)){
    const v=w[k]||0,[mev,,mrv]=RNG[k];let flag='';
    if(['chest','back','quads','delts'].includes(k)&&v<mev&&!hit){flag=BY_DESIGN[p.id]?'ⓘ':'⚠↓';BY_DESIGN[p.id]?explained++:warn++}
    if(v>mrv){flag='⚠↑';warn++}
    row.push(`${names[k]} ${v}${flag}`);
  }
  lines.push(`${p.id.padEnd(9)} ${p.freq}д${rep>1?'(×'+rep+')':'   '} ${row.join(' · ')}${unk.length?'   [не распознано: '+unk.length+']':''}`);
});
console.log('Подходов в неделю на группу (⚠↓ ниже минимума, ⚠↑ выше предела, ⓘ отклонение по замыслу)\n');lines.forEach(l=>console.log(l));
console.log('\nⓘ по замыслу программы:',explained,Object.entries(BY_DESIGN).map(([k,v])=>k+' — '+v).join('; '));
console.log('Предупреждений без объяснения:',warn);process.exit(warn?1:0);
