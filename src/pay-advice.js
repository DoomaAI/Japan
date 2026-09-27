import {yenPerAud,yenToAud} from './trip-features.js';
// Which card, or cash, to use. The family lists what they carry and what each one charges; the
// advice is the arithmetic on top, at the family's shared rate, for paying in a shop and for
// taking yen out of an ATM. A fee nobody has entered is unknown, not free, and says so.
export const PAY_KINDS=[['credit','Credit card'],['debit','Debit card'],['travel','Travel money card'],['cash','Cash from home'],['ic','IC card (Suica, PASMO)']];
export const PAY_HOLDERS=['Damien','Lauren','Family'];
export const MAX_PAY_METHODS=30;
// The fee fields, with the bounds the server enforces. Percentages are of the amount in dollars.
export const FEE_FIELDS=[
 ['fxFeePct','Foreign transaction fee','%',0,10],
 ['marginPct','Exchange-rate margin over the market rate','%',0,10],
 ['atmFeeAud','Own bank’s fee per overseas ATM withdrawal','$',0,50],
 ['atmFeePct','Percentage fee on ATM withdrawals','%',0,10],
 ['cashAdvancePct','Cash advance fee (credit cards at an ATM)','%',0,10]
];
export const payKindLabel=id=>(PAY_KINDS.find(([k])=>k===id)||PAY_KINDS[0])[1];
export const payMethods=state=>state.payMethods||[];
const pct=v=>Number.isFinite(v)?v:null;
// The cost of one payment, in dollars, on one method. Null parts are unknown, and an unknown
// part makes the whole estimate a lower bound rather than a figure.
export function paymentCost(method,{yen,rate,situation,atmOperatorYen=0}){
 const base=yenToAud(yen,rate);
 const unknown=[];const need=(field,label)=>{const v=pct(method[field]);if(v===null)unknown.push(label);return v??0;};
 const card=['credit','debit','travel'].includes(method.kind);
 if(situation==='shop'){
  if(!card&&method.kind!=='ic')return null;
  if(method.kind==='ic')return {method,base,fees:0,total:base,unknown:[],note:'Paid from the card’s yen balance; the cost was in how it was topped up.'};
  const p=need('fxFeePct','foreign transaction fee')+need('marginPct','exchange-rate margin');
  const fees=Math.round(base*p)/100;
  return {method,base,fees,total:Math.round((base+fees)*100)/100,unknown,note:''};
 }
 if(situation==='atm'){
  if(!card)return null;
  let p=need('fxFeePct','foreign transaction fee')+need('marginPct','exchange-rate margin')+need('atmFeePct','ATM percentage fee');
  const warn=[];
  if(method.kind==='credit'){p+=need('cashAdvancePct','cash advance fee');warn.push('A credit card at an ATM is a cash advance: interest usually starts that day.');}
  const fixed=need('atmFeeAud','ATM fee');
  const operator=yenToAud(atmOperatorYen,rate);
  const fees=Math.round((base*p/100+fixed+operator)*100)/100;
  return {method,base,fees,total:Math.round((base+fees)*100)/100,unknown,note:warn.join(' ')};
 }
 return null;
}
// Every method that can do the job, cheapest first; the ones with a fee still unknown after the
// ones that are fully known, so an empty field never wins by looking free.
export function advise(state,{yen,situation,atmOperatorYen=0}){
 const rate=yenPerAud(state);
 if(!Number.isFinite(yen)||yen<=0)return {rate,options:[]};
 const options=payMethods(state).map(m=>paymentCost(m,{yen,rate,situation,atmOperatorYen})).filter(Boolean)
  .sort((a,b)=>(a.unknown.length>0)-(b.unknown.length>0)||a.total-b.total);
 return {rate,options};
}
// A fixed fee costs less the more is taken out at once. What the fixed part comes to at a few
// withdrawal sizes, so "take out more, less often" is a number rather than a slogan.
export function withdrawalSizes(method,{rate,atmOperatorYen=0,sizes=[10000,30000,50000]}){
 const fixed=(pct(method.atmFeeAud)??0)+yenToAud(atmOperatorYen,rate);
 return sizes.map(yen=>({yen,fixedPct:fixed?Math.round(fixed/yenToAud(yen,rate)*1000)/10:0}));
}
export const PAY_TIPS=[
 'Always pay in yen. If a card machine or ATM offers to charge you in Australian dollars, say no: its rate is usually several percent worse than your bank’s.',
 '7-Eleven (Seven Bank), Japan Post and Lawson ATMs take Australian cards and have English menus. Most bank ATMs in Japan do not.',
 'The ATM may add its own fee of a few hundred yen, shown on the screen before you confirm. Put it in below to include it.',
 'Many small restaurants, temples, stalls and lockers are cash only. Keep ¥10,000 or so on you.',
 'An IC card (Suica, PASMO, ICOCA) is topped up with cash at station machines, or by card if it is in Apple Wallet, and then works on trains, buses, lockers and convenience stores.'
];
