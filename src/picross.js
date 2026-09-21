// Picross — お絵かきロジック, "drawing logic". Nonograms: the numbers down the side and along
// the top say how many squares in a row are filled and in what order, and working out which is
// the whole game. A solved grid is a picture.
//
// This is the genuinely Japanese puzzle, which is the reason it is in here. Two people invented
// it independently in Japan in 1987 — Non Ishida, who won a competition with it, and Tetsuya
// Nishio — and it went out from there. Sudoku is the opposite story and the reason the games
// list carries an origin mark at all: American, out of Indianapolis in 1979, named and made
// famous in Japan, and called Japanese ever since.
export const cluesOf=line=>{
 const out=[];let run=0;
 for(const cell of line){if(cell){run++;}else{if(run)out.push(run);run=0;}}
 if(run)out.push(run);
 return out.length?out:[0];
};
// Every way a row's numbers could sit in a line of that length. The grids here are ten wide at
// most, so this is a handful of arrangements rather than a search worth being clever about.
export function arrangements(clue,length){
 const runs=clue.filter(n=>n>0);
 const out=[];
 const walk=(i,from,cells)=>{
  if(i===runs.length){out.push([...cells,...Array(length-cells.length).fill(0)]);return;}
  const need=runs.slice(i).reduce((a,b)=>a+b,0)+(runs.length-i-1);
  for(let start=from;start+need<=length;start++){
   const next=[...cells];
   while(next.length<start)next.push(0);
   for(let k=0;k<runs[i];k++)next.push(1);
   if(i<runs.length-1)next.push(0);
   walk(i+1,next.length,next);
  }
 };
 walk(0,0,[]);
 return out;
}
// The solver, and it is here to keep puzzles out rather than to play them. It only ever deduces
// — it never guesses — so a picture it cannot finish is one a person would have to guess at,
// and a puzzle you have to guess at is not a puzzle. Anything it fails on never ships: there is
// a test that runs it over every picture in the list.
export function solve(rows,cols){
 const height=rows.length,width=cols.length;
 const grid=Array.from({length:height},()=>Array(width).fill(-1));
 const options=(clue,length,known)=>arrangements(clue,length)
  .filter(a=>a.every((v,i)=>known[i]<0||known[i]===v));
 let moved=true;
 while(moved){
  moved=false;
  for(let r=0;r<height;r++){
   const opts=options(rows[r],width,grid[r]);
   if(!opts.length)return null;
   for(let c=0;c<width;c++){
    const first=opts[0][c];
    if(grid[r][c]<0&&opts.every(o=>o[c]===first)){grid[r][c]=first;moved=true;}
   }
  }
  for(let c=0;c<width;c++){
   const known=grid.map(row=>row[c]);
   const opts=options(cols[c],height,known);
   if(!opts.length)return null;
   for(let r=0;r<height;r++){
    const first=opts[0][r];
    if(grid[r][c]<0&&opts.every(o=>o[r]===first)){grid[r][c]=first;moved=true;}
   }
  }
 }
 return grid.some(row=>row.some(v=>v<0))?null:grid;
}
export const gridOf=picture=>picture.art.map(row=>[...row].map(ch=>ch==='#'?1:0));
export function puzzleFor(picture){
 const grid=gridOf(picture);
 return {picture,grid,size:grid.length,
  rows:grid.map(cluesOf),
  cols:grid[0].map((_,c)=>cluesOf(grid.map(row=>row[c])))};
}
export const solvable=picture=>{
 const p=puzzleFor(picture);
 const found=solve(p.rows,p.cols);
 return !!found&&found.every((row,r)=>row.every((v,c)=>v===p.grid[r][c]));
};
// The pictures. Every one is drawn here by hand and then put through the solver above before it
// is allowed in — a test runs that over the whole list, so a picture that needs guessing cannot
// reach a child. Two were drawn, failed it and were redrawn or dropped.
//
// The name is not shown until it is solved. The picture is the reward, and a puzzle that tells
// you what you are drawing has given away half of what you were working out.
export const PICTURES=[
 {id:'fuji',en:'Mount Fuji',ja:'ふじさん',art:['..#..','..#..','.###.','.###.','#####']},
 {id:'torii',en:'Torii gate',ja:'とりい',art:['#####','.#.#.','#####','.#.#.','.#.#.']},
 {id:'cup',en:'Tea cup',ja:'ゆのみ',art:['.....','#####','.###.','.###.','..#..']},
 {id:'fish',en:'Fish',ja:'さかな',art:['...#.','.####','#####','.####','...#.']},
 {id:'star',en:'Star',ja:'ほし',art:['..#..','#####','.###.','.#.#.','#...#']},
 {id:'cat',en:'Cat',ja:'ねこ',art:['#...#','#####','#.#.#','#####','.###.']},
 {id:'umbrella',en:'Umbrella',ja:'かさ',art:['..#..','.###.','#####','..#..','..##.']},
 {id:'onigiri',en:'Rice ball',ja:'おにぎり',art:['..#..','.###.','.###.','#####','#####']},
 {id:'crane',en:'Paper crane',ja:'おりづる',art:[
  '.....##...','....###...','...####...','..#####...','.########.',
  '##########','.######...','..####....','...##.....','...##.....']},
 {id:'fujibig',en:'Mount Fuji',ja:'ふじさん',art:[
  '..........','....##....','...####...','...####...','..######..',
  '..######..','.########.','.########.','##########','##########']},
 {id:'lantern',en:'Paper lantern',ja:'ちょうちん',art:[
  '....##....','.########.','##########','##########','##########',
  '##########','##########','##########','.########.','....##....']},
 {id:'shinkansen',en:'Bullet train',ja:'しんかんせん',art:[
  '..........','.....#####','....######','..########','.#########',
  '##########','##########','.########.','..#....#..','..#....#..']},
 {id:'daruma',en:'Daruma doll',ja:'だるま',art:[
  '...####...','..######..','.########.','##########','##.####.##',
  '##########','##########','.########.','..######..','...####...']},
 {id:'koi',en:'Koi carp',ja:'こい',art:[
  '..........','....####..','..######.#','.########.','##########',
  '.########.','..######.#','....####..','..........','..........']},
 {id:'blossom',en:'Cherry blossom',ja:'さくら',art:[
  '..##..##..','.####.####','.####.####','..##..##..','...####...',
  '..######..','.########.','..######..','...####...','....##....']},
 {id:'neko',en:'Lucky cat',ja:'まねきねこ',art:[
  '.##....##.','.########.','.##.##.##.','.########.','..######..',
  '.########.','##########','##########','.########.','..######..']},
 {id:'sushi',en:'Sushi',ja:'すし',art:[
  '..........','...####...','..######..','.########.','##########',
  '##########','##########','.########.','..........','..........']},
 {id:'pagoda',en:'Pagoda',ja:'ごじゅうのとう',art:[
  '....##....','##########','...####...','.########.','...####...',
  '##########','...####...','.########.','...####...','..######..']},
 {id:'kite',en:'Kite',ja:'たこ',art:[
  '....##....','...####...','..######..','.########.','##########',
  '.########.','..######..','...####...','....##....','....##....']}
];
export const SIZES=[5,10];
export const pictureById=id=>PICTURES.find(p=>p.id===id)||PICTURES[0];
export const picturesOf=size=>PICTURES.filter(p=>p.art.length===size);
export const sizeOf=picture=>picture.art.length;
// Filling a square that is not in the picture is not punished while you play — you work it out
// and cross it back off — but it is counted, because a child who guesses should not out-score
// one who worked it out. Time matters less than that, and never takes a solve below its size.
export const WRONG=6;
export const picrossScore=(size,seconds,wrong)=>{
 const base=size*size*2;
 return Math.max(size,Math.min(9999,Math.round(base+Math.max(0,300-seconds)/3-wrong*WRONG)));
};
