// The codes on our tickets, read once and drawn fresh. A gate scanner reads the text inside a QR
// code, not the picture of it, so a code read out of a screenshot and redrawn full size, black on
// white, scans the same as the original and better than a dim, cropped photo of it. What is
// stored is only that text, on the ticket's own record: `code` is the text, null once a picture
// has been looked at and has none, and missing while it has not been looked at yet.
//
// Some codes cannot be copied: the ones that change every few seconds, or only show once you are
// signed in to the operator's app. A parent marks those, with the app they live in, and the gate
// view says to show it there rather than drawing a copy that would be turned away.
import {isArchived,isDrawable,attachmentsOf} from './trip-features.js';
export const CODE_MAX=3000,APP_MAX=60;
const live=doc=>!!doc?.codeLive;
// A ticket's codes in the order its files are in: its own first, then each attached page. Each
// carries whose it is, so four park tickets swipe through as Damien, Lauren, Boston and Nate.
export function codesFor(state,doc){
 if(!doc||live(doc))return [];
 return [doc,...attachmentsOf(state,doc)].filter(d=>typeof d.code==='string'&&d.code)
  .map(d=>({id:d.id,text:d.code,person:d.person||doc.person,title:d.id===doc.id?doc.title:d.title}));
}
// The pictures still to be looked at: drawable, not yet read, on a ticket still in use.
export function toRead(state){
 const docs=state?.documents||[],byId=new Map(docs.map(d=>[d.id,d]));
 return docs.filter(d=>{
  if(!isDrawable(d)||d.code!==undefined||d.category==='memory')return false;
  const owner=d.parentDocumentId?byId.get(d.parentDocumentId):d;
  return !!owner&&!isArchived(owner)&&!live(owner)&&owner.category!=='memory';
 });
}
// What the server accepts, checked the same way on the phone.
export function cleanCode(op){
 if(op.code!==undefined&&op.code!==null&&(typeof op.code!=='string'||!op.code||op.code.length>CODE_MAX))return {error:'That code is not one the app can keep.'};
 if(op.live!==undefined&&typeof op.live!=='boolean')return {error:'Invalid choice.'};
 const app=String(op.app??'').trim();
 if(app.length>APP_MAX)return {error:'Keep the app’s name short.'};
 return {value:{code:op.code,live:op.live,app}};
}
