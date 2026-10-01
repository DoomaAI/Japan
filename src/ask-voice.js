// Ask, out loud. The same question box with the screen taken out of it: somebody walking between
// stops with a five-year-old by the hand says what they want — "push the garden to after lunch",
// "add a ramen stop near the hotel tonight" — hears the answer, and says yes or no to the change.
// Nothing here changes the plan either: a yes is the same tap on Apply, made by a parent, against
// the same checks, and only when the change runs into nothing.
const tidy=v=>String(v??'').replace(/\s+/g,' ').trim();
const dayName=date=>new Intl.DateTimeFormat('en-AU',{weekday:'long',timeZone:'Asia/Tokyo'}).format(new Date(`${date}T12:00:00+09:00`));
// "13:30" read out as a phone would say it to a person, not "thirteen thirty".
export function sayTime(hhmm){
 const m=/^(\d{2}):(\d{2})$/.exec(String(hhmm||''));if(!m)return '';
 const h=+m[1],min=+m[2],twelve=h%12||12,half=h<12?'in the morning':h<17?'in the afternoon':'in the evening';
 if(h===12&&min===0)return 'midday';
 if(min===0)return `${twelve} o’clock ${half}`;
 if(min===30)return `half past ${twelve} ${half}`;
 return `${twelve}:${m[2]} ${half}`;
}
// One change, as a sentence somebody can say yes to.
export function sayChange(row){
 const when=row.to?.day?`${dayName(row.to.day)}${row.to.time?` at ${sayTime(row.to.time)}`:''}`:'';
 if(row.action==='add')return `add ${row.title} on ${when}`;
 if(row.action==='skip')return `skip ${row.title}`;
 if(row.action==='later')return `put ${row.title} back in Options`;
 return `move ${row.title} to ${when}`;
}
const joinAnd=list=>list.length<2?list.join(''):`${list.slice(0,-1).join(', ')} and ${list.at(-1)}`;
// What is read back: the answer first, then the change and the question it asks. A change that
// would run into something booked, or that the plan has overtaken, is not offered for a yes —
// it is said, and left on the screen for a parent to look at.
export function spokenAnswer(item,{offer=false,preview=null}={}){
 const parts=[tidy(item?.verdict),tidy(item?.answer)].filter(Boolean);
 // The verdict is often the answer's own first sentence; said twice it sounds broken.
 if(parts.length===2&&parts[1].toLowerCase().startsWith(parts[0].replace(/[.!?]$/,'').toLowerCase()))parts.shift();
 const rows=preview?.rows||[];
 if(item?.draft&&rows.length&&!item.draft.appliedAt){
  const said=`The change is to ${joinAnd(rows.map(sayChange))}.`;
  if(offer)parts.push(said,'Shall I make that change? Say yes or no.');
  else if(preview?.conflicts?.length)parts.push(said,`It is not ready to apply: ${preview.conflicts[0]}`);
  else if(preview?.stale)parts.push('The plan has moved on since, so that change is no longer offered.');
  else parts.push(said,'A parent can apply it on the screen.');
 }
 if(tidy(item?.checkFirst))parts.push(`Check first: ${tidy(item.checkFirst)}`);
 return parts.join(' ');
}
// Speech engines stop partway through a long utterance on some phones, so it goes out a few
// sentences at a time.
export function speechChunks(text,max=220){
 const sentences=tidy(text).match(/[^.!?]+[.!?]*["’”)]?\s*/g)||[];
 const out=[];let cur='';
 for(const s of sentences){
  if(cur&&(cur+s).length>max){out.push(cur.trim());cur='';}
  cur+=s;
 }
 if(cur.trim())out.push(cur.trim());
 return out;
}
// The answer to "shall I make that change?". A plain yes or no in any of the ways people say
// them; anything else is not taken as either, because a misheard sentence must never be a yes.
const YES=/^(yes|yeah|yep|yup|yes please|sure|ok|okay|do it|go ahead|go for it|apply( it)?|make (it|the change|that change)|please do|sounds good|that's fine|that is fine)\b/;
const NO=/^(no|nope|nah|don't|do not|leave it|not now|cancel|stop|never ?mind|no thanks)\b/;
export function confirmReply(text){
 const said=tidy(text).toLowerCase().replace(/[.,!?]/g,'').replace(/’/g,"'");
 if(!said)return null;
 if(NO.test(said))return 'no';
 // Short, because "yes but move the garden instead" is a new question, not a yes.
 if(YES.test(said)&&said.split(' ').length<=5&&!/\b(but|instead|except|rather)\b/.test(said))return 'yes';
 return null;
}
// The voice the answers are read in: the family's own English first, any English after that.
export function englishVoice(voices,lang='en-AU'){
 const list=Array.isArray(voices)?voices:[];
 const norm=v=>String(v?.lang||'').replace('_','-').toLowerCase();
 return list.find(v=>norm(v)===lang.toLowerCase())||list.find(v=>norm(v).startsWith('en-gb'))||list.find(v=>norm(v).startsWith('en'))||null;
}
