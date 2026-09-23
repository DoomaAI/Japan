// A thing being dragged stays under the finger, rather than sitting still until it is let go
// and then jumping. The tile games and the timeline both lift something this way, so they share
// how it follows, what it is dropped on and how it goes back.
const still=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
// The dragged thing is under the finger itself, so what it is dropped on is the first match
// beneath it rather than the top of the stack.
export function underFinger(x,y,selector,lifted){
 if(typeof document==='undefined'||!document.elementsFromPoint)return null;
 for(const el of document.elementsFromPoint(x,y)){
  const hit=el.closest(selector);
  if(hit&&hit!==lifted&&!lifted?.contains(hit))return hit;
 }
 return null;
}
export function follow(el,dx,dy){
 if(!el)return;
 el.style.transition='none';
 el.style.transform=`translate(${dx}px,${dy}px)`;
}
// Dropped somewhere that took it: it is already where it belongs, so no glide back. Dropped on
// nothing: it slides home, so it is plain the drag did not count.
export function settle(el,home){
 if(!el)return;
 if(!home||still()){el.style.transition='';el.style.transform='';return;}
 el.style.transition='transform .2s ease';
 el.style.transform='';
 setTimeout(()=>{if(!el.style.transform)el.style.transition='';},220);
}
