// One puzzle a day for the whole family, the same on every phone (Wordle's shape): today's
// katakana word, which stop yesterday's photo was taken at, or what one of the boys' buys cost.
// Everything is picked from the date, so nobody has to send anybody a puzzle, and the result is
// a grid of squares that can go to Messages or the grandparents without giving the answer away.
import {LOANWORDS,KATAKANA,shuffled} from './kana-data.js';
import {activeSteps} from './timing.js';
import {documentSteps,spending,spendCost} from './trip-features.js';
export const PUZZLE_KINDS=['katakana','stop','price'];
export const KATAKANA_TRIES=6,STOP_TRIES=3,PRICE_TRIES=2;
// A number out of the date, the same on every phone, for the seeded shuffle.
export const daySeed=day=>Number(String(day).replace(/\D/g,''))>>>0;
const chars=s=>Array.from(s);
export const puzzleKey=day=>`puzzle-${day}`;
// The word: three to five katakana, so the grid fits a phone, and never the same word two days
// running while the list lasts.
export function katakanaPuzzle(day,index){
 const words=LOANWORDS.filter(w=>{const n=chars(w.ja).length;return n>=3&&n<=5;});
 const order=shuffled(words,7919),word=order[index%order.length];
 const letters=chars(word.ja),extra=shuffled(KATAKANA.map(k=>k[0]).filter(k=>!letters.includes(k)),daySeed(day)).slice(0,Math.max(0,16-new Set(letters).size));
 return {kind:'katakana',tries:KATAKANA_TRIES,word:word.ja,romaji:word.romaji,en:word.en,where:word.where,length:letters.length,keys:shuffled([...new Set(letters),...extra],daySeed(day)+1)};
}
// Wordle's marks: a hit is the right kana in the right place, a near one is in the word
// somewhere else, counted once each so a doubled kana is not marked twice.
export function markGuess(target,guess){
 const t=chars(target),g=chars(guess),marks=g.map(()=>'miss'),left={};
 g.forEach((c,i)=>{if(c===t[i])marks[i]='hit';else left[t[i]]=(left[t[i]]||0)+1;});
 g.forEach((c,i)=>{if(marks[i]!=='hit'&&left[c]){marks[i]='near';left[c]--;}});
 return marks;
}
// Which stop: a photo from a day already behind us, attached to a stop, and three other stops
// from the same day to choose from. Nothing when no such photo exists yet.
export function stopPuzzle(state,day,before=day){
 const days=(state.days||[]).map(d=>d.date).filter(d=>d<before).reverse();
 for(const d of days){
  const shots=(state.documents||[]).filter(doc=>doc.category==='memory'&&String(doc.type||'').startsWith('image/')&&!doc.archivedAt&&documentSteps(doc).some(id=>(state.steps||[]).find(s=>s.id===id&&s.day===d)));
  if(!shots.length)continue;
  const shot=shuffled(shots,daySeed(day))[0],stepId=documentSteps(shot).find(id=>(state.steps||[]).find(s=>s.id===id&&s.day===d));
  const steps=activeSteps(state,d).filter(s=>s.title),right=steps.find(s=>s.id===stepId)||(state.steps||[]).find(s=>s.id===stepId);
  const others=shuffled(steps.filter(s=>s.id!==stepId&&s.title!==right.title),daySeed(day)+2).slice(0,3);
  if(others.length<2)continue;
  return {kind:'stop',tries:STOP_TRIES,day:d,photo:{id:shot.id,title:shot.title||''},answer:right.id,options:shuffled([right,...others].map(s=>({id:s.id,title:s.title})),daySeed(day)+3),zoom:[4,2.4,1.5]};
 }
 return null;
}
// What did it cost: one of the boys' buys with a price written on it, and three prices that
// are not it. Nothing until somebody has bought something.
export function pricePuzzle(state,day){
 const bought=spending(state).items.filter(i=>i.boughtAt&&Number.isFinite(i.spent)&&i.spent>=100);
 if(!bought.length)return null;
 const item=shuffled(bought,daySeed(day)+4)[0],yen=spendCost(item),round=v=>Math.max(100,Math.round(v/10)*10);
 const wrong=[round(yen*.55),round(yen*1.7),round(yen*2.6)].map((v,i)=>v===yen?v+50*(i+1):v);
 return {kind:'price',tries:PRICE_TRIES,item:{title:item.title,person:item.person,day:item.day||null},answer:yen,options:shuffled([yen,...wrong],daySeed(day)+5)};
}
// Today's puzzle: the kinds take turns by the day of the trip, and a kind with nothing to ask yet
// hands over to the next.
export function puzzleFor(state,day){
 const index=Math.max(0,(state.days||[]).findIndex(d=>d.date===day));
 const order=[0,1,2].map(i=>PUZZLE_KINDS[(index+i)%PUZZLE_KINDS.length]);
 for(const kind of order){
  const p=kind==='katakana'?katakanaPuzzle(day,index):kind==='stop'?stopPuzzle(state,day):pricePuzzle(state,day);
  if(p)return {...p,dayNumber:index+1};
 }
 return null;
}
// The score kept against the day: seven for first go, down to two for the last, one for a try
// that never got there. Never nought, so a day played shows as played.
export const puzzleScore=(tries,used,solved)=>solved?Math.max(2,8-Math.round(used*6/tries)):1;
export const puzzleResults=(state,day)=>Object.entries(state.games?.scores||{}).map(([person,s])=>({person,score:s?.[puzzleKey(day)]})).filter(r=>Number.isInteger(r.score));
// The grid to share: squares for every guess, the day number and how many goes, no letters.
export function shareGrid(puzzle,guesses,solved){
 const rows=guesses.map(g=>g.marks.map(m=>m==='hit'?'🟩':m==='near'?'🟨':'⬜').join('')).join('\n');
 return `Japan puzzle · Day ${puzzle.dayNumber} · ${solved?`${guesses.length}/${puzzle.tries}`:`X/${puzzle.tries}`}\n${rows}`;
}
