// Recommendations from people who are not on the trip: a friend's WhatsApp list of ramen places,
// an aunt's email about the Kyoto temple she loved, a colleague's "you have to do teamLab".
// Each one lands on the planning board as an ordinary idea, so the family votes on it like any
// other; what this adds is who said so and what they said, kept on the idea itself. The same
// place recommended twice is one idea with two names on it, not two ideas, which is the point:
// a place three people told us about is worth knowing about before it is voted on.
// How it reached us. Kept on each name so the card can say "Sue, by email" and the family knows
// where to look for the rest of what she said.
export const RECOMMEND_VIA=[['message','Text or WhatsApp'],['email','Email'],['screenshot','Screenshot'],['call','Phone call'],['person','In person'],['other','Somewhere else']];
export const viaLabel=id=>(RECOMMEND_VIA.find(([k])=>k===id)||[null,''])[1];
export const MAX_RECOMMEND_SHOTS=4;
export const MAX_RECOMMENDERS=20,RECOMMENDER_NAME=80,RECOMMENDER_SAID=500,RECOMMEND_TEXT=6000,MAX_RECOMMEND_ITEMS=30;
const clamp=(v,max)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
export const recommenders=p=>Array.isArray(p?.recommendedBy)?p.recommendedBy:[];
// One entry per person, matched without caring about case, newest words kept. Anything without a
// name is dropped rather than shown as "someone".
export function cleanRecommenders(list){
 const out=[];
 for(const r of Array.isArray(list)?list:[]){
  const name=clamp(r?.name,RECOMMENDER_NAME);if(!name)continue;
  const said=clamp(r?.said,RECOMMENDER_SAID),at=typeof r?.at==='string'?r.at:undefined,by=typeof r?.by==='string'?r.by:undefined;
  const via=RECOMMEND_VIA.some(([k])=>k===r?.via)?r.via:undefined;
  const i=out.findIndex(x=>x.name.toLowerCase()===name.toLowerCase()),entry={name,said,...(via?{via}:{}),...(at?{at}:{}),...(by?{by}:{})};
  if(i>=0)out[i]={...entry,said:said||out[i].said,via:via||out[i].via};else out.push(entry);
 }
 return out.slice(0,MAX_RECOMMENDERS);
}
// Adds one person's recommendation to an idea's list, or takes it off. Shared by the server and
// by the phone drawing the change before it has synced, so the two land the same.
export function withRecommender(list,{name,said,via,at,by,remove}){
 const key=clamp(name,RECOMMENDER_NAME).toLowerCase();
 const rest=recommenders({recommendedBy:list}).filter(r=>r.name.toLowerCase()!==key);
 if(remove)return rest;
 const old=recommenders({recommendedBy:list}).find(r=>r.name.toLowerCase()===key);
 return cleanRecommenders([...rest,{name,said:clamp(said,RECOMMENDER_SAID)||old?.said||'',via:via||old?.via,at,by}]);
}
// "Ichiran Ramen (Shibuya)" and "ichiran ramen" are the same place; "the" and punctuation are noise.
const STOP=new Set(['the','a','an','at','in','of','and','to','go','visit','try']);
export const placeKey=title=>clamp(title,250).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'')
 .replace(/\(.*?\)/g,' ').replace(/[^a-z0-9぀-ヿ一-鿿]+/g,' ').split(' ').filter(w=>w&&!STOP.has(w)).join(' ');
// The idea already on the board that a recommendation is about, if there is one: the same name,
// or one name wholly inside the other once it is long enough not to match by accident
// ("teamLab" inside "teamLab Planets Toyosu").
export function matchProposal(proposals,title){
 const key=placeKey(title);if(!key)return null;
 const list=Array.isArray(proposals)?proposals:[];
 return list.find(p=>placeKey(p.title)===key)
  ||(key.length>=6?list.find(p=>{const k=placeKey(p.title);return k.length>=6&&(` ${k} `.includes(` ${key} `)||` ${key} `.includes(` ${k} `));}):null)
  ||null;
}
// Reading a pasted message without the model: one recommendation a line, bullets and numbers
// taken off, and anything after a dash or a colon kept as what they said about it. Lines that
// are plainly chat ("Hi!", "Have a great trip", a question) are left out. It is a starting list
// for a person to tick through, not a judgement.
const CHATTY=/^(hi|hey|hello|dear|thanks|thank you|cheers|love|xx+|have (a|an|the) |enjoy|let me know|hope|ps\b|p\.s\.|from\b|sent from)/i;
export function splitRecommendations(text){
 const lines=String(text??'').slice(0,RECOMMEND_TEXT).split(/\r?\n|\s•\s|;\s+/);
 const out=[],seen=new Set();
 for(const raw of lines){
  const line=raw.replace(/^\s*(?:[-*•·▪◦>]|\d{1,2}[.)]|[a-z][.)])\s*/i,'').trim();
  if(line.length<3||line.length>300||CHATTY.test(line)||/\?\s*$/.test(line))continue;
  const [, head, tail]=line.match(/^(.{2,120}?)\s+(?:[-–—:]|\.\.\.)\s+(.+)$/)||line.match(/^(.{2,120}?)\s*[:–—]\s*(.+)$/)||[null,line,''];
  const title=clamp(head.replace(/[.!]+$/,''),250);
  if(!title||title.split(' ').length>12)continue;
  const key=placeKey(title);if(!key||seen.has(key))continue;seen.add(key);
  out.push({title,said:clamp(tail,RECOMMENDER_SAID),place:'',category:'place'});
  if(out.length>=MAX_RECOMMEND_ITEMS)break;
 }
 return out;
}
// Everyone who has recommended something, most generous first, with the ideas each one gave.
export function recommenderList(proposals){
 const people=new Map();
 for(const p of Array.isArray(proposals)?proposals:[])for(const r of recommenders(p)){
  const key=r.name.toLowerCase(),entry=people.get(key)||{name:r.name,ideas:[]};
  entry.ideas.push(p);people.set(key,entry);
 }
 return [...people.values()].sort((a,b)=>b.ideas.length-a.ideas.length||a.name.localeCompare(b.name));
}
// The ideas that came from outside the family, the most recommended first.
export const recommendedProposals=proposals=>(Array.isArray(proposals)?proposals:[]).filter(p=>recommenders(p).length)
 .sort((a,b)=>recommenders(b).length-recommenders(a).length||String(a.title).localeCompare(String(b.title)));
// One line for the card and for the stop's notes once it is on a day.
export const recommendedLine=p=>{const r=recommenders(p);return r.length?`Recommended by ${r.map(x=>x.name).join(', ')}`:'';};
// Who a forwarded email was first from. A parent forwards Sue's email to the trip address, so the
// inbox says it came from the parent; the "From:" line inside the forward says it was Sue.
// Her name, or the part of her address before the @, or nothing for a person to type in.
export function forwardedSender(text,fallback=''){
 const lines=String(text??'').split(/\r?\n/);
 const at=lines.findIndex(l=>/^[-\s]*(forwarded message|begin forwarded message|original message)/i.test(l.trim()));
 const from=lines.slice(at<0?0:at).map(l=>l.match(/^\s*\*?(?:from|von|de)\*?:\s*(.+)$/i)).find(Boolean)?.[1]||'';
 const pick=v=>{const v2=String(v||'').trim(),name=v2.replace(/<[^>]*>/,'').replace(/["']/g,'').replace(/\[mailto:[^\]]*\]/i,'').trim();
  if(name&&!name.includes('@'))return name;const mail=(v2.match(/[\w.+-]+@[\w.-]+/)||[])[0];return mail?mail.split('@')[0]:'';};
 return clamp(pick(from)||pick(fallback),RECOMMENDER_NAME);
}
// A message handed to the recommendations panel from somewhere else: an email in the inbox, the
// share sheet through a Shortcut, or Android's own share sheet. Held for the one screen change
// it takes to get there, in the tab's session where it can be, in memory where it cannot.
const HANDOFF='japan.recommend';let held=null;
export function handRecommendation(draft){
 const value={from:clamp(draft?.from,RECOMMENDER_NAME),text:String(draft?.text??'').slice(0,RECOMMEND_TEXT),
  via:RECOMMEND_VIA.some(([k])=>k===draft?.via)?draft.via:'message',inboxId:typeof draft?.inboxId==='string'?draft.inboxId:''};
 held=value;try{sessionStorage.setItem(HANDOFF,JSON.stringify(value));}catch{}
 return value;
}
// Read without taking, so drawing the screen twice cannot lose it; cleared once the panel is up.
export function peekRecommendation(){
 let value=held;
 try{const saved=sessionStorage.getItem(HANDOFF);if(!value&&saved)value=JSON.parse(saved);}catch{}
 return value&&(value.text||value.from)?value:null;
}
export function clearRecommendation(){held=null;try{sessionStorage.removeItem(HANDOFF);}catch{}}
