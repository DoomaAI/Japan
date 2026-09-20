import {AppError} from './model.mjs';
export const FILE_TYPES=['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif','video/mp4','video/quicktime','video/webm'];
export function validateFile(type,size,category){
 const video=type?.startsWith('video/');
 if(!FILE_TYPES.includes(type)||!Number.isFinite(size)||size<=0||size>(video?100:25)*1024*1024)throw new AppError('Use photos/PDFs up to 25 MB or videos up to 100 MB.');
 if(category==='memory'&&type==='application/pdf')throw new AppError('Choose a photo or video for the gallery.');
}
