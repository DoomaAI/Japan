// Kendama — けん玉. A wooden handle with three cups and a spike, a ball on a string, and a
// lifetime of tricks. The cup-and-ball came to Japan from abroad, but the shape everybody means
// by kendama — the crosspiece with a big cup on one side and a small cup on the other — was
// designed in Hiroshima in 1919, and the trick names and the grading system are entirely
// Japanese. Those names are the reason it is in here: this teaches them the way the sumo game
// teaches the ranks, by making you say them before you can do them.
//
// Two things have to be right, and they are the two things that are hard with a real one: how
// hard you pull, and when you close your hand. Either one wrong and the ball goes past.
export const PULL_BASE=560,PULL_SPAN=520;
// How long the ball is in the air for a given pull. A harder pull is a longer wait, which is
// why a trick with a narrow band is also a trick with a moment you have to find.
export const airtime=power=>Math.round(PULL_BASE+power*PULL_SPAN);
// The tricks, in the order they are really learned. Each one wants a pull inside its own band
// and a catch inside its own window, and both get tighter as you go up. Each also names the
// cup it is caught in, because a trick called "big cup" has to put the ball in the big cup —
// the first drawing of this landed everything in the middle of the crosspiece, which is not
// where any of them go.
export const TRICKS=[
 {id:'ozara',ja:'大皿',romaji:'ōzara',en:'Big cup',worth:20,land:[21,54],band:[0.18,0.78],window:190,
  how:'The big cup, on the wide side of the crosspiece. The one everybody learns first.'},
 {id:'kozara',ja:'小皿',romaji:'kozara',en:'Small cup',worth:30,land:[80,54],band:[0.22,0.72],window:155,
  how:'The small cup, on the other side. Same pull, less room.'},
 {id:'chuzara',ja:'中皿',romaji:'chūzara',en:'Base cup',worth:40,land:[50,90],band:[0.3,0.74],window:140,
  how:'The cup on the bottom of the handle. You are catching it underneath.'},
 {id:'rosoku',ja:'ろうそく',romaji:'rōsoku',en:'The candle',worth:55,land:[50,90],band:[0.34,0.7],window:125,
  how:'Hold the handle by the spike, like a candle, and catch the ball on the base cup.'},
 {id:'tomeken',ja:'とめけん',romaji:'tomeken',en:'Spike catch',worth:75,land:[50,38],band:[0.42,0.72],window:105,
  how:'The classic one: the ball drops onto the spike and the hole takes it. Line it up.'},
 {id:'hikoki',ja:'ひこうき',romaji:'hikōki',en:'Aeroplane',worth:95,land:[50,38],band:[0.46,0.72],window:92,
  how:'The other way round — you hold the ball and fly the handle onto it, spike first.'},
 {id:'furiken',ja:'ふりけん',romaji:'furiken',en:'Swing and spike',worth:120,land:[50,38],band:[0.54,0.76],window:80,
  how:'Swing the ball right out, let it come back round, and spike it. The hardest one here.'}
];
export const trickById=id=>TRICKS.find(t=>t.id===id)||TRICKS[0];
export const trickAt=i=>TRICKS[Math.max(0,Math.min(TRICKS.length-1,i))];
// もしかめ — big cup, base cup, big cup, base cup, for as long as you can keep it going. It is
// the endurance one, it is what every Japanese child counts out loud, and it is the only score
// here that is a number rather than a list of things done.
export const MOSHIKAME={id:'moshikame',ja:'もしかめ',romaji:'moshikame',en:'Big cup, base cup, again',
 land:[21,54],alt:[50,90],band:[0.24,0.74],window:165,tighten:3,floor:78,
 how:'Big cup, base cup, big cup, base cup. Keep going. It gets quicker, and everybody counts along.'};
// The window closes a little with every catch, so a long run is a run that got harder.
export const moshikameWindow=reps=>Math.max(MOSHIKAME.floor,MOSHIKAME.window-reps*MOSHIKAME.tighten);
// Was it a catch? The pull has to be inside the band or the ball never arrives where the cup
// is, and the catch has to be inside the window or your hand is shut at the wrong moment.
export function judge({band,window},power,tapAt){
 if(power<band[0])return {landed:false,why:'soft',says:'Not enough. The ball never got up to the cup.'};
 if(power>band[1])return {landed:false,why:'hard',says:'Too hard. It flew straight past.'};
 const ideal=airtime(power),off=tapAt-ideal;
 if(off<-window)return {landed:false,why:'early',says:'Too early. Your hand was shut before it arrived.',off};
 if(off>window)return {landed:false,why:'late',says:'Too late. It had already gone by.',off};
 return {landed:true,off,ideal};
}
// A run of tricks is worth what the tricks are worth, and going up the list in one go is worth
// more than doing the easy one twenty times.
export const kendamaScore=landed=>Math.min(9999,landed.reduce((sum,id)=>sum+trickById(id).worth,0));
export const moshikameScore=reps=>Math.max(reps?1:0,Math.min(9999,reps*12));
// Where the ball hangs before anybody pulls it.
export const HANG=[52,104];
