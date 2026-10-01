// Text and link helpers shared by the screens and the server. Whatever a model, a form or an email
// sends back is trimmed and capped before it is kept, and only an https address is kept as a link.
export const clamp=(v,max)=>String(v??'').trim().slice(0,max);
// The same with runs of spaces and line breaks folded into one, for a value read on one line.
export const clampLine=(v,max)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
// Shortened to fit a line of a card, with an ellipsis when something had to go.
export const cut=(s,n)=>{s=String(s||'').replace(/\s+/g,' ').trim();return s.length>n?`${s.slice(0,n-1)}…`:s;};
// An https address with no name or password in it, as text, or '' for anything else.
export const httpsLink=v=>{try{const u=new URL(String(v||'').trim());return u.protocol==='https:'&&!u.username&&!u.password?u.href.slice(0,500):'';}catch{return '';}};
// An https address as a URL, or null.
export const httpsUrl=v=>{try{return new URL(v).protocol==='https:'?new URL(v):null;}catch{return null;}};
export const mapSearch=q=>q?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`:'';
export const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
