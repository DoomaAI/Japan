// Google Nest Hub frames, through Google Photos. Since March 2025 an app may only create albums
// and add to what it made (the photoslibrary.appendonly scope), which is all this needs: the
// grandparents sign in once from a link a parent sends them, the app makes a "Japan 2026" album in
// their Google Photos, and every night it adds the frame's new photos to it. The Nest Hub's Photo
// Frame is pointed at that album in the Google Home app.
import {photosToMail} from './frame-mail-data.js';
export const GOOGLE_ALBUM='Japan 2026',MAX_GOOGLE_FRAMES=4,CONNECT_DAYS=7,GOOGLE_BATCH=20;
// What a parent's phone is sent: never the token or the link's secret.
export const googleFrameView=g=>({id:g.id,label:g.label,status:g.status==='connected'?'connected':'waiting',connectedAt:g.connectedAt||null,lastSentAt:g.lastSentAt||null,sent:Object.keys(g.sent||{}).length,linkUntil:g.status==='connected'?null:g.nonceUntil||null});
export const photosToGoogle=(state,frame,today)=>photosToMail(state,frame,today,GOOGLE_BATCH);
export function recordGoogleSent(state,sent,at=new Date().toISOString()){
 if(!sent.length)return null;
 return {...state,googleFrames:(state.googleFrames||[]).map(g=>{const mine=sent.filter(s=>s.id===g.id);return mine.length?{...g,lastSentAt:at,sent:{...(g.sent||{}),...Object.fromEntries(mine.map(s=>[s.photo,at]))}}:g;})};
}
export const NEST_STEPS=[
 'Send them the link. They open it on their phone, sign in with the Google account their Nest Hub uses, and allow “add to your Google Photos”.',
 'In the Google Home app: tap the Nest Hub → Settings (the cog) → Photo Frame → Google Photos, and choose the album “Japan 2026”.',
 'The photos arrive every evening. Nothing in their Google Photos is read; the app can only add to the album it made.'
];
