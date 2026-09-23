// How to say a wrestler's name, worked out from the kana rather than typed in by hand, so the
// English line and the macrons cannot drift from the Japanese. A dot (・) in the kana marks where
// two words meet — の・うみ is "no-oo-mee", not a long "noh" — and is dropped from what is shown.
const ROWS={'':['a','i','u','e','o'],k:'かきくけこ',g:'がぎぐげご',s:'さしすせそ',z:'ざじずぜぞ',t:'たちつてと',d:'だぢづでど',
 n:'なにぬねの',h:'はひふへほ',b:'ばびぶべぼ',p:'ぱぴぷぺぽ',m:'まみむめも',y:'や.ゆ.よ',r:'らりるれろ',w:'わ...を'};
const VOWELS='aiueo',BASE={};
for(const [c,row] of Object.entries(ROWS))[...(c?row:'あいうえお')].forEach((k,i)=>{if(k!=='.')BASE[k]=[c,VOWELS[i]];});
Object.assign(BASE,{し:['sh','i'],じ:['j','i'],ち:['ch','i'],つ:['ts','u'],ふ:['f','u'],ぢ:['j','i'],づ:['z','u']});
const SMALL={ゃ:'a',ゅ:'u',ょ:'o'};
// A consonant and a following い as English says it: だい is "dye", さい is "sigh".
const EYE={'':'eye',k:'kye',g:'guy',s:'sigh',z:'zye',t:'tie',d:'dye',n:'nigh',h:'high',b:'bye',p:'pie',m:'my',r:'rye',w:'why',sh:'shy',ch:'chai',j:'jai',ts:'tsai',f:'fie',y:'yai'};
const SAY={a:'a',i:'ee',u:'oo',e:'eh',o:'oh'};
const NASAL={a:'an',ee:'een',oo:'oon',eh:'en',oh:'on',ay:'ane'};
// Kana to morae: [consonant, vowel, long?] with ん and っ carried as their own marks.
function morae(kana){
 const out=[];const chars=[...String(kana).normalize('NFC')];
 for(let i=0;i<chars.length;i++){
  const k=chars[i];
  if(k==='・'){out.push({gap:true});continue;}
  if(k==='ん'){out.push({n:true});continue;}
  if(k==='っ'){out.push({stop:true});continue;}
  const base=BASE[k];if(!base)throw new Error(`No reading for ${k} in ${kana}`);
  let [c,v]=base;
  if(SMALL[chars[i+1]]){c=c==='sh'||c==='ch'||c==='j'?c:c+'y';v=SMALL[chars[++i]];}
  out.push({c,v});
 }
 // A vowel held on: おう and おお are one long o, うう one long u, えい is "ay". Not across a dot.
 const joined=[];
 for(const m of out){
  const prev=joined.at(-1);
  if(prev&&prev.v&&m.c===''&&!prev.long&&!prev.ai){
   if((prev.v==='o'&&(m.v==='u'||m.v==='o'))||(prev.v==='u'&&m.v==='u')){prev.long=true;continue;}
   if(prev.v==='e'&&m.v==='i'){prev.ei=true;continue;}
   if(prev.v==='a'&&m.v==='i'){prev.ai=true;continue;}
  }
  joined.push({...m});
 }
 return joined;
}
export function sayName(kana){
 const parts=[],hold=[];let doubled='';
 for(const m of morae(kana)){
  if(m.gap)continue;
  if(m.stop){doubled=true;continue;}
  if(m.n){const last=parts.pop()||'';const end=Object.keys(NASAL).find(e=>last.endsWith(e));
   parts.push(end?last.slice(0,-end.length)+NASAL[end]:last+'n');continue;}
  let text=m.ai?EYE[m.c]:m.ei?`${m.c}ay`:m.c+SAY[m.v];
  if(doubled&&parts.length){parts[parts.length-1]+=m.c[0]||'';doubled=false;}
  parts.push(text);if(m.long)hold.push(text);
 }
 return {say:parts.join('-'),hold:[...new Set(hold)]};
}
// Hepburn with macrons, capitalised — what a dictionary would print.
export function romajiName(kana){
 let out='',doubled=false;
 for(const m of morae(kana)){
  if(m.gap)continue;
  if(m.stop){doubled=true;continue;}
  if(m.n){out+='n';continue;}
  const c=doubled?(m.c[0]||'')+m.c:m.c;doubled=false;
  out+=c+(m.long?{o:'ō',u:'ū'}[m.v]:m.v)+(m.ei?'i':m.ai?'i':'');
 }
 return out.charAt(0).toUpperCase()+out.slice(1);
}
// How it is spelt on the banzuke and the programme: the macrons dropped and nothing else changed.
export const plainName=kana=>romajiName(kana).normalize('NFD').replace(/\p{M}/gu,'');
