import {photosFor,photoOfTheDay,voiceNotesFor,ratedSteps} from './trip-features.js';
// What a highlights video would be cut from, counted out of what the family has already kept.
// The video itself is not built yet: the Claude API reads and chooses, it does not make video,
// so the plan is Claude picking the moments and writing the captions, and the phone putting
// them together. Until then this is the list of what is waiting, so the page is honest about
// being a placeholder rather than a button that does nothing.
const isVideo=d=>String(d.type||'').startsWith('video/');
export function highlightsMaterial(state){
 const memories=(state.documents||[]).filter(d=>d.category==='memory'&&!d.parentDocumentId);
 const days=(state.days||[]).map(d=>{
  const best=photoOfTheDay(state,d.date);
  return {date:d.date,title:d.title||'',winners:best?.winners||[],photos:photosFor(state,d.date).length};
 });
 return {
  galleryPhotos:memories.filter(d=>String(d.type||'').startsWith('image/')).length,
  videos:memories.filter(isVideo).length,
  boysPhotos:photosFor(state).length,
  voiceNotes:voiceNotesFor(state).length,
  topRated:ratedSteps(state,{min:4}).slice(0,10),
  daysWithWinner:days.filter(d=>d.winners.length).length,
  days
 };
}
