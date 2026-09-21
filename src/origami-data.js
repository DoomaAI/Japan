// Origami, folded by the app rather than drawn by hand.
//
// Every diagram in here is COMPUTED. A model is a square of paper and a list of folds, and the
// picture at each step is worked out by actually folding the polygon — reflecting whichever
// part of it is being turned over across the crease. Nothing is hand-placed, so no step can
// quietly disagree with the one before it, and a fold that would not work does not draw.
//
// Two things it cannot do yet, and both are honest limits rather than oversights.
//
// It folds EVERY layer. A real instruction often says "the front flap only" — the rim of a
// paper cup, the horns of a samurai helmet — and folding all of them instead collapses the
// paper into slivers. So the models here are the ones whose every fold really does go through
// all the layers at once.
//
// And it only does flat folds. A crane needs petal and reverse folds, where the paper opens
// out and flattens a different way; that cannot be drawn by reflecting a polygon, so it is
// not in here pretending to be.
export const PAPER=[[10,10],[90,10],[90,90],[10,90]];
// Which side of the crease a point falls on. Zero means on the line itself.
export const sideOf=([x,y],[ax,ay],[bx,by])=>{
 const cross=(bx-ax)*(y-ay)-(by-ay)*(x-ax);
 return Math.abs(cross)<1e-9?0:Math.sign(cross);
};
// A point flipped over the crease, which is all a fold is.
export function reflect([x,y],[ax,ay],[bx,by]){
 const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy;
 if(!d)return [x,y];
 const t=((x-ax)*dx+(y-ay)*dy)/d;
 return [2*(ax+t*dx)-x,2*(ay+t*dy)-y];
}
const meet=(p,q,a,b)=>{
 const [x1,y1]=p,[x2,y2]=q,[x3,y3]=a,[x4,y4]=b;
 const d=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
 if(Math.abs(d)<1e-9)return null;
 const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/d;
 return [x1+t*(x2-x1),y1+t*(y2-y1)];
};
const same=(p,q)=>Math.abs(p[0]-q[0])<1e-6&&Math.abs(p[1]-q[1])<1e-6;
const tidy=points=>points.filter((p,i)=>!same(p,points[(i+1)%points.length]));
// The part of a polygon on one side of the crease, cut cleanly along it.
export function clipToSide(poly,a,b,keep){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length];
  const sp=sideOf(p,a,b),sq=sideOf(q,a,b);
  if(sp===0||sp===keep)out.push(p);
  if(sp!==0&&sq!==0&&sp!==sq){const x=meet(p,q,a,b);if(x)out.push(x);}
 }
 return tidy(out);
}
// Fold every layer over the crease. Whatever is on the `move` side is reflected; the rest
// stays where it is. Layers that vanish entirely are dropped rather than drawn as slivers.
export function foldLayers(layers,a,b,move){
 const next=[];
 for(const layer of layers){
  const stays=clipToSide(layer,a,b,-move);
  const turns=clipToSide(layer,a,b,move);
  if(stays.length>2)next.push(stays);
  if(turns.length>2)next.push(turns.map(p=>reflect(p,a,b)));
 }
 return next;
}
export const rotateLayers=(layers,degrees,about=[50,50])=>{
 const r=degrees*Math.PI/180,cos=Math.cos(r),sin=Math.sin(r);
 return layers.map(layer=>layer.map(([x,y])=>{
  const dx=x-about[0],dy=y-about[1];
  return [about[0]+dx*cos-dy*sin,about[1]+dx*sin+dy*cos];
 }));
};
// Turning it over is a mirror, and it has to be one: a fold made on the back of the paper
// lands in the mirrored place, and a diagram that forgot that would teach the wrong crease.
export const flipLayers=(layers,about=50)=>layers.map(layer=>layer.map(([x,y])=>[2*about-x,y]));
// Where the paper has got to, so a diagram can be drawn at a size you can see.
export function boundsOf(layers){
 const points=layers.flat();
 if(!points.length)return null;
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}
// Re-centre and re-scale so the paper always fills the picture. Without this a rotation walks
// the shape off the edge of the box and the step that needs looking at hardest is the one you
// cannot see.
export function fitLayers(layers,box=100,margin=10){
 const b=boundsOf(layers);
 if(!b)return layers;
 const w=b.maxX-b.minX,h=b.maxY-b.minY,span=Math.max(w,h);
 if(span<1e-9)return layers;
 const scale=(box-margin*2)/span;
 const dx=margin+(box-margin*2-w*scale)/2,dy=margin+(box-margin*2-h*scale)/2;
 return layers.map(layer=>layer.map(([x,y])=>[dx+(x-b.minX)*scale,dy+(y-b.minY)*scale]));
}
// The crease that lands one point exactly on another — which is what an origami instruction
// actually says. "Fold this corner to that corner" is a thing you can follow; "fold along the
// line from 24,64 to 72,36" is not, and guessing those numbers is how the diagrams went wrong.
export function creaseBringing([px,py],[qx,qy],length=400){
 const mx=(px+qx)/2,my=(py+qy)/2;
 const dx=qx-px,dy=qy-py,d=Math.hypot(dx,dy);
 if(d<1e-9)return null;
 const ux=-dy/d,uy=dx/d;
 return [[mx-ux*length,my-uy*length],[mx+ux*length,my+uy*length]];
}
// A fold, however it was described, together with WHICH SIDE MOVES — worked out from the point
// that is being folded rather than written down as a plus or a minus. A sign copied wrongly is
// invisible in the source and obvious in the diagram, and this removes the chance of it.
export function foldSpec(fold){
 if(!fold)return null;
 const crease=fold.through||(fold.bring&&fold.to?creaseBringing(fold.bring,fold.to):null);
 const moving=fold.moving||fold.bring;
 if(!crease||!moving)return null;
 const move=sideOf(moving,crease[0],crease[1]);
 return move?{crease,move}:null;
}
export const creaseOf=fold=>foldSpec(fold)?.crease||null;
// The crease trimmed to the edges of the picture. A perpendicular bisector is an infinite
// line, and drawn as one it runs off the card and stops looking like a fold in a piece of paper.
export function creaseInBox(crease,bounds,over=0){
 if(!crease||!bounds)return null;
 const box={minX:bounds.minX-over,maxX:bounds.maxX+over,minY:bounds.minY-over,maxY:bounds.maxY+over};
 const [[ax,ay],[bx,by]]=crease,dx=bx-ax,dy=by-ay;
 let lo=-Infinity,hi=Infinity;
 for(const [p,d,lowest,highest] of [[ax,dx,box.minX,box.maxX],[ay,dy,box.minY,box.maxY]]){
  if(Math.abs(d)<1e-9){if(p<lowest||p>highest)return null;continue;}
  const t0=(lowest-p)/d,t1=(highest-p)/d;
  lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));
 }
 if(!(hi>lo))return null;
 return [[ax+dx*lo,ay+dy*lo],[ax+dx*hi,ay+dy*hi]];
}
// Play a model's folds through and keep the picture after each one, so a step can be shown
// without replaying everything before it.
export function foldThrough(model){
 let layers=[model.paper||PAPER];
 const frames=[layers];
 for(const step of model.steps){
  const spec=foldSpec(step.fold);
  if(spec)layers=foldLayers(layers,spec.crease[0],spec.crease[1],spec.move);
  else if(step.turn)layers=flipLayers(layers);
  else if(step.rotate)layers=fitLayers(rotateLayers(layers,step.rotate));
  frames.push(layers);
 }
 return frames;
}
// The picture for one step: the paper as it is BEFORE the step, with the crease and the arrow
// for what you are about to do — which is what a diagram is. The last frame is the finished
// thing with nothing drawn on it.
export function stepFrames(model){
 const frames=foldThrough(model);
 return model.steps.map((step,i)=>({...step,index:i,layers:frames[i],after:frames[i+1]}))
  .concat([{say:model.finish,index:model.steps.length,layers:frames[frames.length-1],done:true}]);
}
const hat={
 id:'hat',name:'Paper hat',ja:'ぼうし',romaji:'bōshi',icon:'👒',minutes:3,level:'Easiest',
 paper:[[25,5],[75,5],[75,95],[25,95]],
 about:'Four folds from a sheet of newspaper and it fits on your head. Open it out flat again and the same thing floats as a boat.',
 finish:'Pull the two sides apart and it opens out. On your head it is a hat; on the water it is a boat.',
 steps:[
  {say:'A sheet of newspaper, the long way up. Fold it in half downwards, so the fold is along the top.',
   fold:{through:[[0,50],[100,50]],moving:[50,20]}},
  {say:'Fold the top left corner down and in, so its edge sits along the middle.',
   fold:{bring:[25,50],to:[50,75]}},
  {say:'Fold the top right corner down the same way. Now it looks like a roof with a strip underneath.',
   fold:{bring:[75,50],to:[50,75]}},
  {say:'Fold that strip up along the bottom of the roof, front and back together. Press it all flat.',
   fold:{through:[[0,75],[100,75]],moving:[50,90]}}
 ]
};
export const ORIGAMI=[hat];
export const modelById=id=>ORIGAMI.find(m=>m.id===id)||null;
export const origamiGame=id=>`origami-${id}`;
