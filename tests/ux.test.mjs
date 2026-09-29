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
