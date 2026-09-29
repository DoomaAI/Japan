import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=async f=>readFile(new URL(`../src/${f}`,import.meta.url),'utf8');
// The UX review against hotel and event apps: each fix it led to is pinned here.
test('a pronunciation line wraps inside its card rather than being styled as the tiny label',async()=>{
 const css=await source('style.css');
 assert.doesNotMatch(css,/\.say-phonics span\{/,'only the first span is the SAY label');
 assert.match(css,/\.say-phonics>span:first-child\{font-size:\.75rem/);
 assert.match(css,/\.say-phonics>span\+span\{flex:1 1 auto;min-width:0\}/);
});
test('the weather list starts at today, with the days behind us folded above it',async()=>{
 const page=await source('WeatherPage.jsx');
 assert.match(page,/behind=state\.days\.filter\(d=>d\.date<today\)/);
 assert.match(page,/<summary>Earlier days \(\{earlier\.length\}\)<\/summary>/);
 assert.match(page,/open=\{earlier\.some\(d=>d\.date===open\)\|\|undefined\}/,'a past day asked for opens its fold');
 assert.match(page,/<details className="page-help"><summary>How this works<\/summary>/,'the explanation folds under the button');
 assert.match(page,/No forecast saved yet\./);
});
test('the phrase and fun fact of the day wait on the day in brief instead of opening over Home',async()=>{
 const main=await source('main.jsx'),brief=await source('Briefing.jsx');
 assert.doesNotMatch(main,/setModal\(\{type:'phrase',phrase:todaysPhrase,day:dayOnTrip\}\);\n \},/,'no effect opens the phrase');
 assert.doesNotMatch(main,/localStorage\.setItem\(`japan\.fact\.\$\{dayOnTrip\}`,'seen'\);setModal/,'no effect opens the fact');
 assert.match(main,/const openPhrase=\(\)=>todaysPhrase\?setModal\(\{type:'phrase'/);
 assert.match(main,/const openFact=\(\)=>todaysFact\?setModal\(\{type:'fact',day:dayOnTrip\}\)/);
 assert.match(main,/phrase=\{day===dayOnTrip&&settingOn\(settings,'dailyPhrase'\)\?\{item:phraseQueue\(visibleState,user\.name,dayOnTrip\)\[0\],open:openPhrase,fresh:!phraseDone\}:null\}/,'the row names the phrase its sheet opens on');
 assert.match(brief,/className="briefing-phrase briefing-fact" onClick=\{fact\.open\}/);
 assert.match(brief,/\{phrase\?\.fresh&&<em className="briefing-new">New<\/em>\}/);
});
test('no text is set below 12px, outside game boards and the drawn day map',async()=>{
 const exempt=['snake-cell','shogi-square','picross-cols','picross-rows','merge-tile','stable-cell','bingo-cell','.dm-','line-symbol','game-tile-stars'];
 for(const f of ['style.css','stages.css','guide-theme.css']){
  const css=await source(f);
  for(const [,sel,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
   if(exempt.some(e=>sel.includes(e)))continue;
   for(const [,v,u] of body.matchAll(/font-size:\s*(\.?\d*\.?\d+)(rem|px)(?![\w%])/g))
    assert.ok((u==='rem'?Number(v)*16:Number(v))>=12,`${f}: ${sel.trim().slice(-60)} is ${v}${u}`);
  }
 }
 // The printed guide is sized from one base: 16px on screen, 10pt on paper. Every size is a
 // multiple of it, never compounded, so its smallest on screen is 12px and on paper 7.5pt.
 const guide=await source('travel-guide.css');
 assert.match(guide,/\.travel-guide\{--tg-base:16px;/);
 for(const [,sel,body] of guide.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  if(sel.includes('.tg-map-'))continue;
  for(const [,size] of body.matchAll(/font-size:([^;]+)/g)){
   const k=size.match(/var\(--tg-base\) \* (\d*\.?\d+)\)/);
   assert.ok(k?Number(k[1])>=.75:/^(var\(--tg-base\)|10pt|\.9\d?rem)$/.test(size.trim()),`travel-guide.css: ${sel.trim().slice(-50)} is ${size}`);
  }
 }
});
test('dark mode: every colour in a stylesheet becomes a variable with a turned-over dark value',async()=>{
 const {themeCss,darkOf,parseColour}=await import('../scripts/dark-theme.mjs');
 const out=themeCss(':root{--ink:#16383b}.card{background:#fff;color:#16383b;box-shadow:0 4px 16px #24231b08;white-space:nowrap}.x:hover{border-color:rgba(0,0,0,.25)}/* white paper */');
 assert.match(out,/^:root\{--c16383b:#16383b;--cffffff:#ffffff;/,'the light values are exactly what was written');
 assert.match(out,/@media screen and \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme=light\]\)\{[^}]*color-scheme:dark\}\}/);
 assert.match(out,/@media screen\{:root\[data-theme=dark\]\{/,"printing stays on paper colours");
 assert.match(out,/--ink:var\(--c16383b\)/,'the app\'s own tokens follow too');
 assert.match(out,/background:var\(--cffffff\);color:var\(--c16383b\)/);
 assert.match(out,/white-space:nowrap/,'a property name is not a colour');
 assert.match(out,/\/\* white paper \*\//,'nor is a comment');
 const L=c=>{const [r,g,b]=parseColour(c);return (Math.max(r,g,b)+Math.min(r,g,b))/510;};
 assert.ok(L(darkOf('#fff'))<.15,'white paper turns dark');
 assert.ok(L(darkOf('#16383b'))>.7,'dark ink turns pale');
 assert.ok(L(darkOf('#24231b08'))<.1,'a shadow stays a shadow');
 assert.ok(L(darkOf('#da684f'))>=.55,'the accent keeps its strength');
 assert.equal(themeCss('.a{display:block}'),'.a{display:block}','a sheet with no colour is left as it was');
});
test('dark mode is built into every stylesheet, and the status bar follows the phone',async()=>{
 const vite=await readFile(new URL('../vite.config.js',import.meta.url),'utf8');
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.match(vite,/name:'dark-theme',enforce:'pre',transform\(code,id\)\{if\(\/\\\/src\\\/\[\^\/\]\+\\\.css\$\//);
 assert.match(html,/<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="#262523"\/>/);
 assert.doesNotMatch(html,/#102e32/);
});
test('screens lead with the tool, and a feature not switched on is left off rather than explained',async()=>{
 const yen=await source('Currency.jsx'),food=await source('FoodList.jsx'),main=await source('main.jsx');
 assert.ok(yen.indexOf('<section className="converter">')<yen.indexOf('<section className={`rate-card'),'the converter comes before the rate');
 assert.match(yen,/<details className="page-help"><summary>How this works<\/summary>Everything in Japan is priced in yen/);
 assert.match(food,/<strong>Allergies: always confirm with the restaurant, not with this list\.<\/strong>/);
 assert.match(main,/<div className="row wrap page-links"><button onClick=\{\(\)=>go\('allergy'\)\}>/);
 assert.doesNotMatch(main,/🥜 Allergy card/);
 for(const f of ['DocumentReader.jsx','FileTranslate.jsx','FoodList.jsx','PhotoDay.jsx','TicketTranslate.jsx'])
  assert.doesNotMatch(await source(f),/is not switched on for this trip yet\. Everything else|Photo tips are not switched on|Translating a file is not switched on/,f);
 assert.match(await source('DocumentReader.jsx'),/if\(!config\?\.documentReader\)return null;/);
 assert.match(main,/\{!parent&&<SpeakRules id=\{`page-\$\{tab\}`\}/,'the read-aloud button is on the boys\' phones');
 assert.match(await source('style.css'),/\.date-strip\{-webkit-mask-image:linear-gradient/,'the date strip fades at its edges so a cut-off day reads as more to scroll');
});
test('a stay is worked out from the plan: the run of nights, check-in and out, and the hotel from our map',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {staysOf,stayFor,cleanStay}=await import('../src/stay-data.js');
 const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
 const {locations}=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url)));
 const state={...ensureFeatures(seed),locations};
 assert.deepEqual(staysOf(state).map(s=>s.hotel),['1 Hotel Tokyo','Hotel Kanra Kyoto','Fantasy Springs Hotel','Hilton Tokyo']);
 const fsh=stayFor(state,'2026-09-30');
 assert.equal(fsh.from,'2026-09-29');assert.equal(fsh.to,'2026-10-01');
 assert.equal(fsh.night,2);assert.equal(fsh.total,2);assert.ok(fsh.leaving);
 assert.equal(fsh.checkIn,'15:00','from the plan’s check-in stop');
 assert.equal(fsh.checkOut,'07:00','from the plan’s check-out stop the morning after');
 assert.match(fsh.address,/Maihama/,'the address comes from our map');
 assert.ok(fsh.japanese,'and the Japanese name for the taxi card');
 const hilton=stayFor(state,'2026-10-05');
 assert.equal(hilton.checkOut,'09:00','the airport check-in is not the hotel’s');
 assert.equal(stayFor({...state,days:state.days.map(d=>({...d,hotel:''}))},'2026-09-30'),null);
 assert.deepEqual(cleanStay({reference:' ABC ',checkIn:'15:00'}).value,{reference:'ABC',checkIn:'15:00'});
 assert.match(cleanStay({checkOut:'11am'}).error,/24-hour clock/);
 assert.match(cleanStay({notes:'x'.repeat(601)}).error,/too long/);
});
test('a parent keeps a stay’s confirmation number and times for everyone, and nobody else can',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {applyOperation}=await import('../server/model.mjs');
 const {stayFor}=await import('../src/stay-data.js');
 const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
 let state=ensureFeatures(seed);
 assert.deepEqual(state.stays,{});
 state=applyOperation(state,{type:'stayEdit',hotel:'Hilton Tokyo',patch:{reference:'HT-2231',checkOut:'12:00',notes:'Late check-out agreed'}},{name:'Lauren',role:'parent'});
 assert.equal(state.stays['Hilton Tokyo'].reference,'HT-2231');assert.equal(state.stays['Hilton Tokyo'].by,'Lauren');
 const hilton=stayFor(state,'2026-10-03');
 assert.equal(hilton.reference,'HT-2231');assert.equal(hilton.checkOut,'12:00','an agreed time wins over the plan');
 assert.throws(()=>applyOperation(state,{type:'stayEdit',hotel:'Hilton Tokyo',patch:{reference:'x'}},{name:'Nate',role:'child'}),/parent/);
 assert.throws(()=>applyOperation(state,{type:'stayEdit',hotel:'Ritz',patch:{}},{name:'Lauren',role:'parent'}),/Unknown hotel/);
 assert.throws(()=>applyOperation(state,{type:'stayEdit',hotel:'Hilton Tokyo',patch:{checkIn:'3pm'}},{name:'Lauren',role:'parent'}),/24-hour/);
 const main=await source('main.jsx'),widgets=await source('home-widgets.js');
 assert.match(widgets,/stay:\{label:'Tonight’s stay'/);
 assert.match(main,/stay:<StayCard state=\{visibleState\} day=\{day\}/);
});
test('on the day we fly home the stay is the morning we check out, not another night',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {stayFor}=await import('../src/stay-data.js');
 const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
 const last=stayFor(ensureFeatures(seed),'2026-10-06');
 assert.ok(last.checkingOut);assert.equal(last.to,'2026-10-06');assert.equal(last.total,5);
});
