// The photobook: one page for each day, laid out to print or save as a PDF at home. The big
// picture is the photo of the day where the family voted for one, then any photo from the day;
// under it the stops we rated highest, a line somebody said about one, and the diary. A day we
// kept nothing from still gets its page, with the plan's title, so the book has no gaps.
import {photoOfTheDay,photosFor,diaryDays} from './trip-features.js';
const isImage=d=>String(d?.type||'').startsWith('image/');
export function photobookPages(state){
 return diaryDays(state).map((d,i)=>{
  const winner=photoOfTheDay(state,d.date)?.winners?.[0]||null;
  const daily=photosFor(state,d.date),gallery=d.media.filter(isImage);
  const pictures=[...(winner?[{kind:'photo',item:winner}]:[]),...daily.filter(p=>p.id!==winner?.id).map(item=>({kind:'photo',item})),...gallery.map(item=>({kind:'document',item}))];
  const quote=d.reviews.flatMap(r=>Object.entries(r.thoughts||{}).map(([person,t])=>({person,text:t.text,title:r.step.title})))[0]||null;
  return {date:d.date,number:i+1,title:d.title||'',city:d.city||'',hero:pictures[0]||null,more:pictures.slice(1,5),
   best:d.reviews.slice(0,3).map(r=>({id:r.step.id,title:r.step.title,average:r.average})),quote,note:d.note,done:d.steps.length,winner:!!winner};
 });
}
