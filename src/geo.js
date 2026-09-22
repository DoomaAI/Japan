// The one place that asks a phone where it is. Two screens ask — what is near here, and a stop
// added where we are standing — and a phone that will not answer should say the same thing on
// both, in words that name the usual cause rather than the error code. Each screen adds its own
// sentence about what to do instead, because that part is not the same.
export const GEO_TROUBLE={
 1:'This phone has not given the app your position. Allow location for this site in Settings',
 2:'Your position is not available right now — indoors or underground it often is not',
 3:'Finding your position took too long'};
export const GEO_UNKNOWN='Your position could not be read';
// The browser's own timeout starts once permission has been given, so a permission sheet that is
// swiped away rather than answered never calls back at all. Left alone that is a button stuck on
// "finding you" for the rest of the day, so the wait is bounded here as well — longer than the
// browser's, to let a genuine fix-taking-too-long say so in its own words first.
export const DEADLINE=20000;
// Rounded here, before it is used for anything, to whatever the asking screen is entitled to.
export async function askPhoneWhereItIs(places,deadline=DEADLINE){
 if(!navigator.geolocation)throw new Error('This phone cannot share its position');
 const round=v=>Math.round(v*10**places)/10**places;
 let timer,at;
 try{
  at=await Promise.race([
   new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:60000})),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject({code:3}),deadline);})]);
 }catch(e){throw new Error(GEO_TROUBLE[e?.code]||GEO_UNKNOWN);}
 finally{clearTimeout(timer);}
 return {lat:round(at.coords.latitude),lng:round(at.coords.longitude)};
}
