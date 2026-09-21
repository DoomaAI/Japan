import {randomUUID,timingSafeEqual} from 'node:crypto';
import {put,get} from '@vercel/blob';
import {AppError} from './model.mjs';
import {validateFile} from './files.mjs';
import {readDocument,readEmailText,readerReady} from './document-reader.mjs';
// Forwarding a booking confirmation into the trip is a door into the family's private data, so
// it is bolted shut three times over: a secret only Postmark knows, a list of addresses we
// forward from, and a human being who files whatever arrives. Nothing an email says can reach
// the itinerary on its own.
export const emailInboxReady=()=>!!(process.env.EMAIL_INBOX_SECRET&&allowedSenders().length);
export const allowedSenders=()=>String(process.env.EMAIL_INBOX_SENDERS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
// Email bodies and translations live in the trip state, so they are kept to a readable length
// rather than a whole newsletter, and the inbox is a queue to work through, not an archive.
export const MAX_BODY=8000;
export const MAX_ATTACHMENTS=10;
export const MAX_INBOX=40;
const sameSecret=(a,b)=>{
 const x=Buffer.from(String(a||''),'utf8'),y=Buffer.from(String(b||''),'utf8');
 return x.length>0&&x.length===y.length&&timingSafeEqual(x,y);
};
// A wrong secret is answered with the same 404 as a wrong path: a caller who is guessing learns
// nothing about whether the route exists.
export function authoriseInbound(req,route){
 const secret=process.env.EMAIL_INBOX_SECRET;
 if(!secret)throw new AppError('Not found.',404);
 let path='';
 // A malformed escape in the URL is just a wrong secret, not a crash.
 if(route.startsWith('email-in/')){const raw=route.slice('email-in/'.length);try{path=decodeURIComponent(raw);}catch{path=raw;}}
 const auth=String(req.headers.authorization||'');
 const basic=auth.startsWith('Basic ')?Buffer.from(auth.slice(6),'base64').toString('utf8').split(':').slice(1).join(':'):'';
 if(!sameSecret(path,secret)&&!sameSecret(basic,secret))throw new AppError('Not found.',404);
}
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:'\'',nbsp:' ',yen:'¥',middot:'·',mdash:'—',ndash:'–'};
// Most Japanese hotel and restaurant confirmations are an HTML body with no attachment at all,
// and the characters arrive as numeric entities. Decoding them is the difference between a
// readable email and a page of &#12469;.
export function htmlToText(html){
 return String(html||'')
  .replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi,' ')
  .replace(/<\s*br\s*\/?>/gi,'\n')
  .replace(/<\s*\/(p|div|tr|li|h[1-6]|table|blockquote)\s*>/gi,'\n')
  .replace(/<[^>]*>/g,' ')
  .replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]+);/gi,(whole,name)=>{
   if(name[0]==='#'){
    const code=name[1]==='x'||name[1]==='X'?parseInt(name.slice(2),16):parseInt(name.slice(1),10);
    return Number.isInteger(code)&&code>0&&code<=0x10ffff?String.fromCodePoint(code):whole;
   }
   return ENTITIES[name.toLowerCase()]??whole;
  })
  .replace(/[ \t\u00a0]+/g,' ')
  .replace(/ ?\n ?/g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim();
}
const headerValue=(body,name)=>String((body?.Headers||[]).find(h=>String(h?.Name||'').toLowerCase()===name.toLowerCase())?.Value||'');
const safeName=n=>String(n||'attachment').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)||'attachment';
// Postmark's inbound shape, read defensively: anything missing simply becomes empty rather than
// throwing, because a malformed webhook must not take the route down.
export function parseInbound(body){
 if(!body||typeof body!=='object')return null;
 const from=String(body.FromFull?.Email||body.From||'').trim().toLowerCase().replace(/^.*<|>.*$/g,'');
 const subject=String(body.Subject||'').trim().slice(0,250);
 const plain=String(body.TextBody||'').trim();
 const text=(plain||htmlToText(body.HtmlBody)).slice(0,MAX_BODY);
 const received=Date.parse(body.Date||'');
 const spam=/^yes/i.test(headerValue(body,'X-Spam-Status'));
 const attachments=(Array.isArray(body.Attachments)?body.Attachments:[]).slice(0,MAX_ATTACHMENTS)
  .map(a=>({filename:safeName(a?.Name),type:String(a?.ContentType||'').split(';')[0].trim(),content:String(a?.Content||'')}))
  .filter(a=>a.content);
 if(!from||!/^[^@\s]+@[^@\s]+$/.test(from))return null;
 return {from,subject,text,spam,attachments,
  receivedAt:Number.isFinite(received)?new Date(received).toISOString():new Date().toISOString()};
}
export const senderAllowed=from=>allowedSenders().includes(String(from||'').toLowerCase());
const uploadsReady=()=>!!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID);
// An attachment that cannot be stored is still worth recording: the parent sees the email and
// knows a file came with it, rather than the whole message being dropped silently.
async function storeAttachment(itemId,index,attachment){
 const bytes=Buffer.from(attachment.content,'base64');
 const file={id:randomUUID(),filename:attachment.filename,type:attachment.type,size:bytes.length,pathname:null,skipped:null};
 try{validateFile(attachment.type,bytes.length,'ticket');}
 catch{return {...file,skipped:'This kind of file, or its size, is not accepted.'};}
 if(!uploadsReady())return {...file,skipped:'Private file storage is not connected.'};
 const {pathname}=await put(`inbox/${itemId}/${index}-${attachment.filename}`,bytes,
  {access:'private',contentType:attachment.type,addRandomSuffix:true});
 return {...file,pathname};
}
// Receiving is deliberately quick and dumb: store it, answer the webhook, translate later when
// somebody opens it. A mail provider gives a webhook seconds, and a careful translation takes
// longer than that.
export async function receiveEmail(body){
 const mail=parseInbound(body);
 if(!mail)return {ok:true,filed:false,reason:'unreadable'};
 if(!senderAllowed(mail.from))return {ok:true,filed:false,reason:'sender'};
 if(mail.spam)return {ok:true,filed:false,reason:'spam'};
 if(!mail.text&&!mail.attachments.length)return {ok:true,filed:false,reason:'empty'};
 const id=randomUUID(),attachments=[];
 for(const [index,attachment] of mail.attachments.entries())attachments.push(await storeAttachment(id,index,attachment));
 return {ok:true,filed:true,item:{id,from:mail.from,subject:mail.subject,text:mail.text,
  receivedAt:mail.receivedAt,at:new Date().toISOString(),attachments,reading:null,readError:null}};
}
export const addToInbox=(state,item)=>{
 const inbox=[item,...(state.inbox||[])].slice(0,MAX_INBOX);
 return {...state,inbox};
};
export const inboxFiles=(state,id)=>((state.inbox||[]).find(i=>i.id===id)?.attachments||[]).map(f=>f.pathname).filter(Boolean);
// About 4.5 MB of base64 is the reader's ceiling; a larger attachment is left for the parent to
// open themselves rather than sent to the model and refused there.
const READABLE=['image/jpeg','image/png','image/webp','application/pdf'];
const MAX_READ_BYTES=3_300_000;
export const readableAttachment=item=>(item?.attachments||[]).find(f=>f.pathname&&READABLE.includes(f.type)&&f.size<=MAX_READ_BYTES)||null;
// What the email actually says, in English. The body is read where there is one; where the real
// content is the PDF the hotel attached, that is read instead.
export async function readInboxItem(item){
 if(!readerReady())throw new AppError('Reading email is not switched on. Add an Anthropic API key to the deployment.',503);
 const text=String(item?.text||'').trim();
 if(text.length>=40||!readableAttachment(item))return readEmailText({subject:item.subject,from:item.from,text});
 const file=readableAttachment(item);
 const result=await get(file.pathname,{access:'private',useCache:false});
 if(!result||!result.stream)throw new AppError('That attachment could not be opened.',404);
 const data=Buffer.from(await new Response(result.stream).arrayBuffer()).toString('base64');
 return readDocument({file:data,mediaType:file.type});
}
