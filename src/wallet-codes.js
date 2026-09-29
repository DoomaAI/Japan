// The codes on our tickets, read once and drawn fresh. A gate scanner reads the text inside a QR
// code, not the picture of it, so a code read out of a screenshot or a PDF and redrawn full size,
// black on white, scans the same as the original and better than a dim, cropped photo of it.
// What is stored is only that text, on the file's own record: `code` is the text, a list of them
// when one file carries several (a PDF with a ticket a page, four tickets on one page), null once
// a file has been looked at and has none, and missing while it has not been looked at yet.
//
// A code found is not added by itself: it waits on the file as `codeFound` until a parent says
// whether it belongs in the Wallet. A confirmation letter can carry a QR code that is only a link
// to a website, and a menu or a poster photographed for the diary can carry one too.
//
// Some codes cannot be copied: the ones that change every few seconds, or only show once you are
// signed in to the operator's app. A parent marks those, with the app they live in, and the gate
// view says to show it there rather than drawing a copy that would be turned away.
import {isArchived,isDrawable,attachmentsOf} from './trip-features.js';
export const CODE_MAX=3000,CODES_MAX=40,APP_MAX=60;
export const PDF='application/pdf';
const live=doc=>!!doc?.codeLive;
const listOf=code=>Array.isArray(code)?code:typeof code==='string'&&code?[code]:[];
// The files a code can be read from: a picture the phone can draw, or a PDF.
export const readable=doc=>!!doc?.pathname&&(isDrawable(doc)||doc.type===PDF);
// A ticket's codes in the order its files are in: its own first, then each attached page. Each
// carries whose it is, so four park tickets swipe through as Damien, Lauren, Boston and Nate; a
// file with several codes numbers them instead, as nothing says whose each one is.
export function codesFor(state,doc){
 if(!doc||live(doc))return [];
 return [doc,...attachmentsOf(state,doc)].flatMap(d=>{
  const list=listOf(d.code),who=d.person||doc.person;
  return list.map((text,i)=>{
   const key=codeKey(d.id,i),owner=doc.codeOwners?.[key];
   return {id:d.id,key,text,owner:owner||null,who:owner||who,person:owner||(list.length>1?`${who} · ${i+1} of ${list.length}`:who),title:d.id===doc.id?doc.title:d.title,sent:(doc.codeSends||[]).filter(s=>s.key===key)};
  });
 });
}
// The files still to be looked at: readable, not yet read, on a ticket still in use.
export function toRead(state){
 const docs=state?.documents||[],byId=new Map(docs.map(d=>[d.id,d]));
 return docs.filter(d=>{
  if(!readable(d)||d.code!==undefined||d.codeFound!==undefined||d.category==='memory')return false;
  const owner=d.parentDocumentId?byId.get(d.parentDocumentId):d;
  return !!owner&&!isArchived(owner)&&!live(owner)&&owner.category!=='memory';
 });
}
// The tickets with codes found and not yet answered, each with every code found on it and its
// attached pages, so one question covers a whole booking.
export function pendingCodes(state){
 const docs=state?.documents||[];
 return docs.filter(d=>!d.parentDocumentId&&!isArchived(d)&&!live(d)).map(doc=>{
  const files=[doc,...attachmentsOf(state,doc)].filter(f=>listOf(f.codeFound).length);
  return files.length?{doc,files,codes:files.flatMap(f=>listOf(f.codeFound))}:null;
 }).filter(Boolean);
}
// A code that is a web address is usually a link printed on a letter, not what a gate scans.
export const isLink=text=>/^https?:\/\//i.test(text);
export const preview=text=>text.startsWith('b64:')?'A code in its own characters':text.length>48?text.slice(0,45)+'…':text;
const clean=list=>{
 if(list===undefined||list===null)return {value:list};
 if(Array.isArray(list)){
  if(list.length>CODES_MAX)return {error:'That is more codes than one file can hold.'};
  list=list.length===0?null:list.length===1?list[0]:list;
 }
 const bad=c=>typeof c!=='string'||!c||c.length>CODE_MAX;
 if(list!==null&&(Array.isArray(list)?list.some(bad):bad(list)))return {error:'That code is not one the app can keep.'};
 return {value:list};
};
// What the server accepts, checked the same way on the phone: for `code` (in the Wallet) and
// `found` (waiting to be asked about), one code, a list of them, or null. A list of one is kept
// as the code itself, and an empty list as none.
export function cleanCode(op){
 const code=clean(op.code),found=clean(op.found);
 if(code.error)return code;if(found.error)return found;
 if(op.live!==undefined&&typeof op.live!=='boolean')return {error:'Invalid choice.'};
 const app=String(op.app??'').trim();
 if(app.length>APP_MAX)return {error:'Keep the app’s name short.'};
 return {value:{code:code.value,found:found.value,live:op.live,app}};
}
// A parent's answer for a whole booking: its codes go into the Wallet, or they are let go and the
// files are never read or asked about again. Changes the documents in place; says how many moved.
export function answerCodes(state,id,add,now){
 const doc=(state.documents||[]).find(d=>d.id===id&&!d.parentDocumentId);
 if(!doc)return null;
 let moved=0;
 for(const f of [doc,...attachmentsOf(state,doc)]){
  if(f.codeFound===undefined)continue;
  f.code=add?f.codeFound:null;f.codeAt=now;moved+=add?listOf(f.codeFound).length:0;delete f.codeFound;
 }
 return moved;
}
// Each code has a key of its own, the file it was read from and its place in that file, so a
// name or a send is kept against exactly one code even when a PDF carries four.
export const codeKey=(fileId,i)=>`${fileId}:${i}`;
// The code a person's phone opens on: their own, when a parent has said whose each one is.
export const startAt=(codes,name)=>Math.max(0,codes.findIndex(c=>c.owner===name));
// Whose a code is, a parent's to say: a member of the family, or nobody in particular.
export function setOwner(state,doc,key,person){
 if(person&&!(state.members||[]).includes(person))return {error:'Choose one of the family.'};
 if(!codesFor(state,{...doc,codeLive:false}).some(c=>c.key===key))return {error:'That code is not on this ticket.'};
 const owners={...(doc.codeOwners||{})};if(person)owners[key]=person;else delete owners[key];
 return {value:owners};
}
// A code sent out of the app is a ticket handed over: whoever holds it can use it, and the first
// scan usually wins. So each send is kept on the ticket — which code, who sent it and when — for
// everyone to see before anybody tries the same code at a gate.
export const SENDS_MAX=50;
export function recordSend(state,doc,key,by,at){
 if(!codesFor(state,{...doc,codeLive:false}).some(c=>c.key===key))return {error:'That code is not on this ticket.'};
 return {value:[...(doc.codeSends||[]),{key,by,at}].slice(-SENDS_MAX)};
}
