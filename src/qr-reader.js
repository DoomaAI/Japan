// Reading and drawing QR codes on the phone. Both libraries are fetched only when a ticket is
// being read or a code is being shown, so no other screen carries their weight.
const fileUrl=id=>`/api/document?id=${encodeURIComponent(id)}`;
// A screenshot's code is often small in a big picture, and a photo's is often huge and soft, so
// it is tried at two sizes before giving up. Null means there is no code this app can read.
// Plain-text codes (almost every ticket) are kept as they read. Anything else is kept as its exact
// bytes, marked b64:, so the code drawn back is byte for byte the one that was photographed.
const keep=found=>/^[\x20-\x7e]*$/.test(found.data)&&found.data&&!found.data.startsWith('b64:')?found.data:'b64:'+btoa(String.fromCharCode(...found.binaryData));
export async function readCode(id){
 const {default:jsQR}=await import('jsqr');
 const blob=await (await fetch(fileUrl(id),{credentials:'same-origin'})).blob();
 const bitmap=await createImageBitmap(blob);
 try{
  for(const max of [1800,900]){
   const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
   const w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));
   const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,w,h);
   const found=jsQR(ctx.getImageData(0,0,w,h).data,w,h,{inversionAttempts:'attemptBoth'});
   if(found)return keep(found);
  }
  return null;
 }finally{bitmap.close?.();}
}
// The code drawn fresh as a picture: medium error correction, and the four-module quiet zone
// around it that scanners need, so it can be drawn edge to edge on a white card.
export async function drawCode(text){
 const {default:qrcode}=await import('qrcode-generator');
 const bytes=text.startsWith('b64:')?[...atob(text.slice(4))].map(c=>c.charCodeAt(0)):[...text].map(c=>c.charCodeAt(0)&0xff);
 // Handed over as one byte per character, which is what the library writes into the code.
 const qr=qrcode(0,'M');qr.addData(String.fromCharCode(...bytes),'Byte');qr.make();
 return qr.createDataURL(8,4);
}
