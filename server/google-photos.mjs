// Google Photos for the Nest Hub frames. OAuth with the photoslibrary.appendonly scope only: the app
// can make an album and add photos to it, and cannot read anything else in the account. The
// refresh token is sealed (AES-256-GCM, keyed from the client secret) before it goes in the trip,
// and stripped at the boundary so it reaches no phone.
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {get} from '@vercel/blob';
import {AppError} from './model.mjs';
import {photosToGoogle,GOOGLE_ALBUM} from '../src/google-frame-data.js';
import {followPhoto} from '../src/follow-data.js';
import {frameCaption} from '../src/frame-data.js';
export const SCOPE='https://www.googleapis.com/auth/photoslibrary.appendonly';
export const googleReady=()=>!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET);
const sealKey=()=>createHash('sha256').update(`google-frames:${process.env.GOOGLE_CLIENT_SECRET||''}`).digest();
export function sealToken(text,bound){
 const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',sealKey(),iv);c.setAAD(Buffer.from(bound));
 const body=Buffer.concat([c.update(text,'utf8'),c.final()]);
 return Buffer.concat([iv,c.getAuthTag(),body]).toString('base64');
}
export function openToken(sealed,bound){
 try{const b=Buffer.from(sealed,'base64'),d=createDecipheriv('aes-256-gcm',sealKey(),b.subarray(0,12));d.setAAD(Buffer.from(bound));d.setAuthTag(b.subarray(12,28));
  return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8');}
 catch{throw new AppError('The Google connection could not be unlocked. Has GOOGLE_CLIENT_SECRET changed? Send them a new link.',500);}
}
export const redirectUri=origin=>`${origin}/api/google-callback`;
export function authUrl(origin,state){
 const q=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:redirectUri(origin),response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent',include_granted_scopes:'false',state});
 return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}
async function tokenCall(params,fetcher){
 const r=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,...params})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new AppError(j.error==='invalid_grant'?'Google has withdrawn this connection. Send them a new link.':'Google did not accept the sign-in. Try the link again.',502);
 return j;
}
export const exchangeCode=(code,origin,fetcher=fetch)=>tokenCall({code,grant_type:'authorization_code',redirect_uri:redirectUri(origin)},fetcher);
export const accessToken=async(refresh,fetcher=fetch)=>(await tokenCall({refresh_token:refresh,grant_type:'refresh_token'},fetcher)).access_token;
const API='https://photoslibrary.googleapis.com/v1';
export async function createAlbum(access,fetcher=fetch){
 const r=await fetcher(`${API}/albums`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({album:{title:GOOGLE_ALBUM}})});
 const j=await r.json().catch(()=>({}));if(!r.ok||!j.id)throw new AppError('The album could not be made in Google Photos.',502);
 return j.id;
}
async function uploadBytes(access,bytes,fileName,type,fetcher){
 const r=await fetcher(`${API}/uploads`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/octet-stream','X-Goog-Upload-Content-Type':type,'X-Goog-Upload-Protocol':'raw','X-Goog-Upload-File-Name':fileName},body:bytes});
 if(!r.ok)throw new Error(`upload ${r.status}`);return (await r.text()).trim();
}
async function photoBytes(state,shot,today){
 const p=followPhoto(state,shot.id,today);if(!p)return null;
 const r=await get(p.pathname,{access:'private',useCache:false}).catch(()=>null);if(!r?.stream)return null;
 const chunks=[];for await(const c of r.stream)chunks.push(Buffer.from(c));
 return {bytes:Buffer.concat(chunks),type:p.type||'image/jpeg',name:`japan-${shot.day}-${shot.id}.${(p.type||'image/jpeg').split('/')[1].replace('jpeg','jpg')}`};
}
// Adds each connected frame's new photos to its album. Returns what went, for the caller to record.
export async function sendGoogleFrames(state,today,{only=null,fetcher=fetch,load=photoBytes}={}){
 if(!googleReady())return [];
 const out=[];
 for(const g of state.googleFrames||[]){
  if(g.status!=='connected'||!g.token||!g.albumId||(only&&g.id!==only))continue;
  const shots=photosToGoogle(state,g,today);if(!shots.length)continue;
  let access;try{access=await accessToken(openToken(g.token,g.id),fetcher);}catch(e){if(only)throw e;continue;}
  const items=[];
  for(const shot of shots){
   const file=await load(state,shot,today);if(!file)continue;
   try{items.push({shot,uploadToken:await uploadBytes(access,file.bytes,file.name,file.type,fetcher)});}catch{break;}
  }
  if(!items.length)continue;
  const r=await fetcher(`${API}/mediaItems:batchCreate`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},
   body:JSON.stringify({albumId:g.albumId,newMediaItems:items.map(i=>({description:`${frameCaption(i.shot)} · ${i.shot.by}`.slice(0,1000),simpleMediaItem:{uploadToken:i.uploadToken}}))})});
  const j=await r.json().catch(()=>({}));
  for(const res of j.newMediaItemResults||[]){const it=items.find(i=>i.uploadToken===res.uploadToken);if(it&&res.mediaItem?.id)out.push({id:g.id,photo:it.shot.id});}
 }
 return out;
}
