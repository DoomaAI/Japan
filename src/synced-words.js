// Phrases with synced words: the phrase lit up word by word as the phone says it, like lyrics,
// so the boys can say it along. The phone's speech engine reports where in the Japanese it has
// got to; that position is turned into how many of the romaji words to light, in proportion, since
// the Japanese and the romaji do not split at the same places. A phone that reports nothing gets
// a steady beat instead, timed from the number of syllables and the speed chosen.
export const wordsOf=romaji=>String(romaji||'').trim().split(/\s+/).filter(Boolean);
// How many words are lit, given how far through the Japanese the voice is.
export function litCount(words,jaLength,charIndex){
 if(!words.length||!jaLength)return 0;
 const share=Math.min(1,Math.max(0,charIndex/jaLength));
 return Math.min(words.length,Math.floor(share*words.length)+1);
}
// Roughly how many syllables a romaji word has: its vowels, with long vowels and "n" counted.
export const morae=w=>(String(w).toLowerCase().match(/[aeiouāēīōū]|n(?![aeiouy])/g)||[]).length||1;
// The beat for a phone with no word positions: milliseconds per word, at a mora every 180 ms at
// talking pace and slower in proportion.
export const beats=(words,rate=0.8)=>words.map(w=>Math.round(morae(w)*180*(0.8/Math.max(0.3,rate))));
