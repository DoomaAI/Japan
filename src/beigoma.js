// Beigoma — べーごま. Small cast-iron tops, wound with a string and thrown into a ring: a
// barrel with a cloth stretched over the top, called a 床. The cloth sags in the middle, so
// the tops drift together whether you meant them to or not, and they batter each other until
// one stops or goes over the edge. Children have been playing it since the Edo period and
// boys spent their pocket money filing and weighting their tops to make them last longer.
//
// The whole skill is in the throw. Once it leaves your hand you are a spectator, which is why
// this is a game of one swipe and then watching — anything else would be a different game.
export const RING=100,TICK=40,EDGE=RING/2;
// The cloth sag. Without it two tops can spin in their own corners for a minute and nothing
// happens; with it they always find each other, which is what the barrel is for.
export const SAG=0.008;
export const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
// Three tops, and the trade is the real one every child works out with a file: a heavy one
// outlasts anything but cannot shift it, and a light one with a sharp edge will flip a top
// twice its weight clean out of the ring before running down itself. Weight decides who
// survives being hit; the filed edge, which is `push` here, decides who does the hitting.
export const TOPS=[
 {id:'omo',ja:'重',romaji:'omo',en:'Heavy iron',mass:1.5,r:7,decay:0.86,push:0.8,speed:0.85,
  how:'Filed heavy. Spins longest and is very hard to shift, but it will not knock anybody out.'},
 {id:'nami',ja:'並',romaji:'nami',en:'Plain',mass:1,r:6,decay:0.98,push:1.45,speed:1.05,
  how:'The one out of the packet. Nothing special and nothing wrong with it.'},
 {id:'karu',ja:'軽',romaji:'karu',en:'Light',mass:0.7,r:5.4,decay:1.1,push:2.8,speed:1.35,
  how:'Filed light with a sharp edge. It will flip one out of the ring, if it lasts long enough to.'}
];
export const topById=id=>TOPS.find(t=>t.id===id)||TOPS[1];
// Five of them, up the yard. Each one is a better top than the last, so it is the same fight
// with the odds moving against you.
export const RIVALS=[
 {id:'first',en:'The little one',ja:'ちび',top:'karu',skill:0.55,pays:25},
 {id:'second',en:'The one from next door',ja:'となり',top:'nami',skill:0.7,pays:45},
 {id:'third',en:'The big brother',ja:'あにき',top:'nami',skill:0.85,pays:75},
 {id:'fourth',en:'The one who files his',ja:'けずり',top:'omo',skill:0.95,pays:120},
 {id:'fifth',en:'The champion of the yard',ja:'おやぶん',top:'omo',skill:1,pays:200}
];
export const rivalAt=i=>RIVALS[Math.max(0,Math.min(RIVALS.length-1,i))];
export const SPIN=100;
const spun=(top,power)=>SPIN*(0.55+power*0.55)*(2-top.decay*0.45);
// A throw is an angle round the rim and how hard it was wound. Everything else follows.
export function newBout({mine,theirs,angle,power,rand=Math.random}){
 const me=topById(mine),them=topById(theirs.top);
 const start=(who,a,p,side)=>{
  const x=Math.cos(a)*EDGE*0.74,y=Math.sin(a)*EDGE*0.74;
  return {id:side,top:who.id,x,y,spin:spun(who,p),
   vx:-Math.cos(a)*1.5*p*who.speed,vy:-Math.sin(a)*1.5*p*who.speed,out:false};
 };
 // He throws from the other side, as well as his skill lets him.
 // He throws from the other side. How close he gets to a good line is what his skill is.
 const his=Math.PI+angle+(rand()-0.5)*2.2*(1.05-theirs.skill);
 return {ring:RING,mine:start(me,angle,power,'mine'),
  theirs:start(them,his,0.32+theirs.skill*0.62,'theirs'),over:null,ticks:0};
}
const alive=t=>!t.out&&t.spin>0;
// One moment of the bout. The cloth pulls them in, spinning costs spin, moving costs more, and
// a knock costs whichever of them was spinning slower a great deal more than the other.
export function beigomaTick(bout,rand=Math.random){
 if(bout.over)return bout;
 const step=one=>{
  if(!alive(one))return one;
  const top=topById(one.top);
  const away=Math.hypot(one.x,one.y)||0.001;
  // Down the sag, towards the middle.
  let vx=one.vx-(one.x/away)*SAG*away*0.1,vy=one.vy-(one.y/away)*SAG*away*0.1;
  // A tired top wanders. A fresh one tracks true.
  const wobble=(1-one.spin/SPIN/1.6)*0.16;
  vx+=(rand()-0.5)*wobble;vy+=(rand()-0.5)*wobble;
  const speed=Math.hypot(vx,vy);
  const spin=one.spin-(0.42+speed*0.55)*top.decay;
  // Friction against the cloth, and a heavy one carries on once it is moving. That is the
  // price of the weight: it outlasts anything, and a good shove sends it sailing over the
  // edge because there is nothing to stop it. Without this the heavy top simply won.
  const drag=1-0.007/top.mass;
  return {...one,x:one.x+vx,y:one.y+vy,vx:vx*drag,vy:vy*drag,spin:Math.max(0,spin)};
 };
 let mine=step(bout.mine),theirs=step(bout.theirs);
 // The knock. They bounce off each other by weight, and the slower one loses the exchange.
 if(alive(mine)&&alive(theirs)){
  const dx=theirs.x-mine.x,dy=theirs.y-mine.y;
  const gap=Math.hypot(dx,dy)||0.001;
  const touching=topById(mine.top).r+topById(theirs.top).r;
  if(gap<touching){
   const nx=dx/gap,ny=dy/gap;
   const a=topById(mine.top),b=topById(theirs.top);
   const force=1.1+Math.hypot(mine.vx-theirs.vx,mine.vy-theirs.vy)*0.35;
   mine={...mine,vx:mine.vx-nx*force*(b.mass/a.mass)*b.push,vy:mine.vy-ny*force*(b.mass/a.mass)*b.push,
    x:mine.x-nx*(touching-gap)/2,y:mine.y-ny*(touching-gap)/2};
   theirs={...theirs,vx:theirs.vx+nx*force*(a.mass/b.mass)*a.push,vy:theirs.vy+ny*force*(a.mass/b.mass)*a.push,
    x:theirs.x+nx*(touching-gap)/2,y:theirs.y+ny*(touching-gap)/2};
   // Whoever was spinning slower comes off worse, which is why lasting matters.
   const total=mine.spin+theirs.spin||1;
   const bite=5+force*2.2;
   mine={...mine,spin:Math.max(0,mine.spin-bite*(theirs.spin/total)*2)};
   theirs={...theirs,spin:Math.max(0,theirs.spin-bite*(mine.spin/total)*2)};
  }
 }
 const off=one=>alive(one)&&Math.hypot(one.x,one.y)>EDGE?{...one,out:true}:one;
 mine=off(mine);theirs=off(theirs);
 const next={...bout,mine,theirs,ticks:bout.ticks+1};
 const iAmUp=alive(mine),heIsUp=alive(theirs);
 if(!iAmUp||!heIsUp)next.over={won:iAmUp&&!heIsUp,
  how:!heIsUp&&theirs.out?'knocked':!heIsUp?'stopped':mine.out?'knockedOut':'ranDown'};
 else if(next.ticks>600)next.over={won:false,how:'timeout'};
 return next;
}
// Beating a better top is worth more, and so is finishing with something left in yours.
export const beigomaWorth=(rival,spinLeft)=>
 Math.max(1,Math.min(9999,rival.pays+Math.round(Math.max(0,spinLeft)/2)));
