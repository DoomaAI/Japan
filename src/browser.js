// What the screens ask of the browser itself, in one place. Each one copes with the thing not being
// there (a private window, a test run with no DOM) rather than throwing.
export const reducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
// The phone's own storage, or null when it cannot be reached.
export const localStore=()=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}};
// Hands a file the app made (a CSV, a calendar) to the phone to save.
export function download(name,data,type){const u=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
// A picked file as a data: URL, ready to send to the server.
export const readDataUrl=file=>new Promise((resolve,reject)=>{
 const reader=new FileReader();
 reader.onload=()=>resolve(String(reader.result));
 reader.onerror=()=>reject(new Error('That file could not be opened.'));
 reader.readAsDataURL(file);
});
