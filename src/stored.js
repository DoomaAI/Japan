// A piece of state that survives the screen being left and the app being reloaded: iOS puts a
// Home Screen app down in the background and picks it up fresh more often than anyone notices,
// and a shogi board or a half-solved picross should still be there when it does. Anything that
// JSON can carry is fine; the phone's storage failing (private browsing, a full disk) means
// nothing worse than the value being ordinary state for that session.
import {useEffect,useState} from 'react';
export function useStored(key,initial){
 const [value,setValue]=useState(()=>{try{const s=localStorage.getItem(key);if(s!==null)return JSON.parse(s);}catch{}return typeof initial==='function'?initial():initial;});
 useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}},[key,value]);
 return [value,setValue];
}
