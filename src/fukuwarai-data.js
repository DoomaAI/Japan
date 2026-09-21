// Fukuwarai — 福笑い, "lucky laugh". The New Year game: you are blindfolded, somebody hands
// you an eyebrow, and you put it where you think the face is. Then the blindfold comes off
// and everybody falls about, which is the whole point — it is the only game in here where
// losing is funnier than winning, and the score is there to be laughed at rather than beaten.
//
// The two faces are the two it is always played with. お多福 is the round, pleased one, and
// ひょっとこ is the man with his mouth pulled round to one side blowing on a fire.
export const FACES=[
 {id:'otafuku',ja:'お多福',romaji:'Otafuku',en:'The lucky lady',
  who:'The round, cheerful one. Her name means "much good fortune", and a face like hers on the wall at New Year is meant to bring some.',
  skin:'#f6e2cf',hair:'#241d1f',blush:'#e8a7a0'},
 {id:'hyottoko',ja:'ひょっとこ',romaji:'Hyottoko',en:'The fire-blower',
  who:'The comic one, from a word for "fire man" — his mouth is pulled round to one side because he is blowing on a fire through a bamboo pipe.',
  skin:'#f0cdae',hair:'#2b2320',blush:'#dd8f7a'}
];
export const faceById=id=>FACES.find(f=>f.id===id)||FACES[0];
// Handed over in this order, one at a time, and there is no going back — which is the game.
// Everything is placed on a hundred by a hundred, the same square the rest of the app draws
// its faces on, so a target is a spot on that square rather than a pixel on somebody's phone.
export const PARTS=[
 {id:'brow-l',en:'Left eyebrow',ja:'まゆ',romaji:'mayu'},
 {id:'brow-r',en:'Right eyebrow',ja:'まゆ',romaji:'mayu'},
 {id:'eye-l',en:'Left eye',ja:'め',romaji:'me'},
 {id:'eye-r',en:'Right eye',ja:'め',romaji:'me'},
 {id:'nose',en:'Nose',ja:'はな',romaji:'hana'},
 {id:'mouth',en:'Mouth',ja:'くち',romaji:'kuchi'}
];
// Left and right are the face's left and right, which is the other way round from yours —
// so the left eyebrow is on the right of the screen, exactly as it is on a real person.
const COMMON={'brow-l':[62,40],'brow-r':[38,40],'eye-l':[61,49],'eye-r':[39,49],nose:[50,58]};
export const TARGETS={
 otafuku:{...COMMON,mouth:[50,71]},
 // His is deliberately off to one side. A player who has seen a hyottoko knows that; one who
 // has not puts it in the middle and is wrong in the way the face is supposed to be wrong.
 hyottoko:{...COMMON,mouth:[43,71]}
};
export const targetFor=(faceId,partId)=>TARGETS[faceId]?.[partId]||TARGETS.otafuku[partId];
// What a part is worth: full marks on the spot, nothing at all once it is a third of a face
// away. Distance is in those hundred units, so twenty-five is a quarter of the way across.
export const PART_PAR=25,PART_REACH=33;
export const partPoints=(placed,target)=>{
 const away=Math.hypot(placed[0]-target[0],placed[1]-target[1]);
 return {away,points:Math.max(0,Math.round(PART_PAR*(1-away/PART_REACH)))};
};
export const PERFECT=PARTS.length*PART_PAR;
export function fukuwaraiScore(faceId,placed){
 const parts=PARTS.map(part=>{
  const spot=placed[part.id];
  return {...part,spot,target:targetFor(faceId,part.id),
   ...(spot?partPoints(spot,targetFor(faceId,part.id)):{away:null,points:0})};
 });
 return {parts,total:parts.reduce((sum,p)=>sum+p.points,0)};
}
// Said to the player rather than about him, and the bottom of the range is the good end of
// the joke — a face that has gone properly wrong is the one worth showing your brother.
export const verdictOf=total=>
 total>=PERFECT*0.8?'That is a face. Genuinely a face.'
 :total>=PERFECT*0.55?'Nearly a face. Something is in the wrong place but you would know who it was.'
 :total>=PERFECT*0.3?'Something has gone badly wrong, and it is much better for it.'
 :'That is not a face. Show somebody immediately.';
