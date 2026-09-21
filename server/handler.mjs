import {FILE_TYPES,AUDIO_TYPES,VOICE_MAX_BYTES,validateFile} from './files.mjs';
import {checkVoiceNote,addVoiceNote} from './voice.mjs';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {get,head} from '@vercel/blob';
import {handleUpload} from '@vercel/blob/client';
import {AppError,applyOperation,MEMBERS,documentDetails,documentAssociation,ticketParent} from './model.mjs';
import {database,readTrip,writeTrip,session,localDemo,hash,token,setCookie} from './store.mjs';
import {visibleEnvelope} from './visibility.mjs';
import {readMenu,menuReaderReady} from './menu.mjs';
import {translatePhrase,translatorReady} from './translate.mjs';
import {readDocument,readerReady} from './document-reader.mjs';
const json=(res,data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
async function body(req,max=1000000){if(req.body&&typeof req.body==='object')return req.body;let s='';for await(const c of req){s+=c;if(Buffer.byteLength(s)>max)throw new AppError('Request too large.',413);}try{return JSON.parse(s||'{}');}catch{throw new AppError('Invalid request.');}}
const parent=u=>{if(u.role!=='parent')throw new AppError('A parent can do this.',403);};
const validName=(name,role)=>MEMBERS.includes(name)&&(['Damien','Lauren'].includes(name)?role==='parent':role==='child');
function checkOrigin(req){
 const origin=req.headers.origin;
 if(localDemo()){if(origin&&new URL(origin).host!==req.headers.host)throw new AppError('Request origin is not allowed.',403);return;}
 if(!process.env.APP_ORIGIN||origin!==process.env.APP_ORIGIN)throw new AppError('Request origin is not allowed.',403);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const url=new URL(req.url,'http://localhost'),route=url.pathname.replace(/^\/api\/?/,'');
  const post=req.method==='POST';let b=post?await body(req,['menu','read-document'].includes(route)?6000000:1000000):{};
  // Blob callbacks carry a signature verified by the SDK. They do not mutate itinerary data.
  if(route==='upload'&&post&&b.type==='blob.upload-completed'){
   const result=await handleUpload({body:b,request:req,onBeforeGenerateToken:async()=>{throw new Error('Not a token request');},onUploadCompleted:async()=>{}});return json(res,result);
  }
  if(post)checkOrigin(req);
  if(route==='config'&&req.method==='GET')return json(res,{configured:!!process.env.DATABASE_URL,demo:localDemo(),uploads:!!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID),menuReader:menuReaderReady(),translator:translatorReady(),documentReader:readerReady()});
  if(route==='join'&&post){
   if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))throw new AppError('Invalid family link.',403);
   const db=await database();const [u]=await db`SELECT id FROM japan_grants WHERE token_hash=${hash(b.token)} AND revoked=false AND expires_at>now()`;
   if(!u)throw new AppError('This invite has expired or been revoked.',403);
   const sid=token();await db`INSERT INTO japan_sessions(token_hash,grant_id) VALUES (${hash(sid)},${u.id})`;setCookie(res,sid);return json(res,{ok:true});
  }
  const user=await session(req);
  if(route==='session'&&req.method==='GET')return json(res,{user});
  if(route==='logout'&&post){if(!localDemo()){const c=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('japan_session='))?.slice(14);if(c){const db=await database();await db`DELETE FROM japan_sessions WHERE token_hash=${hash(c)}`;}}setCookie(res,'');return json(res,{ok:true});}
  if(route==='state'&&req.method==='GET')return json(res,visibleEnvelope(await readTrip(),user));
  if(route==='mutate'&&post){
   const current=await readTrip();if(b.operation?.operationId&&current.state.appliedOperationIds?.includes(b.operation.operationId))return json(res,visibleEnvelope(current,user));if(b.revision!==current.revision)throw new AppError('The family updated the trip. Review your change against the latest plan.',409);
   const state=applyOperation(current.state,b.operation,user);return json(res,visibleEnvelope(await writeTrip(state,current.revision),user));
  }
  if(route==='menu'&&post){
   parent(user);const {state}=await readTrip();
   return json(res,await readMenu(b,state));
  }
  if(route==='translate'&&post){
   parent(user);
   return json(res,await translatePhrase(b));
  }
  if(route==='read-document'&&post){
   parent(user);
   return json(res,await readDocument(b));
  }
  if(route==='invites'&&req.method==='GET'){
   parent(user);if(localDemo())return json(res,{invites:[]});const db=await database();return json(res,{invites:await db`SELECT id,name,role,revoked,expires_at FROM japan_grants ORDER BY created_at`});
  }
  if(route==='invites'&&post){
   parent(user);if(localDemo())throw new AppError('Connect Neon to create real family invite links.',503);
   if(!validName(b.name,b.role))throw new AppError('Choose a family member and matching role.');
   const db=await database(),raw=token(),id=randomUUID();await db`INSERT INTO japan_grants(id,token_hash,name,role) VALUES (${id},${hash(raw)},${b.name},${b.role})`;
   return json(res,{url:`${process.env.APP_ORIGIN}/#join=${raw}`,id});
  }
  if(route==='revoke'&&post){
   parent(user);if(b.id===user.id||b.id==='owner')throw new AppError('Keep the owner access. Revoke another invite instead.');
   const db=await database();await db`UPDATE japan_grants SET revoked=true WHERE id=${b.id}`;return json(res,{ok:true});
  }
  if(route==='guide-index'&&req.method==='GET')return json(res,JSON.parse(await readFile(new URL('../data/guide-index.json',import.meta.url),'utf8')));
  if(route==='guide'&&req.method==='GET'){
   const page=Number(url.searchParams.get('page'));if(!Number.isInteger(page)||page<1||page>72)throw new AppError('Page not found.',404);
   const bytes=await readFile(new URL(`../data/guide/${page}.jpg`,import.meta.url));res.setHeader('Content-Type','image/jpeg');return res.end(bytes);
  }
  if(route==='upload'&&post){
   // Everyone records their own voice notes; only a parent uploads documents and media.
   if(!String(b.pathname||'').startsWith(`voice/${user.id}/`))parent(user);
   if(localDemo())throw new AppError('Connect private Blob storage to upload documents.',503);
   const result=await handleUpload({body:b,request:req,onBeforeGenerateToken:async pathname=>{
    const voice=pathname.startsWith(`voice/${user.id}/`);
    if(pathname.includes('..')||!(voice||pathname.startsWith(`tickets/${user.id}/`)))throw new AppError('Invalid upload path.');
    if(voice)return {allowedContentTypes:AUDIO_TYPES,maximumSizeInBytes:VOICE_MAX_BYTES,addRandomSuffix:true,tokenPayload:JSON.stringify({grant:user.id})};
    parent(user);
    return {allowedContentTypes:FILE_TYPES,maximumSizeInBytes:100*1024*1024,addRandomSuffix:true,tokenPayload:JSON.stringify({grant:user.id})};
   },onUploadCompleted:async()=>{}});return json(res,result);
  }
  // A voice note anyone in the family can leave, on a day or on one activity.
  if(route==='voice'&&post){
   const current=await readTrip();
   const checked=checkVoiceNote(current.state,b,user);
   const state=addVoiceNote(current.state,checked,user,await head(checked.pathname));
   if(state===current.state)return json(res,visibleEnvelope(current,user));
   return json(res,visibleEnvelope(await writeTrip(state,current.revision),user));
  }
  if(route==='voice'&&req.method==='GET'){
   const {state}=await readTrip();const note=state.voiceNotes?.find(v=>v.id===url.searchParams.get('id')&&v.pathname);if(!note)throw new AppError('Voice note not found.',404);
   const range=req.headers.range;if(range&&!/^bytes=\d*-\d*$/.test(range))throw new AppError('Invalid byte range.',416);
   const result=await get(note.pathname,{access:'private',useCache:false,...(range?{headers:{Range:range}}:{})});if(!result||!result.stream)throw new AppError('Voice note unavailable.',404);
   res.setHeader('Content-Type',note.type);res.setHeader('Content-Disposition','inline');
   for(const h of ['content-length','content-range','accept-ranges']){const value=result.headers.get(h);if(value)res.setHeader(h,value);}
   if(result.headers.has('content-range'))res.statusCode=206;
   const stream=Readable.fromWeb(result.stream);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
  }
  if(route==='document'&&post){
   parent(user);const current=await readTrip();
   if(typeof b.pathname!=='string'||!b.pathname.startsWith(`tickets/${user.id}/`)||b.pathname.includes('..'))throw new AppError('Invalid attachment.');
   if(!b.title||typeof b.title!=='string'||b.title.length>250)throw new AppError('Add a document title.');
   if(b.stepId&&!current.state.steps.some(s=>s.id===b.stepId))throw new AppError('Activity not found.');
   if(b.person&&!['Family',...MEMBERS].includes(b.person))throw new AppError('Choose a family member.');
   const root=ticketParent(b.parentDocumentId,current.state);
   const details=documentDetails(root?{...b,category:root.category}:b),association=documentAssociation(root||b,current.state);
   const blob=await head(b.pathname);
   validateFile(blob.contentType,blob.size,details.category);
   const existing=current.state.documents.find(d=>d.pathname===b.pathname);if(existing)return json(res,visibleEnvelope(current,user));
   current.state.documents.push({id:randomUUID(),title:b.title,...details,...association,...(root?{parentDocumentId:root.id}:{}),size:blob.size,pathname:b.pathname,type:blob.contentType,person:b.person||'Family',createdAt:new Date().toISOString()});
   return json(res,visibleEnvelope(await writeTrip(current.state,current.revision),user));
  }
  if(route==='document'&&req.method==='GET'){
   const {state}=await readTrip();const doc=state.documents.find(d=>d.id===url.searchParams.get('id')&&d.pathname);if(!doc)throw new AppError('Ticket not found.',404);
   const range=req.headers.range;if(range&&!/^bytes=\d*-\d*$/.test(range))throw new AppError('Invalid byte range.',416);
   const result=await get(doc.pathname,{access:'private',useCache:false,...(range?{headers:{Range:range}}:{})});if(!result||!result.stream)throw new AppError('Ticket file unavailable.',404);
   res.setHeader('Content-Type',doc.type);res.setHeader('Content-Disposition','inline');
   for(const h of ['content-length','content-range','accept-ranges']){const value=result.headers.get(h);if(value)res.setHeader(h,value);}
   if(result.headers.has('content-range'))res.statusCode=206;
   const stream=Readable.fromWeb(result.stream);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
  }
  throw new AppError('Not found.',404);
 }catch(e){if(!res.headersSent)json(res,{error:e instanceof AppError?e.message:'The service is unavailable. Your changes have not been saved.'},e.status||500);}
}
