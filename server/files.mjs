import {AppError} from './model.mjs';
export const FILE_TYPES=['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm'];
// What a phone's own recorder produces: Safari gives mp4, everything else webm/opus.
export const AUDIO_TYPES=['audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/wav','audio/aac','audio/x-m4a'];
export const VOICE_MAX_BYTES=25*1024*1024;
export const VOICE_MAX_SECONDS=300;
export function validateAudio(type,size){
 const base=(type||'').split(';')[0].trim();
 if(!AUDIO_TYPES.includes(base)||!Number.isFinite(size)||size<=0||size>VOICE_MAX_BYTES)throw new AppError('Record a voice note of up to five minutes.');
}
export function validateFile(type,size,category){
 const video=type?.startsWith('video/');
 if(!FILE_TYPES.includes(type)||!Number.isFinite(size)||size<=0||size>(video?100:25)*1024*1024)throw new AppError('Use photos/PDFs up to 25 MB or videos up to 100 MB.');
 if(category==='memory'&&type==='application/pdf')throw new AppError('Choose a photo or video for the gallery.');
}
