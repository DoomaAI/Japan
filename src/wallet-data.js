// The Wallet leads with what is about to be scanned, the way a boarding pass or an event badge
// sits at the top of its app: the tickets for the next stops that have one, in the order we will
// reach them, from the day in hand onwards. A stop already ticked off or skipped has been used;
// a ticket marked used has left the wallet; anything that is not about a stop stays in the list.
import {isArchived,documentServesStep} from './trip-features.js';
const order=(a,b)=>(a.day||'').localeCompare(b.day||'')||(a.time||'99:99').localeCompare(b.time||'99:99')||(a.order??0)-(b.order??0);
export function nextPasses(state,date,limit=3){
 const docs=(state?.documents||[]).filter(d=>!d.parentDocumentId&&d.category!=='memory'&&!isArchived(d));
 const seen=new Set(),out=[];
 const steps=(state?.steps||[]).filter(s=>s.day&&s.day>=date&&s.status!=='done'&&s.status!=='skipped').sort(order);
 for(const step of steps){
  for(const doc of docs){
   if(seen.has(doc.id)||!documentServesStep(doc,step.id))continue;
   seen.add(doc.id);out.push({doc,step});
   if(out.length>=limit)return out;
  }
 }
 return out;
}
