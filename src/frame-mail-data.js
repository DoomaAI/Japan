// The frames at the grandparents', two ways. A screen frame (an old iPad, a laptop, a TV browser)
// opens the follow-along link in frame mode, and each one now has a key of its own with a label —
// "Nana's kitchen iPad" — so one can be withdrawn without breaking a grandparent's phone link or
// the other frames. A real digital photo frame (Aura, Nixplay, Skylight) cannot open a link but
// has an email address that accepts photos, so the app emails it the same curated set: the photo
// of the day and whatever a parent put on the frame, each photo once.
import {followView} from './follow-data.js';
import {frameSet} from './frame-data.js';
export const FRAME_SERVICES=[
 {id:'aura',label:'Aura',hint:'In the Aura app: the frame’s settings → Email photos to this frame. Add our sending address as a contributor if the frame only takes photos from people it knows.'},
 {id:'nixplay',label:'Nixplay',hint:'In the Nixplay app: Playlists → the playlist → its email address. Allow our sending address under Allowed senders.'},
 {id:'skylight',label:'Skylight',hint:'The frame’s @ourskylight.com address, from the Skylight app. Approve our sending address the first time a photo arrives.'},
 {id:'other',label:'Another frame',hint:'Any frame or album that takes photos by email.'}
];
export const MAX_FRAME_KEYS=6,MAX_FRAME_EMAILS=6,MAX_PER_SEND=6;
export const frameService=id=>FRAME_SERVICES.find(s=>s.id===id)||FRAME_SERVICES.at(-1);
export const cleanLabel=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,40);
export const validFrameEmail=s=>/^[^\s@<>(),;:"]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/i.test(String(s||'').trim())&&String(s).length<=120;
// Which key a follow-along request came with: the family's follow link, or one of the frames.
// The comparison is on hashes, as the follow key's is, so it takes the same time either way.
export function keyAccess(state,key,hash){
 if(!/^[a-f0-9]{64}$/.test(String(key||'')))return null;
 const h=hash(key);
 if(state?.followKey&&hash(state.followKey)===h)return {kind:'follow'};
 const frame=(state?.frameKeys||[]).find(f=>f.key&&hash(f.key)===h);
 return frame?{kind:'frame',id:frame.id,label:frame.label}:null;
}
// A frame as a phone sees it: never the key itself, which a parent is handed by its own route.
export const frameKeyView=f=>({id:f.id,label:f.label,createdAt:f.createdAt,createdBy:f.createdBy||''});
// The photos a mailed frame has not had yet: the frame's curated set (newest day first), oldest of
// those first so the frame fills in order, at most a few a run so a long gap does not flood it.
export function photosToMail(state,entry,today,limit=MAX_PER_SEND){
 const sent=entry?.sent||{};
 return frameSet(followView(state,today)).filter(p=>!sent[p.id]).reverse().slice(0,limit);
}
