import {randomUUID} from 'node:crypto';
import {AppError} from './model.mjs';
import {validateAudio,VOICE_MAX_SECONDS} from './files.mjs';
// Everything about a voice note that can be decided without reaching storage, so the rules
// are the same whether or not a blob is involved and can be checked on their own.
export function checkVoiceNote(state,body,user){
 if(typeof body.pathname!=='string'||!body.pathname.startsWith(`voice/${user.id}/`)||body.pathname.includes('..'))throw new AppError('Invalid voice note.');
 if(!body.day||!state.days.some(d=>d.date===body.day))throw new AppError('Choose a trip day.');
 if(body.stepId&&!state.steps.some(s=>s.id===body.stepId&&s.day===body.day))throw new AppError('Activity not found on that day.');
 if(body.title!==undefined&&body.title!==null&&(typeof body.title!=='string'||body.title.length>200))throw new AppError('Keep the label short.');
 const seconds=Math.round(Number(body.seconds));
 if(!Number.isFinite(seconds)||seconds<1||seconds>VOICE_MAX_SECONDS)throw new AppError('Record between one second and five minutes.');
 return {pathname:body.pathname,day:body.day,stepId:body.stepId||null,title:(body.title||'').trim(),seconds};
}
// The blob is described by storage, not by the phone, so a note cannot claim to be something
// it is not. Saving the same recording twice is the same note.
export function addVoiceNote(state,checked,user,blob,now=new Date().toISOString()){
 validateAudio(blob?.contentType,blob?.size);
 if(state.voiceNotes.some(v=>v.pathname===checked.pathname))return state;
 return {...state,voiceNotes:[...state.voiceNotes,{id:randomUUID(),by:user.name,...checked,type:blob.contentType,size:blob.size,at:now}]};
}
