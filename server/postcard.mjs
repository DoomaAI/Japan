// Posting a postcard from the app: the seam. POSTCARD_PROVIDER names the provider and
// POSTCARD_API_KEY its key; until both are set, and an adapter for that provider is written, the
// app says so and the share sheet does the sending. An adapter is one function: (job, photo
// bytes) → the provider's reference for the card. See src/postcard-providers.js for the candidates.
import {AppError} from './model.mjs';
import {postcardProvider} from '../src/postcard-providers.js';
const ADAPTERS={
 // postgrid: async(job,photo)=>{ /* upload the front image, then create the postcard; return its id */ },
};
export const postcardProviderId=()=>process.env.POSTCARD_PROVIDER||'';
export const postcardReady=()=>!!(process.env.POSTCARD_API_KEY&&ADAPTERS[postcardProviderId()]);
export async function sendPostcard(job,photo){
 const id=postcardProviderId(),adapter=ADAPTERS[id];
 if(!adapter)throw new AppError(id&&postcardProvider(id)?`${postcardProvider(id).name} is chosen but not connected yet. Use Share to send the card for now.`:'No postcard service is connected yet. Use Share to send the card through a postcard app.',501);
 if(!process.env.POSTCARD_API_KEY)throw new AppError('The postcard service has no key yet.',501);
 return adapter(job,photo);
}
