// Kudos from home, the way Strava gives a run a thumbs up: the grandparents on the follow-along
// link tap a clap, a heart or a wow on a photo or a stop, and nothing else. The link stays
// read-only in every way that matters — a reaction is not a message, and it cannot say anything
// the three emoji do not. Each follower gives one per thing, under the first name they typed
// once, so the boys see who clapped at breakfast.
export const KUDOS=['👏','❤️','😮'];
export const KUDOS_TARGETS=['photo','stop'];
export const MAX_KUDOS_TARGETS=400,MAX_KUDOS_NAMES=40,KUDOS_NAME=24;
export const kudosKey=(target,id)=>`${target}:${id}`;
export const cleanKudosName=name=>String(name||'').replace(/[^\p{L}\p{M}' -]/gu,'').trim().slice(0,KUDOS_NAME);
export const kudosState=state=>state.kudos||{};
// What one thing has: how many of each, and who gave what.
export function kudosFor(state,target,id){
 const names=kudosState(state)[kudosKey(target,id)]||{},counts={};
 for(const e of Object.values(names))counts[e]=(counts[e]||0)+1;
 return {counts,names,total:Object.keys(names).length};
}
// A follower's tap: the same emoji again takes it back, a different one replaces it. Returns the
// next state, or null when nothing about it was worth keeping.
export function applyKudos(state,{target,id,emoji,name}){
 const who=cleanKudosName(name);
 if(!KUDOS_TARGETS.includes(target)||typeof id!=='string'||!id||id.length>80||!KUDOS.includes(emoji)||!who)return null;
 const all={...kudosState(state)},key=kudosKey(target,id),names={...(all[key]||{})};
 if(names[who]===emoji)delete names[who];
 else{if(!names[who]&&Object.keys(names).length>=MAX_KUDOS_NAMES)return null;names[who]=emoji;}
 if(Object.keys(names).length)all[key]=names;else delete all[key];
 if(!all[key]&&!state.kudos?.[key])return null;
 if(Object.keys(all).length>MAX_KUDOS_TARGETS)return null;
 return {...state,kudos:all};
}
// Everything given on one day: the day's photos and the stops done on it, for the tally on Home.
export function dayKudos(state,day){
 const photos=(state.photos||[]).filter(p=>p.day===day).map(p=>kudosFor(state,'photo',p.id));
 const stops=(state.steps||[]).filter(s=>s.day===day).map(s=>kudosFor(state,'stop',s.id));
 const counts={},givers={};
 for(const k of [...photos,...stops]){for(const [e,n] of Object.entries(k.counts))counts[e]=(counts[e]||0)+n;for(const who of Object.keys(k.names))givers[who]=(givers[who]||0)+1;}
 return {counts,givers,total:Object.values(counts).reduce((a,b)=>a+b,0)};
}
export const kudosLine=k=>KUDOS.filter(e=>k.counts[e]).map(e=>`${e} ${k.counts[e]}`).join(' · ');
export const giversLine=k=>Object.entries(k.givers).sort((a,b)=>b[1]-a[1]).map(([who,n])=>`${who} ×${n}`).join(', ');
