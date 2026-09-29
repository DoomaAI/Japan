// The shopping list, grouped the way a shopping trip actually goes: by the shop we will be
// standing in, or by the day we plan to be there. A shop is read from what was typed, up to the
// first comma or bracket and without minding capitals, so "Don Quijote" and "don quijote,
// Shibuya" are one shop. Anything with no shop or no day written down goes last, together.
export const GROUPINGS=[['shop','By shop'],['day','By day'],['none','One list']];
export const shopKey=store=>String(store||'').split(/[,(·\-–]/)[0].trim().toLowerCase();
export const shopLabel=store=>String(store||'').split(/[,(·\-–]/)[0].trim();
export function groupShopping(items,by='shop',today=null,dayLabel=d=>d){
 if(by==='day'){
  const map=new Map();
  for(const s of items){const k=s.day||'';if(!map.has(k))map.set(k,[]);map.get(k).push(s);}
  return [...map.entries()].sort(([a],[b])=>a===''?1:b===''?-1:a.localeCompare(b)).map(([k,list])=>({key:`day:${k||'none'}`,label:k?dayLabel(k):'Any day',items:list,today:!!k&&k===today}));
 }
 if(by==='shop'){
  const map=new Map();
  for(const s of items){const k=shopKey(s.store);if(!map.has(k))map.set(k,{label:shopLabel(s.store),items:[]});map.get(k).items.push(s);}
  return [...map.entries()].sort(([a,A],[b,B])=>a===''?1:b===''?-1:B.items.length-A.items.length||A.label.localeCompare(B.label)).map(([k,g])=>({key:`shop:${k||'none'}`,label:k?g.label:'Anywhere',items:g.items}));
 }
 return [{key:'all',label:'',items}];
}
