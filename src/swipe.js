// A sideways swipe, told apart from a scroll. The app turns the guide, the tickets, the daily
// phrase and now the phrasebook this way, and they should all agree on what a swipe is — a
// page that turns at a flick when the one before it needed a shove is worse than either.
export const SWIPE={across:55,down:45};
// -1 back, 1 on, 0 for anything that was not a sideways swipe. Far enough across AND not far
// down, because a diagonal drag during a scroll is a scroll.
export function swipeDelta(start,end,limits=SWIPE){
 if(!start||!end||!Number.isFinite(start.x)||!Number.isFinite(end.x))return 0;
 const across=end.x-start.x,down=end.y-start.y;
 if(Math.abs(across)<limits.across||Math.abs(down)>limits.down)return 0;
 return across<0?1:-1;
}
// The same question the other way up, for the bar along the bottom: a swipe up it opens the
// whole menu, a swipe down it closes again. 1 for up, -1 for down, 0 for anything that was
// really a sideways swipe or a scroll. The limits are the sideways ones turned over, so a
// flick means the same amount of finger whichever way the app reads it.
export const SWIPE_UP={up:55,across:45};
export function swipeVertical(start,end,limits=SWIPE_UP){
 if(!start||!end||!Number.isFinite(start.y)||!Number.isFinite(end.y))return 0;
 const up=start.y-end.y,across=end.x-start.x;
 if(Math.abs(up)<limits.up||Math.abs(across)>limits.across)return 0;
 return up>0?1:-1;
}
// A drag that began on something you press is not a page turn. Audio is in the list because a
// recorded phrase has a scrub bar, and dragging that must not turn the card.
const CONTROLS=['BUTTON','A','INPUT','SELECT','TEXTAREA','AUDIO','SUMMARY','LABEL'];
export const isControl=tag=>CONTROLS.includes(String(tag||'').toUpperCase());
// Whether an arrow key belongs to whatever has focus. This is a different question from
// isControl: a focused BUTTON does nothing with an arrow key, so swallowing it there leaves
// the keyboard looking broken after every tap — which is exactly what it did.
const TYPING=['INPUT','TEXTAREA','SELECT'];
export const typesText=target=>!!target&&
 (TYPING.includes(String(target.tagName||'').toUpperCase())||target.isContentEditable===true);
// Never off either end, and never a move that goes nowhere — one place decides, so a swipe, a
// key and a button cannot drift apart.
export const stepIndex=(index,delta,length)=>{
 const next=Math.min(Math.max(0,length-1),Math.max(0,index+delta));
 return next===index?index:next;
};
