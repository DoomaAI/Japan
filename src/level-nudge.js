// The suggested bump. A boy who has solved the katakana puzzle the last three times it came up
// is reading the kana, whatever his reading dial says. One line on a parent's day in brief offers
// to move the dial up a step; the parent decides, and nothing moves on its own. Saying not yet is
// remembered on that phone for that boy at that level, so the line does not come back every day.
import {puzzleFor,puzzleKey} from './puzzle-data.js';
import {READING,childLevels} from './child-levels.js';
export const BUMP_RUN=3;
// The katakana puzzle days up to today, newest first, with whether this boy solved each.
export function kanaRun(state,name,today){
 const out=[];
 for(const d of [...(state?.days||[])].reverse()){
  if(d.date>today)continue;
  if(puzzleFor(state,d.date)?.kind!=='katakana')continue;
  const score=state?.games?.scores?.[name]?.[puzzleKey(d.date)];
  out.push({day:d.date,played:Number.isInteger(score),solved:Number.isInteger(score)&&score>=2});
 }
 return out;
}
// The offer for one boy, or null: his last three kana puzzles all solved, and a reading step
// above where his dial is now.
export function readingBump(state,name,today){
 const l=childLevels(state,name);if(!l.child)return null;
 const ids=READING.map(([id])=>id),at=ids.indexOf(l.reading);
 if(at<0||at>=ids.length-1)return null;
 const run=kanaRun(state,name,today).slice(0,BUMP_RUN);
 if(run.length<BUMP_RUN||!run.every(r=>r.solved))return null;
 return {name,from:l.reading,to:ids[at+1],fromLabel:READING[at][1],toLabel:READING[at+1][1],days:run.map(r=>r.day)};
}
const KEY=(name,level)=>`japan.bump.${name}.${level}`;
export const bumpDismissed=(name,level)=>{try{return localStorage.getItem(KEY(name,level))==='no';}catch{return false;}};
export const dismissBump=(name,level)=>{try{localStorage.setItem(KEY(name,level),'no');}catch{}};
// Every offer a parent should see today.
export const readingBumps=(state,today)=>(state?.members||[]).map(n=>readingBump(state,n,today)).filter(b=>b&&!bumpDismissed(b.name,b.from));
