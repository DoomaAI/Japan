// Tracker tags — the AirTags in the suitcases and the boys' backpacks. The app cannot see a tag:
// an iPhone web app has no Bluetooth, and Find My has no way in for anybody else's app. What it
// can do is remember which tag is in which bag, whose Apple Account it is on, and the one thing
// Find My will hand over — a Share Item Location link — so that link is one tap away at a
// baggage counter rather than three screens deep in somebody's phone.
export const TRACKER_KINDS=[['suitcase','Suitcase'],['bag','Bag'],['backpack','Backpack'],['other','Something else']];
// Find My stops a shared link working after seven days, or as soon as the item is back with us.
export const SHARE_LINK_DAYS=7;
export const MAX_TRACKERS=30;
const DAY=24*60*60*1000;
export const trackers=state=>state?.trackers||[];
export const trackerKindLabel=kind=>TRACKER_KINDS.find(([id])=>id===kind)?.[1]||'Something else';
export const validShareUrl=v=>{
 if(typeof v!=='string'||v.length>2000)return false;
 try{return new URL(v).protocol==='https:';}catch{return false;}
};
export const trackerItem=(o,id)=>({id,label:String(o.label||'').trim(),kind:TRACKER_KINDS.some(([k])=>k===o.kind)?o.kind:'other',
 person:o.person||'Family',owner:o.owner||'',forwarded:o.forwarded===true,notes:String(o.notes||'').trim()});
// Whether the link we were given is still worth opening. It is a guess from when it was pasted:
// Find My may have ended it sooner, because the bag turned up.
export function linkState(tracker,now=new Date()){
 if(!tracker?.shareUrlAt)return {state:'none',expires:null};
 const expires=new Date(Date.parse(tracker.shareUrlAt)+SHARE_LINK_DAYS*DAY);
 return {state:expires>now?'live':'expired',expires};
}
// What still needs doing in Find My before the tag is any use to the whole family.
export function trackerChecks(tracker){
 return [
  ['shared','Shared with the other parent in Find My','Otherwise whoever does not own it is warned that an AirTag is travelling with them.'],
  ['alerts','Notify When Left Behind is on','So the phone says so when the bag is left on a train.']
 ].map(([id,label,why])=>({id,label,why,done:!!tracker?.checks?.[id]}));
}
export const forwardedTrackers=state=>trackers(state).filter(t=>t.forwarded);
// Held up at a baggage counter. Written for staff to read, in plain polite Japanese; the English
// underneath is so we know what we are showing.
export const LOST_BAG_LINES=[
 {ja:'荷物が届いていません。紛失手荷物の届け出をしたいです。',en:'Our bag has not arrived. We would like to report it missing.'},
 {ja:'このバッグにはAppleのAirTag（位置情報タグ）が入っています。',en:'This bag has an Apple AirTag tracker in it.'},
 {ja:'現在地のリンクをお送りできます。',en:'We can send you a link showing where it is now.'}
];
