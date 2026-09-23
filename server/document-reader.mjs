import {AppError} from './model.mjs';
export const readerReady=()=>!!process.env.ANTHROPIC_API_KEY;
const IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
const PDF='application/pdf';
// About 4.5 MB of base64. The phone shrinks photographs before sending; this cap stops an
// oversized file reaching the model at all.
const MAX_BASE64=4_500_000;
const SCHEMA={
 type:'object',additionalProperties:false,
 required:['readable','kind','title','summary','translation','actions','language'],
 properties:{
  readable:{type:'boolean',description:'False if the file is too blurry, too dark, or has no readable text.'},
  language:{type:'string',description:'The language it is written in, in English. "Japanese", "English", "Mixed".'},
  kind:{type:'string',description:'What sort of document this is, in a few words: hotel letter, train ticket, receipt, form, notice, menu, medical.'},
  title:{type:'string',description:'A short English title for filing it under.'},
  summary:{type:'array',description:'Three to six short lines: what this says and why it matters to this family.',items:{type:'string'}},
  translation:{type:'string',description:'The full text in English, keeping the document’s own order and line breaks. Untranslated where it is already English.'},
  actions:{type:'array',description:'Anything the family has to DO, with any date or time. Empty when there is nothing to do.',items:{
   type:'object',additionalProperties:false,required:['what','when'],
   properties:{what:{type:'string'},when:{type:'string',description:'The date or time as printed, or an empty string.'}}}}}
};
const SYSTEM=`You read a document for an Australian family travelling in Japan and tell them what it says.

The family: Damien and Lauren, with their sons Boston (8) and Nate (5). They read no Japanese.

Rules:
- Translate everything into plain English. Keep the document's own order and its line breaks, so they can match the English against the page in front of them.
- Keep numbers, dates, times, platform and carriage numbers, reference codes and prices exactly as printed. Do not convert currency, and do not reformat a date into another order — copy it as written and say what it means if it is ambiguous.
- The summary is what this means for them, not a description of the layout. Lead with whatever costs money, has a deadline, or has to be shown to someone.
- "actions" is only for things they must actually do: be somewhere, pay something, bring something, reply by a date. Nothing to do means an empty list.
- If part of it is unreadable, translate what you can and say plainly which part you could not read. Never guess at a number you cannot see.
- If the file is not a document at all, or has no readable text, set readable to false.
- You are translating, not advising. Do not give legal, medical or immigration advice; say what the document says and who it tells them to contact.`;
async function ask(content){
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 let response;
 try{
  response=await client.messages.create({
   model:'claude-opus-5',
   max_tokens:16000,
   system:SYSTEM,
   thinking:{type:'adaptive'},
   output_config:{effort:'medium',format:{type:'json_schema',schema:SCHEMA}},
   messages:[{role:'user',content}]
  });
 }catch(e){
  if(e?.status===401)throw new AppError('The Anthropic API key was rejected. Check it in the deployment settings.',502);
  if(e?.status===429)throw new AppError('The reader is busy. Wait a moment and try again.',429);
  if(e?.status===400)throw new AppError('That file could not be read. Try a clearer photo, or one page at a time.',400);
  throw new AppError('The reader could not be reached. Try again when there is better signal.',502);
 }
 if(response.stop_reason==='refusal')throw new AppError('The reader declined to answer for this document.',422);
 const text=response.content.filter(b=>b.type==='text').map(b=>b.text).join('');
 let parsed;try{parsed=JSON.parse(text);}catch{throw new AppError('The reader replied in a form the app could not use. Try again.',502);}
 return {...parsed,usage:{input:response.usage?.input_tokens??0,output:response.usage?.output_tokens??0}};
}
export async function readDocument({file,mediaType,note}){
 if(!readerReady())throw new AppError('Document reading is not switched on. Add an Anthropic API key to the deployment.',503);
 if(typeof file!=='string'||!file)throw new AppError('Choose a photo or a PDF.');
 const data=file.includes(',')&&file.startsWith('data:')?file.slice(file.indexOf(',')+1):file;
 if(!/^[A-Za-z0-9+/=]+$/.test(data))throw new AppError('That file could not be read.');
 if(data.length>MAX_BASE64)throw new AppError('That file is too large. A photo of each page works better than a long PDF.',413);
 if(![...IMAGE_TYPES,PDF].includes(mediaType))throw new AppError('Use a JPEG, PNG or WebP photo, or a PDF.');
 if(note!==undefined&&(typeof note!=='string'||note.length>500))throw new AppError('Keep the note short.');
 const source=mediaType===PDF
  ?{type:'document',source:{type:'base64',media_type:PDF,data}}
  :{type:'image',source:{type:'base64',media_type:mediaType,data}};
 return ask([source,{type:'text',text:note?.trim()
  ?`Read this and tell them what it says. They also asked: ${note.trim()}`
  :'Read this and tell them what it says.'}]);
}
// The same reading, for an email the family forwarded in rather than a photograph of a page.
// Most confirmations from Japan are a body of text with no attachment at all, so this path is
// the one that does the work most of the time.
export async function readEmailText({subject='',from='',text=''}){
 if(!readerReady())throw new AppError('Reading email is not switched on. Add an Anthropic API key to the deployment.',503);
 const body=String(text||'').trim();
 if(!body)throw new AppError('There is nothing written in this email to read.',422);
 const preamble=[`From: ${String(from||'').slice(0,250)}`,`Subject: ${String(subject||'').slice(0,250)}`].join('\n');
 return ask([{type:'text',text:`This is an email the family forwarded in. Read it and tell them what it says.\n\n${preamble}\n\n${body.slice(0,20000)}`}]);
}
// A ticket's own photo or PDF, read into English where it is kept. The confirmation that came
// as a screenshot of Japanese is the one the family most needs to read, and the reading is saved
// onto the file, so it is paid for once and still there at a gate with no signal. The file is
// loaded here by its own stored path; nothing the browser sends is read in its place.
export const FILE_TYPES_READ=[...IMAGE_TYPES,PDF];
// About 4.4 MB once in base64, just under what the reader will take.
export const MAX_FILE_BYTES=3_300_000;
export const MAX_FILE_TRANSLATION=8000;
export async function translateStoredFile(doc,load){
 if(!doc?.pathname)throw new AppError('This ticket has no photo or PDF to translate.',422);
 if(!FILE_TYPES_READ.includes(doc.type))throw new AppError('Only a photo or a PDF can be translated.',422);
 if(Number(doc.size||0)>MAX_FILE_BYTES)throw new AppError('That file is too large to translate. A photo of the page that matters works better.',413);
 const bytes=await load(doc.pathname);
 const reading=await readDocument({file:Buffer.from(bytes).toString('base64'),mediaType:doc.type});
 if(!reading.readable||!reading.translation)throw new AppError('Nothing on this file could be read. Try a clearer photo of the page.',422);
 return {language:String(reading.language||''),kind:String(reading.kind||''),title:String(reading.title||''),
  summary:(reading.summary||[]).slice(0,6).map(String),
  actions:(reading.actions||[]).slice(0,10).map(a=>({what:String(a?.what||''),when:String(a?.when||'')})).filter(a=>a.what),
  translation:String(reading.translation).slice(0,MAX_FILE_TRANSLATION),
  usage:reading.usage};
}
