// The hunts: things we try again and again and want to know which was best. The food list rates
// a dish once each; a hunt rates every one of them — the matcha at Maruni against the one in
// Uji, this capsule against the last — and keeps a leaderboard. Anyone adds a find and everyone
// rates it for themselves, the boys included.
export const HUNTS=[
 {id:'matcha',title:'Matcha',icon:'🍵',hint:'Every matcha, latte and matcha sweet'},
 {id:'gachapon',title:'Gachapon',icon:'🎰',hint:'What came out of the capsule, and was it any good'},
 {id:'kitkat',title:'KitKat flavours',icon:'🍫',hint:'The Japan-only flavours'},
 {id:'ramen',title:'Ramen',icon:'🍜',hint:'Every bowl'},
 {id:'softserve',title:'Soft serve',icon:'🍦',hint:'Soft-serve ice cream, every flavour'},
 {id:'popcorn',title:'Theme park popcorn',icon:'🍿',hint:'The flavours at Universal and Disney'},
 {id:'onigiri',title:'Konbini onigiri',icon:'🍙',hint:'Convenience store rice balls'},
 {id:'vending',title:'Vending machine drinks',icon:'🥤',hint:'The strange ones included'}
];
export const MAX_CUSTOM_HUNTS=20,MAX_HUNT_ENTRIES=1000;
export const EMPTY_HUNTS={custom:[],entries:[]};
export const huntState=state=>({...EMPTY_HUNTS,...(state.hunts||{})});
export const allHunts=state=>[...HUNTS,...huntState(state).custom];
export const findHunt=(state,id)=>allHunts(state).find(h=>h.id===id)||null;
export function huntAverage(entry){
 const v=Object.values(entry.ratings||{}).filter(n=>Number.isInteger(n)&&n>0);
 return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10:null;
}
// Best first: by the average, then by how many rated it, then newest. Unrated ones last.
export function huntBoard(state,huntId){
 const list=huntState(state).entries.filter(e=>e.hunt===huntId);
 const ranked=[...list].sort((a,b)=>(huntAverage(b)??-1)-(huntAverage(a)??-1)
  ||Object.keys(b.ratings||{}).length-Object.keys(a.ratings||{}).length||String(b.at).localeCompare(String(a.at)));
 const members=state.members||[];
 const favourites=Object.fromEntries(members.map(n=>{
  const mine=list.filter(e=>(e.ratings||{})[n]>0).sort((a,b)=>b.ratings[n]-a.ratings[n]||String(b.at).localeCompare(String(a.at)));
  return [n,mine[0]||null];
 }).filter(([,e])=>e));
 const best=ranked.find(e=>huntAverage(e)!==null)||null;
 return {entries:ranked,count:list.length,best,favourites};
}
export function huntEntryFields(o){
 return {hunt:o.hunt,title:String(o.title||'').trim(),place:String(o.place||'').trim(),day:o.day??null,
  yen:Number.isInteger(o.yen)&&o.yen>=0?o.yen:null,note:String(o.note||'').trim()};
}
