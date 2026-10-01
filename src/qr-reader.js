// Reading and drawing QR codes on the phone. The libraries are fetched only when a ticket is being
// read or a code is being shown, so no other screen carries their weight.
import {documentUrl} from './api-urls.js';
export const PDF_PAGES=20,PER_PAGE=8;
// Plain-text codes (almost every ticket) are kept as they read. Anything else is kept as its exact
// bytes, marked b64:, so the code drawn back is byte for byte the one that was photographed.
const keep=found=>/^[\x20-\x7e]*$/.test(found.data)&&found.data&&!found.data.startsWith('b64:')?found.data:'b64:'+btoa(String.fromCharCode(...found.binaryData));
const canvasOf=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
// Every code on one picture. The reader finds one code at a time and loses its way when several
// share a picture, so each one found is painted over in white and the picture read again; then
// the page is read again in overlapping sections, two by two up to five by five, so four tickets
// printed on one page each get looked at on their own. A code found twice is kept once.
function scan(jsQR,ctx,x,y,w,h){
 const found=jsQR(ctx.getImageData(x,y,w,h).data,w,h,{inversionAttempts:'attemptBoth'});
 if(!found)return null;
 const {topLeftCorner:a,topRightCorner:b,bottomRightCorner:c,bottomLeftCorner:d}=found.location;
 const pad=Math.max(12,Math.hypot(b.x-a.x,b.y-a.y)*.08),xs=[a.x,b.x,c.x,d.x],ys=[a.y,b.y,c.y,d.y];
 ctx.fillStyle='#fff';ctx.fillRect(x+Math.min(...xs)-pad,y+Math.min(...ys)-pad,Math.max(...xs)-Math.min(...xs)+pad*2,Math.max(...ys)-Math.min(...ys)+pad*2);
 return {text:keep(found),x:x+Math.min(...xs),y:y+Math.min(...ys),size:Math.max(...ys)-Math.min(...ys)};
}
function codesOnCanvas(jsQR,ctx,w,h){
 const out=[],add=f=>{if(f&&!out.some(o=>o.text===f.text))out.push(f);};
 for(let i=0;i<PER_PAGE;i++){const f=scan(jsQR,ctx,0,0,w,h);if(!f)break;add(f);}
 for(const n of [2,3,4,5]){
  const tw=Math.ceil(w/n*1.3),th=Math.ceil(h/n*1.3);
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){
   if(out.length>=PER_PAGE)break;
   const x=Math.max(0,Math.min(w-tw,Math.round(c*w/n-(tw-w/n)/2))),y=Math.max(0,Math.min(h-th,Math.round(r*h/n-(th-h/n)/2)));
   for(let i=0;i<2;i++){const f=scan(jsQR,ctx,x,y,Math.min(tw,w),Math.min(th,h));if(!f)break;add(f);}
  }
 }
 // In reading order, whatever order they were found in: rows top to bottom (codes whose tops are
 // within half a code of each other share a row), then left to right, so Guest 1 comes first.
 const row=Math.max(20,...out.map(o=>o.size/2));
 return out.sort((a,b)=>Math.abs(a.y-b.y)<row?a.x-b.x:a.y-b.y).map(o=>o.text);
}
// A screenshot's code is often small in a big picture, and a photo's is often huge and soft, so a
// picture with nothing found is tried again at a smaller size before giving up.
async function codesInImage(jsQR,blob){
 const bitmap=await createImageBitmap(blob);
 try{
  for(const max of [1800,900]){
   const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
   const w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvasOf(w,h).getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,w,h);
   const found=codesOnCanvas(jsQR,ctx,w,h);if(found.length)return found;
  }
  return [];
 }finally{bitmap.close?.();}
}
// A PDF ticket, page by page: each page drawn on white at a size where a printed code is a few
// hundred pixels across, then read like a picture. The legacy build of pdf.js is used so older
// iPhones can open it too; its worker ships with the app, so this works with no signal.
async function codesInPdf(jsQR,blob){
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const {default:worker}=await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
 pdfjs.GlobalWorkerOptions.workerSrc=worker;
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false}).promise;
 try{
  const out=[];
  for(let n=1;n<=Math.min(pdf.numPages,PDF_PAGES);n++){
   const page=await pdf.getPage(n),base=page.getViewport({scale:1});
   const viewport=page.getViewport({scale:Math.min(3,1800/Math.max(base.width,base.height))});
   const w=Math.ceil(viewport.width),h=Math.ceil(viewport.height),ctx=canvasOf(w,h).getContext('2d',{willReadFrequently:true});
   ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
   await page.render({canvasContext:ctx,viewport,background:'#fff'}).promise;
   for(const text of codesOnCanvas(jsQR,ctx,w,h))if(!out.includes(text))out.push(text);
   page.cleanup();
  }
  return out;
 }finally{pdf.destroy();}
}
// Every code on a ticket's file, in reading order: none, one, or several.
export async function readCodes(id,type=''){
 const {default:jsQR}=await import('jsqr');
 const blob=await (await fetch(documentUrl({id}),{credentials:'same-origin'})).blob();
 return type==='application/pdf'||blob.type==='application/pdf'?codesInPdf(jsQR,blob):codesInImage(jsQR,blob);
}
// The code drawn fresh as a picture: medium error correction, and the four-module quiet zone
// around it that scanners need, so it can be drawn edge to edge on a white card.
export async function drawCode(text){
 const {default:qrcode}=await import('qrcode-generator');
 const bytes=text.startsWith('b64:')?[...atob(text.slice(4))].map(c=>c.charCodeAt(0)):[...text].map(c=>c.charCodeAt(0)&0xff);
 // Handed over as one byte per character, which is what the library writes into the code.
 const qr=qrcode(0,'M');qr.addData(String.fromCharCode(...bytes),'Byte');qr.make();
 // The library's margin is in pixels, not modules: four modules of eight pixels each.
 return qr.createDataURL(8,32);
}
// The code as a card to send: the code large on white, with the ticket's name, whose it is and
// the reference underneath, as a PNG that saves to Photos and shows at a gate like a screenshot.
export async function codeCard(text,{title='',person='',reference=''}={}){
 const url=await drawCode(text),img=new Image();img.src=url;await img.decode();
 const W=900,pad=60,size=W-pad*2,lines=[[title,'600 40px'],[person,'400 34px'],[reference&&`Ref ${reference}`,'400 30px']].filter(([t])=>t);
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=pad+size+30+lines.length*54+pad;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.imageSmoothingEnabled=false;ctx.drawImage(img,pad,pad,size,size);
 ctx.fillStyle='#111';ctx.textAlign='center';
 let y=pad+size+30;
 for(const [t,font] of lines){ctx.font=`${font} system-ui,-apple-system,sans-serif`;y+=46;
  let s=t;while(ctx.measureText(s).width>W-pad*2&&s.length>4)s=s.slice(0,-2);ctx.fillText(s===t?t:s+'…',W/2,y);}
 return new Promise((ok,fail)=>canvas.toBlob(b=>b?ok(b):fail(new Error('The code could not be drawn.')),'image/png'));
}
