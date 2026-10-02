import {holdPlayback,releasePlayback,keepHolding} from './speech.js';
// Asking with AirPods. A web app cannot hear "Hey Siri", but it can be the thing that is playing:
// the press on an AirPods stem (or the play button on any headphones, or the lock screen) is sent
// to whatever holds Now Playing, as play, pause or skip. So while this is on and the app is open,
// the inaudible loop speech.js already uses to beat the silent switch is kept running, the app
// names itself in Now Playing as the Concierge, and every press is passed to whoever is listening
// for one here: the Concierge if it is open, which starts or stops listening, else the app, which
// opens it. When the app goes into the background the loop stops and the press goes back to the
// music, so the family's podcasts are only borrowed while the trip is on the screen; with the
// phone in a pocket, "Hey Siri, Concierge" (a Shortcut, in Settings) is the way in.
const ACTIONS=['play','pause','stop','nexttrack','previoustrack'];
const listeners=[];
// The newest listener hears the press: the Concierge on the screen before the app beneath it.
export function onHeadphonePress(fn){
 listeners.push(fn);
 return ()=>{const i=listeners.lastIndexOf(fn);if(i>=0)listeners.splice(i,1);};
}
export function headphonePress(action='play'){const fn=listeners.at(-1);if(!fn)return false;fn(action);return true;}
export const headphonesSupported=(nav=typeof navigator!=='undefined'?navigator:null)=>!!nav?.mediaSession?.setActionHandler;
let held=false;
function claim(nav,win){
 const session=nav.mediaSession;
 for(const action of ACTIONS){
  // A browser that does not know an action throws; the others still work.
  try{session.setActionHandler(action,()=>{headphonePress(action);stillPlaying(nav);});}catch{}
 }
 try{if(win?.MediaMetadata)session.metadata=new win.MediaMetadata({title:'Concierge',artist:'Press to ask',album:'Japan 2026',artwork:[{src:'/icon-512.jpg',sizes:'512x512',type:'image/jpeg'}]});}catch{}
 stillPlaying(nav);
}
// After a press, after listening, after an answer: the loop may have been paused by the phone
// (recording takes the audio over), and a paused loop gives the next press to the music app.
export function stillPlaying(nav=typeof navigator!=='undefined'?navigator:null){
 if(!held)return false;
 keepHolding();
 try{if(nav?.mediaSession)nav.mediaSession.playbackState='playing';}catch{}
 return true;
}
function letGo(nav){
 const session=nav?.mediaSession;
 if(session){for(const action of ACTIONS){try{session.setActionHandler(action,null);}catch{}}
  try{session.metadata=null;session.playbackState='none';}catch{}}
 if(held){held=false;releasePlayback();}
}
// Turned on: the loop starts on the next touch (iOS will not play before one), and stops and
// starts again with the app going into and out of the background. Returns the way to turn it off.
export function startHeadphones(win=typeof window!=='undefined'?window:null){
 const nav=win?.navigator,doc=win?.document;
 if(!headphonesSupported(nav)||!win.addEventListener)return ()=>{};
 let touched=false;
 const take=()=>{if(held||doc?.visibilityState==='hidden')return;held=holdPlayback();if(held)claim(nav,win);};
 const first=()=>{touched=true;take();for(const e of ['pointerdown','touchend'])win.removeEventListener(e,first,true);};
 const seen=()=>{if(doc?.visibilityState==='hidden')letGo(nav);else if(touched)take();};
 for(const e of ['pointerdown','touchend'])win.addEventListener(e,first,true);
 doc?.addEventListener?.('visibilitychange',seen);
 return ()=>{
  for(const e of ['pointerdown','touchend'])win.removeEventListener(e,first,true);
  doc?.removeEventListener?.('visibilitychange',seen);
  letGo(nav);
 };
}
export const headphonesHeld=()=>held;
