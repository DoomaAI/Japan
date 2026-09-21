import {randomUUID} from 'node:crypto';
import {AppError} from './model.mjs';
import {validateAudio} from './files.mjs';
// A phrase said out loud, once, by someone in the family, and kept.
//
// This exists because an iPhone's ring switch silences the phone's own speaking voice and a
// web page cannot override it — but it does not silence a recording played through the media
// session. So the phrase that will not speak on a silent phone can still be heard, as long as
// somebody has said it into a device where the speaking does work.
//
// One recording per phrase, replaced rather than piled up: this is a reference pronunciation,
// not a conversation, and two of them would only raise the question of which is right.
export const PHRASE_CLIP_SECONDS=20;
export function checkPhraseClip(body,user){
 if(typeof body.pathname!=='string'||!body.pathname.startsWith(`phrases/${user.id}/`)||body.pathname.includes('..'))
  throw new AppError('Invalid recording.');
 const phraseId=String(body.phraseId||'').trim();
 if(!phraseId||phraseId.length>80)throw new AppError('Choose a phrase to record.');
 const seconds=Math.round(Number(body.seconds));
 if(!Number.isFinite(seconds)||seconds<1||seconds>PHRASE_CLIP_SECONDS)
  throw new AppError(`A phrase is a second or two — keep it under ${PHRASE_CLIP_SECONDS}.`);
 return {phraseId,pathname:body.pathname,seconds};
}
// Storage describes the file, not the phone, so a recording cannot claim to be something it
// is not. Replacing one keeps the phrase's id stable so anything already playing it still works.
export function addPhraseClip(state,checked,user,blob,now=new Date().toISOString()){
 validateAudio(blob?.contentType,blob?.size);
 const existing=state.phraseAudio?.[checked.phraseId];
 if(existing?.pathname===checked.pathname)return state;
 return {...state,phraseAudio:{...(state.phraseAudio||{}),[checked.phraseId]:{
  id:randomUUID(),by:user.name,phraseId:checked.phraseId,pathname:checked.pathname,
  seconds:checked.seconds,type:blob.contentType,size:blob.size,at:now,
  replaced:existing?existing.pathname:null
 }}};
}
export function removePhraseClip(state,phraseId){
 if(!state.phraseAudio?.[phraseId])throw new AppError('There is no recording for that phrase.',404);
 const next={...state.phraseAudio};delete next[phraseId];
 return {...state,phraseAudio:next};
}
export const phraseClip=(state,phraseId)=>state?.phraseAudio?.[phraseId]||null;
