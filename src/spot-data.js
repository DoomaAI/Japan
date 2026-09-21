// Spot the difference, made out of our own photographs. The edits are worked out and painted
// on the phone, from the photo the phone already has, so nothing is sent anywhere to build a
// puzzle and a round costs nothing but the photo itself.
//
// The hard part is not editing a photo. It is editing it somewhere a child can actually find:
// a change in a blank sky is invisible and a change to a colourless patch cannot be recoloured.
// So the picture is measured first, and only places with enough going on are touched.
export const LEVELS=[
 {id:'easy',label:'3 to find',count:3,cell:0.2},
 {id:'normal',label:'5 to find',count:5,cell:0.16},
 {id:'hard',label:'7 to find',count:7,cell:0.13}
];
export const levelFor=id=>LEVELS.find(l=>l.id===id)||LEVELS[1];
// The same photo at the same level is the same puzzle on every phone, which is the whole
// point of a race: neither boy can claim he got the easier board.
export function hashSeed(text){
 const s=String(text);let h=2166136261>>>0;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
 return h>>>0||1;
}
export function rng(seed){
 let n=(seed>>>0)||1;
 return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};
}
// A canvas big enough to look at and small enough to measure quickly. A phone screen never
// shows more than this per pane anyway, and both panes are drawn at the same size.
export function workingSize(width,height,max=1000){
 if(!(width>0&&height>0))return {width:0,height:0};
 const scale=Math.min(1,max/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
// How many cells across and down, kept roughly square on the photo so a difference is not a
// long thin sliver on a wide picture.
export function gridFor(level,aspect){
 const cols=Math.max(4,Math.round(1/level.cell));
 return {cols,rows:Math.max(3,Math.round(cols/(aspect>0?aspect:1)))};
}
// Below this a cell is too flat for a change to be findable — sky, a wall, a blurred
// background. Below the colour floor there is nothing to recolour.
export const DETAIL_FLOOR=12,COLOUR_FLOOR=18;
// Standard deviation of brightness across each cell, plus how colourful it is. Every second
// pixel is enough to tell a face from a sky and keeps a big photo instant.
export function detailMap(image,cols,rows){
 const {data,width,height}=image;
 const cells=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const x0=Math.floor(col*width/cols),x1=Math.floor((col+1)*width/cols);
  const y0=Math.floor(row*height/rows),y1=Math.floor((row+1)*height/rows);
  let n=0,sum=0,squares=0,colour=0;
  for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
   const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2];
   const light=r*0.299+g*0.587+b*0.114;
   sum+=light;squares+=light*light;
   colour+=Math.max(r,g,b)-Math.min(r,g,b);
   n++;
  }
  if(!n)continue;
  const mean=sum/n;
  cells.push({col,row,detail:Math.sqrt(Math.max(0,squares/n-mean*mean)),colour:colour/n});
 }
 return cells;
}
// Somewhere worth changing: busy enough to be findable, and spread out, because five
// differences in one corner is a worse game than five across the picture.
export function pickCells(cells,{count,gap=2,floor=DETAIL_FLOOR,random=Math.random}){
 const good=cells.filter(c=>c.detail>=floor).sort((a,b)=>b.detail-a.detail);
 const shuffle=list=>{
  const out=[...list];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
 };
 const chosen=[],clear=c=>!chosen.some(o=>Math.abs(o.col-c.col)<gap&&Math.abs(o.row-c.row)<gap);
 // The busiest handful first, shuffled so the same photo is not edited in the same places
 // every time — then anything else that still passes the floor, rather than giving up early.
 for(const pool of [shuffle(good.slice(0,Math.max(count*4,count))),shuffle(good)])
  for(const c of pool){
   if(chosen.length>=count)break;
   if(!chosen.includes(c)&&clear(c))chosen.push(c);
  }
 return chosen;
}
// What can honestly be done to this cell. A recolour of something grey is not a difference,
// so it is only offered where there is colour to shift.
export const EDIT_KINDS=['patch','clone','flip','grow','recolour'];
export const kindsFor=cell=>EDIT_KINDS.filter(k=>k!=='recolour'||cell.colour>=COLOUR_FLOOR);
// Turn the chosen cells into edits in fractions of the picture, so the same plan paints
// correctly at any size and a tap can be tested against it without knowing the pixels.
export function planEdits(chosen,{cols,rows,cells=[],random=Math.random}){
 const w=1/cols,h=1/rows;
 const taken=c=>chosen.some(o=>Math.abs(o.col-c.col)<2&&Math.abs(o.row-c.row)<2);
 const donors=cells.filter(c=>c.detail>=DETAIL_FLOOR&&!taken(c));
 return chosen.map((cell,i)=>{
  const kinds=kindsFor(cell);
  const kind=kinds[Math.floor(random()*kinds.length)]||'patch';
  const x=cell.col*w,y=cell.row*h;
  const edit={id:`d${i+1}`,kind,x,y,w,h,col:cell.col,row:cell.row};
  if(kind==='patch'){
   // Cover it with what is beside it, so the thing simply is not there any more. Sideways
   // first, then up or down if the picture runs out.
   const step=random()<0.5?-1:1;
   const sideways=Math.min(Math.max(x+step*w,0),1-w);
   edit.from=sideways===x
    ?{x,y:Math.min(Math.max(y+step*h,0),1-h)}
    :{x:sideways,y};
  }else if(kind==='clone'){
   // Put something that belongs elsewhere in the picture here, so a thing appears twice.
   const donor=donors.length?donors[Math.floor(random()*donors.length)]:null;
   if(donor)edit.from={x:donor.col*w,y:donor.row*h};
   else{edit.kind='flip';}
  }else if(kind==='recolour')edit.shift=random()<0.5?1:2;
  else if(kind==='grow')edit.scale=1.25;
  if(edit.kind==='patch'&&edit.from&&edit.from.x===x&&edit.from.y===y)edit.kind='flip';
  return edit;
 });
}
// The whole round, from a photo's pixels to the list of differences. Returns nothing when the
// picture is too plain to make a fair puzzle — better to say so than to hide a change in a sky.
export function planRound(image,{level,seed,aspect}){
 const {cols,rows}=gridFor(level,aspect||image.width/image.height);
 const random=rng(seed);
 const cells=detailMap(image,cols,rows);
 const chosen=pickCells(cells,{count:level.count,random});
 if(chosen.length<level.count)return {edits:[],cols,rows,tooPlain:true,found:chosen.length};
 return {edits:planEdits(chosen,{cols,rows,cells,random}),cols,rows,tooPlain:false};
}
// Rotate the colour channels of what has just been drawn. A crude hue shift, but it needs no
// filter support and it is always visible on anything that has colour in it at all.
export function rotateChannels(ctx,width,height,shift=1){
 const image=ctx.getImageData(0,0,width,height),d=image.data;
 for(let i=0;i<d.length;i+=4){
  const r=d[i],g=d[i+1],b=d[i+2],c=[r,g,b];
  d[i]=c[shift%3];d[i+1]=c[(1+shift)%3];d[i+2]=c[(2+shift)%3];
 }
 ctx.putImageData(image,0,0);
 return ctx;
}
// Fade each edit out at its edges. A hard-edged rectangle is a giveaway — the game is meant to
// be looking at the picture, not hunting for a seam.
export function featherMask(ctx,width,height){
 ctx.globalCompositeOperation='destination-in';
 const gradient=ctx.createRadialGradient(width/2,height/2,Math.min(width,height)*0.2,width/2,height/2,Math.max(width,height)*0.52);
 gradient.addColorStop(0,'rgba(0,0,0,1)');
 gradient.addColorStop(0.7,'rgba(0,0,0,1)');
 gradient.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
 ctx.globalCompositeOperation='source-over';
 return ctx;
}
// Paint the plan onto a copy of the photo. Each edit is built on its own little canvas so it
// can be flipped, grown or recoloured without disturbing anything around it, then feathered
// in. The original is never touched — both panes are drawn from the same source.
export function applyEdits(ctx,source,edits,{width,height,makeCanvas,feather=true}){
 const painted=[];
 for(const edit of edits){
  const r={
   x:Math.round(edit.x*width),y:Math.round(edit.y*height),
   w:Math.max(1,Math.round(edit.w*width)),h:Math.max(1,Math.round(edit.h*height))
  };
  if(r.w<4||r.h<4)continue;
  const tile=makeCanvas(r.w,r.h),t=tile.getContext('2d');
  if((edit.kind==='patch'||edit.kind==='clone')&&edit.from)
   t.drawImage(source,Math.round(edit.from.x*width),Math.round(edit.from.y*height),r.w,r.h,0,0,r.w,r.h);
  else if(edit.kind==='flip'){
   t.translate(r.w,0);t.scale(-1,1);
   t.drawImage(source,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
   t.setTransform(1,0,0,1,0,0);
  }else if(edit.kind==='grow'){
   const scale=edit.scale||1.25,inset=(1-1/scale)/2;
   t.drawImage(source,r.x+r.w*inset,r.y+r.h*inset,r.w/scale,r.h/scale,0,0,r.w,r.h);
  }else{
   t.drawImage(source,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
   rotateChannels(t,r.w,r.h,edit.shift||1);
  }
  if(feather)featherMask(t,r.w,r.h);
  ctx.drawImage(tile,r.x,r.y);
  painted.push(edit.id);
 }
 return painted;
}
// A finger is not a pixel. A tap counts anywhere in the changed patch, or just outside it.
// Tapping something already found is neither a hit nor a miss — being sure of an answer you
// already gave should not cost a five-year-old points.
export function hitTest(edits,point,{found=[],tolerance=0.035}={}){
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
 let best=null,closest=Infinity;
 for(const edit of edits){
  const dx=Math.max(0,Math.abs(point.x-(edit.x+edit.w/2))-edit.w/2);
  const dy=Math.max(0,Math.abs(point.y-(edit.y+edit.h/2))-edit.h/2);
  const distance=Math.hypot(dx,dy);
  if(distance<=tolerance&&distance<closest){closest=distance;best=edit;}
 }
 if(!best)return null;
 return {id:best.id,already:found.includes(best.id)};
}
// The next one to point at, for a hint. Always one they have not found.
export const hintFor=(edits,found=[])=>edits.find(e=>!found.includes(e.id))||null;
// Side by side, or above and below. Whichever gives each pane more of the photo — which on a
// phone held upright means stacked, and side by side the moment it is turned, and does the
// right thing for a tall photo either way without asking which way up the phone is.
export function paneLayout({width,height,aspect,gap=12}){
 if(!(width>0&&height>0&&aspect>0))return 'rows';
 const area=(boxWidth,boxHeight)=>{
  const w=Math.min(boxWidth,boxHeight*aspect);
  return Math.max(0,w*(w/aspect));
 };
 return area((width-gap)/2,height)>area(width,(height-gap)/2)?'columns':'rows';
}
// How big one pane actually is, worked out here rather than left to the stylesheet, because
// a tap is turned into a position on the photo and that only works if the box on screen and
// the photo in it are exactly the same shape.
export function paneBox({width,height,aspect,mode,gap=12}){
 if(!(width>0&&height>0&&aspect>0))return {width:0,height:0};
 const boxWidth=mode==='columns'?(width-gap)/2:width;
 const boxHeight=mode==='columns'?height:(height-gap)/2;
 const w=Math.max(40,Math.min(boxWidth,boxHeight*aspect));
 return {width:Math.round(w),height:Math.round(w/aspect)};
}
export const SPOT_SCORE={find:100,miss:12,hint:40,quick:150};
// A find is always worth more than a miss costs, so looking is never punished into not
// looking. The time bonus is only paid for finishing: there is no prize for giving up fast.
export function spotScore({found=0,total=0,misses=0,hints=0,seconds=0}={}){
 const base=found*SPOT_SCORE.find-misses*SPOT_SCORE.miss-hints*SPOT_SCORE.hint;
 const bonus=total>0&&found>=total?Math.max(0,SPOT_SCORE.quick-Math.round(seconds)*2):0;
 return Math.max(0,Math.min(9999,Math.round(base+bonus)));
}
export const spotGame=(photoId,count)=>`spot-${String(photoId||'').slice(0,8)}-${count}`;
