import {readFile} from 'node:fs/promises';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {put,get,head,del} from '@vercel/blob';
import {handleUpload} from '@vercel/blob/client';
import {AppError,applyOperation,MEMBERS} from './model.mjs';
import {database,readTrip,writeTrip,session,localDemo,hash,token,setCookie} from './store.mjs';
const json=(res,data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
async function body(req){if(req.body&&typeof req.body==='object')return req.body;let s='';for await(const c of req){s+=c;if(Buffer.byteLength(s)>1000000)throw new AppError('Request too large.',413);}try{return JSON.parse(s||'{}');}catch{throw new AppError('Invalid request.');}}
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
  const post=req.method==='POST';let b=post?await body(req):{};
  // Blob callbacks carry a signature verified by the SDK. They do not mutate itinerary data.
  if(route==='upload'&&post&&b.type==='blob.upload-completed'){
   const result=await handleUpload({body:b,request:req,onBeforeGenerateToken:async()=>{throw new Error('Not a token request');},onUploadCompleted:async()=>{}});return json(res,result);
  }
  if(post)checkOrigin(req);
  if(route==='config'&&req.method==='GET')return json(res,{configured:!!process.env.DATABASE_URL,demo:localDemo(),uploads:!!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID)});
  if(route==='setup'&&post){
   const secret=process.env.SETUP_SECRET||'';
   if(secret.length<32||typeof b.secret!=='string'||b.secret.length!==secret.length||!timingSafeEqual(Buffer.from(secret),Buffer.from(b.secret)))throw new AppError('Setup key is not valid.',403);
   if(!validName(b.name,'parent'))throw new AppError('Choose Damien or Lauren.');
   const db=await database(),invite=token(),sid=token();
   const [r]=await db`INSERT INTO japan_grants(id,token_hash,name,role) VALUES ('owner',${hash(invite)},${b.name},'parent') ON CONFLICT(id) DO NOTHING RETURNING id`;
   if(!r)throw new AppError('This trip is already set up. Use a family invite link.',409);
   await db`INSERT INTO japan_sessions(token_hash,grant_id) VALUES (${hash(sid)},'owner')`;setCookie(res,sid);return json(res,{ok:true,recoveryLink:`${process.env.APP_ORIGIN}/#join=${invite}`});
  }
  if(route==='join'&&post){
   if(typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))throw new AppError('Invalid family link.',403);
   const db=await database();const [u]=await db`SELECT id FROM japan_grants WHERE token_hash=${hash(b.token)} AND revoked=false AND expires_at>now()`;
   if(!u)throw new AppError('This invite has expired or been revoked.',403);
   const sid=token();await db`INSERT INTO japan_sessions(token_hash,grant_id) VALUES (${hash(sid)},${u.id})`;setCookie(res,sid);return json(res,{ok:true});
  }
  const user=await session(req);
  if(route==='session'&&req.method==='GET')return json(res,{user});
  if(route==='logout'&&post){if(!localDemo()){const c=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('japan_session='))?.slice(14);if(c){const db=await database();await db`DELETE FROM japan_sessions WHERE token_hash=${hash(c)}`;}}setCookie(res,'');return json(res,{ok:true});}
  if(route==='state'&&req.method==='GET')return json(res,{...await readTrip(),user});
  if(route==='mutate'&&post){
   const current=await readTrip();if(b.operation?.operationId&&current.state.appliedOperationIds?.includes(b.operation.operationId))return json(res,{...current,user});if(b.revision!==current.revision)throw new AppError('The family updated the trip. Review your change against the latest plan.',409);
   const state=applyOperation(current.state,b.operation,user);return json(res,{...await writeTrip(state,current.revision),user});
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
   parent(user);if(localDemo())throw new AppError('Connect private Blob storage to upload documents.',503);
   const result=await handleUpload({body:b,request:req,onBeforeGenerateToken:async pathname=>{
    if(!pathname.startsWith(`tickets/${user.id}/`)||pathname.includes('..'))throw new AppError('Invalid upload path.');
    return {allowedContentTypes:['image/jpeg','image/png','image/webp','application/pdf'],maximumSizeInBytes:25*1024*1024,addRandomSuffix:true,tokenPayload:JSON.stringify({grant:user.id})};
   },onUploadCompleted:async()=>{}});return json(res,result);
  }
  if(route==='document'&&post){
   parent(user);const current=await readTrip();
   if(typeof b.pathname!=='string'||!b.pathname.startsWith(`tickets/${user.id}/`)||b.pathname.includes('..'))throw new AppError('Invalid attachment.');
   if(!b.title||typeof b.title!=='string'||b.title.length>250)throw new AppError('Add a document title.');
   if(b.stepId&&!current.state.steps.some(s=>s.id===b.stepId))throw new AppError('Activity not found.');
   if(b.person&&!['Family',...MEMBERS].includes(b.person))throw new AppError('Choose a family member.');
   const blob=await head(b.pathname);
   if(blob.size>25*1024*1024||!['application/pdf','image/jpeg','image/png','image/webp'].includes(blob.contentType))throw new AppError('Use a PDF, JPEG, PNG or WebP up to 25 MB.');
   const existing=current.state.documents.find(d=>d.pathname===b.pathname);if(existing)return json(res,{...current,user});
   current.state.documents.push({id:randomUUID(),title:b.title,pathname:b.pathname,type:blob.contentType,person:b.person||'Family',stepId:b.stepId||null,createdAt:new Date().toISOString()});
   return json(res,{...await writeTrip(current.state,current.revision),user});
  }
  if(route==='document'&&req.method==='GET'){
   const {state}=await readTrip();const doc=state.documents.find(d=>d.id===url.searchParams.get('id')&&d.pathname);if(!doc)throw new AppError('Ticket not found.',404);
   const result=await get(doc.pathname,{access:'private',useCache:false});if(!result||!result.stream)throw new AppError('Ticket file unavailable.',404);
   res.setHeader('Content-Type',doc.type);res.setHeader('Content-Disposition',`inline; filename="ticket${doc.type==='application/pdf'?'.pdf':'.jpg'}"`);return Readable.fromWeb(result.stream).pipe(res);
  }
  throw new AppError('Not found.',404);
 }catch(e){if(!res.headersSent)json(res,{error:e instanceof AppError?e.message:'The service is unavailable. Your changes have not been saved.'},e.status||500);}
}
