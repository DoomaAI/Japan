// One small mixer for the sound postcards, shared by the replay, the flyover and the highlights
// video. Each sound is an <audio> from our own server, played through Web Audio so that it reaches
// the speaker and, while something is recording, the recording too. A new sound fades the last one
// out rather than talking over it.
export const voiceUrl=id=>`/api/voice?id=${encodeURIComponent(id)}`;
export function createMixer(){
 const AC=typeof window!=='undefined'&&(window.AudioContext||window.webkitAudioContext);
 if(!AC)return null;
 const ctx=new AC(),dest=ctx.createMediaStreamDestination(),playing=new Set();
 const master=ctx.createGain();master.connect(ctx.destination);master.connect(dest);
 function fadeOut(p,seconds=.4){try{p.gain.gain.setTargetAtTime(0,ctx.currentTime,seconds/3);setTimeout(()=>{p.el.pause();playing.delete(p);},seconds*1000+50);}catch{}}
 return {
  ctx,stream:dest.stream,
  // Play one of our sounds now; any sound already playing fades out under it.
  async play(url,{volume=1}={}){
   if(ctx.state==='suspended')await ctx.resume().catch(()=>{});
   for(const p of playing)fadeOut(p);
   const el=new Audio();el.src=url;el.preload='auto';
   const src=ctx.createMediaElementSource(el),gain=ctx.createGain();gain.gain.value=volume;src.connect(gain);gain.connect(master);
   const p={el,gain};playing.add(p);el.onended=()=>playing.delete(p);
   try{await el.play();}catch{playing.delete(p);}
   return p;
  },
  // A clip's own sound (a gallery video) goes into the mix the same way.
  attach(el,{volume=1}={}){try{const src=ctx.createMediaElementSource(el),gain=ctx.createGain();gain.gain.value=volume;src.connect(gain);gain.connect(master);return gain;}catch{return null;}},
  stopAll(){for(const p of playing)fadeOut(p,.2);},
  setMuted(m){master.gain.value=m?0:1;},
  close(){for(const p of playing)p.el.pause();playing.clear();ctx.close?.().catch?.(()=>{});}
 };
}
