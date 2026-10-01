// Email to the photo frames. The inbound forwarding module only receives; sending needs an outbound
// email service, and this uses Resend's HTTP API (no SDK) when RESEND_API_KEY and FRAME_MAIL_FROM
// are set. One email per photo, the photo attached, so every frame's importer handles it.
import {get} from '@vercel/blob';
import {AppError} from './model.mjs';
import {photosToMail} from '../src/frame-mail-data.js';
import {followPhoto} from '../src/follow-data.js';
import {frameCaption} from '../src/frame-data.js';
export const frameMailReady=()=>!!(process.env.RESEND_API_KEY&&process.env.FRAME_MAIL_FROM);
export const frameMailFrom=()=>process.env.FRAME_MAIL_FROM||'';
const MAX_BYTES=9*1024*1024;
async function photoFile(state,shot,today){
 const p=followPhoto(state,shot.id,today);if(!p)return null;
 const r=await get(p.pathname,{access:'private',useCache:false}).catch(()=>null);if(!r?.stream)return null;
 const chunks=[];for await(const c of r.stream)chunks.push(Buffer.from(c));
 const buf=Buffer.concat(chunks);if(buf.length>MAX_BYTES)return null;
 const ext=(p.type||'image/jpeg').split('/')[1].replace('jpeg','jpg');
 return {filename:`japan-day-${shot.number||''}-${shot.id}.${ext}`.replace(/[^a-zA-Z0-9._-]/g,'-'),content:buf.toString('base64')};
}
async function send(to,subject,text,attachment,fetcher=fetch){
 const r=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
  body:JSON.stringify({from:frameMailFrom(),to:[to],subject,text,attachments:[attachment]})});
 if(r.status===401||r.status===403)throw new AppError('The email service key was rejected. Check RESEND_API_KEY.',502);
 if(!r.ok)throw new Error(`send failed ${r.status}`);
}
// Sends what each frame has not had. Returns what went where, for the caller to record in the trip
// (the caller writes it, so a send that fails halfway records only what actually went).
export async function mailFrames(state,today,{only=null,fetcher}={}){
 if(!frameMailReady())return [];
 const out=[];
 for(const entry of state.frameEmails||[]){
  if(only&&entry.id!==only)continue;
  for(const shot of photosToMail(state,entry,today)){
   const file=await photoFile(state,shot,today);if(!file)continue;
   try{await send(entry.address,frameCaption(shot)||'From Japan',`${frameCaption(shot)}\n${shot.best?'Photo of the day':'A photo'} by ${shot.by}.${shot.said?`\n“${shot.said}”`:''}`,file,fetcher);}
   catch(e){if(e instanceof AppError)throw e;break;}
   out.push({id:entry.id,photo:shot.id});
  }
 }
 return out;
}
export function recordSent(state,sent,at=new Date().toISOString()){
 if(!sent.length)return null;
 return {...state,frameEmails:(state.frameEmails||[]).map(e=>{const mine=sent.filter(s=>s.id===e.id);return mine.length?{...e,lastSentAt:at,sent:{...(e.sent||{}),...Object.fromEntries(mine.map(s=>[s.photo,at]))}}:e;})};
}
