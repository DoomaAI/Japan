// Drawing, the way the art channels do it: one line at a time, with the line being drawn in
// front of you rather than appearing finished. Everything here is geometry rather than
// pictures — a subject is a list of steps, a step is a list of shapes, and every shape turns
// into an SVG path. Nothing is a file, so the whole game works with no signal, and a shape
// can be moved and shrunk, which is what lets a beast crest be drawn full size on its own and
// again as the decal in the middle of a spinner top without being drawn twice.
const R=n=>Math.round(n*1000)/1000;
const num=n=>Number.isFinite(n);
// Degrees, clockwise from the top, because that is how a child describes a circle — twelve
// o'clock, three o'clock — and how the blades of a top are counted off.
export const polar=(cx,cy,r,deg)=>{const a=(deg-90)*Math.PI/180;return [R(cx+r*Math.cos(a)),R(cy+r*Math.sin(a))];};
const pair=p=>Array.isArray(p)&&p.length>=2&&num(p[0])&&num(p[1]);
const points=list=>Array.isArray(list)&&list.length>1&&list.every(pair);
// A smooth line through the points rather than at them: Catmull-Rom converted to cubics, so
// a face outline is written as the half dozen places it passes through and not as a string of
// control points nobody can read or check.
function curvePath(list,closed){
 const n=list.length;
 if(n===2)return `M${R(list[0][0])},${R(list[0][1])}L${R(list[1][0])},${R(list[1][1])}`;
 const at=i=>closed?list[(i+n)%n]:list[Math.max(0,Math.min(n-1,i))];
 let d=`M${R(list[0][0])},${R(list[0][1])}`;
 for(let i=0;i<(closed?n:n-1);i++){
  const p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
  d+=`C${R(p1[0]+(p2[0]-p0[0])/6)},${R(p1[1]+(p2[1]-p0[1])/6)} ${R(p2[0]-(p3[0]-p1[0])/6)},${R(p2[1]-(p3[1]-p1[1])/6)} ${R(p2[0])},${R(p2[1])}`;
 }
 return closed?`${d}Z`:d;
}
// One shape, one path. A shape that does not describe anything draws nothing rather than
// throwing: a bad line in the roster should cost one line of a picture, not the whole game.
export function pathOf(shape){
 if(!shape||typeof shape!=='object')return '';
 if(shape.line&&shape.line.length===4&&shape.line.every(num)){
  const [x1,y1,x2,y2]=shape.line;return `M${R(x1)},${R(y1)}L${R(x2)},${R(y2)}`;
 }
 if(shape.circle&&num(shape.circle[0])&&num(shape.circle[1])&&shape.circle[2]>0){
  const [cx,cy,r]=shape.circle;
  return `M${R(cx-r)},${R(cy)}a${R(r)},${R(r)} 0 1,0 ${R(r*2)},0a${R(r)},${R(r)} 0 1,0 ${R(-r*2)},0Z`;
 }
 if(shape.ellipse&&num(shape.ellipse[0])&&num(shape.ellipse[1])&&shape.ellipse[2]>0&&shape.ellipse[3]>0){
  const [cx,cy,rx,ry,rot=0]=shape.ellipse,a=rot*Math.PI/180;
  const edge=s=>[R(cx+s*rx*Math.cos(a)),R(cy+s*rx*Math.sin(a))];
  const [x1,y1]=edge(-1),[x2,y2]=edge(1);
  return `M${x1},${y1}A${R(rx)},${R(ry)} ${R(rot)} 0,1 ${x2},${y2}A${R(rx)},${R(ry)} ${R(rot)} 0,1 ${x1},${y1}Z`;
 }
 if(shape.arc&&shape.arc.length>=5&&shape.arc.every(num)&&shape.arc[2]>0){
  const [cx,cy,r,from,to]=shape.arc;
  if(Math.abs(to-from)<0.01)return '';
  const [sx,sy]=polar(cx,cy,r,from),[ex,ey]=polar(cx,cy,r,to);
  return `M${sx},${sy}A${R(r)},${R(r)} 0 ${Math.abs(to-from)>180?1:0},${to>from?1:0} ${ex},${ey}`;
 }
 if(shape.poly&&points(shape.poly)){
  const d=`M${shape.poly.map(([x,y])=>`${R(x)},${R(y)}`).join('L')}`;
  return shape.close===false?d:`${d}Z`;
 }
 if(shape.curve&&points(shape.curve))return curvePath(shape.curve,shape.close!==false&&shape.curve.length>2);
 return '';
}
// What a shape takes up on the card. Used to keep every picture inside its frame, and to drop
// a crest into the middle of a top without measuring anything by hand.
export function shapeBounds(shape){
 const from=list=>({minX:Math.min(...list.map(p=>p[0])),maxX:Math.max(...list.map(p=>p[0])),
  minY:Math.min(...list.map(p=>p[1])),maxY:Math.max(...list.map(p=>p[1]))});
 if(!shape||typeof shape!=='object')return null;
 if(shape.line)return from([[shape.line[0],shape.line[1]],[shape.line[2],shape.line[3]]]);
 if(shape.circle){const [cx,cy,r]=shape.circle;return {minX:cx-r,maxX:cx+r,minY:cy-r,maxY:cy+r};}
 if(shape.ellipse){const [cx,cy,rx,ry]=shape.ellipse,r=Math.max(rx,ry);return {minX:cx-r,maxX:cx+r,minY:cy-r,maxY:cy+r};}
 // An arc is measured off its own circle, because working out where it actually turns is more
 // arithmetic than a frame check is worth.
 if(shape.arc){const [cx,cy,r]=shape.arc;return {minX:cx-r,maxX:cx+r,minY:cy-r,maxY:cy+r};}
 if(shape.poly&&points(shape.poly))return from(shape.poly);
 if(shape.curve&&points(shape.curve))return from(shape.curve);
 return null;
}
export function boundsOf(shapes){
 const all=(shapes||[]).map(shapeBounds).filter(Boolean);
 if(!all.length)return null;
 return {minX:Math.min(...all.map(b=>b.minX)),maxX:Math.max(...all.map(b=>b.maxX)),
  minY:Math.min(...all.map(b=>b.minY)),maxY:Math.max(...all.map(b=>b.maxY))};
}
// Every shape moves and shrinks the same way, so a crest drawn once at full size is also the
// decal in the middle of a top. Uniform scale only — a squashed circle stops being a circle,
// and a crest that means something squashed does not.
export function scaleShape(shape,scale=1,dx=0,dy=0){
 const x=v=>R(v*scale+dx),y=v=>R(v*scale+dy),s=v=>R(v*scale);
 const move=list=>list.map(([px,py])=>[x(px),y(py)]);
 if(!shape||typeof shape!=='object'||!num(scale))return null;
 const keep=({line,circle,ellipse,arc,poly,curve,...rest})=>rest;
 const rest=keep(shape);
 if(shape.line)return {...rest,line:[x(shape.line[0]),y(shape.line[1]),x(shape.line[2]),y(shape.line[3])]};
 if(shape.circle)return {...rest,circle:[x(shape.circle[0]),y(shape.circle[1]),s(shape.circle[2])]};
 if(shape.ellipse){const [cx,cy,rx,ry,rot=0]=shape.ellipse;return {...rest,ellipse:[x(cx),y(cy),s(rx),s(ry),rot]};}
 if(shape.arc){const [cx,cy,r,from,to]=shape.arc;return {...rest,arc:[x(cx),y(cy),s(r),from,to]};}
 if(shape.poly&&points(shape.poly))return {...rest,poly:move(shape.poly),close:shape.close};
 if(shape.curve&&points(shape.curve))return {...rest,curve:move(shape.curve),close:shape.close};
 return null;
}
export const placeShapes=(shapes,scale,dx,dy)=>(shapes||[]).map(s=>scaleShape(s,scale,dx,dy)).filter(Boolean);
// Half a face is drawn and the other half is the same face backwards. Written out twice it
// drifts: one eye ends up a pixel lower than the other and the picture looks wrong without
// anybody being able to say why.
export function mirrorShape(shape,axis=50){
 if(!shape||typeof shape!=='object')return null;
 const x=v=>R(axis*2-v),keep=({line,circle,ellipse,arc,poly,curve,...rest})=>rest;
 const rest=keep(shape),flip=list=>list.map(([px,py])=>[x(px),R(py)]);
 if(shape.line)return {...rest,line:[x(shape.line[0]),R(shape.line[1]),x(shape.line[2]),R(shape.line[3])]};
 if(shape.circle)return {...rest,circle:[x(shape.circle[0]),R(shape.circle[1]),R(shape.circle[2])]};
 if(shape.ellipse){const [cx,cy,rx,ry,rot=0]=shape.ellipse;return {...rest,ellipse:[x(cx),R(cy),R(rx),R(ry),R(-rot)]};}
 // An arc mirrors into the arc going the other way round the clock, from the far end.
 if(shape.arc){const [cx,cy,r,from,to]=shape.arc;return {...rest,arc:[x(cx),R(cy),R(r),R(-to),R(-from)]};}
 if(shape.poly&&points(shape.poly))return {...rest,poly:flip(shape.poly),close:shape.close};
 if(shape.curve&&points(shape.curve))return {...rest,curve:flip(shape.curve),close:shape.close};
 return null;
}
export const mirrored=(shapes,axis=50)=>(shapes||[]).map(s=>mirrorShape(s,axis)).filter(Boolean);
// Both sides at once, which is how a step is spoken as well: "two horns, one each side".
export const bothSides=(shapes,axis=50)=>[...(shapes||[]),...mirrored(shapes,axis)];
// The beasts. Each one is drawn in its own hundred-square box, which is why the same handful
// of steps can be a crest the size of the page and the decal in the middle of a spinner top.
// They are ours rather than anybody's: the real tops in the shops are somebody's drawings, and
// these are drawn here from circles and lines so that a child can copy them and own the result.
export const CRESTS=[
 {id:'dragon',name:'Dragon',ja:'竜',romaji:'ryū',icon:'🐉',blurb:'Horns back, whiskers out, fangs down.',steps:[
  {say:'A big shield shape for the head — wide at the brow, narrow at the chin.',
   shapes:[{curve:[[50,10],[68,18],[78,38],[70,62],[50,80],[30,62],[22,38],[32,18]]}]},
  {say:'Two horns sweeping back off the top, one each side, like a pair of thick leaves.',
   shapes:bothSides([{curve:[[63,26],[78,12],[92,6],[86,21],[71,34]]}])},
  {say:'The eyes are two slanted almonds. Slant them down towards the nose and he looks cross.',
   shapes:bothSides([{curve:[[56,46],[64,38],[73,42],[64,50]]},{line:[56,36,74,32]}])},
  {say:'A wide muzzle across the middle, with a nostril either side of it.',
   shapes:[{curve:[[36,56],[50,63],[64,56]],close:false},{circle:[44,58,2]},{circle:[56,58,2]}]},
  {say:'The mouth underneath, and one fang coming down from each corner.',
   shapes:[{curve:[[34,64],[50,73],[66,64]],close:false},...bothSides([{poly:[[42,69],[45,77],[48,69]]}])]},
  {say:'Two long whiskers curling away from his cheeks, and he is finished.',
   shapes:bothSides([{curve:[[76,52],[88,46],[94,32]],close:false}])}
 ]},
 {id:'tiger',name:'Tiger',ja:'虎',romaji:'tora',icon:'🐯',blurb:'Round face, stripes, and a very flat stare.',steps:[
  {say:'A round face, a little wider at the cheeks than at the top.',
   shapes:[{curve:[[50,12],[70,18],[80,38],[74,62],[50,82],[26,62],[20,38],[30,18]]}]},
  {say:'An ear on each corner of his head — a rounded triangle, not a point.',
   shapes:bothSides([{curve:[[67,21],[76,6],[89,17],[79,31]]}])},
  {say:'Two big round eyes, then a smaller circle inside each one, filled in.',
   shapes:bothSides([{circle:[64,44,7]},{circle:[64,44,3]}])},
  {say:'A little nose like an upside-down triangle, and the mouth as two curves under it.',
   shapes:[{poly:[[43,57],[57,57],[50,65]]},{curve:[[50,65],[44,71],[37,67]],close:false},{curve:[[50,65],[56,71],[63,67]],close:false}]},
  {say:'Now the stripes — one down the middle of his forehead and two on each cheek.',
   shapes:[{poly:[[50,16],[53,27],[50,32],[47,27]]},...bothSides([{poly:[[59,18],[66,27],[61,31],[56,24]]},
    {poly:[[75,40],[88,36],[88,41],[76,43]]},{poly:[[76,49],[89,48],[88,53],[76,52]]}])]},
  {say:'Three whiskers each side and he is done. Keep them long.',
   shapes:bothSides([{line:[66,58,92,55]},{line:[66,61,93,64]},{line:[65,64,88,72]}])}
 ]},
 {id:'phoenix',name:'Phoenix',ja:'鳳凰',romaji:'hōō',icon:'🔥',blurb:'Wings up, tail down, everything on fire.',steps:[
  {say:'A small round head near the top, with a beak pointing out to the side.',
   shapes:[{circle:[50,30,9]},{poly:[[58,29],[68,33],[58,36]]},{circle:[53,28,1.6]}]},
  {say:'The body underneath, like a teardrop hanging off the head.',
   shapes:[{curve:[[50,38],[63,54],[58,72],[50,80],[42,72],[37,54]]}]},
  {say:'A wing on each side, thrown up high — a long leaf shape from the shoulder to the top corner.',
   shapes:bothSides([{curve:[[58,48],[72,38],[92,12],[86,44],[64,58]]}])},
  {say:'Three tail feathers trailing down from the bottom of the body.',
   shapes:[{curve:[[50,74],[56,84],[50,97],[44,84]]},...bothSides([{curve:[[44,77],[37,87],[25,96],[40,84]]}])]},
  {say:'A flame of feathers off the top of his head, and the phoenix is finished.',
   shapes:[{curve:[[45,23],[38,10],[50,15],[46,2]],close:false},{curve:[[52,22],[58,10],[56,18],[62,8]],close:false}]}
 ]},
 {id:'beetle',name:'Beetle',ja:'兜虫',romaji:'kabutomushi',icon:'🪲',blurb:'The rhinoceros beetle, horn and all.',steps:[
  {say:'A big oval for the shell — this is most of the beetle.',
   shapes:[{ellipse:[50,62,24,30]}]},
  {say:'A small oval on top for his head.',
   shapes:[{ellipse:[50,30,11,9]}]},
  {say:'The horn: up from the head, then split into two prongs like a Y.',
   shapes:[{curve:[[46,26],[45,16],[38,6]],close:false},{curve:[[54,26],[55,16],[62,6]],close:false},{line:[46,20,54,20]}]},
  {say:'A line straight down the middle of the shell, where the wing cases meet.',
   shapes:[{line:[50,34,50,91]},...bothSides([{arc:[50,62,20,203,248]}])]},
  {say:'Three legs each side, bent like elbows, and he is ready to go.',
   shapes:bothSides([{poly:[[72,44],[86,34],[92,40]],close:false},{poly:[[74,60],[90,58],[96,66]],close:false},{poly:[[72,76],[86,84],[88,94]],close:false}])}
 ]},
 {id:'fox',name:'Fox',ja:'狐',romaji:'kitsune',icon:'🦊',blurb:'The shrine fox, with a very pointed chin.',steps:[
  {say:'A face that comes to a point at the chin — wide at the top, narrow at the bottom.',
   shapes:[{curve:[[50,18],[68,26],[76,46],[58,68],[50,78],[42,68],[24,46],[32,26]]}]},
  {say:'Two tall pointed ears, leaning outwards.',
   shapes:bothSides([{poly:[[60,26],[76,2],[82,30]]}])},
  {say:'Slanted eyes, higher at the outside than at the nose.',
   shapes:bothSides([{curve:[[56,46],[64,39],[73,44],[64,50]]}])},
  {say:'A small nose at the point, and a mouth going out to each side of it.',
   shapes:[{poly:[[46,57],[54,57],[50,63]]},{curve:[[50,63],[44,68],[38,64]],close:false},{curve:[[50,63],[56,68],[62,64]],close:false}]},
  {say:'Cheek fur sticking out each side, and a mark on his forehead. Done.',
   shapes:[{curve:[[50,28],[46,36],[50,40],[54,36]]},...bothSides([{poly:[[70,50],[88,44],[80,58],[66,58]]}])]}
 ]}
];
export const crestById=id=>CRESTS.find(c=>c.id===id)||CRESTS[0];
// A spinner top is not drawn, it is built: a ring, some blades, a forge disc and a beast in
// the middle. Written out as pictures, eight tops would be eight chances for the blades to
// disagree with the ring; built, a new one is four choices and its steps come out right.
export const RINGS=[
 {id:'flame',name:'Flame',say:'curving out to a point, dipping in, and out again all the way round',outer:38,inner:30,soft:true},
 {id:'saw',name:'Saw',say:'straight out to a sharp point and straight back in, like a saw',outer:38,inner:27,soft:false},
 {id:'petal',name:'Petal',say:'round petals, like the edge of a flower',outer:38,inner:33,soft:true},
 {id:'shield',name:'Shield',say:'a straight line between each corner, like a shield',outer:37,inner:37,flat:true}
];
export const ringById=id=>RINGS.find(r=>r.id===id)||RINGS[0];
export const BLADE_RANGE={min:3,max:8};
export const TOP_TYPES=['Attack','Defence','Stamina','Balance'];
const DEFAULT_COLOUR='#c2523c';
// The ring, as many points as there are blades, so the two of them line up instead of the
// blades landing wherever the ring happens to be thin.
export function ringShape(style,blades){
 const ring=ringById(style),n=Math.max(3,Math.round(blades));
 if(ring.flat)return {poly:Array.from({length:n},(_,i)=>polar(50,50,ring.outer,i*360/n+180/n))};
 const list=[];
 for(let i=0;i<n;i++){list.push(polar(50,50,ring.outer,i*360/n));list.push(polar(50,50,ring.inner,(i+0.5)*360/n));}
 return ring.soft?{curve:list}:{poly:list};
}
// The blades, all leaning the same way, which is what makes a still picture of a top look
// like it is already spinning.
export const bladeShapes=(blades,lean=11)=>Array.from({length:Math.max(3,Math.round(blades))},(_,i)=>{
 const a=i*360/Math.max(3,Math.round(blades)),wide=Math.min(26,150/blades);
 return {poly:[polar(50,50,22,a-wide/3),polar(50,50,30,a+lean-wide/2),polar(50,50,30,a+lean+wide/2),polar(50,50,22,a+wide/3)]};
});
export function normaliseDesign(design){
 const d=design&&typeof design==='object'?design:{};
 const name=String(d.name||'').trim().slice(0,24)||'My top';
 const blades=Number.isFinite(Number(d.blades))?Math.max(BLADE_RANGE.min,Math.min(BLADE_RANGE.max,Math.round(Number(d.blades)))):5;
 return {id:String(d.id||'own').slice(0,32),name,ja:String(d.ja||'').slice(0,24),romaji:String(d.romaji||'').slice(0,32),
  icon:[...String(d.icon||crestById(d.crest).icon)].slice(0,2).join(''),
  ring:ringById(d.ring).id,blades,crest:crestById(d.crest).id,
  type:TOP_TYPES.includes(d.type)?d.type:'Balance',
  colour:/^#[0-9a-f]{6}$/i.test(String(d.colour||''))?String(d.colour).toLowerCase():DEFAULT_COLOUR,
  about:String(d.about||'').slice(0,300)};
}
// The crest sits inside the forge disc: shrunk to fit the circle it goes in, so a beast drawn
// for a page still fits a decal without anybody measuring it again.
export const CREST_SCALE=0.34,CREST_SHIFT=50-CREST_SCALE*50;
export function topSteps(design){
 const d=normaliseDesign(design),ring=ringById(d.ring),beast=crestById(d.crest);
 const spin=[{arc:[50,50,43,18,58]},{arc:[50,50,43,138,178]},{arc:[50,50,43,258,298]},
  {arc:[50,50,47,26,46]},{arc:[50,50,47,146,166]},{arc:[50,50,47,266,286]}];
 return [
  {guide:true,say:'Start with a big circle and a cross through the middle. These two are only guides — they are rubbed out at the end, so draw them lightly.',
   shapes:[{circle:[50,50,34]},{line:[50,10,50,90]},{line:[10,50,90,50]}]},
  {say:`Now the outer ring, ${ring.say}. ${d.blades} points, and use the cross to keep them even.`,shapes:[ringShape(d.ring,d.blades)]},
  {say:'A circle inside the ring, about two thirds of the way in. Everything else happens inside this.',shapes:[{circle:[50,50,30]}]},
  {say:`${d.blades} blades from the middle out to that circle, all leaning the same way — that lean is what makes it look like it is already spinning.`,shapes:bladeShapes(d.blades)},
  {say:'Two circles in the very middle for the forge disc, one inside the other.',shapes:[{circle:[50,50,22]},{circle:[50,50,18]}]},
  ...beast.steps.map(step=>({say:`The ${beast.name.toLowerCase()} goes in the middle. ${step.say}`,
   shapes:placeShapes(step.shapes,CREST_SCALE,CREST_SHIFT,CREST_SHIFT),crest:true})),
  {say:`Spin lines round the outside, then write ${d.name} along the bottom. It is yours now.`,shapes:spin}
 ];
}
const TOP_PRESETS=[
 {id:'kaen-dragon',name:'Kaen Dragon',ja:'火炎竜',romaji:'kaen ryū',icon:'🐉',ring:'flame',blades:6,crest:'dragon',type:'Attack',colour:'#c2523c',
  about:'Six flame points and a dragon in the forge. The attack type: all edge, nothing spare.'},
 {id:'iwa-beetle',name:'Iwa Beetle',ja:'岩兜虫',romaji:'iwa kabutomushi',icon:'🪲',ring:'shield',blades:8,crest:'beetle',type:'Defence',colour:'#4a6b52',
  about:'Eight flat sides like a stone shield, with a rhinoceros beetle holding the middle. Nothing gets in.'},
 {id:'yuki-fox',name:'Yuki Fox',ja:'雪狐',romaji:'yuki kitsune',icon:'🦊',ring:'petal',blades:5,crest:'fox',type:'Stamina',colour:'#4f7ca8',
  about:'Five soft petals, because a stamina type wants to slide off a hit rather than meet it. A shrine fox in the middle.'},
 {id:'rai-tiger',name:'Rai Tiger',ja:'雷虎',romaji:'rai tora',icon:'🐯',ring:'saw',blades:4,crest:'tiger',type:'Balance',colour:'#d99a2b',
  about:'Four saw teeth, wide and heavy, and a tiger staring out of the middle of them.'},
 {id:'hono-phoenix',name:'Honō Phoenix',ja:'炎鳳凰',romaji:'honō hōō',icon:'🔥',ring:'flame',blades:3,crest:'phoenix',type:'Attack',colour:'#b5472f',
  about:'Three long flames and a phoenix with its wings up. The fewest blades of any of them, and the biggest.'}
];
export function topSubject(design){
 const d=normaliseDesign(design);
 return {id:d.id,name:d.name,ja:d.ja,romaji:d.romaji,icon:d.icon,kind:'top',level:d.type,minutes:10,
  about:d.about||`Your own top: a ${ringById(d.ring).name.toLowerCase()} ring, ${d.blades} blades and a ${crestById(d.crest).name.toLowerCase()} in the forge.`,
  finish:`That is ${d.name}. Colour the ring one colour and the blades another, and the beast in the middle darkest of all.`,
  design:d,steps:topSteps(d)};
}
export const TOPS=TOP_PRESETS.map(topSubject);
// The people and the animals. These are drawn rather than built, because a face is not a
// machine — but they are still written as the half dozen places a line passes through, so a
// step can be read as a sentence and checked against the picture it produces.
export const CHARACTERS=[
 {id:'chibi',name:'Chibi face',ja:'ちび',romaji:'chibi',icon:'😀',kind:'character',level:'Easiest',minutes:10,
  about:'The manga face everybody starts with: a big round head, enormous eyes and almost no nose. Get this one and the rest are variations.',
  finish:'Rub out the guides. The eyes are the whole picture, so make them the darkest thing on the page and leave a white spot in each.',steps:[
  {guide:true,say:'A big circle for the skull, a line straight down the middle, and a line across it lower than you think — that lower line is where the eyes go.',
   shapes:[{circle:[50,40,28]},{line:[50,8,50,94]},{line:[18,52,82,52]}]},
  {say:'The jaw: from the sides of the circle, curve in and down to a soft chin on the middle line.',
   shapes:[{curve:[[23,44],[27,66],[50,84],[73,66],[77,44]],close:false}]},
  {say:'Two big eyes sitting on the line, one either side of the middle. Taller than they are wide.',
   shapes:bothSides([{ellipse:[64,54,10,12]}])},
  {say:'A circle inside each eye, and a small round shine near the top corner. The shine is what makes it look alive.',
   shapes:bothSides([{circle:[64,56,5.5]},{circle:[68,50,2.4]}])},
  {say:'Eyebrows above, a little nose like a tick, and a small mouth below it.',
   shapes:[...bothSides([{curve:[[58,40],[66,37],[72,40]],close:false}]),{curve:[[48,66],[52,68],[49,70]],close:false},{curve:[[43,74],[50,78],[57,74]],close:false}]},
  {say:'An ear on each side, level with the eyes — a small C shape.',
   shapes:bothSides([{arc:[76,56,6,0,180]}])},
  {say:'The hair: a zigzag fringe across the top of the head, coming to a point each time. Keep it outside the circle.',
   shapes:[{curve:[[22,48],[20,22],[36,32],[42,12],[56,28],[66,10],[78,26],[79,48]],close:false}]},
  {say:'A short neck and two shoulders, and that is a face.',
   shapes:[{line:[42,82,42,90]},{line:[58,82,58,90]},{curve:[[16,98],[34,88],[50,90],[66,88],[84,98]],close:false}]}
 ]},
 {id:'eye',name:'Manga eye',ja:'目',romaji:'me',icon:'👁️',kind:'character',level:'Easiest',minutes:5,
  about:'One eye, big. It is the fastest way to make anything look like manga, and it takes two minutes.',
  finish:'Fill the pupil in black, leave the two shines white, and colour the iris from dark at the top to light at the bottom.',steps:[
  {say:'The top lash line, thick and curving — highest above the middle, coming down at both ends.',
   shapes:[{curve:[[8,46],[26,24],[56,20],[88,36]],close:false}]},
  {say:'The bottom line, much lighter, sweeping under it. The two meet at the outside corner.',
   shapes:[{curve:[[12,54],[36,70],[66,68],[88,38]],close:false}]},
  {say:'A big circle for the iris, cut off by the top line. Most of the eye is iris.',
   shapes:[{circle:[47,46,21]}]},
  {say:'The pupil in the middle of the iris, a good deal smaller.',
   shapes:[{circle:[47,48,9]}]},
  {say:'Two shines: a big round one up on one side, a small one down on the other. Never in the middle.',
   shapes:[{circle:[37,36,7]},{circle:[58,58,3.5]}]},
  {say:'Three lashes off the outside corner and an eyebrow over the top.',
   shapes:[{poly:[[84,34],[95,24],[88,37]],close:false},{poly:[[76,28],[84,16],[80,30]],close:false},{poly:[[64,22],[68,10],[68,23]],close:false},{curve:[[10,20],[34,6],[64,4],[88,16]],close:false}]}
 ]},
 {id:'shiba',name:'Shiba inu',ja:'柴犬',romaji:'shiba inu',icon:'🐕',kind:'character',level:'Easy',minutes:10,
  about:'The curly-tailed dog being walked on every street in Japan, and the one on half the souvenirs.',
  finish:'Orange on top and white underneath — white round the muzzle, over the eyebrows, down the chest and along the underside of the tail.',steps:[
  {guide:true,say:'A circle for the head and a bigger one underneath for the body, sitting down.',
   shapes:[{circle:[50,30,20]},{circle:[50,72,24]}]},
  {say:'The head over the top circle: round, and a bit wider at the cheeks than at the ears.',
   shapes:[{curve:[[50,10],[68,18],[72,34],[62,48],[50,52],[38,48],[28,34],[32,18]]}]},
  {say:'Two triangle ears standing straight up. A shiba never lets them droop.',
   shapes:bothSides([{poly:[[66,16],[73,0],[56,8]]}])},
  {say:'A small rounded muzzle low on the face, with a triangle nose sitting on top of it.',
   shapes:[{curve:[[50,34],[59,39],[56,48],[50,51],[44,48],[41,39]]},{poly:[[46,35],[54,35],[50,40]]},
    {curve:[[50,40],[45,46],[41,43]],close:false},{curve:[[50,40],[55,46],[59,43]],close:false}]},
  {say:'Two eyes above the muzzle — small triangles, not circles. That squint is the whole face.',
   shapes:bothSides([{poly:[[62,28],[54,27],[59,34]]}])},
  {say:'The body underneath, sitting: down the chest, out at the haunches and back up.',
   shapes:[{curve:[[36,48],[26,62],[24,80],[32,91],[68,91],[76,80],[74,62],[64,48]],close:false}]},
  {say:'Two front legs straight down the middle, with a paw on the bottom of each.',
   shapes:[{line:[42,72,42,90]},{line:[58,72,58,90]},{curve:[[36,90],[42,95],[48,90]],close:false},{curve:[[52,90],[58,95],[64,90]],close:false}]},
  {say:'And the tail curled right over his back in a circle. That is the shiba.',
   shapes:[{curve:[[74,70],[88,62],[93,74],[84,84],[74,79]],close:false}]}
 ]},
 {id:'rikishi',name:'Sumo wrestler',ja:'力士',romaji:'rikishi',icon:'🤼',kind:'character',level:'Easy',minutes:10,
  about:'A chibi rikishi in his fighting stance — the one we will be watching in Ryogoku.',
  finish:'Skin, then the mawashi a strong colour of its own, and leave the fringe of sagari white.',steps:[
  {guide:true,say:'A small circle up top for the head and a big oval underneath for everything else. He is mostly oval.',
   shapes:[{circle:[50,22,14]},{ellipse:[50,64,28,26]}]},
  {say:'The head, a little wider at the cheeks, sitting straight on the body with no neck to speak of.',
   shapes:[{curve:[[50,8],[63,14],[65,26],[50,36],[35,26],[37,14]]}]},
  {say:'The topknot: hair across the forehead, and a small bun folded forward on top.',
   shapes:[{curve:[[36,18],[42,10],[50,8],[58,10],[64,18]],close:false},{curve:[[44,8],[46,2],[56,2],[58,8]],close:false},{line:[46,5,58,5]}]},
  {say:'Two dots for eyes, and a wide mouth. He is concentrating.',
   shapes:[{circle:[44,22,1.8]},{circle:[56,22,1.8]},{curve:[[44,29],[50,32],[56,29]],close:false}]},
  {say:'The body: shoulders wide, belly wider, down to the hips.',
   shapes:[{curve:[[50,36],[74,46],[80,66],[70,84],[50,88],[30,84],[20,66],[26,46]],close:false}]},
  {say:'The mawashi — a thick belt round the hips, with the fringe of stiff cords hanging off it.',
   shapes:[{curve:[[24,70],[50,78],[76,70]],close:false},{curve:[[26,80],[50,88],[74,80]],close:false},
   {line:[34,82,33,96]},{line:[42,85,42,98]},{line:[50,87,50,99]},{line:[58,85,58,98]},{line:[66,82,67,96]}]},
  {say:'Arms out and low, ready to take hold, with a fist at the end of each.',
   shapes:[...bothSides([{curve:[[72,50],[86,58],[87,70]],close:false},{circle:[87,76,6]}])]},
  {say:'Two thick legs braced apart, and he is ready for the charge.',
   shapes:[{curve:[[32,86],[22,92],[20,99]],close:false},{curve:[[68,86],[78,92],[80,99]],close:false}]}
 ]},
 {id:'mecha',name:'Mecha helmet',ja:'ロボ',romaji:'robo',icon:'🤖',kind:'character',level:'Harder',minutes:12,
  about:'A robot head, all straight lines and sharp corners — the opposite of the chibi face, and a good one to do straight after it.',
  finish:'White on the face, one strong colour on the cheeks and the fin, and black inside the visor with a bright line across it.',steps:[
  {guide:true,say:'A circle and a cross again, but this time nothing will be round. The cross keeps both sides the same.',
   shapes:[{circle:[50,44,30]},{line:[50,8,50,96]},{line:[16,44,84,44]}]},
  {say:'The skull: a flat top, then straight down the sides and in to a narrow chin. All corners.',
   shapes:[{poly:[[34,16],[66,16],[78,30],[76,54],[62,72],[38,72],[24,54],[22,30]]}]},
  {say:'The visor across the eyes — a wide band that comes to a point at each end.',
   shapes:[{poly:[[26,38],[40,34],[60,34],[74,38],[66,50],[34,50]]}]},
  {say:'A line down the middle of the visor, splitting it into two eyes.',
   shapes:[{line:[50,35,50,50]},{poly:[[30,40],[44,37],[46,47],[34,47]]},{poly:[[70,40],[56,37],[54,47],[66,47]]}]},
  {say:'The V-fin on his forehead, pointing up and out. This is the bit everyone recognises.',
   shapes:[{poly:[[50,30],[38,10],[30,14],[44,32]]},{poly:[[50,30],[62,10],[70,14],[56,32]]}]},
  {say:'Cheek vents: three short bars on each side, under the visor.',
   shapes:bothSides([{line:[62,56,72,54]},{line:[61,60,70,59]},{line:[60,64,67,63]}])},
  {say:'A mouth grille and a chin plate at the bottom.',
   shapes:[{poly:[[42,56],[58,56],[55,64],[45,64]]},{line:[44,60,56,60]},{poly:[[40,72],[60,72],[56,80],[44,80]]}]},
  {say:'And the neck, straight down into the shoulders. Done.',
   shapes:[{line:[42,80,40,90]},{line:[58,80,60,90]},{poly:[[22,98],[36,88],[64,88],[78,98]],close:false}]}
 ]}
];
// A beast on its own is the same beast as the one in the forge, drawn the size of the page.
const crestSubject=c=>({id:`crest-${c.id}`,name:c.name,ja:c.ja,romaji:c.romaji,icon:c.icon,kind:'crest',level:'Easy',minutes:8,
 about:`${c.blurb} It is the beast that goes in the middle of a top, drawn the size of the whole page.`,
 finish:`Go over the outside line again, heavier than the rest — that is what makes a crest look like a badge rather than a drawing.`,
 steps:c.steps});
export const CREST_SUBJECTS=CRESTS.map(crestSubject);
export const SUBJECTS=[...TOPS,...CREST_SUBJECTS,...CHARACTERS];
export const subjectById=id=>SUBJECTS.find(s=>s.id===id)||null;
export const CATEGORIES=[
 {id:'top',name:'Spinner tops',note:'A ring, the blades and a beast in the middle. Draw one of ours, or build your own and name it.'},
 {id:'crest',name:'Beast crests',note:'The beasts on their own, big. These are the ones that go in the middle of a top.'},
 {id:'character',name:'Manga faces',note:'Faces and friends, starting with the chibi head everybody learns first.'}
];
// One game name per subject, and short enough for the server to keep.
export const drawGame=id=>`draw:${String(id||'').slice(0,32)}`;
// What is on the page at each step: everything drawn so far, and the lines being drawn now.
// Kept apart because the whole point is watching this one line arrive over the top of the
// ones already there, rather than being handed a finished picture and told to copy it.
export function stepFrames(subject){
 if(!subject?.steps?.length)return [];
 const frames=[];let past=[];
 subject.steps.forEach((step,index)=>{
  frames.push({index,count:subject.steps.length,say:step.say,guide:!!step.guide,now:step.shapes||[],past});
  past=[...past,...(step.shapes||[]).map(shape=>step.guide?{...shape,guide:true}:shape)];
 });
 frames.push({index:subject.steps.length,count:subject.steps.length,say:subject.finish,done:true,now:[],past});
 return frames;
}
// The finished drawing with the guides left out: what a tracing sits under, and what gets
// coloured in. A guide line is scaffolding — trace it and the picture is wrong.
export const lineArt=subject=>(subject?.steps||[]).filter(s=>!s.guide).flatMap(s=>s.shapes||[]);
export const guideArt=subject=>(subject?.steps||[]).filter(s=>s.guide).flatMap(s=>s.shapes||[]);
// The pens. Enough colours to paint any of this and few enough to fit across a phone without
// scrolling, with the greys at the end because that is where a child looks for them last.
export const PENS=['#16383b','#c2523c','#e08a3c','#f2c14e','#5c9e5f','#2f7f7a','#4f7ca8','#7a5ea8','#d4739b','#8a5a3c','#9aa7a5','#ffffff'];
export const NIBS=[{id:'fine',name:'Fine',width:2},{id:'pen',name:'Pen',width:5},{id:'brush',name:'Brush',width:11},{id:'marker',name:'Marker',width:22}];
export const nibById=id=>NIBS.find(n=>n.id===id)||NIBS[1];
