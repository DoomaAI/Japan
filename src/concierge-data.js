// Ask the front desk. A Japanese hotel concierge will ring a restaurant that takes no English
// bookings, call a taxi for a set time, chase a bag left on a train, or find a doctor who speaks
// English — but only if the request is clear. These are the requests written out in polite
// Japanese, filled in from the trip (the party, the allergies, the next stop's Japanese name),
// with the English underneath so we know what we are handing over. Nothing is sent: it is shown
// at the desk, or copied into the hotel's chat.
import {allergyOf,allergenById} from './allergy-data.js';
import {personProfile} from './trip-features.js';
import {isChild} from './child-levels.js';
const md=date=>{const [,m,d]=String(date||'').split('-').map(Number);return m&&d?`${m}月${d}日`:'';};
const mdEn=date=>date?new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(`${date}T12:00:00+09:00`)):'';
const clean=(v,max=200)=>String(v??'').trim().slice(0,max);
// Who is in the party, as a restaurant wants to hear it: grown-ups, children and their ages.
export function partyOf(state){
 const adults=(state.members||[]).filter(n=>!isChild(state,n)),kids=(state.members||[]).filter(n=>isChild(state,n));
 const ages=kids.map(n=>personProfile(state,n).age).filter(Number.isInteger);
 return {adults:adults.length,children:kids.length,ages};
}
const partyJa=({adults,children,ages})=>`大人${adults}名${children?`、子ども${children}名${ages.length?`（${ages.map(a=>`${a}歳`).join('・')}）`:''}`:''}`;
const partyEn=({adults,children,ages})=>`${adults} adult${adults===1?'':'s'}${children?`, ${children} child${children===1?'':'ren'}${ages.length?` (${ages.join(' and ')})`:''}`:''}`;
// Every allergen on anybody's card, said once, in the words a kitchen uses.
export function allergiesOf(state){
 const ids=[...new Set((state.members||[]).flatMap(n=>allergyOf(state,n).allergens))];
 const severe=(state.members||[]).some(n=>allergyOf(state,n).severe);
 return {ja:ids.map(id=>allergenById(id)?.[2]).filter(Boolean),en:ids.map(id=>allergenById(id)?.[1]).filter(Boolean),severe};
}
export const REQUESTS=[
 {id:'restaurant',label:'Book a restaurant',icon:'🍽️',
  fields:[['place','Restaurant (and branch)'],['date','Date','date'],['time','Time','time'],['flex','Other times that would do'],['note','Anything else (English is fine)']]},
 {id:'taxi',label:'Book a taxi',icon:'🚕',
  fields:[['date','Date','date'],['time','Pick-up time','time'],['place','Going to'],['bags','Suitcases','number'],['note','Anything else']]},
 {id:'lost',label:'Something left behind',icon:'🧳',
  fields:[['item','What it is'],['where','Where (train line and car, station, shop)'],['date','When','date'],['time','About what time','time'],['look','What it looks like']]},
 {id:'doctor',label:'Find a doctor',icon:'🩺',
  fields:[['who','Who is unwell'],['what','What is wrong (English is fine)'],['since','Since when']]},
 {id:'late',label:'Late check-out',icon:'🛏️',
  fields:[['date','Check-out day','date'],['time','Until','time']]}
];
// The request, written out: the Japanese to show and the English to check it by.
export function requestText(state,id,v={}){
 const p=partyOf(state),a=allergiesOf(state),party=partyJa(p);
 const note=clean(v.note,300);
 if(id==='restaurant'){
  const ja=['恐れ入りますが、こちらのレストランの予約をお願いできますでしょうか。',
   `店名：${clean(v.japanese)||clean(v.place)}`,`日時：${md(v.date)} ${clean(v.time,5)}`,`人数：${party}`,
   v.flex?`この時間が難しい場合：${clean(v.flex,80)}でも大丈夫です。`:'',
   a.ja.length?`アレルギー：${a.ja.join('、')}${a.severe?'（重度です）':''}。対応できるか確認していただけますか。`:'',
   p.children?'子ども用の椅子があると助かります。':'',note?`メモ（英語）：${note}`:'','よろしくお願いいたします。'].filter(Boolean);
  const en=[`Could you book this restaurant for us?`,`Restaurant: ${clean(v.place)}`,`When: ${mdEn(v.date)} ${clean(v.time,5)}`,`Party: ${partyEn(p)}`,
   v.flex?`If that time is full: ${clean(v.flex,80)} would also be fine.`:'',a.en.length?`Allergies: ${a.en.join(', ')}${a.severe?' (severe)':''} — please check they can manage.`:'',
   p.children?'A child’s chair would help.':'',note?`Note: ${note}`:''].filter(Boolean);
  return {ja,en};
 }
 if(id==='taxi'){
  const bags=Number.isInteger(Number(v.bags))&&Number(v.bags)>0?Number(v.bags):0;
  const ja=['タクシーの予約をお願いできますでしょうか。',`日時：${md(v.date)} ${clean(v.time,5)}、ホテルの玄関で`,`行き先：${clean(v.japanese)||clean(v.place)}`,
   `人数：${party}`,bags?`スーツケース：${bags}個（大きめの車だと助かります）`:'',p.children&&p.ages.some(x=>x<6)?'チャイルドシートがあればお願いします。':'',note?`メモ（英語）：${note}`:'','よろしくお願いいたします。'].filter(Boolean);
  const en=['Could you book a taxi for us?',`When: ${mdEn(v.date)} ${clean(v.time,5)}, from the hotel entrance`,`To: ${clean(v.place)}`,`Party: ${partyEn(p)}`,
   bags?`${bags} suitcase${bags===1?'':'s'} (a larger car would help)`:'',p.children&&p.ages.some(x=>x<6)?'A child seat if there is one.':'',note?`Note: ${note}`:''].filter(Boolean);
  return {ja,en};
 }
 if(id==='lost'){
  const ja=['忘れ物をしてしまいました。問い合わせをお願いできますでしょうか。',`忘れ物：${clean(v.item)}`,`場所：${clean(v.where)}`,`日時：${md(v.date)} ${clean(v.time,5)}頃`,
   v.look?`特徴（英語）：${clean(v.look,200)}`:'','見つかった場合、ホテルに届けていただくか、受け取り方法を教えてください。','よろしくお願いいたします。'].filter(Boolean);
  const en=['We left something behind. Could you call and ask for us?',`What: ${clean(v.item)}`,`Where: ${clean(v.where)}`,`When: ${mdEn(v.date)} about ${clean(v.time,5)}`,
   v.look?`Looks like: ${clean(v.look,200)}`:'','If it is found, could it be sent to the hotel, or tell us how to collect it?'].filter(Boolean);
  return {ja,en};
 }
 if(id==='doctor'){
  const ja=['家族が体調を崩しました。英語が通じる近くの病院かクリニックを探していただけますか。',`患者：${clean(v.who)}`,`症状（英語）：${clean(v.what,200)}`,v.since?`いつから：${clean(v.since,60)}`:'',
   a.ja.length?`アレルギー：${a.ja.join('、')}`:'','予約が必要な場合は、お電話をお願いできますか。','よろしくお願いいたします。'].filter(Boolean);
  const en=['One of us is unwell. Could you find a nearby clinic or hospital where English is spoken?',`Who: ${clean(v.who)}`,`What: ${clean(v.what,200)}`,v.since?`Since: ${clean(v.since,60)}`:'',
   a.en.length?`Allergies: ${a.en.join(', ')}`:'','If it needs an appointment, could you call them for us?'].filter(Boolean);
  return {ja,en};
 }
 if(id==='late'){
  const ja=['レイトチェックアウトは可能でしょうか。',`日付：${md(v.date)}`,`希望：${clean(v.time,5)}まで`,'追加料金がかかる場合は教えてください。','よろしくお願いいたします。'];
  const en=['Is a late check-out possible?',`Day: ${mdEn(v.date)}`,`Until: ${clean(v.time,5)}`,'Please tell us if there is a charge.'];
  return {ja,en};
 }
 return null;
}
// What a request starts with: tomorrow's date, the next fixed dinner, the next stop's place.
export function requestDefaults(state,id,day,step=null){
 const next=(()=>{const i=(state.days||[]).findIndex(d=>d.date===day);return state.days?.[i+1]?.date||day;})();
 if(id==='restaurant')return {date:day,time:'18:00',place:step?.place||'',japanese:step?.japanese||''};
 if(id==='taxi')return {date:day,time:'09:00',place:step?.place||'',japanese:step?.japanese||'',bags:''};
 if(id==='lost')return {date:day,time:''};
 if(id==='late')return {date:next,time:'12:00'};
 return {};
}
