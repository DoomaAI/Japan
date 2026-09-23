export const LAST_PAGE=72;
// How far a zoomed page may be dragged before its edge would come away from the screen's.
export const panLimit=(scale,width,height)=>({x:Math.max(0,(scale-1)*width/2),y:Math.max(0,(scale-1)*height/2)});
// The guide laid open as a magazine is: the cover alone on the right, then even pages on the
// left facing odd on the right, and the back page alone on the left. [left, right], with null
// for the side that has nothing on it.
export function spreadOf(page,last=LAST_PAGE){
 const n=Math.min(last,Math.max(1,Math.round(page)||1));
 if(n===1)return [null,1];
 return n%2===0?[n,n+1<=last?n+1:null]:[n-1,n];
}
// The page to land on after a turn, or null off either cover. One page at a time it is the
// next page; open as a spread it is the first page of the next spread either way, whichever
// page of this one we were on — so going back to one page shows the left of the pair.
export function stepPage(page,dir,spread,last=LAST_PAGE){
 if(!spread){const to=page+dir;return to>=1&&to<=last?to:null;}
 const [l,r]=spreadOf(page,last),to=dir>0?(r??l)+1:(l??r)-1;
 if(to<1||to>last)return null;
 const [nl,nr]=spreadOf(to,last);
 return nl??nr;
}
