// Gomoku — 五目並べ, "five eyes lined up". Get five of your stones in a row, any direction.
// The rules take two minutes to teach and the game does not run out of depth for years, which
// is the whole reason it is in here: it is the one game on this phone a parent and an
// eight-year-old can both take seriously.
//
// On the origin mark: it is traditional in Japan and was formalised here as renju in 1899, but
// games of five-in-a-row are older than that and are not only Japanese. The story on the card
// says so. The mark exists to stop that sort of thing being fudged, so it would be a poor
// showing to fudge it here.
// Eleven and thirteen. Nine was tried and thrown out: measured over thirty-two games at every
// setting, two engines that both block well drew twenty-four to twenty-seven of them, because
// five in a row on a small board is a draw once nobody blunders. Eleven is decisive and still
// fits a child's finger.
export const SIZES=[11,13];
export const EMPTY=0,BLACK=1,WHITE=2;
export const other=side=>side===BLACK?WHITE:BLACK;
export const idx=(size,r,c)=>r*size+c;
const DIRS=[[0,1],[1,0],[1,1],[1,-1]];
export const newBoard=size=>Array(size*size).fill(EMPTY);
// How long a line this stone would be part of, and whether the ends are open. An open three is
// worth far more than a blocked four, and that single fact is most of what playing well is.
export function lineAt(board,size,r,c,dr,dc,side){
 let count=1,open=0;
 for(const way of [1,-1]){
  let rr=r+dr*way,cc=c+dc*way;
  while(rr>=0&&rr<size&&cc>=0&&cc<size&&board[idx(size,rr,cc)]===side){count++;rr+=dr*way;cc+=dc*way;}
  if(rr>=0&&rr<size&&cc>=0&&cc<size&&board[idx(size,rr,cc)]===EMPTY)open++;
 }
 return {count,open};
}
export const WIN=5;
// Did putting a stone here finish it? Five or more counts, which is the plain version of the
// rule and the one everybody plays in a playground.
export function winsAt(board,size,at,side){
 const r=Math.floor(at/size),c=at%size;
 return DIRS.some(([dr,dc])=>lineAt(board,size,r,c,dr,dc,side).count>=WIN);
}
// What a line of that length with that many open ends is worth. A four nobody can block is a
// win next move; a four with one end shut is only a threat; an open three is the real danger,
// because it becomes an open four and there is no single answer to one.
export const SHAPE={5:100000,'4-2':20000,'4-1':1200,'3-2':1500,'3-1':120,'2-2':110,'2-1':12,'1-2':8,'1-1':2};
export const shapeValue=({count,open})=>count>=WIN?SHAPE[5]:(open===0?0:SHAPE[`${count}-${open}`]||0);
// What this square is worth to one side: what it builds, plus what it takes away from the other.
// Blocking is weighted well under attacking, and the number was measured rather than felt. Two
// engines that value blocking as highly as attacking simply fill the board in — at 0.93 nearly
// every game between two of them was a draw. It also belongs to the engine rather than to the
// level: giving the weak one a different block weight let it out-attack the middle one on the
// bigger board, which put the ladder out of order until it was made the same for everybody.
export const BLOCK=0.35;
export function scoreAt(board,size,at,side,block=BLOCK){
 if(board[at]!==EMPTY)return -1;
 const r=Math.floor(at/size),c=at%size;
 let mine=0,theirs=0;
 for(const [dr,dc] of DIRS){
  mine+=shapeValue(lineAt(board,size,r,c,dr,dc,side));
  theirs+=shapeValue(lineAt(board,size,r,c,dr,dc,other(side)));
 }
 // Near the middle is worth a little, which stops the opening drifting into a corner.
 const middle=(size-1)/2;
 const central=(size-Math.abs(r-middle)-Math.abs(c-middle))/size;
 return mine+theirs*block+central;
}
// Only squares next to a stone are worth looking at. On an empty board that is the middle.
export function candidates(board,size,reach=2){
 const near=new Set();
 board.forEach((v,i)=>{
  if(v===EMPTY)return;
  const r=Math.floor(i/size),c=i%size;
  for(let dr=-reach;dr<=reach;dr++)for(let dc=-reach;dc<=reach;dc++){
   const rr=r+dr,cc=c+dc;
   if(rr>=0&&rr<size&&cc>=0&&cc<size&&board[idx(size,rr,cc)]===EMPTY)near.add(idx(size,rr,cc));
  }
 });
 return near.size?[...near]:[idx(size,(size-1)>>1,(size-1)>>1)];
}
// The three of them differ in how often they MISS something, not in how deeply they think.
// That is what a weak player actually does, and it is the only lever that moved the result:
// blur alone made almost no difference, because every level still blocked every four and
// taking or blocking a four is what decides a game of gomoku. Letting the easy one fail to
// see it is what makes him the easy one.
export const LEVELS=[
 {id:'child',ja:'こども',romaji:'kodomo',en:'Child',misses:0.5,blur:0.5,pays:40,
  how:'Plays for himself. He will walk straight past a four of yours about half the time.'},
 {id:'grown',ja:'おとな',romaji:'otona',en:'Grown-up',misses:0.1,blur:0.15,pays:90,
  how:'Blocks nearly everything and takes nearly every chance. He lets about one in eight past.'},
 {id:'master',ja:'めいじん',romaji:'meijin',en:'Master',misses:0,blur:0,pays:170,
  how:'Never misses a four and never misplays a square. If you beat him you have beaten him.'}
];
export const levelById=id=>LEVELS.find(l=>l.id===id)||LEVELS[0];
const best=(list,rand)=>list[Math.floor(rand()*list.length)];
// His move: win if he can, stop you winning if he sees it, otherwise take the square worth most.
//
// A two-move search was written first and made him play worse — what it kept finding is that
// the other side always has a good square somewhere, so he went passive and lost to the level
// below him. A threat ladder was written next, and measuring it rung by rung showed the
// open-four rungs never changed the move at all, because scoreAt already values an open four
// at twenty thousand and picks it anyway, while the speculative rungs made him worse again.
// Both were deleted, and what is left is the honest version.
export function aiMove(board,size,side,levelId='grown',rand=Math.random){
 const level=levelById(levelId);
 const them=other(side);
 const spots=candidates(board,size);
 const pickBest=(hits)=>{
  const ranked=hits.map(at=>({at,value:scoreAt(board,size,at,side)})).sort((a,b)=>b.value-a.value);
  return best(ranked.filter(h=>h.value>=ranked[0].value-0.0001),rand).at;
 };
 const win=spots.filter(at=>winsAt(place(board,at,side),size,at,side));
 if(win.length)return pickBest(win);
 // The one thing a weak player really does: look straight past a four.
 if(!(level.misses&&rand()<level.misses)){
  const stop=spots.filter(at=>winsAt(place(board,at,them),size,at,them));
  if(stop.length)return pickBest(stop);
 }
 let scored=spots.map(at=>({at,value:scoreAt(board,size,at,side)}));
 if(level.blur)scored=scored.map(s=>({...s,value:s.value*(1-rand()*level.blur)}));
 scored.sort((a,b)=>b.value-a.value);
 return best(scored.filter(s=>s.value>=scored[0].value-0.0001),rand).at;
}
export const place=(board,at,side)=>{const next=[...board];next[at]=side;return next;};
export const full=board=>board.every(v=>v!==EMPTY);
// A win pays by who you beat and how few stones it took, because a long game of gomoku is
// usually two people refusing to commit rather than anything happening.
export const gomokuWorth=(level,stones)=>
 Math.max(1,Math.min(9999,levelById(level).pays+Math.max(0,60-stones)*2));
