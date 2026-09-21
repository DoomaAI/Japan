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
   messages:[{role:'user',content:[source,{type:'text',text:note?.trim()
    ?`Read this and tell them what it says. They also asked: ${note.trim()}`
    :'Read this and tell them what it says.'}]}]
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
