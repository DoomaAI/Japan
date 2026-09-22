// What this phone has folded away. A section somebody has read and does not want in the way of
// the day itself — the weather, most mornings — folds down, and stays folded tomorrow rather
// than springing open on every reload.
//
// It is a view of one person's screen rather than a fact about the trip, so it lives on the
// phone: it is never sent anywhere, never reaches anybody else's phone, and works with no
// signal. Everything here degrades to open rather than throwing, because a private window or a
// phone with storage turned off must not be the reason a section disappears — or refuses to.
const KEY=id=>`japan.fold.${id}`;
const device=()=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}};
export function isOpen(id,store=device()){
 try{return store?.getItem(KEY(id))!=='closed';}catch{return true;}
}
// Hands back what the fold now is, so the screen is drawn from the answer rather than from a
// guess about whether the phone accepted it.
export function setOpen(id,open,store=device()){
 try{store?.setItem(KEY(id),open?'open':'closed');}catch{}
 return !!open;
}
