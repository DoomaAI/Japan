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
// A run of points along a circle, so an outer edge that really is curved can be written as a
// curve rather than as a straight line between two blade tips. Five points across a blade is
// close enough to a true arc that the eye cannot tell, and it keeps every shape one kind of
// thing — mirrored, shrunk and measured by the same three functions as everything else.
export function arcPoints(cx,cy,r,from,to,steps=6){
 const list=[];
 for(let i=0;i<=steps;i++)list.push(polar(cx,cy,r,from+(to-from)*i/steps));
 return list;
}
// The beasts. Each one is drawn in its own hundred-square box, which is why the same handful
// of steps can be a crest the size of the page and the decal in the middle of a spinner top.
// They are ours rather than anybody's: the real tops in the shops are somebody's drawings, and
// these are drawn here from circles and lines so that a child can copy them and own the result.
export const CRESTS=[
 {id:'dragon',name:'Dragon',ja:'竜',romaji:'ryū',icon:'🐉',blurb:'Side on: long snout, horn back, jaw open.',steps:[
  {say:'Start with the top of the head, side on. One long line from the nose, back over the brow, and down the neck.',
   shapes:[{curve:[[88,44],[74,38],[60,34],[46,30],[34,34],[24,46],[16,62]],close:false,weight:1.4}]},
  {say:'Now the bottom of the head: back from the nose along the top lip, then down under the jaw to the neck.',
   shapes:[{curve:[[88,44],[84,52],[70,56],[52,56],[40,62],[30,74],[22,86]],close:false,weight:1.4}]},
  {say:'The lower jaw drops open underneath — roar. It hinges level with the eye and comes forward under the snout.',
   shapes:[{curve:[[80,60],[68,70],[54,72],[45,68],[47,60]],close:false,weight:1.2}]},
  {say:'A horn off the back of the head, sweeping back and up, and a smaller one under it.',
   shapes:[{curve:[[40,30],[34,16],[20,6],[28,20],[30,32]],weight:1.2},
    {curve:[[32,36],[20,30],[8,30],[20,38],[28,42]],weight:1.1}]},
  {say:'The eye, filled in, with a heavy brow over it — and a nostril up at the end of the snout.',
   shapes:[{poly:[[54,34],[68,31],[68,35],[55,38]],fill:'#16383b'},
    {curve:[[57,43],[62,40],[67,43],[62,47]],fill:'#16383b'},
    {ellipse:[83,45,2.6,1.9,25],fill:'#16383b'}]},
  {say:'Teeth along the top lip and one up from the jaw, a spike under the chin, and the dragon is finished.',
   shapes:[{poly:[[77,56],[75,62],[72,56]],fill:'#16383b'},{poly:[[67,57],[65,63],[62,57]],fill:'#16383b'},
    {poly:[[66,67],[68,61],[70,67]],fill:'#16383b'},
    {curve:[[45,70],[38,78],[28,82]],close:false,weight:1},
    {poly:[[34,46],[24,52],[28,42]],weight:1},{poly:[[26,58],[16,66],[20,54]],weight:1}]}
 ]},
 {id:'tiger',name:'Tiger',ja:'虎',romaji:'tora',icon:'🐯',blurb:'Round face, cheek fur, stripes, flat stare.',steps:[
  {say:'A wide round face. Keep it wider than it is tall — a tiger is all cheeks.',
   shapes:[{curve:[[50,13],[70,17],[82,32],[80,54],[66,72],[50,78],[34,72],[20,54],[18,32],[30,17]],weight:1.3}]},
  {say:'An ear on each top corner, rounded, with a smaller shape inside it.',
   shapes:bothSides([{curve:[[66,20],[74,7],[87,16],[80,30]],weight:1.2},{curve:[[70,21],[76,13],[82,18],[78,26]],weight:0.8}])},
  {say:'Two eyes, filled in, with a white spot left in each one. Keep them low and wide apart.',
   shapes:bothSides([{curve:[[56,42],[64,37],[72,42],[64,48]],fill:'#16383b'},{circle:[62,40,1.5],fill:'#ffffff',weight:0.5}])},
  {say:'The muzzle: two soft lumps side by side, a filled-in nose on top of them and a mouth underneath.',
   shapes:[{curve:[[50,60],[58,60],[60,67],[50,70],[40,67],[42,60]],weight:0.9},
    {curve:[[44,55],[50,52],[56,55],[50,60]],fill:'#16383b'},
    {line:[50,60,50,66]},{curve:[[50,66],[44,71],[39,67]],close:false},{curve:[[50,66],[56,71],[61,67]],close:false}]},
  {say:'Now the stripes, filled in solid: one down the forehead, two off each cheek, two over each eye.',
   shapes:[{poly:[[50,16],[54,28],[50,34],[46,28]],fill:'#16383b'},
    ...bothSides([{poly:[[60,17],[68,26],[62,31],[57,23]],fill:'#16383b'},
     {poly:[[76,42],[89,37],[89,43],[77,45]],fill:'#16383b'},
     {poly:[[75,51],[88,51],[86,57],[74,54]],fill:'#16383b'},
     {poly:[[58,32],[71,29],[72,33],[59,36]],fill:'#16383b'}])]},
  {say:'Three whiskers each side, long, and the fur coming out at the jaw. Done.',
   shapes:bothSides([{line:[62,62,90,60],weight:0.7},{line:[62,65,92,68],weight:0.7},{line:[61,68,88,76],weight:0.7},
    {poly:[[66,70],[74,74],[64,76]],weight:0.9}])}
 ]},
 {id:'phoenix',name:'Phoenix',ja:'鳳凰',romaji:'hōō',icon:'🔥',blurb:'Wings thrown up, tail streaming down.',steps:[
  {say:'A long teardrop for the body, pointing down, in the middle of the page.',
   shapes:[{curve:[[50,34],[61,48],[58,66],[50,76],[42,66],[39,48]],weight:1.3}]},
  {say:'A small round head on top of it, with a short beak out to one side and an eye filled in.',
   shapes:[{circle:[50,24,9],weight:1.2},{poly:[[58,22],[70,26],[58,29]],fill:'#16383b'},{circle:[53,22,1.8],fill:'#16383b'}]},
  {say:'A wing each side, thrown right up: out of the shoulder, up to the corner, and back down to the body.',
   shapes:bothSides([{curve:[[58,44],[74,34],[90,14],[84,32],[70,48],[59,56]],weight:1.2}])},
  {say:'Cut three rounded feathers into the underside of each wing — big at the tip, smaller near the body.',
   shapes:bothSides([{curve:[[80,26],[86,26],[78,38],[74,34]],weight:0.9},
    {curve:[[73,37],[80,37],[71,47],[67,43]],weight:0.9},
    {curve:[[65,46],[72,47],[64,55],[61,51]],weight:0.9}])},
  {say:'Three long tail feathers out of the bottom, the middle one longest, all curling the same way.',
   shapes:[{curve:[[50,72],[57,84],[50,99],[43,84]],weight:1.2},
    ...bothSides([{curve:[[43,73],[40,86],[26,96],[36,80]],weight:1.2}])]},
  {say:'A crest of three flames off the top of his head, and the phoenix is finished.',
   shapes:[{curve:[[45,17],[38,6],[48,11],[47,1],[55,9],[60,4],[56,16]],close:false,weight:1.2}]}
 ]},
 {id:'beetle',name:'Beetle',ja:'兜虫',romaji:'kabutomushi',icon:'🪲',blurb:'The rhinoceros beetle, horn and all.',steps:[
  {say:'A big oval for the shell, a little wider at the top than the bottom. This is most of the beetle.',
   shapes:[{curve:[[50,32],[70,40],[74,62],[64,86],[50,92],[36,86],[26,62],[30,40]],weight:1.3}]},
  {say:'A smaller shape on top for the head, tucked under the shell.',
   shapes:[{curve:[[50,22],[61,26],[62,34],[50,38],[38,34],[39,26]],weight:1.2},
    ...bothSides([{circle:[57,29,1.6],fill:'#16383b'}])]},
  {say:'The horn: up out of the head, then split into two prongs like a Y. Make it as long as the head.',
   shapes:[{curve:[[46,24],[44,14],[38,5]],close:false,weight:1.4},{curve:[[54,24],[56,14],[62,5]],close:false,weight:1.4},
    {poly:[[38,5],[34,2],[40,9]],weight:1},{poly:[[62,5],[66,2],[60,9]],weight:1},{line:[47,18,53,18]}]},
  {say:'A line straight down the middle of the shell where the wing cases meet, and a curve each side at the shoulders.',
   shapes:[{line:[50,38,50,90],weight:1.1},...bothSides([{arc:[50,62,22,200,246],weight:0.9}])]},
  {say:'Three legs each side, bent like an elbow, and he is ready.',
   shapes:bothSides([{poly:[[68,44],[84,36],[92,42]],close:false,weight:1.1},
    {poly:[[72,60],[90,58],[96,68]],close:false,weight:1.1},
    {poly:[[68,76],[84,84],[86,95]],close:false,weight:1.1}])}
 ]},
 {id:'fox',name:'Fox',ja:'狐',romaji:'kitsune',icon:'🦊',blurb:'The shrine fox: sharp chin, slit eyes, ruff.',steps:[
  {say:'A face that comes to a point at the chin — wide across the eyes, narrow at the nose.',
   shapes:[{curve:[[50,20],[66,26],[74,42],[64,62],[52,76],[48,76],[36,62],[26,42],[34,26]],weight:1.3}]},
  {say:'Two tall pointed ears, leaning out, with a dark triangle inside each.',
   shapes:bothSides([{poly:[[60,26],[74,2],[80,30]],weight:1.2},{poly:[[64,26],[73,10],[75,28]],fill:'#16383b'}])},
  {say:'Slanted eyes, filled in, higher at the outside than at the nose. That slant is the whole face.',
   shapes:bothSides([{curve:[[55,45],[63,39],[72,43],[63,49]],fill:'#16383b'}])},
  {say:'A small filled nose right at the point, and a mouth going out to each side of it.',
   shapes:[{curve:[[45,60],[55,60],[50,67]],fill:'#16383b'},
    {curve:[[50,67],[44,71],[38,67]],close:false},{curve:[[50,67],[56,71],[62,67]],close:false}]},
  {say:'Fur sticking out at each cheek in three points, and a mark on the forehead. Done.',
   shapes:[{curve:[[50,28],[46,36],[50,41],[54,36]],fill:'#16383b'},
    ...bothSides([{poly:[[68,44],[84,40],[74,50],[86,52],[70,58],[66,56]],weight:1.1}])]}
 ]}
];
export const crestById=id=>CRESTS.find(c=>c.id===id)||CRESTS[0];
// A spinner top is not drawn, it is built: a ring, some blades, a forge disc and a beast in
// the middle. Written out as pictures, eight tops would be eight chances for the blades to
// disagree with the ring; built, a new one is four choices and its steps come out right.
// How the front edge of a blade is cut. This is the whole character of a top: the same three
// blades read as an attacker or as a defender depending on what the leading corner does.
export const RINGS=[
 {id:'flame',name:'Flame',say:'drawn out past the circle into a point at the front, like a flame lying over',point:3.5},
 {id:'saw',name:'Saw',say:'cut off square at the front, like a tooth on a saw',square:true},
 {id:'petal',name:'Petal',say:'round at the end, like a petal',round:true},
 {id:'shield',name:'Shield',say:'flat right across the front, like a shield',chord:true}
];
export const ringById=id=>RINGS.find(r=>r.id===id)||RINGS[0];
export const BLADE_RANGE={min:3,max:8};
export const TOP_TYPES=['Attack','Defence','Stamina','Balance'];
export const TOP_RADIUS={out:42,hub:26,core:21,driver:5};
const DEFAULT_COLOUR='#c2523c';
// One blade of the energy layer, seen from above. A blade is not a spoke. It is a chunk:
// wide where it meets the hub, wider still at the rim, leaning the way the top turns, with a
// real gap before the next one. Drawing them as spokes is what made these look like
// snowflakes rather than like something that would hurt to be hit by.
export function bladeShape(index,blades,style){
 const ring=ringById(style),n=Math.max(BLADE_RANGE.min,Math.round(blades)),step=360/n;
 const {out,hub}=TOP_RADIUS;
 const a=index*step;
 // Half the step is blade and half is gap, and the blade leans forward by a fifth of a step
 // between its root and its tip — which is what makes a still picture look like it is turning.
 const root=Math.min(step*0.5,44),lean=Math.min(step*0.2,18),rim=Math.min(step*0.46,38);
 const lead=a+lean,tail=a+lean+rim;
 const front=ring.chord?[polar(50,50,out,lead),polar(50,50,out,tail)]
  :ring.round?arcPoints(50,50,out,lead,tail,6)
  :arcPoints(50,50,out,lead,tail,4);
 return {poly:[
  polar(50,50,hub,a),
  ...(ring.point?[polar(50,50,out+ring.point,lead-step*0.05)]:[]),
  ...front,
  ...(ring.square?[polar(50,50,out-4,tail+step*0.04)]:[]),
  polar(50,50,hub,a+root),
  ...arcPoints(50,50,hub,a+root,a,3)
 ],weight:1.15};
}
export const bladeShapes=(blades,style)=>Array.from({length:Math.max(BLADE_RANGE.min,Math.round(blades))},
 (_,i)=>bladeShape(i,blades,style));
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
 const {out,hub,core,driver}=TOP_RADIUS;
 const spin=[{arc:[50,50,45,14,52]},{arc:[50,50,45,134,172]},{arc:[50,50,45,254,292]},
  {arc:[50,50,48,22,40]},{arc:[50,50,48,142,160]},{arc:[50,50,48,262,280]}];
 return [
  {guide:true,say:'A big circle for how far the blades reach, and a cross through the middle. Both are guides — draw them lightly, because they get rubbed out at the end.',
   shapes:[{circle:[50,50,out]},{line:[50,6,50,94]},{line:[6,50,94,50]}]},
  {say:'Two circles in the middle for the hub. The beast goes inside these, so leave yourself room.',
   shapes:[{circle:[50,50,hub],weight:1.2},{circle:[50,50,core]}]},
  {say:`Now the ${d.blades} blades, ${ring.say}. Start each one fat against the hub, lean it the same way round as the last, and stop at the big circle. Leave as much gap as blade.`,
   shapes:bladeShapes(d.blades,d.ring)},
  {say:'A short line across each blade near the tip — that is the edge that does the hitting.',
   shapes:Array.from({length:Math.max(BLADE_RANGE.min,Math.round(d.blades))},(_,i)=>{
    const step=360/Math.max(BLADE_RANGE.min,Math.round(d.blades)),a=i*step+step*0.36;
    return {line:[...polar(50,50,out-3,a),...polar(50,50,out-10,a+step*0.06)],weight:0.8};})},
  {say:'The tip it spins on, filled in black right in the middle, with three bolts around it.',
   shapes:[{circle:[50,50,driver],fill:'#16383b'},
    ...Array.from({length:3},(_,i)=>({circle:[...polar(50,50,core-4,i*120+30),1.7],weight:0.8}))]},
  ...beast.steps.map(step=>({say:`The ${beast.name.toLowerCase()} goes in the hub. ${step.say}`,
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
  about:'The manga face everybody starts with: a big round head, enormous eyes low down, and almost no nose. Get this one and the rest are variations of it.',
  finish:'Rub out the guides. Leave the two white spots in each eye white whatever you do — they are what make it look alive.',steps:[
  {guide:true,say:'A big circle for the skull, a line down the middle, and the eye line lower than you think — a long way below halfway.',
   shapes:[{circle:[50,40,30]},{line:[50,6,50,96]},{line:[16,56,84,56]}]},
  {say:'The cheeks and chin: from the sides of the circle, curve out a little and down to a wide round chin.',
   shapes:[{curve:[[21,42],[24,64],[36,78],[50,82],[64,78],[76,64],[79,42]],close:false,weight:1.4}]},
  {say:'Two huge eyes sitting on the line, taller than they are wide, tipped in at the bottom. Leave a whole eye of space between them.',
   shapes:bothSides([{curve:[[58,48],[66,45],[74,50],[75,60],[68,66],[59,62]],weight:1.4}])},
  {say:'Fill each eye in, then leave a big white spot at the top and a small one at the bottom. Those two spots do all the work.',
   shapes:bothSides([{curve:[[59,50],[66,47],[73,52],[73,60],[67,64],[60,60]],fill:'#16383b'},
    {circle:[64,52,3.4],fill:'#ffffff',weight:0.5},{circle:[71,60,1.7],fill:'#ffffff',weight:0.5}])},
  {say:'A short eyebrow over each eye, then a tiny mouth low down. No nose at all — a chibi does not need one.',
   shapes:[...bothSides([{curve:[[58,40],[66,37],[73,41]],close:false,weight:1}]),
    {curve:[[44,72],[50,76],[56,72]],close:false,weight:1.1}]},
  {say:'The hair comes over the top of the head in three fat locks, each one wider than a finger and pointed at the end.',
   shapes:[{curve:[[20,44],[18,24],[30,12],[42,26],[46,10],[58,24],[66,8],[78,22],[80,44],[72,30],[60,36],[50,30],[38,36],[28,30]],weight:1.4}]},
  {say:'A small ear each side, level with the eyes and mostly hidden by the hair.',
   shapes:bothSides([{arc:[79,56,5.5,0,180],weight:1}])},
  {say:'A short neck and two sloping shoulders, and that is a face.',
   shapes:[{line:[42,80,41,88],weight:1.2},{line:[58,80,59,88],weight:1.2},
   {curve:[[14,99],[30,89],[41,88],[59,88],[70,89],[86,99]],close:false,weight:1.3}]}
 ]},
 {id:'eye',name:'Manga eye',ja:'目',romaji:'me',icon:'👁️',kind:'character',level:'Easiest',minutes:5,
  about:'One eye, big. It is the fastest way to make anything look like manga, and it takes two minutes.',
  finish:'The pupil is the blackest thing on the page and the two shines stay white. Shade the iris dark at the top and let it fade towards the bottom.',steps:[
  {say:'The top lash line, thick and curving — highest over the middle, dropping at both ends. Go over it twice to make it heavy.',
   shapes:[{curve:[[8,44],[26,24],[56,20],[88,36]],close:false,weight:2.2}]},
  {say:'The bottom line, much lighter than the top one, sweeping under it. The two meet at the outside corner.',
   shapes:[{curve:[[12,54],[36,70],[66,68],[88,38]],close:false,weight:0.9}]},
  {say:'A big circle for the iris, running off the top line. Most of the eye is iris.',
   shapes:[{circle:[47,46,21],weight:1.3}]},
  {say:'The pupil in the middle, filled in solid, about half as wide as the iris.',
   shapes:[{circle:[47,48,9],fill:'#16383b'}]},
  {say:'Two shines: a big round one up on one side, a small one down on the other. Never in the middle.',
   shapes:[{circle:[37,36,7],fill:'#ffffff',weight:1.2},{circle:[58,58,3.5],fill:'#ffffff',weight:1}]},
  {say:'Three lashes off the outside corner and a thick eyebrow over the top, and it is done.',
   shapes:[{poly:[[84,34],[96,25],[88,38]],fill:'#16383b'},{poly:[[76,28],[85,16],[80,31]],fill:'#16383b'},
    {poly:[[65,22],[69,9],[69,23]],fill:'#16383b'},
    {curve:[[10,20],[34,7],[64,5],[88,16],[64,11],[34,13]],weight:1.2}]}
 ]},
 {id:'shiba',name:'Shiba inu',ja:'柴犬',romaji:'shiba inu',icon:'🐕',kind:'character',level:'Easy',minutes:10,
  about:'The curly-tailed dog being walked on every street in Japan, and the one on half the souvenirs. Sitting down, looking straight at you.',
  finish:'Orange on top and white underneath: white round the muzzle, over each eyebrow, down the chest, and along the underside of the tail.',steps:[
  {guide:true,say:'A circle for the head and a bigger one underneath it for the body. They overlap a little.',
   shapes:[{circle:[50,28,19]},{circle:[50,68,26]}]},
  {say:'Draw the head over the top circle: round at the forehead, coming in to a blunt muzzle.',
   shapes:[{curve:[[50,10],[66,15],[70,30],[62,42],[50,46],[38,42],[30,30],[34,15]],weight:1.4}]},
  {say:'Two triangle ears standing straight up, tipped slightly out. A shiba never lets them droop.',
   shapes:bothSides([{poly:[[64,17],[72,2],[76,22]],weight:1.3},{poly:[[66,17],[71,7],[73,19]],fill:'#16383b'}])},
  {say:'The muzzle: a soft rounded shape low on the face, a filled nose on top of it, and the mouth in two curves.',
   shapes:[{curve:[[50,30],[58,34],[57,42],[50,45],[43,42],[42,34]],weight:1},
    {curve:[[45,31],[55,31],[50,36]],fill:'#16383b'},
    {line:[50,36,50,40],weight:0.9},{curve:[[50,40],[45,44],[41,41]],close:false,weight:0.9},{curve:[[50,40],[55,44],[59,41]],close:false,weight:0.9}]},
  {say:'Two eyes above the muzzle, filled in — little triangles rather than circles. That squint is the whole dog.',
   shapes:bothSides([{poly:[[63,24],[55,23],[59,29]],fill:'#16383b'}])},
  {say:'The body sitting down: straight down the chest, then out wide at the back legs and up again.',
   shapes:[{curve:[[38,42],[30,54],[26,74],[32,90],[50,93],[68,90],[74,74],[70,54],[62,42]],close:false,weight:1.4}]},
  {say:'Two front legs down the middle of the chest, with a round paw on the bottom of each.',
   shapes:[{line:[43,66,42,88],weight:1.2},{line:[57,66,58,88],weight:1.2},
    {curve:[[37,88],[42,93],[47,88]],close:false,weight:1.2},{curve:[[53,88],[58,93],[63,88]],close:false,weight:1.2}]},
  {say:'And the tail, curled right over his back in a circle. That is the shiba.',
   shapes:[{curve:[[71,60],[84,54],[92,64],[88,78],[76,80],[70,72]],close:false,weight:1.3}]}
 ]},
 {id:'rikishi',name:'Sumo wrestler',ja:'力士',romaji:'rikishi',icon:'🤼',kind:'character',level:'Easy',minutes:10,
  about:'A chibi rikishi in his stance, fists down, about to charge — the one we will be watching in Ryogoku.',
  finish:'Skin first, then the mawashi a strong colour of its own, and leave the stiff fringe of sagari white.',steps:[
  {guide:true,say:'A small circle up top for the head and a big one underneath for everything else. He is mostly the big one.',
   shapes:[{circle:[50,20,13]},{circle:[50,62,27]}]},
  {say:'The head, a little wider at the cheeks than at the top, sitting straight on the body with no neck to speak of.',
   shapes:[{curve:[[50,7],[62,12],[64,24],[56,32],[44,32],[36,24],[38,12]],weight:1.3}]},
  {say:'The topknot: the hairline across his forehead, then the little folded bun on top, filled in.',
   shapes:[{curve:[[37,15],[43,8],[50,7],[57,8],[63,15]],close:false,weight:1.2},
    {curve:[[44,8],[45,2],[55,2],[56,8]],fill:'#16383b'},{line:[44,6,56,6],weight:0.8}]},
  {say:'Two filled dots for eyes and a wide flat mouth. He is concentrating, not smiling.',
   shapes:[{circle:[44,21,2],fill:'#16383b'},{circle:[56,21,2],fill:'#16383b'},
    {curve:[[44,28],[50,30],[56,28]],close:false,weight:1}]},
  {say:'The body: shoulders wide, belly wider still, coming back in at the hips.',
   shapes:[{curve:[[50,32],[72,42],[78,60],[72,78],[50,84],[28,78],[22,60],[28,42]],close:false,weight:1.4}]},
  {say:'The mawashi — a thick belt round his hips — and the row of stiff cords hanging off the front of it.',
   shapes:[{curve:[[26,66],[50,74],[74,66]],close:false,weight:1.3},{curve:[[28,76],[50,84],[72,76]],close:false,weight:1.3},
   {line:[34,79,33,94],weight:1},{line:[42,82,42,96],weight:1},{line:[50,83,50,97],weight:1},{line:[58,82,58,96],weight:1},{line:[66,79,67,94],weight:1}]},
  {say:'Arms out and low, ready to take hold, with a fist at the end of each.',
   shapes:bothSides([{curve:[[71,46],[84,54],[86,66]],close:false,weight:1.3},{circle:[86,72,6],weight:1.3}])},
  {say:'Two thick legs braced wide apart, and he is ready for the charge.',
   shapes:bothSides([{curve:[[66,82],[76,90],[78,98]],close:false,weight:1.4}])}
 ]},
 {id:'mecha',name:'Mecha helmet',ja:'ロボ',romaji:'robo',icon:'🤖',kind:'character',level:'Harder',minutes:12,
  about:'A robot head: all straight lines and sharp corners, which is the opposite of the chibi face and a good one to draw straight after it.',
  finish:'White on the face, one strong colour on the cheeks and the fin, and the visor left black with a bright line across it.',steps:[
  {guide:true,say:'A circle and a cross again, but nothing here will be round. The cross is only there to keep both sides the same.',
   shapes:[{circle:[50,44,30]},{line:[50,6,50,96]},{line:[16,44,84,44]}]},
  {say:'The skull: flat across the top, straight down the sides, then in to a narrow chin. Every corner sharp.',
   shapes:[{poly:[[34,15],[66,15],[78,29],[76,54],[62,72],[38,72],[24,54],[22,29]],weight:1.4}]},
  {say:'The visor across the eyes, filled in black — a wide band that comes to a point at each end.',
   shapes:[{poly:[[25,37],[40,32],[60,32],[75,37],[66,51],[34,51]],fill:'#16383b'}]},
  {say:'Two eyes cut out of the visor, left white, slanting in towards the middle.',
   shapes:[{poly:[[30,40],[44,36],[46,46],[33,47]],fill:'#ffffff',weight:0.9},
    {poly:[[70,40],[56,36],[54,46],[67,47]],fill:'#ffffff',weight:0.9}]},
  {say:'The V-fin on his forehead: two blades pointing up and out. This is the bit everybody recognises.',
   shapes:[{poly:[[50,28],[36,6],[28,11],[44,30]],weight:1.2},{poly:[[50,28],[64,6],[72,11],[56,30]],weight:1.2}]},
  {say:'Three short vents on each cheek, under the visor.',
   shapes:bothSides([{line:[62,57,73,55],weight:1},{line:[61,61,71,60],weight:1},{line:[60,65,68,64],weight:1}])},
  {say:'A mouth grille and a chin plate at the bottom of the face.',
   shapes:[{poly:[[42,56],[58,56],[55,65],[45,65]],weight:1.1},{line:[44,60,56,60],weight:0.8},
    {poly:[[40,72],[60,72],[56,80],[44,80]],weight:1.1}]},
  {say:'And the neck, straight down into two square shoulders. Done.',
   shapes:[{line:[43,80,41,90],weight:1.2},{line:[57,80,59,90],weight:1.2},
    {poly:[[20,99],[34,89],[41,90],[59,90],[66,89],[80,99]],close:false,weight:1.3}]}
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
