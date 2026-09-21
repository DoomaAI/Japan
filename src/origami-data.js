// Origami, folded by the app rather than drawn by hand.
//
// Every diagram in here is COMPUTED. A model is a square of paper and a list of folds, and the
// picture at each step is worked out by actually folding the polygon — reflecting whichever
// part of it is being turned over across the crease. Nothing is hand-placed, so no step can
// quietly disagree with the one before it, and a fold that would not work does not draw.
//
// The layers are a STACK, so a fold can say "the front flap only" — which is what a paper cup's
// rim and a samurai helmet's horns are, and folding every layer instead collapses the paper
// into slivers.
//
// What it still cannot do is a collapse: a crane's petal fold, or the base a jumping frog sits
// on, where the paper opens out and flattens a different way. That is not a reflection of a
// polygon, so it is not in here pretending to be.
export const PAPER=[[10,10],[90,10],[90,90],[10,90]];
// Where the paper has got to, so a diagram can be drawn at a size you can see.
export function boundsOf(layers){
 const points=layers.flat();
 if(!points.length)return null;
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}
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
// Is this point inside this piece of paper? Used to say WHICH flap a fold means, which
// "the front one" cannot: once you have folded one horn up, the front layer is that horn.
export function insidePoly(poly,[x,y]){
 let inside=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [xi,yi]=poly[i],[xj,yj]=poly[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
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
// THE LAYERS ARE A STACK. Index 0 is the sheet at the bottom, the last one is the face you are
// looking at. Keeping that order is what makes "the front flap only" a thing that can be said:
// without it there is no front.
//
// `only` picks what moves: every layer with something on that side, the topmost, the bottom
// one, or — the one that is actually reliable — `{at:[x,y]}`, meaning the topmost flap with
// that point inside it. A paper cup's rim and a samurai helmet's horns are single-flap folds,
// and folding all the layers instead collapses the paper into slivers.
export function foldLayers(layers,a,b,move,only='all'){
 const parts=layers.map(layer=>({
  stays:clipToSide(layer,a,b,-move),
  turns:clipToSide(layer,a,b,move)
 }));
 const movable=parts.map((part,i)=>part.turns.length>2?i:-1).filter(i=>i>=0);
 if(!movable.length)return layers;
 // `only` is a string most of the time, and 'all'.at is String.prototype.at — a function, not
 // a point. Ask for the object before reaching into it.
 const at=only&&typeof only==='object'?only.at:null;
 const here=at?movable.filter(i=>insidePoly(layers[i],at)):[];
 const chosen=new Set(
  at?(here.length?[here[here.length-1]]:[])
  :only==='front'?[movable[movable.length-1]]
  :only==='back'?[movable[0]]
  :movable);
 if(!chosen.size)return layers;
 const stays=[],turned=[];
 layers.forEach((layer,i)=>{
  if(!chosen.has(i))return stays.push(layer);
  if(parts[i].stays.length>2)stays.push(parts[i].stays);
  turned.push(parts[i].turns.map(p=>reflect(p,a,b)));
 });
 // Folding a stack over reverses it — whatever was underneath ends up on top. A diagram that
 // got that backwards would show the wrong face and put the next front flap in the wrong place.
 return [...stays,...turned.reverse()];
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
export function flipLayers(layers){
 const b=boundsOf(layers);
 const axis=b?(b.minX+b.maxX)/2:50;
 // Mirrored about the paper rather than about the middle of the picture, so turning it over
 // leaves it where it was — and the stack reverses, because the back is now the front.
 return layers.map(layer=>layer.map(([x,y])=>[2*axis-x,y])).reverse();
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
// Moving the creases with the paper. A crease is a line ON the sheet, so when the sheet is
// turned or spun the line goes with it — a guide line left behind where the paper used to be
// is worse than no guide line.
const moveLine=(line,move)=>{const [[a],[b]]=[move([line[0]]),move([line[1]])];return [a,b];};
// Play a model's folds through and keep the picture after each one, so a step can be shown
// without replaying everything before it. Creases are remembered: folding and unfolding leaves
// a line you line the next fold up against, and half of learning a plane is those lines.
export function foldThrough(model){
 let layers=[model.paper||PAPER],creases=[];
 const frames=[{layers,creases}];
 for(const step of model.steps){
  const spec=foldSpec(step.fold||step.crease);
  if(step.crease&&spec){
   // Folded and opened out again: the paper is where it was and there is a line on it now.
   creases=[...creases,creaseInBox(spec.crease,boundsOf(layers))].filter(Boolean);
  }else if(spec&&step.fold){
   layers=foldLayers(layers,spec.crease[0],spec.crease[1],spec.move,step.fold.only);
  }else if(step.turn){
   layers=flipLayers(layers);
   const axis=(boundsOf(layers).minX+boundsOf(layers).maxX)/2;
   creases=creases.map(line=>moveLine(line,pts=>pts.map(([x,y])=>[2*axis-x,y])));
  }else if(step.rotate){
   const spun=rotateLayers(layers,step.rotate);
   const before=boundsOf(spun);
   layers=fitLayers(spun);
   const after=boundsOf(layers);
   const scale=(after.maxX-after.minX)/(before.maxX-before.minX||1);
   const shift=([x,y])=>[after.minX+(x-before.minX)*scale,after.minY+(y-before.minY)*scale];
   creases=creases.map(line=>moveLine(rotateLayers([line],step.rotate)[0].map(p=>p),pts=>pts.map(shift)));
  }
  frames.push({layers,creases});
 }
 return frames;
}
// The picture for one step: the paper as it is BEFORE the step, with the crease and the arrow
// for what you are about to do — which is what a diagram is. The last frame is the finished
// thing with nothing drawn on it.
export function stepFrames(model){
 const frames=foldThrough(model);
 return model.steps.map((step,i)=>({...step,index:i,layers:frames[i].layers,creases:frames[i].creases,after:frames[i+1].layers}))
  .concat([{say:model.finish,index:model.steps.length,layers:frames.at(-1).layers,creases:frames.at(-1).creases,done:true}]);
}
const cup={
 id:'cup',name:'Paper cup',ja:'紙コップ',romaji:'kami koppu',icon:'🥤',minutes:4,level:'Easy',
 about:'It really does hold water, for about a minute — long enough for a mouthful at a drinking fountain, or for a handful of sweets.',
 finish:'Put your thumbs in the top and open it out. Fill it quickly.',
 steps:[
  {say:'Plain side up. Fold it corner to corner and press the crease hard with your thumbnail.',
   fold:{bring:[10,10],to:[90,90]}},
  {say:'Turn it round so the long edge is at the bottom and the point is at the top.',rotate:-135},
  {say:'Fold the right corner up and across, so its tip lands halfway along the opposite edge.',
   fold:{bring:[90,70],to:[30,50]}},
  {say:'Fold the left corner across the same way. The two edges should lie right on top of each other.',
   fold:{bring:[10,70],to:[70,50]}},
  {say:'Fold the front point down over the front — only the top layer, not both.',
   fold:{through:[[0,45],[100,45]],moving:[50,30],only:'front'}},
  {say:'Turn the whole thing over.',turn:true},
  {say:'Fold that point down too, the same way. Now both sides are tucked in.',
   fold:{through:[[0,45],[100,45]],moving:[50,30],only:'front'}}
 ]
};
const helmet={
 id:'helmet',name:'Samurai helmet',ja:'かぶと',romaji:'kabuto',icon:'🪖',minutes:5,level:'A bit harder',
 about:'The kabuto a samurai wore. Japanese children fold these for Children\u2019s Day, and from a sheet of newspaper it comes out big enough to put on your head.',
 finish:'Open the bottom and wear it. Bigger paper makes a bigger helmet — newspaper is about right for a boy.',
 steps:[
  {say:'Plain side up. Fold it corner to corner so you have a triangle.',
   fold:{bring:[10,10],to:[90,90]}},
  {say:'Turn it so the long edge is along the top and the point hangs down.',rotate:45},
  {say:'Fold the left corner straight down to the bottom point.',
   fold:{bring:[10,30],to:[50,70]}},
  {say:'Fold the right corner down to the bottom point as well. Now it is a diamond.',
   fold:{bring:[90,30],to:[50,70]}},
  {say:'Take the top flap on the right — just that one — and fold its point up and out past the top. That is one horn.',
   fold:{bring:[70,50],to:[80,28],only:{at:[64,51]}}},
  {say:'Do the same with the top flap on the left. Two horns.',
   fold:{bring:[30,50],to:[20,28],only:{at:[36,51]}}},
  {say:'Now the front bottom layer: fold its point up so the edge sits across the middle. That is the brim.',
   fold:{through:[[0,58],[100,58]],moving:[50,70],only:{at:[50,66]}}},
  {say:'Fold that brim up once more, over itself, and press the whole thing flat.',
   fold:{through:[[0,50],[100,50]],moving:[50,56],only:{at:[50,53]}}}
 ]
};
const fox={
 id:'fox',name:'Fox face',ja:'きつね',romaji:'kitsune',icon:'🦊',minutes:2,level:'Easiest',
 about:'Three folds and a face. Foxes turn up everywhere in Japan — every Inari shrine has a pair of stone ones guarding the gate.',
 finish:'Draw two eyes and a nose on it. Hold it by the chin and it can talk.',
 steps:[
  {say:'Plain side up. Fold it corner to corner into a triangle.',
   fold:{bring:[10,10],to:[90,90]}},
  {say:'Turn it so the long edge is along the top.',rotate:45},
  {say:'Fold the left corner down and in, about a third of the way across.',
   fold:{bring:[10,30],to:[38,62]}},
  {say:'Fold the right corner down to match. Those two are the ears.',
   fold:{bring:[90,30],to:[62,62]}}
 ]
};
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
const A4=[[26,16],[74,16],[74,84],[26,84]];
// Paper planes. All flat folds, which is why they work here — and the centre crease you make
// first and then open out is the line every later fold is lined up against.
const dart={
 id:'dart',name:'Dart',ja:'かみひこうき',romaji:'kami hikōki',icon:'🛩️',minutes:2,level:'Easiest',
 paper:A4,
 about:'The one everybody knows. Thin, heavy at the front, and it goes a long way in a straight line. Throw it hard.',
 finish:'Hold it underneath, at the thickest part, and throw it level and hard. It wants speed, not height.',
 steps:[
  {say:'A sheet of paper, the long way up. Fold it in half down the middle, then open it out again — you only want the line.',
   crease:{through:[[50,0],[50,100]],moving:[30,50]}},
  {say:'Fold the top left corner in so its edge lies along that middle line.',
   fold:{bring:[26,16],to:[50,40]}},
  {say:'Fold the top right corner in the same way. It comes to a point.',
   fold:{bring:[74,16],to:[50,40]}},
  {say:'Fold the new left edge in to the middle line again, from the point downwards.',
   fold:{bring:[26,40],to:[50,64]}},
  {say:'And the right edge the same. The nose is getting long and thin now.',
   fold:{bring:[74,40],to:[50,64]}},
  {say:'Fold the whole thing in half along the middle line, so the flaps end up on the outside.',
   fold:{through:[[50,0],[50,100]],moving:[30,50]}},
  {say:'Fold the front wing down to meet the bottom edge.',
   fold:{through:[[0,58],[100,58]],moving:[60,30],only:'front'}},
  {say:'Turn it over and fold the other wing down to match.',turn:true},
  {say:'Fold that wing down too, and line the two up against each other.',
   fold:{through:[[0,58],[100,58]],moving:[60,30],only:'front'}}
 ]
};
const glider={
 id:'glider',name:'Glider',ja:'グライダー',romaji:'guraidā',icon:'✈️',minutes:3,level:'Easy',
 paper:A4,
 about:'Blunt nose, wide wings. It will not go as far as the dart but it stays up much longer — throw it gently and it floats across the room.',
 finish:'Hold it underneath and let it go, level and slow. Thrown hard it just loops.',
 steps:[
  {say:'The long way up. Fold in half down the middle and open it out again.',
   crease:{through:[[50,0],[50,100]],moving:[30,50]}},
  {say:'Fold the top edge down about a fifth of the way. That blunt nose is what keeps it in the air.',
   fold:{through:[[0,30],[100,30]],moving:[50,20]}},
  {say:'Fold the top left corner in to the middle line.',
   fold:{bring:[26,30],to:[50,54]}},
  {say:'Fold the top right corner in to match.',
   fold:{bring:[74,30],to:[50,54]}},
  {say:'Fold the whole thing in half along the middle line.',
   fold:{through:[[50,0],[50,100]],moving:[30,50]}},
  {say:'Fold the front wing down, leaving a finger-width of body underneath.',
   fold:{through:[[0,48],[100,48]],moving:[60,30],only:'front'}},
  {say:'Turn the whole thing over, keeping the nose pointing the same way.',turn:true},
  {say:'Fold the other wing down to match it exactly, or it will fly in circles.',
   fold:{through:[[0,48],[100,48]],moving:[60,30],only:'front'}}
 ]
};
const hammer={
 id:'hammer',name:'Wide wing',ja:'ひろつばさ',romaji:'hirotsubasa',icon:'🪁',minutes:3,level:'Easy',
 paper:A4,
 about:'Short, fat and slow, with a wing almost as wide as it is long. It hangs in the air and turns. The one to throw indoors.',
 finish:'Throw it softly, nose slightly up. Bend the back corners of the wings up a touch and it will climb.',
 steps:[
  {say:'The long way up. Fold in half down the middle and open it out again.',
   crease:{through:[[50,0],[50,100]],moving:[30,50]}},
  {say:'Fold the top edge down a long way — about a third of the sheet. That is what makes the nose heavy and the wings wide.',
   fold:{through:[[0,44],[100,44]],moving:[50,20]}},
  {say:'Fold the top left corner down to the middle line.',
   fold:{bring:[26,44],to:[50,66]}},
  {say:'Fold the top right corner down to match it.',
   fold:{bring:[74,44],to:[50,66]}},
  {say:'Fold the whole thing in half along the middle line.',
   fold:{through:[[50,0],[50,100]],moving:[30,50]}},
  {say:'Fold the front wing down, right down near the bottom edge.',
   fold:{through:[[0,56],[100,56]],moving:[60,40],only:'front'}},
  {say:'Turn it over and fold the last wing down to match.',turn:true},
  {say:'Fold it down, and press every crease hard.',
   fold:{through:[[0,56],[100,56]],moving:[60,40],only:'front'}}
 ]
};
export const ORIGAMI=[fox,hat,cup,helmet,dart,glider,hammer];
export const modelById=id=>ORIGAMI.find(m=>m.id===id)||null;
export const origamiGame=id=>`origami-${id}`;
