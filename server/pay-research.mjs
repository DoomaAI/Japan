import {AppError} from './model.mjs';
import {researchReady} from './research.mjs';
import {PAY_KINDS,FEE_FIELDS} from '../src/pay-advice.js';
import {clamp} from '../src/text.js';
// Looking up what an Australian card charges overseas. Asked from Australia, because the fee
// schedules that matter are the Australian issuers' own pages. Nothing is saved here: the
// figures come back as a draft that a parent reads, corrects and saves.
const SEARCH={type:'web_search_20260209',name:'web_search',max_uses:6,user_location:{type:'approximate',country:'AU',timezone:'Australia/Sydney'}};
const fee=d=>({anyOf:[{type:'number'},{type:'null'}],description:d});
const RECORD={
 name:'record_fees',
 description:'Record the card’s overseas fees, once, after searching. Call this exactly once, at the end.',
 strict:true,
 input_schema:{
  type:'object',additionalProperties:false,
  required:['found','product','kind','fxFeePct','marginPct','atmFeeAud','atmFeePct','cashAdvancePct','summary','checkFirst','sources'],
  properties:{
   found:{type:'boolean',description:'False if you could not work out which card or account they mean.'},
   product:{type:'string',description:'The card’s full official name and issuer.'},
   kind:{type:'string',enum:PAY_KINDS.map(([k])=>k)},
   fxFeePct:fee('Foreign transaction or currency conversion fee, as a percentage of the amount. 0 if the issuer charges none. Null if not published.'),
   marginPct:fee('Any margin the issuer adds to the exchange rate beyond the card network rate or mid-market rate, as a percentage. 0 for cards that use the network rate with no markup. Null if unknown.'),
   atmFeeAud:fee('The issuer’s own fixed fee in Australian dollars for each overseas ATM withdrawal. 0 if none. Null if not published.'),
   atmFeePct:fee('Any percentage fee on overseas ATM withdrawals, beyond the foreign transaction fee. 0 if none. Null if unknown.'),
   cashAdvancePct:fee('For credit cards only: the cash advance fee as a percentage. Null for other cards or if not published.'),
   summary:{type:'string',description:'Two or three plain sentences: what this card costs to use in Japan in a shop and at an ATM, and anything notable such as refunded ATM fees, conditions to qualify, or a minimum fee.'},
   checkFirst:{type:'string',description:'What they should confirm themselves and where. Never empty.'},
   sources:{type:'array',description:'The pages you used, the issuer’s own fee schedule first.',items:{
    type:'object',additionalProperties:false,required:['title','url'],properties:{title:{type:'string'},url:{type:'string'}}}}}}
};
const SYSTEM=`You look up the overseas fees on one Australian card or account, for an Australian family travelling in Japan in September and October 2026, so they can choose which card to use.

How to work:
- Search before you answer. Use the issuer's own fee schedule, product disclosure statement or product page first. Comparison sites are a fallback; say so in the source title if you rely on one.
- Fees change and search results can be old. Prefer the current official page, and put anything you are unsure of in checkFirst.
- Percentages are numbers, such as 3 for 3%. Dollar fees are Australian dollars.
- 0 means you found that the fee is zero. Null means you could not find it. Never guess a number.
- Travel money cards often charge nothing on the transaction but build the cost into the rate when you load or convert money; put that in marginPct if it is published, and explain it in summary.
- Mention conditions: a fee refunded only with a minimum monthly deposit, a different fee for a different account tier, or an ATM rebate cap.
- If you cannot tell which card they mean, set found to false and explain in checkFirst.

Search first, then call record_fees exactly once. Everything goes in that call, not in a message.`;
const https=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.href:'';}catch{return '';}};
// Nothing the model returns is trusted: every fee must fall inside the bounds the app enforces,
// or it is dropped to unknown rather than stored as a figure that looks researched.
export function normalisePayFindings(found){
 const draft={product:clamp(found.product,120),kind:PAY_KINDS.some(([k])=>k===found.kind)?found.kind:null};
 for(const [field,,,min,max] of FEE_FIELDS){
  const v=found[field];
  draft[field]=typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?Math.round(v*100)/100:null;
 }
 return {draft,summary:clamp(found.summary,1000),checkFirst:clamp(found.checkFirst,1000),
  sources:(Array.isArray(found.sources)?found.sources:[]).map(s=>({title:clamp(s?.title,200),url:https(s?.url)})).filter(s=>s.url).slice(0,8)};
}
export async function researchPayMethod({name,kind}){
 if(!researchReady())throw new AppError('Looking things up is not switched on. Add an Anthropic API key to the deployment.',503);
 if(typeof name!=='string'||!name.trim()||name.length>120)throw new AppError('Type the card’s name first, such as “ING Orange Everyday”.');
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let message,messages=[{role:'user',content:`Look up the overseas fees for this card.\n\nWhat they typed: ${name.trim()}\n${PAY_KINDS.some(([k])=>k===kind)?`They think it is: ${PAY_KINDS.find(([k])=>k===kind)[1]}\n`:''}`}];
 try{
  for(let attempt=0;attempt<4;attempt++){
   message=await client.messages.create({model:'claude-opus-5',max_tokens:6000,system:SYSTEM,thinking:{type:'adaptive'},output_config:{effort:'medium'},tools:[SEARCH,RECORD],messages});
   if(message.stop_reason!=='pause_turn')break;
   messages=[...messages,{role:'assistant',content:message.content}];
  }
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('Lookups are busy. Wait a moment and try again.',429);
  throw new AppError('The lookup could not be reached. Enter the fees yourself, or try again when the signal is better.',502);
 }
 if(message.stop_reason==='refusal')throw new AppError('The lookup declined that one. Try the card’s plain name.',422);
 const call=message.content.find(b=>b.type==='tool_use'&&b.name==='record_fees');
 const found=call?.input&&typeof call.input==='object'?call.input:null;
 if(!found)throw new AppError('The lookup came back with nothing. Try the bank and the card’s name.',502);
 if(!found.found)throw new AppError(clamp(found.checkFirst,300)||'That card could not be found. Try the bank’s name and the card’s name.',404);
 return normalisePayFindings(found);
}
