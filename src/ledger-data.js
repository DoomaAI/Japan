import {PAYERS} from './trip-features.js';
// The parents' money, squared up. Every shared payment is split down the middle: whoever paid
// more than half is owed the difference, less whatever has already been handed over. A payment
// marked "own" (a massage, a present for the other) is left out of the split, and the boys'
// purses were never in it. Nothing here is a ledger of debts between the two, only the one
// number that says who buys the next dinner.
export const settlements=state=>state.settlements||[];
export const sharedExpenses=state=>(state.expenses||[]).filter(e=>!e.own&&Number.isFinite(e.yen));
export function balanceBetween(state){
 const [a,b]=PAYERS;
 const paid=n=>sharedExpenses(state).filter(e=>e.paidBy===n).reduce((s,e)=>s+e.yen,0);
 const handed=(from,to)=>settlements(state).filter(s=>s.from===from&&s.to===to).reduce((s,x)=>s+x.yen,0);
 const shared=paid(a)+paid(b),half=shared/2;
 // What a is owed: paid over the half, less what b has already given, plus what a has given b.
 const owedToA=Math.round(paid(a)-half-handed(b,a)+handed(a,b));
 if(!shared&&!settlements(state).length)return null;
 if(Math.abs(owedToA)<1)return {from:null,to:null,yen:0,shared};
 return owedToA>0?{from:b,to:a,yen:owedToA,shared}:{from:a,to:b,yen:-owedToA,shared};
}
// IC card balances, typed in from the card reader at the gate or the top-up machine. One
// number per person, with when it was last set, so a card about to run dry is noticed on the
// platform and not at the barrier.
export const IC_MAX=20000;
export const icCards=state=>state.icCards||{};
export const icBalance=(state,person)=>icCards(state)[person]||null;
export const icLow=(state,person,floor=1000)=>{const b=icBalance(state,person);return !!b&&b.yen<floor;};
export const RECEIPT_TYPES=['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'];
export const receiptUrl=e=>`/api/receipt?id=${encodeURIComponent(e.id)}`;
