// The pause after a winner goes in: the bout is held where it is for a couple of seconds while
// its card goes green and the points land, then let go so the list can move on. A one-off wait
// on a tap, not a poll — nothing here reads anything.
import {useState,useEffect} from 'react';
export const CHEER_MS=2200;
export function useCheer(onDone){
 const [cheer,setCheer]=useState(null);
 useEffect(()=>{
  if(!cheer)return;
  const t=setTimeout(()=>{setCheer(null);onDone?.();},CHEER_MS);
  return ()=>clearTimeout(t);
 },[cheer]);
 return [cheer,(id,winner,scorers)=>setCheer({id,winner,scorers,at:Date.now()})];
}
