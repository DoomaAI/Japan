// Where a finished drawing lives. A drawing is a picture — a PNG off the canvas, or a photo of
// a piece of paper — and pictures do not go in the operation queue, which holds small JSON in
// localStorage. So they go in IndexedDB on the phone: they survive the app being closed, they
// need no signal at all, and the ones worth keeping are sent to the family afterwards. Every
// call degrades to "nothing saved" rather than throwing, because a private window or a phone
// with storage turned off must not break the drawing game.
const DB='japan-art',DRAWINGS='drawings',DESIGNS='designs',VERSION=1;
function open(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('no indexeddb'));
  const request=indexedDB.open(DB,VERSION);
  request.onupgradeneeded=()=>{const db=request.result;
   for(const name of [DRAWINGS,DESIGNS])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('indexeddb refused'));
  request.onblocked=()=>reject(new Error('indexeddb blocked'));
 });
}
async function withStore(name,mode,run){
 const db=await open();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(name,mode),result=run(tx.objectStore(name));
   tx.oncomplete=()=>resolve(result?.__value??result);
   tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
 }finally{db.close();}
}
const readAll=name=>withStore(name,'readonly',store=>{
 const holder={__value:[]},request=store.getAll();
 request.onsuccess=()=>{holder.__value=(request.result||[]).sort((a,b)=>String(b.at).localeCompare(String(a.at)));};
 return holder;
});
export async function saveDrawing(drawing){
 await withStore(DRAWINGS,'readwrite',store=>{store.put(drawing);});
 return drawing.id;
}
export async function listDrawings(){try{return await readAll(DRAWINGS);}catch{return [];}}
export async function dropDrawing(id){try{await withStore(DRAWINGS,'readwrite',store=>{store.delete(id);});return true;}catch{return false;}}
// Sent to the family, but kept on the phone as well: the one on the phone is the one that
// still opens on a train with no signal.
export async function markShared(id,pathname){
 try{
  const current=await withStore(DRAWINGS,'readonly',store=>{const holder={__value:null},request=store.get(id);
   request.onsuccess=()=>{holder.__value=request.result||null;};return holder;});
  if(!current)return false;
  await withStore(DRAWINGS,'readwrite',store=>{store.put({...current,shared:true,pathname});});
  return true;
 }catch{return false;}
}
export async function saveDesign(design){try{await withStore(DESIGNS,'readwrite',store=>{store.put(design);});return design.id;}catch{return null;}}
export async function listDesigns(){try{return await readAll(DESIGNS);}catch{return [];}}
export async function dropDesign(id){try{await withStore(DESIGNS,'readwrite',store=>{store.delete(id);});return true;}catch{return false;}}
export async function artStorageWorks(){try{const db=await open();db.close();return true;}catch{return false;}}
