// The digital frame at the grandparents': the follow-along link opened in frame mode on an old
// iPad, a laptop or a TV browser. It shows what a parent chose for it, one photo at a time, and
// nothing else. What goes on it is curated rather than everything: the photo of the day is on
// by default, and a parent flags any other photo for it, so the boys' bathroom-floor pictures
// stay off a screen a visitor sees. Nothing here is written back to the trip except a clap.
export const FRAME_SECONDS=20,FRAME_KEEP=20;
// Newest day first, the photo of the day leading each day, then the flagged ones in order.
export function frameSet(view){
 const out=[];
 for(const d of view?.days||[]){
  const shown=(d.photos||[]).filter(p=>p.best||p.frame);
  for(const p of [...shown.filter(p=>p.best),...shown.filter(p=>!p.best)])out.push({id:p.id,by:p.by,best:!!p.best,day:d.date,number:d.number,total:view.total,title:d.title,city:d.city,said:(d.stops||[]).flatMap(s=>s.said||[]).find(x=>x.text)?.text||'',kudos:p.kudos||{}});
 }
 return out.slice(0,FRAME_KEEP);
}
export const frameCaption=p=>p?`Day ${p.number}${p.total?` of ${p.total}`:''} · ${p.city||''}${p.title?` · ${p.title}`:''}`:'';
export const nextIndex=(i,n)=>n?(i+1)%n:0;
// Dim between ten at night and six in the morning, in the frame's own clock.
export const nightHour=h=>h>=22||h<6;
export const frameUrl=url=>url?`${url}${url.includes('?')?'&':'?'}frame=1`:'';
