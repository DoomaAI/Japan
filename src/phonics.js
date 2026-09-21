// Sounding out for somebody who cannot read yet.
//
// A picture per syllable would mean a hundred pictures, most of them forced — "mass", "dess",
// "yook". Japanese has five vowels and every syllable lands on one of them, so the picture is
// the SHAPE YOUR MOUTH MAKES. Five pictures, each one true, and it is how a five-year-old is
// taught to read anything: look at the mouth, make that shape, copy the sound.
//
// Each vowel keeps its own colour as well, so a run of bubbles can be followed by colour by a
// child who is not looking at the mouths at all.
export const VOWELS=[
 {id:'a',say:'ah',colour:'#d96a4f',hint:'Mouth wide open, like a doctor looking at your tonsils.'},
 {id:'i',say:'ee',colour:'#d5a021',hint:'A wide flat smile, teeth nearly together.'},
 {id:'u',say:'oo',colour:'#3f8f6e',hint:'Lips pushed forward into a small circle.'},
 {id:'e',say:'eh',colour:'#4a7fb5',hint:'Halfway open, corners relaxed.'},
 {id:'o',say:'oh',colour:'#8a63a8',hint:'A round O, lips forward.'}
];
export const vowel=id=>VOWELS.find(v=>v.id===id)||null;
// The mouth itself, as width and height of an opening on a 100×100 face, plus how much of a
// smile. Drawn rather than lettered, because a letter is the thing he cannot read.
export const MOUTH={
 a:{rx:26,ry:34,curve:0},
 i:{rx:38,ry:9,curve:9},
 u:{rx:15,ry:18,curve:0},
 e:{rx:31,ry:20,curve:4},
 o:{rx:23,ry:29,curve:0}
};
// Every chunk our phrasebook actually uses, and the vowel your mouth ends up making. Written
// out rather than guessed at from the spelling: "guy" is あい, "mass" is ます with the u
// swallowed, and a rule clever enough to get those right would be wrong somewhere else.
//
// Where a chunk is two Japanese vowels run together — sigh, guy, kigh, hye, dye, zye, tigh,
// mye, rye, eye — it is the FIRST one, which is the one the mouth opens on.
export const CHUNK_VOWEL={
 a:'a',ka:'a',ga:'a',sa:'a',za:'a',ta:'a',da:'a',na:'a',ha:'a',ba:'a',pa:'a',ma:'a',ya:'a',
 ra:'a',wa:'a',cha:'a',sha:'a',kah:'a',tah:'a',kap:'a',sat:'a',han:'a',ban:'a',nan:'a',
 mash:'a',mass:'a',sigh:'a',guy:'a',kigh:'a',hye:'a',dye:'a',zye:'a',tigh:'a',mye:'a',
 rye:'a',eye:'a',
 ee:'i',kee:'i',gee:'i',shee:'i',chee:'i',nee:'i',bee:'i',mee:'i',ree:'i',see:'i',jee:'i',
 keen:'i',een:'i',keep:'i',
 oo:'u',koo:'u',goo:'u',soo:'u',tsoo:'u',foo:'u',moo:'u',roo:'u',boo:'u',poo:'u',joo:'u',
 kyoo:'u',gyoo:'u',yook:'u',
 eh:'e',keh:'e',seh:'e',teh:'e',deh:'e',neh:'e',reh:'e',beh:'e',men:'e',sen:'e',den:'e',
 dess:'e',desh:'e',ay:'e',kay:'e',zay:'e',
 oh:'o',ko:'o',go:'o',so:'o',to:'o',do:'o',no:'o',bo:'o',mo:'o',yo:'o',ro:'o',sho:'o',
 toh:'o',yoh:'o',joh:'o',soh:'o',moh:'o',poh:'o',byoh:'o',ryoh:'o',kon:'o',hon:'o',yon:'o',
 toy:'o'
};
export const vowelOf=chunk=>CHUNK_VOWEL[String(chunk||'').toLowerCase()]||null;
// The sounding-out, as bubbles rather than as a line of text: the separators are dropped,
// each chunk carries its vowel, and anything we have no mouth for is still shown so it can
// be read out by whoever is helping.
export function soundBubbles(say){
 return String(say||'').split(/[^a-z']+/i).filter(Boolean)
  .map((text,i)=>({text,index:i,vowel:vowelOf(text)}));
}
// Where a phrase is two words, the second one starts a new line of bubbles — four bubbles is
// about as much as a five-year-old will take in at once.
export const bubbleRows=(say,per=4)=>{
 const rows=[];
 for(const bubble of soundBubbles(say)){
  if(!rows.length||rows[rows.length-1].length>=per)rows.push([]);
  rows[rows.length-1].push(bubble);
 }
 return rows;
};
