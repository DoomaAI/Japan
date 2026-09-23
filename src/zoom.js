// The arithmetic behind pinch-to-zoom on a photo, kept apart from React so it can be tested.
// A view is {s,x,y}: the picture is scaled by s from its top-left corner and then moved by x,y,
// all in the frame's own pixels. At s=1 it sits exactly as the page laid it out.
export const MIN_ZOOM=1,MAX_ZOOM=5,TAP_ZOOM=2.5;
export const REST={s:1,x:0,y:0};

// The picture is never shrunk below its fitted size, and never dragged so far that a gap opens
// between its edge and the frame's.
export function clampView({s,x,y},w,h){
 s=Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,s));
 if(s===1)return REST;
 return {s,x:Math.min(0,Math.max(w-w*s,x)),y:Math.min(0,Math.max(h-h*s,y))};
}

// Zooming to scale s about a point keeps whatever was under that point under it — which is what
// makes a pinch feel as though the fingers are holding the picture.
export function zoomAbout(view,s,px,py,w,h){
 const cx=(px-view.x)/view.s,cy=(py-view.y)/view.s;
 return clampView({s,x:px-cx*s,y:py-cy*s},w,h);
}

// A pinch starts from the view as it was when the second finger landed, not from wherever the
// last frame left it, so the scale follows the fingers rather than compounding on itself. The
// midpoint moving carries the picture with it, so two fingers can pan as well as zoom.
export function pinchView(start,from,to,w,h){
 const cx=(from.mx-start.x)/start.s,cy=(from.my-start.y)/start.s,s=start.s*(to.d/from.d);
 return clampView({s,x:to.mx-cx*s,y:to.my-cy*s},w,h);
}

// A double tap goes in on the spot that was tapped, and a second one comes back out.
export function tapView(view,px,py,w,h){
 return view.s>1?REST:zoomAbout(view,TAP_ZOOM,px,py,w,h);
}
