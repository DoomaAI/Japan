import {createContext,useContext} from 'react';
import {createPortal} from 'react-dom';
// The slot at the end of a Home card's heading bar. A card that pages through several (the phrase,
// fact and tip of the day) puts its count and arrows there, on the heading's own line, rather than
// on a row of their own under it. Null outside Home, where a card draws them itself.
export const HomeBarSlot=createContext(null);
// What a card would say on its own heading line goes in the bar instead when there is one, so the
// card's title is said once; anywhere else the card draws its own heading, the fallback.
export function InBar({children,fallback=null}){
 const slot=useContext(HomeBarSlot);
 return slot?children==null?null:createPortal(children,slot):fallback;
}
