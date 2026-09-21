import {randomUUID} from 'node:crypto';
import {AppError} from './model.mjs';
import {validateAudio,VOICE_MAX_SECONDS} from './files.mjs';
import {BOYS} from '../src/trip-features.js';
// A photo of the thing, a video of it, or something said about it, pinned to one purchase.
// Written notes do not come through here: they need no upload, so they go through an ordinary
// change and still work standing in a shop with no signal.
export const RECEIPT_IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
export const RECEIPT_VIDEO_TYPES=['video/mp4','video/quicktime','video/webm'];
export const RECEIPT_MAX_PER_ITEM=30;
// Everything that can be decided before reaching storage, so the rules stand on their own and
// are the same whether or not a blob is involved.
export function checkReceipt(state,body,user){
 if(typeof body.pathname!=='string'||!body.pathname.startsWith(`receipts/${user.id}/`)||body.pathname.includes('..'))
  throw new AppError('Invalid file.');
 if(!['photo','video','voice'].includes(body.kind))throw new AppError('Choose a photo, a video or a voice note.');
 const item=(state.spending?.items||[]).find(i=>i.id===body.itemId);
 if(!item)throw new AppError('That is no longer on the spending list.',404);
 if(!BOYS.includes(item.person))throw new AppError('Spending money belongs to Nate and Boston.');
 // The boys keep their own; a parent helps with either of theirs.
 if(user.role!=='parent'&&item.person!==user.name)throw new AppError('That is somebody else’s purchase.',403);
 if((state.spending?.receipts||[]).filter(r=>r.itemId===item.id).length>=RECEIPT_MAX_PER_ITEM)
  throw new AppError(`That is ${RECEIPT_MAX_PER_ITEM} things pinned to one purchase already.`);
 let seconds=null;
 if(body.kind==='voice'){
  seconds=Math.round(Number(body.seconds));
  if(!Number.isFinite(seconds)||seconds<1||seconds>VOICE_MAX_SECONDS)throw new AppError('Record between one second and five minutes.');
 }
 const caption=String(body.caption||'').trim();
 if(caption.length>250)throw new AppError('Keep the caption short.');
 return {itemId:item.id,person:item.person,kind:body.kind,seconds,caption,pathname:body.pathname};
}
// Storage describes the blob, never the phone, so a file cannot claim to be something it is not.
// Saving the same upload twice is the same record rather than a second one.
export function addReceipt(state,checked,user,blob,now=new Date().toISOString()){
 const type=(blob?.contentType||'').split(';')[0].trim(),size=blob?.size;
 if(checked.kind==='voice')validateAudio(blob?.contentType,size);
 else{
  const allowed=checked.kind==='photo'?RECEIPT_IMAGE_TYPES:RECEIPT_VIDEO_TYPES;
  const cap=(checked.kind==='video'?100:25)*1024*1024;
  if(!allowed.includes(type)||!Number.isFinite(size)||size<=0||size>cap)
   throw new AppError(checked.kind==='photo'?'Use a photo up to 25 MB.':'Use a video up to 100 MB.');
 }
 const receipts=state.spending.receipts||[];
 if(receipts.some(r=>r.pathname===checked.pathname))return state;
 return {...state,spending:{...state.spending,receipts:[...receipts,
  {id:randomUUID(),...checked,type,size,by:user.name,at:now}]}};
}
