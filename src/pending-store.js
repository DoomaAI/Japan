// A recording is the one thing the app cannot hand to the queue: the queue holds small JSON
// operations in localStorage, and a two-minute voice note is megabytes of audio. So it goes
// in IndexedDB on the phone, survives the app being closed, and is uploaded when there is
// signal again. Everything here degrades to "no pending notes" rather than throwing, because
// a private window or a phone with storage turned off must not break the recorder.
const DB='japan-pending',STORE='voice',VERSION=1;
function open(){
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(new Error('no indexeddb'));
  const request=indexedDB.open(DB,VERSION);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('indexeddb refused'));
  request.onblocked=()=>reject(new Error('indexeddb blocked'));
 });
}
async function withStore(mode,run){
 const db=await open();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode),result=run(tx.objectStore(STORE));
   tx.oncomplete=()=>resolve(result?.__value??result);
   tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
 }finally{db.close();}
}
export async function savePending(note){
 await withStore('readwrite',store=>{store.put(note);});
 return note.id;
}
export async function listPending(){
 try{
  return await withStore('readonly',store=>{
   const holder={__value:[]};
   const request=store.getAll();
   request.onsuccess=()=>{holder.__value=(request.result||[]).sort((a,b)=>String(a.at).localeCompare(String(b.at)));};
   return holder;
  });
 }catch{return [];}
}
export async function dropPending(id){
 try{await withStore('readwrite',store=>{store.delete(id);});return true;}catch{return false;}
}
export async function pendingSupported(){
 try{const db=await open();db.close();return true;}catch{return false;}
}
