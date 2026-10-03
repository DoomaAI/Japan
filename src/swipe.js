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
// A drag already settled as sideways — the card has been following the finger — is judged on
// how far across it went alone: a thumb arcs, and drifting down on the way must not snap the
// card back after it visibly moved. A short quick flick counts too. ms is how long the finger
// was down. -1 back, 1 on, 0 stay.
export const FLICK={least:20,speed:.35};
export function dragTurn(dx,ms,limits=SWIPE,flick=FLICK){
 if(!Number.isFinite(dx))return 0;
 const far=Math.abs(dx)>=limits.across;
 const quick=Math.abs(dx)>=flick.least&&Number.isFinite(ms)&&ms>0&&Math.abs(dx)/ms>=flick.speed;
 return far||quick?(dx<0?1:-1):0;
}
// Which way a drag is going, decided once, at the first few pixels: 'x' sideways, 'y' a
// scroll, null not yet. Once decided it stays, so a scroll never turns into a swipe halfway.
export const dragAxis=(dx,dy,slop=8)=>Math.max(Math.abs(dx),Math.abs(dy))<slop?null:Math.abs(dx)>Math.abs(dy)?'x':'y';
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
// How far over the page is, 0 flat to 1 fully turned. The point of the page that was picked up
// stays under the finger: grabbed g from the spine and moved dx towards it, that point sits at
// g·cos(angle) from the spine, so the angle is the one that puts it where the finger is now.
// Picked up right by the spine it would whip over at a touch, so the reach never counts as less
// than a third of the page. A cover that cannot turn only gives a little, so it is plain there
// is nothing there.
export const leafProgress=(dx,grab,width,dir,open)=>{
 const reach=Math.max(grab,width/3,1),toward=dir>0?-dx:dx;
 const p=Math.acos(Math.min(1,Math.max(-1,1-Math.max(0,toward)/reach)))/Math.PI;
 return open?p:Math.min(p,.08);
};
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
// A card flung off the suggestion deck, as on a dating app: right to keep, left to pass. It
// goes when it is dragged a good way over, or flicked fast the way it is already leaning — a
// card dragged right and then pulled back towards the middle is a change of mind, and stays. A mostly-downward drag
// is a scroll of the page and never decides anything. 1 keep, -1 pass, 0 back to the middle.
export const FLING={share:.3,least:90,speed:.6,nudge:30};
export function flingDirection(dx,dy,width,vx=0,limits=FLING){
 if(!Number.isFinite(dx))return 0;
 if(Number.isFinite(dy)&&Math.abs(dy)>Math.abs(dx))return 0;
 const far=Math.max(limits.least,(width||0)*limits.share);
 if(Math.abs(dx)>=far)return dx>0?1:-1;
 if(Number.isFinite(vx)&&Math.abs(vx)>=limits.speed&&Math.abs(dx)>=limits.nudge&&Math.sign(vx)===Math.sign(dx))return vx>0?1:-1;
 return 0;
}
// How much the card leans while it is held, and how sure the stamp on it is: both follow the
// finger, and both stop at the point where letting go would decide.
export const cardTilt=(dx,width)=>Math.max(-15,Math.min(15,dx/Math.max(width||0,1)*20));
export const stampStrength=(dx,width,limits=FLING)=>Math.min(1,Math.abs(dx)/Math.max(limits.least,(width||0)*limits.share));
