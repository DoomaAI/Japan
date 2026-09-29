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
test('the phrase and fun fact of the day wait in a folding widget of their own instead of opening over Home',async()=>{
 const main=await source('main.jsx'),brief=await source('TodaysJapan.jsx');
 assert.doesNotMatch(main,/setModal\(\{type:'phrase',phrase:todaysPhrase,day:dayOnTrip\}\);\n \},/,'no effect opens the phrase');
 assert.doesNotMatch(main,/localStorage\.setItem\(`japan\.fact\.\$\{dayOnTrip\}`,'seen'\);setModal/,'no effect opens the fact');
 assert.match(main,/const openPhrase=\(\)=>todaysPhrase\?setModal\(\{type:'phrase'/);
 assert.match(main,/const openFact=\(\)=>todaysFact\?setModal\(\{type:'fact',day:dayOnTrip\}\)/);
 assert.match(main,/phrase=\{day===dayOnTrip&&settingOn\(settings,'dailyPhrase'\)\?\{item:phraseQueue\(visibleState,user\.name,dayOnTrip\)\[0\],open:openPhrase,fresh:!phraseDone\}:null\}/,'the row names the phrase its sheet opens on');
 assert.match(brief,/className="todays-japan-row" onClick=\{fact\.open\}/);
 assert.match(brief,/\{phrase\?\.fresh&&<em className="briefing-new">New<\/em>\}/);
 assert.match(brief,/<details className="todays-japan" open=\{open\} onToggle=/,'it folds, and the phone keeps the fold');
 assert.doesNotMatch(await source('Briefing.jsx'),/Today’s phrase/,'the day in brief no longer carries it');
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
 assert.match(out,/^:root\{--cffffff:#ffffff;--c16383b:#16383b;/,'the light values are exactly what was written');
 assert.match(out,/@media screen and \(prefers-color-scheme:dark\)\{:root\[data-theme=auto\]\{[^}]*color-scheme:dark\}\}/,'night is a choice: match the phone');
 assert.match(out,/@media screen\{:root\[data-theme=dark\]\{/,"printing stays on paper colours");
 assert.match(out,/--ink:#16383b/,'a named token keeps its value; its night value is set by hand under data-theme');
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
 assert.match(html,/<meta name="theme-color" media="\(prefers-color-scheme: dark\)" content="#f4f3ef"\/>/,'light is the default on any phone until night is chosen');
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
test('the wallet leads with the next passes to scan, in the order we reach them',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {nextPasses}=await import('../src/wallet-data.js');
 const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
 const base=ensureFeatures(seed),day='2026-09-30',steps=base.steps.filter(s=>s.day===day&&s.time).sort((a,b)=>a.time.localeCompare(b.time));
 const doc=(id,step,extra={})=>({id,title:id,person:'Family',category:'ticket',stepIds:[step.id],...extra});
 const state={...base,documents:[doc('later',steps[4]),doc('first',steps[1]),doc('used',steps[0],{archivedAt:'2026-09-30T00:00:00Z'}),doc('page',steps[0],{parentDocumentId:'first'}),doc('yesterday',base.steps.find(s=>s.day==='2026-09-29'))]};
 assert.deepEqual(nextPasses(state,day).map(p=>p.doc.id),['first','later'],'in time order; used, attached pages and yesterday’s left out');
 const done={...state,steps:state.steps.map(s=>s.id===steps[1].id?{...s,status:'done'}:s)};
 assert.deepEqual(nextPasses(done,day).map(p=>p.doc.id),['later'],'a stop ticked off has used its pass');
 assert.equal(nextPasses(state,day,1).length,1);
 const main=await source('main.jsx'),nav=await source('nav-data.js');
 assert.match(main,/<h1>Wallet<\/h1><CodeReader [^>]*\/><NextPasses /,'the passes come first, under the line that says codes are being read');
 assert.match(main,/<summary>Search and filter all \{ticketList\(state,\{archived:false\}\)\.length\} bookings<\/summary>/);
 assert.match(nav,/tickets:\{label:'Wallet'/);
});
test('the build step leaves the hand-set night colours and the game boards alone, so nothing turns over twice',async()=>{
 const {themeCss}=await import('../scripts/dark-theme.mjs');
 const out=themeCss(':root[data-theme=dark]{--ink:#ece9df}@media (prefers-color-scheme:dark){:root[data-theme=auto]{--ink:#ece9df}}.merge-tile.filled{background:#fff}.picross-cell{background:#222}.note{color:#16383b}');
 assert.match(out,/:root\[data-theme=dark\]\{--ink:#ece9df\}/);
 assert.match(out,/:root\[data-theme=auto\]\{--ink:#ece9df\}/);
 assert.match(out,/\.merge-tile\.filled\{background:#fff\}/);assert.match(out,/\.picross-cell\{background:#222\}/);
 assert.match(out,/\.note\{color:var\(--c16383b\)\}/,'a one-off colour still follows');
 const {applyTheme,THEME_COLOUR}=await import('../src/theme.js');
 const metas=[{c:''},{c:''}].map(m=>({...m,setAttribute(k,v){this.c=v;}}));
 applyTheme('dark',{documentElement:{dataset:{}},querySelectorAll:()=>metas},false);
 assert.deepEqual(metas.map(m=>m.c),[THEME_COLOUR.dark,THEME_COLOUR.dark],'both of the page\'s bar colours follow the choice');
 assert.equal(THEME_COLOUR.light,'#f4f3ef','the bar is the page, not dark teal over cream');
});
test('ticket codes are read once, kept for everyone by a parent, and drawn fresh at the gate',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {applyOperation}=await import('../server/model.mjs');
 const {codesFor,toRead,cleanCode}=await import('../src/wallet-codes.js');
 const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
 const photo=(id,extra={})=>({id,title:id,person:'Family',type:'image/png',pathname:`tickets/${id}.png`,category:'ticket',...extra});
 let state={...ensureFeatures(seed),documents:[photo('park'),photo('nate',{parentDocumentId:'park',person:'Nate'}),photo('old',{archivedAt:'2026-09-01T00:00:00Z'}),photo('snap',{category:'memory'}),{id:'note',title:'Dinner',type:'note',person:'Family'}]};
 assert.deepEqual(toRead(state).map(d=>d.id),['park','nate'],'pictures on tickets in use; used tickets, memories and notes are not read');
 const lauren={name:'Lauren',role:'parent'};
 state=applyOperation(state,{type:'documentCode',id:'park',code:'TDR-1'},lauren);
 state=applyOperation(state,{type:'documentCode',id:'nate',code:'TDR-2'},lauren);
 assert.deepEqual(toRead(state),[],'each picture is read once');
 const park=state.documents.find(d=>d.id==='park');
 assert.deepEqual(codesFor(state,park).map(c=>[c.text,c.person]),[['TDR-1','Family'],['TDR-2','Nate']],'the ticket and its attached pages, whose each is');
 state=applyOperation(state,{type:'documentCode',id:'park',code:null},lauren);
 assert.deepEqual(codesFor(state,state.documents.find(d=>d.id==='park')).map(c=>c.text),['TDR-2'],'a picture with no code is kept as none');
 state=applyOperation(state,{type:'documentCode',id:'park',live:true,app:'Tokyo Disney Resort'},lauren);
 const live=state.documents.find(d=>d.id==='park');
 assert.equal(live.codeApp,'Tokyo Disney Resort');assert.deepEqual(codesFor(state,live),[],'a code that changes each time is never drawn as a copy');
 assert.throws(()=>applyOperation(state,{type:'documentCode',id:'nate',live:true},lauren),/ticket itself/);
 assert.throws(()=>applyOperation(state,{type:'documentCode',id:'park',code:'x'},{name:'Nate',role:'child'}));
 assert.match(cleanCode({code:'x'.repeat(3001)}).error,/not one the app can keep/);
 assert.match(cleanCode({live:true,app:'x'.repeat(61)}).error,/short/);
 const gate=await source('GateCode.jsx'),reader=await source('qr-reader.js'),dark=await readFile(new URL('../scripts/dark-theme.mjs',import.meta.url),'utf8');
 assert.match(reader,/await import\('jsqr'\)/,'the reader is fetched only when needed');
 assert.match(reader,/'b64:'\+btoa/,'a code that is not plain text is kept as its exact bytes');
 assert.match(gate,/navigator\.wakeLock\?\.request\('screen'\)/);
 assert.match(dark,/BOARDS=\/data-theme\|gate-code\|/,'the gate stays black on white at night');
});
test('PDF tickets are read too, and a file with several codes keeps them all in page order',async()=>{
 const {ensureFeatures}=await import('../src/trip-features.js');
 const {applyOperation}=await import('../server/model.mjs');
 const {codesFor,toRead,cleanCode}=await import('../src/wallet-codes.js');
 const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
 let state={...ensureFeatures(seed),documents:[{id:'usj',title:'USJ e-ticket',person:'Family',type:'application/pdf',pathname:'tickets/usj.pdf',category:'ticket'},{id:'link',title:'Site',type:'link',url:'https://x.jp',person:'Family'}]};
 assert.deepEqual(toRead(state).map(d=>d.id),['usj'],'a PDF is read; a link has nothing to read');
 const lauren={name:'Lauren',role:'parent'};
 state=applyOperation(state,{type:'documentCode',id:'usj',code:['USJ-D','USJ-L','USJ-B','USJ-N']},lauren);
 const usj=state.documents.find(d=>d.id==='usj');
 assert.deepEqual(codesFor(state,usj).map(c=>[c.text,c.person]),[['USJ-D','Family · 1 of 4'],['USJ-L','Family · 2 of 4'],['USJ-B','Family · 3 of 4'],['USJ-N','Family · 4 of 4']]);
 assert.deepEqual(toRead(state),[]);
 assert.equal(cleanCode({code:['one']}).value.code,'one','a list of one is kept as the code');
 assert.equal(cleanCode({code:[]}).value.code,null,'an empty list is none');
 assert.match(cleanCode({code:['ok','']}).error,/not one the app can keep/);
 assert.match(cleanCode({code:Array(41).fill('x')}).error,/more codes/);
 const reader=await source('qr-reader.js');
 assert.match(reader,/await import\('pdfjs-dist\/legacy\/build\/pdf\.mjs'\)/,'the PDF reader is fetched only when a PDF is read');
 assert.match(reader,/for\(const n of \[2,3,4,5\]\)/,'the page is read again in sections, so several codes on one page are all found');
 assert.match(reader,/return qr\.createDataURL\(8,32\);/,'four modules of white round the drawn code, in pixels');
});
