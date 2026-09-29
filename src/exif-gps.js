// Where and when a photo was taken, if the photo still says. A JPEG straight off a camera or an
// iPhone carries both in its EXIF block, and so does an iPhone HEIC; one that went through
// Safari's photo picker may have had the position taken out, and a photo shrunk by the app has
// neither, so this reads the original file before anything else touches it — and a photo that
// says nothing is simply placed wherever the family puts it.
// Only the position and the moment the shutter went are read. Nothing else in the EXIF — the
// phone, the lens, the settings — is.
const HEAD=256*1024,HEIC_HEAD=1024*1024;
function tiffFromJpeg(v){
 if(v.byteLength<4||v.getUint16(0)!==0xFFD8)return null;
 let at=2;
 while(at+4<=v.byteLength){
  if(v.getUint8(at)!==0xFF)return null;
  const marker=v.getUint8(at+1),size=v.getUint16(at+2);
  if(marker===0xDA||marker===0xD9)return null;
  if(marker===0xE1&&at+10<=v.byteLength&&v.getUint32(at+4)===0x45786966&&v.getUint16(at+8)===0)return {base:at+10,end:Math.min(v.byteLength,at+2+size)};
  at+=2+size;
 }
 return null;
}
// A HEIC keeps its EXIF as an item inside the file rather than in a marker of its own. Walking
// the item boxes to find it is a lot of reading for one block, so this looks for the block's own
// signature — "Exif", two zeros, then a TIFF byte order — near the front, where the iPhone puts it.
function tiffFromHeic(v){
 for(let at=0;at+10<=v.byteLength;at++){
  if(v.getUint32(at)!==0x45786966||v.getUint16(at+4)!==0)continue;
  const order=v.getUint16(at+6);
  if((order===0x4949&&v.getUint16(at+8,true)===42)||(order===0x4D4D&&v.getUint16(at+8)===42))return {base:at+6,end:v.byteLength};
 }
 return null;
}
function fromTiff(v,base,end){
 const order=v.getUint16(base);if(order!==0x4949&&order!==0x4D4D)return {gps:null,takenAt:null};
 const le=order===0x4949,u16=o=>v.getUint16(o,le),u32=o=>v.getUint32(o,le);
 const ok=(o,n)=>o>=base&&o+n<=end;
 const entries=ifd=>{
  if(!ok(ifd,2))return [];const n=u16(ifd),list=[];
  for(let i=0;i<n;i++){const e=ifd+2+i*12;if(!ok(e,12))break;list.push({tag:u16(e),type:u16(e+2),count:u32(e+4),value:e+8});}
  return list;
 };
 const ascii=e=>{
  if(!e||e.type!==2||!e.count)return null;
  const at=e.count>4?base+u32(e.value):e.value;if(!ok(at,e.count))return null;
  let s='';for(let i=0;i<e.count;i++){const c=v.getUint8(at+i);if(!c)break;s+=String.fromCharCode(c);}
  return s;
 };
 const ifd0=entries(base+u32(base+4));
 return {gps:gpsFrom(ifd0),takenAt:timeFrom(ifd0)};
 function gpsFrom(ifd0){
  const gpsTag=ifd0.find(e=>e.tag===0x8825);
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
 // When the shutter went (DateTimeOriginal), with the phone's offset from UTC when it says so.
 // Without an offset it is the clock on the phone at the time, which on this trip is Japan's.
 function timeFrom(ifd0){
  const exifTag=ifd0.find(e=>e.tag===0x8769),exif=exifTag?entries(base+u32(exifTag.value)):[];
  const stamp=ascii(exif.find(e=>e.tag===0x9003))||ascii(ifd0.find(e=>e.tag===0x0132));
  const m=stamp?.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
  if(!m||m[1]==='0000')return null;
  const offset=ascii(exif.find(e=>e.tag===0x9011))?.match(/^[+-]\d\d:\d\d$/)?.[0]||'';
  const at=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${offset}`;
  return validTakenAt(at)?at:null;
 }
}
export const validTakenAt=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d([+-]\d\d:\d\d)?$/.test(s)&&Number.isFinite(Date.parse(s.length===19?`${s}Z`:s));
export function exifFromJpeg(buffer){
 const v=new DataView(buffer),at=tiffFromJpeg(v);
 return at?fromTiff(v,at.base,at.end):null;
}
export function exifFromHeic(buffer){
 const v=new DataView(buffer),at=tiffFromHeic(v);
 return at?fromTiff(v,at.base,at.end):null;
}
export const gpsFromJpeg=buffer=>exifFromJpeg(buffer)?.gps||null;
// Never throws: a photo that cannot be read for its position or time is still a photo.
export async function photoDetails(file){
 try{
  if(/^image\/jpe?g$/.test(file?.type))return exifFromJpeg(await file.slice(0,HEAD).arrayBuffer())||{gps:null,takenAt:null};
  if(/^image\/hei[cf]$/.test(file?.type))return exifFromHeic(await file.slice(0,HEIC_HEAD).arrayBuffer())||{gps:null,takenAt:null};
 }catch{}
 return {gps:null,takenAt:null};
}
export const photoPosition=async file=>(await photoDetails(file)).gps;
