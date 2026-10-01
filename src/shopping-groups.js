// The shopping list, grouped the way a shopping trip actually goes: by the shop we will be
// standing in, or by the day we plan to be there. A shop is read from what was typed, up to the
// first comma or bracket and without minding capitals, so "Don Quijote" and "don quijote,
// Shibuya" are one shop. Anything with no shop or no day written down goes last, together.
// Who a thing is for: the family as a whole, one of us, or a souvenir for friends and family back
// home, with the name of whoever it is for written down so the gifts can be checked off by person.
export const GIFT='Friends & family';
export const shoppingFor=members=>['Family',...members,GIFT];
export const forLabel=s=>s.person===GIFT&&s.giftFor?`For ${s.giftFor}`:s.person;
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
// Tax-free: ¥5,000 or more before tax, in one shop on one day, and receipts from different
// shops or days do not add up. So the running total is per shop, for the things flagged as
// bought tax-free (or planned to be), counted from the budget or what was paid.
export const TAX_FREE_MIN=5000;
export function taxFreeTally(items){
 const tagged=items.filter(s=>s.taxFree&&shopKey(s.store));
 if(!tagged.length)return null;
 const total=tagged.reduce((n,s)=>n+(Number.isFinite(s.budget)?s.budget:0),0);
 return {count:tagged.length,total,reached:total>=TAX_FREE_MIN,short:Math.max(0,TAX_FREE_MIN-total)};
}
