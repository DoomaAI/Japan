import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=async f=>readFile(new URL(`../src/${f}`,import.meta.url),'utf8');
// The UX review against hotel and event apps: each fix it led to is pinned here.
test('a pronunciation line wraps inside its card rather than being styled as the tiny label',async()=>{
 const css=await source('style.css');
 assert.doesNotMatch(css,/\.say-phonics span\{/,'only the first span is the SAY label');
 assert.match(css,/\.say-phonics>span:first-child\{font-size:\.6rem/);
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
