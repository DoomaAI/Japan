// Where a photo was taken, if the photo still says. A JPEG straight off a camera or an iPhone
// carries it in its EXIF block; one that went through Safari's photo picker may have had it
// taken out, and a photo shrunk by the app has none, so this reads the original file before
// anything else touches it — and a photo that says nothing is simply placed at its stop.
// Only the GPS block is read. Nothing else in the EXIF — the phone, the time, the settings — is.
const HEAD=256*1024;
export function gpsFromJpeg(buffer){
 const v=new DataView(buffer);
 if(v.byteLength<4||v.getUint16(0)!==0xFFD8)return null;
 let at=2;
 while(at+4<=v.byteLength){
  if(v.getUint8(at)!==0xFF)return null;
  const marker=v.getUint8(at+1),size=v.getUint16(at+2);
  if(marker===0xDA||marker===0xD9)return null;
  if(marker===0xE1&&at+10<=v.byteLength&&v.getUint32(at+4)===0x45786966&&v.getUint16(at+8)===0)return fromTiff(v,at+10,Math.min(v.byteLength,at+2+size));
  at+=2+size;
 }
 return null;
}
function fromTiff(v,base,end){
 const order=v.getUint16(base);if(order!==0x4949&&order!==0x4D4D)return null;
 const le=order===0x4949,u16=o=>v.getUint16(o,le),u32=o=>v.getUint32(o,le);
 const ok=(o,n)=>o>=base&&o+n<=end;
 const entries=ifd=>{
  if(!ok(ifd,2))return [];const n=u16(ifd),list=[];
  for(let i=0;i<n;i++){const e=ifd+2+i*12;if(!ok(e,12))break;list.push({tag:u16(e),type:u16(e+2),count:u32(e+4),value:e+8});}
  return list;
 };
 const ifd0=base+u32(base+4),gpsTag=entries(ifd0).find(e=>e.tag===0x8825);
 if(!gpsTag)return null;
 const gps=entries(base+u32(gpsTag.value)),get=t=>gps.find(e=>e.tag===t);
 const ref=t=>{const e=get(t);return e&&ok(e.value,1)?String.fromCharCode(v.getUint8(e.value)):null;};
 const dms=t=>{
  const e=get(t);if(!e||e.type!==5||e.count!==3)return null;
  const at=base+u32(e.value);if(!ok(at,24))return null;
  const r=i=>{const d=u32(at+i*8+4);return d?u32(at+i*8)/d:NaN;};
  const value=r(0)+r(1)/60+r(2)/3600;return Number.isFinite(value)?value:null;
 };
 let lat=dms(2),lng=dms(4);
 if(lat===null||lng===null||(lat===0&&lng===0))return null;
 if(ref(1)==='S')lat=-lat;if(ref(3)==='W')lng=-lng;
 return Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null;
}
// Never throws: a photo that cannot be read for its position is still a photo.
export async function photoPosition(file){
 try{
  if(!file||!/^image\/jpe?g$/.test(file.type))return null;
  return gpsFromJpeg(await file.slice(0,HEAD).arrayBuffer());
 }catch{return null;}
}
