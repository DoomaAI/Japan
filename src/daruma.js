// Daruma-san ga koronda — だるまさんがころんだ, "the daruma doll fell over". Japan's red light,
// green light. One child faces the wall and chants; everybody else creeps up behind him; on
// the last syllable he spins round, and anybody still moving is caught. The child at the wall
// is the 鬼, the demon, which is what he is called in every Japanese chasing game.
//
// The chant is the game. It is ten syllables long and the tempo is entirely up to the demon —
// dawdle over the first few, rattle through the rest, and somebody is caught mid-step. So the
// tempo here is not a metronome: each syllable gets its own length, and the last few can come
// much faster than the first.
export const CHANT=['だ','る','ま','さ','ん','が','こ','ろ','ん','だ'];
export const CHANT_SAY='daruma-san ga koronda';
export const TRACK=100,TICK=60;
// Three demons. Grace is how long you have to stop once the chant ends and he starts to turn;
// beat is how long a syllable runs; watch is how long he stares at you before facing the wall
// again. The hard one is not merely quicker — his chant is more uneven, which is the real skill.
// Step is tuned against the chant rather than set flat: the demon's chant is half the length
// of the gentle one, so his step is twice as long, and every level takes five or six chants to
// cross. One chant should never get you there, or letting go is never a decision.
//
// The windows were picked by playing each level against a reaction time rather than guessed:
// what you actually get is the last syllable plus the grace after it. Gentle comes out at
// about a second, which a five-year-old makes every time; Ordinary at about two-thirds of
// that, which he makes most of the time and his brother always does; and the demon at about a
// third of a second, which is out of reach of a five-year-old and is meant to be.
export const LEVELS=[
 {id:'gentle',ja:'やさしい',romaji:'yasashii',en:'Gentle',grace:700,beat:[380,520],swing:0.15,watch:[900,1600],step:0.35,pays:60,
  how:'He chants slowly and takes his time turning round.'},
 {id:'ordinary',ja:'ふつう',romaji:'futsū',en:'Ordinary',grace:330,beat:[260,420],swing:0.4,watch:[700,1800],step:0.5,pays:110,
  how:'A real game in a real playground.'},
 {id:'oni',ja:'おに',romaji:'oni',en:'Demon',grace:260,beat:[150,340],swing:0.75,watch:[500,2000],step:0.75,pays:180,
  how:'He rushes the end of the chant and spins before you have heard it. Watch the syllables, not the words.'}
];
export const levelById=id=>LEVELS.find(l=>l.id===id)||LEVELS[0];
// The same xorshift the rest of the app shuffles with, so a chant can be replayed in a test.
export const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
// One chant. It leans slower at the start and quicker at the end, the way a child does it,
// and the swing on top of that is what makes one chant different from the last.
export function chantTempo(level,rand){
 const [fast,slow]=level.beat;
 return CHANT.map((_,i)=>{
  const along=i/(CHANT.length-1);
  const base=slow-(slow-fast)*along;
  const wobble=1+(rand()*2-1)*level.swing;
  return Math.max(90,Math.round(base*wobble));
 });
}
const between=([lo,hi],rand)=>Math.round(lo+rand()*(hi-lo));
export function newRun(levelId,rand=Math.random){
 const level=levelById(levelId);
 return {level:level.id,phase:'ready',distance:0,lives:3,index:0,at:0,
  tempo:chantTempo(level,rand),watchFor:between(level.watch,rand),caught:0,over:null};
}
export const start=(run,now)=>({...run,phase:'chant',index:0,at:now});
// One look at your finger. Everything the game decides, it decides in here, so a test can play
// a whole round without a screen and the screen only has to draw what comes back.
export function darumaTick(run,{held,now,rand=Math.random}){
 if(run.over||run.phase==='ready')return run;
 const level=levelById(run.level);
 const next={...run};
 if(next.phase==='chant'){
  // He has his back to you. This is the only phase you get anywhere in.
  if(held)next.distance=Math.min(TRACK,next.distance+level.step);
  if(next.distance>=TRACK)return {...next,phase:'won',over:{won:true,how:'touched'}};
  if(now-next.at>=next.tempo[next.index]){
   next.index++;next.at=now;
   if(next.index>=CHANT.length){next.phase='turn';}
  }
  return next;
 }
 if(next.phase==='turn'){
  // He is turning. You may still be moving, and the brave get a step out of it.
  if(held)next.distance=Math.min(TRACK,next.distance+level.step);
  if(next.distance>=TRACK)return {...next,phase:'won',over:{won:true,how:'touched'}};
  if(now-next.at>=level.grace)
   return held?spotted(next,now):{...next,phase:'watch',at:now,watchFor:between(level.watch,rand)};
  return next;
 }
 if(next.phase==='watch'){
  // He is looking straight at you. A finger on the screen is a foot off the ground.
  if(held)return spotted(next,now);
  if(now-next.at>=next.watchFor)
   return {...next,phase:'chant',index:0,at:now,tempo:chantTempo(level,rand)};
  return next;
 }
 return next;
}
// Caught. You go back to the wall and start again, which is what happens in the real game once
// somebody has freed you — and the third time, that is the end of it.
function spotted(run,now){
 const lives=run.lives-1,caught=run.caught+1;
 if(lives<=0)return {...run,lives:0,caught,distance:0,phase:'lost',over:{won:false,how:'caught'}};
 return {...run,lives,caught,distance:0,phase:'caught',at:now};
}
export const resume=(run,now,rand=Math.random)=>run.phase!=='caught'?run
 :{...run,phase:'chant',index:0,at:now,tempo:chantTempo(levelById(run.level),rand)};
// Touching him is worth what the demon was worth, plus whatever is left of a minute, plus the
// lives you did not need. A slow win still pays for the level, because a win is a win.
export const darumaWorth=(level,seconds,lives)=>
 Math.max(1,Math.min(9999,level.pays+Math.max(0,Math.round(60-seconds))+lives*15));
