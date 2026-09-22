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
// Two sections fold, and they disagree about what an untouched phone should see: the weather is
// open until somebody folds it away, the dashboard is a small tile until somebody opens it. So
// the caller says which, and only a phone that has actually been told overrides it.
export function isOpen(id,store=device(),unset=true){
 try{const saved=store?.getItem(KEY(id));return saved==null?unset:saved!=='closed';}catch{return unset;}
}
// Hands back what the fold now is, so the screen is drawn from the answer rather than from a
// guess about whether the phone accepted it.
export function setOpen(id,open,store=device()){
 try{store?.setItem(KEY(id),open?'open':'closed');}catch{}
 return !!open;
}
