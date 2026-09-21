// Kingyo-sukui — 金魚すくい, goldfish scooping. The stall the boys will stand in front of at a
// festival: you are given a paper scoop and a bowl, and you get as many fish as you can before
// the paper goes. It always goes. That is the game, and the man running the stall knows it.
//
// The scoop is a poi (ポイ), and the paper comes in numbered grades — the higher the number the
// thinner it is, which is the real difficulty setting at a real stall, so it is the one here.
export const TANK=100,TICK=50;
export const POI_R=11;
// Three fish, and the slow ones are worth more, which is true of the stall as well: the black
// demekin is a poor swimmer and everybody goes for it.
//
// They are drawn rather than picked out of the emoji table, because there is no black fish in
// it — the nearest one comes out blue on a phone, and a black moor that is blue is a thing a
// child notices straight away. Drawing them also means they look the same on every phone.
export const FISH=[
 {id:'wakin',en:'Goldfish',ja:'わきん',romaji:'wakin',speed:1,worth:1,share:0.68,
  body:'#e8792b',fin:'#f4a765',belly:'#f6c89a',girth:0.58,eye:0.8},
 {id:'demekin',en:'Black moor',ja:'でめきん',romaji:'demekin',speed:0.62,worth:3,share:0.26,
  body:'#2f2b33',fin:'#4a444f',belly:'#575060',girth:0.66,eye:1.5},
 {id:'ranchu',en:'Ranchu',ja:'らんちゅう',romaji:'ranchū',speed:0.42,worth:6,share:0.06,
  body:'#d2402f',fin:'#e8705c',belly:'#efa08f',girth:0.78,eye:0.9}
];
export const fishById=id=>FISH.find(f=>f.id===id)||FISH[0];
// The paper. Thicker paper is a longer game rather than a different one.
export const LEVELS=[
 {id:'yon',ja:'四号',romaji:'yon-gō',en:'Thick paper',paper:1,fish:14,pays:20,
  how:'The thickest paper they sell. It still tears, but it forgives a lot first.'},
 {id:'go',ja:'五号',romaji:'go-gō',en:'Ordinary paper',paper:0.68,fish:12,pays:45,
  how:'What you are actually handed at a stall.'},
 {id:'roku',ja:'六号',romaji:'roku-gō',en:'Thin paper',paper:0.46,fish:10,pays:90,
  how:'Thin enough that two fish at once will finish you. One at a time, and be quick about it.'}
];
export const levelById=id=>LEVELS.find(l=>l.id===id)||LEVELS[0];
// What wears the paper out. Everything here is a real thing that ruins a scoop: leaving it
// under water, dragging it about instead of moving it smoothly, and being greedy on the lift.
export const SOAK=0.0042,DRAG=0.0022,LIFT=0.03,GREED=1.7;
export const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
const between=(lo,hi,rand)=>lo+rand()*(hi-lo);
function spawn(i,rand){
 const roll=rand();
 let kind=FISH[0],acc=0;
 for(const f of FISH){acc+=f.share;if(roll<=acc){kind=f;break;}}
 return {key:`f${i}`,kind:kind.id,x:between(12,TANK-12,rand),y:between(12,TANK-12,rand),
  dir:rand()*Math.PI*2,speed:kind.speed*between(0.7,1.15,rand)};
}
export function newTank(levelId,rand=Math.random){
 const level=levelById(levelId);
 return {level:level.id,paper:level.paper,fish:[...Array(level.fish)].map((_,i)=>spawn(i,rand)),
  bowl:[],poi:{x:TANK/2,y:TANK/2,down:false},over:null,scooped:0};
}
// One tick of the tank. The fish swim, the paper gives way, and a lift is resolved the moment
// the finger comes up rather than on some later frame.
export function kingyoTick(tank,{x,y,down,rand=Math.random}){
 if(tank.over)return tank;
 const poi=tank.poi;
 const at={x:x??poi.x,y:y??poi.y};
 const moved=Math.hypot(at.x-poi.x,at.y-poi.y);
 let paper=tank.paper,bowl=tank.bowl,fish=tank.fish,scooped=tank.scooped,over=null;
 // Lifting. Anything sitting on the paper comes up with it, and the more that does the harder
 // the paper is working — two fish is far worse than twice one fish.
 if(poi.down&&!down){
  const caught=fish.filter(f=>Math.hypot(f.x-at.x,f.y-at.y)<=POI_R);
  if(caught.length){
   bowl=[...bowl,...caught.map(f=>f.kind)];
   fish=fish.filter(f=>!caught.includes(f));
   scooped+=caught.length;
   paper-=LIFT*Math.pow(caught.length,GREED);
  }
 }
 // Under water it is soaking, and dragging it about tears it faster than moving it gently.
 if(down)paper-=SOAK+moved*DRAG;
 fish=fish.map(f=>{
  const kind=fishById(f.kind);
  let dir=f.dir+between(-0.35,0.35,rand);
  // They scatter from the scoop, which is most of why this is hard.
  if(down){
   const away=Math.hypot(f.x-at.x,f.y-at.y);
   if(away<POI_R*2.1)dir=Math.atan2(f.y-at.y,f.x-at.x)+between(-0.4,0.4,rand);
  }
  let nx=f.x+Math.cos(dir)*f.speed,ny=f.y+Math.sin(dir)*f.speed;
  if(nx<6||nx>TANK-6){dir=Math.PI-dir;nx=Math.max(6,Math.min(TANK-6,nx));}
  if(ny<6||ny>TANK-6){dir=-dir;ny=Math.max(6,Math.min(TANK-6,ny));}
  return {...f,x:nx,y:ny,dir};
 });
 paper=Math.max(0,paper);
 if(paper<=0)over={won:false,how:'torn'};
 else if(!fish.length)over={won:true,how:'cleared'};
 return {...tank,paper,fish,bowl,scooped,over,poi:{x:at.x,y:at.y,down:!!down}};
}
export const bowlWorth=bowl=>bowl.reduce((sum,id)=>sum+fishById(id).worth,0);
// What the bowl is worth, paid by the paper you did it on. Clearing the tank is worth the rest
// of the paper too, because nobody ever does it.
export const kingyoScore=(level,bowl,paper)=>Math.max(bowl.length?1:0,
 Math.min(9999,Math.round(bowlWorth(bowl)*levelById(level).pays/10+(paper>0?paper*levelById(level).pays:0))));
