import {AppError} from './model.mjs';
import {QUEUE_TIMES_PARK,queueTimesUrl,readQueueTimes,latestUpdate,WAITS_SOURCE} from '../src/wait-times.js';
// The feed refreshes about every five minutes, so one read is shared by everybody for a minute
// and a Refresh inside that minute gets the same answer rather than another request.
const KEEP_MS=60000,cache=new Map();
export async function parkWaits(parkId,now=Date.now()){
 if(!QUEUE_TIMES_PARK[parkId])throw new AppError('No live wait times for that park.',404);
 const kept=cache.get(parkId);if(kept&&now-Date.parse(kept.checkedAt)<KEEP_MS)return kept;
 let feed;
 try{const r=await fetch(queueTimesUrl(parkId),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(String(r.status));feed=await r.json();}
 catch{if(kept)return {...kept,stale:true};throw new AppError('Live wait times are not answering right now. The park’s official app has them.',502);}
 const rides=readQueueTimes(feed);
 const out={park:parkId,checkedAt:new Date(now).toISOString(),updatedAt:latestUpdate(rides),rides,source:WAITS_SOURCE};
 cache.set(parkId,out);return out;
}
