import {FILE_TYPES,AUDIO_TYPES,VOICE_MAX_BYTES,validateFile} from './files.mjs';
import {checkVoiceNote,addVoiceNote} from './voice.mjs';
import {checkPhraseClip,addPhraseClip,removePhraseClip} from './phrase-audio.mjs';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Readable} from 'node:stream';
import {get,head,del} from '@vercel/blob';
import {handleUpload} from '@vercel/blob/client';
import {AppError,applyOperation,MEMBERS,documentDetails,documentAssociation,ticketParent} from './model.mjs';
import {database,readTrip,writeTrip,updateTrip,session,localDemo,hash,token,setCookie} from './store.mjs';
import {visibleEnvelope} from './visibility.mjs';
import {readMenu,menuReaderReady} from './menu.mjs';
import {translatePhrase,translatorReady,translateTicketText,TICKET_FIELDS,TICKET_DIRECTIONS,ticketTranslationKey} from './translate.mjs';
import {researchPlace,researchReady} from './research.mjs';
import {suggestIdeas,suggestReady} from './suggest.mjs';
import {nearbyPlaces,nearbyReady} from './nearby.mjs';
import {fetchSumoDay,fetchWrestler,sumoReady} from './sumo.mjs';
import {readDocument,readerReady} from './document-reader.mjs';
import {coachPhoto,coachReady} from './photo-coach.mjs';
import {authoriseInbound,receiveEmail,addToInbox,inboxFiles,readInboxItem,emailInboxReady} from './email.mjs';
const json=(res,data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};
async function body(req,max=1000000){if(req.body&&typeof req.body==='object')return req.body;let s='';for await(const c of req){s+=c;if(Buffer.byteLength(s)>max)throw new AppError('Request too large.',413);}try{return JSON.parse(s||'{}');}catch{throw new AppError('Invalid request.');}}
const parent=u=>{if(u.role!=='parent')throw new AppError('A parent can do this.',403);};
// A drawing each is fine; a hundred each is somebody holding the shutter down.
const DRAWING_LIMIT=60;
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
  const post=req.method==='POST',base=route.split('/')[0];
  // A forwarded email carries its attachments inline. Vercel stops a request body at about
  // 4.5 MB, so this is the real ceiling on what can arrive by email at all.
  let b=post?await body(req,['menu','read-document','photo-feedback'].includes(base)?6000000:base==='email-in'?4400000:1000000):{};
  // Blob callbacks carry a signature verified by the SDK. They do not mutate itinerary data.
  if(route==='upload'&&post&&b.type==='blob.upload-completed'){
   const result=await handleUpload({body:b,request:req,onBeforeGenerateToken:async()=>{throw new Error('Not a token request');},onUploadCompleted:async()=>{}});return json(res,result);
  }
  // The one route with no session and no browser origin behind it: a mail provider posting an
  // email the family forwarded in. It is answered with 200 even when the message is dropped, so
  // a rejected sender is not retried for hours, and nothing it says reaches the itinerary — it
  // waits in the inbox for a parent to read and file.
  if(base==='email-in'&&post){
   authoriseInbound(req,route);
   const received=await receiveEmail(b);
   if(!received.filed)return json(res,{ok:true,filed:false,reason:received.reason});
   await updateTrip(state=>addToInbox(state,received.item));
   return json(res,{ok:true,filed:true,id:received.item.id});
  }
  if(post)checkOrigin(req);
  if(route==='config'&&req.method==='GET')return json(res,{configured:!!process.env.DATABASE_URL,demo:localDemo(),uploads:!!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID),menuReader:menuReaderReady(),translator:translatorReady(),documentReader:readerReady(),photoCoach:coachReady(),research:researchReady(),suggest:suggestReady(),nearby:nearbyReady(),sumo:sumoReady(),emailInbox:emailInboxReady()});
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
   const state=applyOperation(current.state,b.operation,user);
   const saved=await writeTrip(state,current.revision);
   // A discarded email leaves no attachments behind in private storage. The files are gone
   // from the trip either way, so a failed delete is not worth failing the change over.
   if(b.operation?.type==='inboxDiscard')for(const pathname of inboxFiles(current.state,b.operation.id))await del(pathname).catch(()=>{});
   return json(res,visibleEnvelope(saved,user));
  }
  // Reading a forwarded email into English. It is done when a parent opens the inbox rather
  // than when the email lands, because a mail provider will not wait for a careful translation
  // and an email nobody opens is not worth paying to translate.
  if(route==='inbox-read'&&post){
   parent(user);
   const {state}=await readTrip();
   const item=(state.inbox||[]).find(i=>i.id===b.id);
   if(!item)throw new AppError('That email is no longer in the inbox.',404);
   if(item.reading)return json(res,visibleEnvelope(await readTrip(),user));
   let reading=null,readError=null;
   try{reading=await readInboxItem(item);}
   catch(e){if(!(e instanceof AppError))throw e;readError=e.message;}
   return json(res,visibleEnvelope(await updateTrip(next=>{
    const found=(next.inbox||[]).find(i=>i.id===b.id);
    if(!found||found.reading)return null;
    found.reading=reading;found.readError=readError;found.readAt=new Date().toISOString();
    return next;
   }),user));
  }
  // An attachment still in the inbox, before it has been filed as a ticket. Only a parent sees
  // one, and only by the id of a file that is actually waiting there.
  if(route==='inbox-file'&&req.method==='GET'){
   parent(user);
   const {state}=await readTrip();
   const file=(state.inbox||[]).flatMap(i=>i.attachments||[]).find(f=>f.id===url.searchParams.get('id')&&f.pathname);
   if(!file)throw new AppError('That attachment is not in the inbox.',404);
   const result=await get(file.pathname,{access:'private',useCache:false});
   if(!result||!result.stream)throw new AppError('That attachment could not be opened.',404);
   res.setHeader('Content-Type',file.type);res.setHeader('Content-Disposition','inline');
   const length=result.headers.get('content-length');if(length)res.setHeader('content-length',length);
   const stream=Readable.fromWeb(result.stream);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
  }
  if(route==='menu'&&post){
   parent(user);const {state}=await readTrip();
   return json(res,await readMenu(b,state));
  }
  if(route==='translate'&&post){
   parent(user);
   return json(res,await translatePhrase(b));
  }
  // The same translator, pointed at what a booking already says rather than at a phrase typed
  // into the phrasebook. Only what is written on the ticket is sent — the field is chosen by
  // name and the text is read here, so nothing else travels with it. The answer is written
  // onto the ticket rather than handed back to the screen alone, because the moment it is
  // needed is at a counter with no signal.
  if(route==='ticket-translate'&&post){
   parent(user);
   const field=String(b.field||'notes'),direction=String(b.direction||'en');
   if(!TICKET_FIELDS.includes(field))throw new AppError('Translate the booking’s name, its reference or its notes.');
   if(!TICKET_DIRECTIONS.includes(direction))throw new AppError('Choose English or Japanese.');
   const key=ticketTranslationKey(field,direction);
   if(b.remove===true)return json(res,visibleEnvelope(await updateTrip(next=>{
    const found=next.documents.find(d=>d.id===b.id);
    if(!found?.translations?.[key])return null;
    delete found.translations[key];
    return next;
   }),user));
   const {state}=await readTrip();
   const doc=state.documents.find(d=>d.id===b.id);
   if(!doc||doc.category==='memory')throw new AppError('That booking is no longer in the trip.',404);
   const {usage,...translation}=await translateTicketText({text:doc[field]||'',direction,field,title:doc.title});
   return json(res,visibleEnvelope(await updateTrip(next=>{
    const found=next.documents.find(d=>d.id===b.id);
    if(!found)throw new AppError('That booking is no longer in the trip.',404);
    found.translations={...(found.translations||{}),[key]:{...translation,by:user.name,at:new Date().toISOString()}};
    return next;
   }),user));
  }
  // Looking a place up reads nothing private and writes nothing: it hands back a draft for a
  // parent to check and save themselves, through the ordinary revision-checked mutate.
  if(route==='research'&&post){
   parent(user);const {state}=await readTrip();
   return json(res,await researchPlace(b,state));
  }
  // Suggestions read the travel party and the plan and hand back ideas. Nothing is added to the
  // board here: each one is put up, and voted on, by a person.
  if(route==='suggest'&&post){
   parent(user);const {state}=await readTrip();
   return json(res,await suggestIdeas(b,state));
  }
  // What is near enough to walk to, right now. This one is not a parent's: the person who needs
  // a toilet or a plain bowl of rice is whoever is holding the phone. The position is rounded
  // before it leaves the browser and again here, and is never written into the trip.
  // The day's sumo card, and the man whose name is on it. Read once by a parent and kept in
  // the trip, because the arena is a basement and the list has to still be there without signal.
  if(route==='sumo-card'&&post){
   parent(user);const {state}=await readTrip();
   return json(res,await fetchSumoDay(b,state));
  }
  if(route==='sumo-wrestler'&&post){
   parent(user);
   return json(res,await fetchWrestler(b));
  }
  if(route==='nearby'&&post){
   const {state}=await readTrip();
   return json(res,await nearbyPlaces(b,state));
  }
  if(route==='read-document'&&post){
   parent(user);
   return json(res,await readDocument(b));
  }
  // Feedback on a photograph. The boys ask for this themselves, so it is not parent-only.
  if(route==='photo-feedback'&&post)return json(res,await coachPhoto(b));
  // Recording the photo itself, once it is in storage.
  if(route==='photo'&&post){
   const current=await readTrip();
   if(typeof b.pathname!=='string'||!b.pathname.startsWith(`photos/${user.id}/`)||b.pathname.includes('..'))throw new AppError('Invalid photo.');
   if(!b.day||!current.state.days.some(d=>d.date===b.day))throw new AppError('Choose a trip day.');
   if(b.title!==undefined&&(typeof b.title!=='string'||b.title.length>200))throw new AppError('Keep the title short.');
   // Whose photo it is, which is not always who put it on. A parent takes a picture on their
   // own phone of something a boy did and hands it to him; the boys can only speak for
   // themselves. The cap of twelve a day is per owner, because it is their allowance.
   const owner=b.for==null||b.for===''?user.name:String(b.for);
   if(!current.state.members.includes(owner))throw new AppError('Choose who the photo belongs to.');
   if(user.role!=='parent'&&owner!==user.name)throw new AppError('That is not your photo to add.',403);
   if(current.state.photos.filter(p=>(p.for||p.by)===owner&&p.day===b.day).length>=12)throw new AppError('That is twelve photos for one day already. Remove one first.');
   const blob=await head(b.pathname);
   validateFile(blob.contentType,blob.size,'memory');
   if(current.state.photos.some(p=>p.pathname===b.pathname))return json(res,visibleEnvelope(current,user));
   const feedback=b.feedback&&typeof b.feedback==='object'?{
    title:String(b.feedback.title||'').slice(0,200),
    subject:String(b.feedback.subject||'').slice(0,200),
    good:(Array.isArray(b.feedback.good)?b.feedback.good:[]).slice(0,3).map(g=>String(g).slice(0,300)),
    tip:String(b.feedback.tip||'').slice(0,400),
    score:Number.isInteger(b.feedback.score)?Math.max(1,Math.min(10,b.feedback.score)):null
   }:null;
   current.state.photos=[...current.state.photos,{id:randomUUID(),by:user.name,for:owner,day:b.day,
    title:(b.title||'').trim(),pathname:b.pathname,type:blob.contentType,size:blob.size,feedback,at:new Date().toISOString()}];
   return json(res,visibleEnvelope(await writeTrip(current.state,current.revision),user));
  }
  if(route==='photo'&&req.method==='GET'){
   const {state}=await readTrip();const shot=state.photos?.find(p=>p.id===url.searchParams.get('id')&&p.pathname);
   if(!shot)throw new AppError('Photo not found.',404);
   const result=await get(shot.pathname,{access:'private',useCache:false});
   if(!result||!result.stream)throw new AppError('Photo unavailable.',404);
   res.setHeader('Content-Type',shot.type);res.setHeader('Content-Disposition','inline');
   const length=result.headers.get('content-length');if(length)res.setHeader('content-length',length);
   const stream=Readable.fromWeb(result.stream);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
  }
  // A drawing the boys made, kept on their own phone first and sent here second. It is not a
  // photograph and does not belong in the photo of the day: nobody wants a drawing competing
  // with a picture of a bullet train for the family's votes.
  if(route==='drawing'&&post){
   const current=await readTrip();
   if(typeof b.pathname!=='string'||!b.pathname.startsWith(`art/${user.id}/`)||b.pathname.includes('..'))throw new AppError('Invalid drawing.');
   if(b.day!=null&&b.day!==''&&!current.state.days.some(d=>d.date===b.day))throw new AppError('Choose a trip day.');
   if(typeof b.title!=='string'||!b.title.trim()||b.title.length>120)throw new AppError('Give the drawing a name.');
   if(b.subject!==undefined&&(typeof b.subject!=='string'||b.subject.length>60))throw new AppError('Unknown drawing.');
   // Whose drawing it is, which is not always who sent it: a parent photographs what a boy
   // drew on their own phone and hands it over, the same as a photograph.
   const owner=b.for==null||b.for===''?user.name:String(b.for);
   if(!current.state.members.includes(owner))throw new AppError('Choose who the drawing belongs to.');
   if(user.role!=='parent'&&owner!==user.name)throw new AppError('That is not your drawing to add.',403);
   if(current.state.drawings.filter(d=>(d.for||d.by)===owner).length>=DRAWING_LIMIT)throw new AppError(`That is ${DRAWING_LIMIT} drawings already. Delete one first.`);
   const blob=await head(b.pathname);
   validateFile(blob.contentType,blob.size,'memory');
   if(current.state.drawings.some(d=>d.pathname===b.pathname))return json(res,visibleEnvelope(current,user));
   current.state.drawings=[...current.state.drawings,{id:randomUUID(),by:user.name,for:owner,day:b.day||null,
    title:b.title.trim(),subject:String(b.subject||''),paper:b.paper===true,pathname:b.pathname,
    type:blob.contentType,size:blob.size,at:new Date().toISOString()}];
   return json(res,visibleEnvelope(await writeTrip(current.state,current.revision),user));
  }
  if(route==='drawing'&&req.method==='GET'){
   const {state}=await readTrip();const art=state.drawings?.find(d=>d.id===url.searchParams.get('id')&&d.pathname);
   if(!art)throw new AppError('Drawing not found.',404);
   const result=await get(art.pathname,{access:'private',useCache:false});
   if(!result||!result.stream)throw new AppError('Drawing unavailable.',404);
   res.setHeader('Content-Type',art.type);res.setHeader('Content-Disposition','inline');
   const length=result.headers.get('content-length');if(length)res.setHeader('content-length',length);
   const stream=Readable.fromWeb(result.stream);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
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
   const own=p=>['voice','photos','art'].some(kind=>String(p||'').startsWith(`${kind}/${user.id}/`));
   if(!own(b.pathname))parent(user);
   if(localDemo())throw new AppError('Connect private Blob storage to upload documents.',503);
   const result=await handleUpload({body:b,request:req,onBeforeGenerateToken:async pathname=>{
    const voice=pathname.startsWith(`voice/${user.id}/`),photo=pathname.startsWith(`photos/${user.id}/`)||pathname.startsWith(`art/${user.id}/`);
    // A recorded phrase is the family's reference pronunciation, so a parent makes it.
    const said=pathname.startsWith(`phrases/${user.id}/`);
    if(pathname.includes('..')||!(voice||photo||said||pathname.startsWith(`tickets/${user.id}/`)))throw new AppError('Invalid upload path.');
    if(said){parent(user);return {allowedContentTypes:AUDIO_TYPES,maximumSizeInBytes:VOICE_MAX_BYTES,addRandomSuffix:true,tokenPayload:JSON.stringify({grant:user.id})};}
    if(photo)return {allowedContentTypes:['image/jpeg','image/png','image/webp'],maximumSizeInBytes:25*1024*1024,addRandomSuffix:true,tokenPayload:JSON.stringify({grant:user.id})};
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
  // A phrase said aloud once and kept, because an iPhone's ring switch silences the phone's
  // own voice but not a recording.
  if(route==='phrase-audio'&&post){
   parent(user);
   const current=await readTrip();
   if(b.remove)return json(res,visibleEnvelope(await writeTrip(removePhraseClip(current.state,String(b.phraseId||'')),current.revision),user));
   const checked=checkPhraseClip(b,user);
   const state=addPhraseClip(current.state,checked,user,await head(checked.pathname));
   if(state===current.state)return json(res,visibleEnvelope(current,user));
   return json(res,visibleEnvelope(await writeTrip(state,current.revision),user));
  }
  if(route==='phrase-audio'&&req.method==='GET'){
   const {state}=await readTrip();
   const clip=state.phraseAudio?.[url.searchParams.get('phrase')];
   if(!clip?.pathname)throw new AppError('No recording for that phrase.',404);
   const result=await get(clip.pathname,{access:'private',useCache:false});
   if(!result||!result.stream)throw new AppError('Recording unavailable.',404);
   res.setHeader('Content-Type',clip.type);res.setHeader('Content-Disposition','inline');
   const length=result.headers.get('content-length');if(length)res.setHeader('content-length',length);
   const stream=Readable.fromWeb(result.stream);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());return stream.pipe(res);
  }
  if(route==='document'&&post){
   parent(user);const current=await readTrip();
   if(typeof b.pathname!=='string'||!b.pathname.startsWith(`tickets/${user.id}/`)||b.pathname.includes('..'))throw new AppError('Invalid attachment.');
   if(!b.title||typeof b.title!=='string'||b.title.length>250)throw new AppError('Add a document title.');
   for(const id of (Array.isArray(b.stepIds)?b.stepIds:[b.stepId]).filter(Boolean))if(!current.state.steps.some(s=>s.id===id))throw new AppError('Activity not found.');
   if(b.person&&!['Family',...MEMBERS].includes(b.person))throw new AppError('Choose a family member.');
   const root=ticketParent(b.parentDocumentId,current.state);
   const details=documentDetails(root?{...b,category:root.category}:b),association=documentAssociation(root||b,current.state);
   const blob=await head(b.pathname);
   validateFile(blob.contentType,blob.size,details.category);
   const existing=current.state.documents.find(d=>d.pathname===b.pathname);if(existing)return json(res,visibleEnvelope(current,user));
   // A file added to a ticket already marked used is archived with it, rather than reappearing
   // on the list and in the offline download on its own.
   current.state.documents.push({id:randomUUID(),title:b.title,...details,...association,...(root?{parentDocumentId:root.id,archivedAt:root.archivedAt??null,archivedBy:root.archivedBy??null}:{}),size:blob.size,pathname:b.pathname,type:blob.contentType,person:b.person||'Family',createdAt:new Date().toISOString()});
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
