// Dōbutsu shōgi — animal shogi. Three squares across, four down, four kinds of piece, and it
// is real shogi: you take a piece, it changes sides, and you drop it back on the board as your
// own. Madoka Kitao, a professional shogi player, drew it up in 2008 so that a small child
// could play a whole game rather than a lesson. Shogi itself has been played here since the
// 1500s, which is the point of putting it in front of a five-year-old.
export const FILES=3,RANKS=4,SQUARES=FILES*RANKS;
export const rowOf=i=>Math.floor(i/FILES),colOf=i=>i%FILES;
export const at=(row,col)=>row*FILES+col;
// Forward is up the board for you and down it for him. Every move below is written from your
// side and flipped for his, because a giraffe is a giraffe whichever way it is facing.
const STEPS={
 lion:[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
 giraffe:[[-1,0],[1,0],[0,-1],[0,1]],
 elephant:[[-1,-1],[-1,1],[1,-1],[1,1]],
 chick:[[-1,0]],
 hen:[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,0]]
};
export const PIECES=[
 {id:'lion',icon:'🦁',en:'Lion',ja:'ライオン',romaji:'raion',how:'One square, any direction. Lose him and you lose.'},
 {id:'giraffe',icon:'🦒',en:'Giraffe',ja:'キリン',romaji:'kirin',how:'One square, straight — never on the diagonal.'},
 {id:'elephant',icon:'🐘',en:'Elephant',ja:'ゾウ',romaji:'zō',how:'One square, diagonally — never straight.'},
 {id:'chick',icon:'🐤',en:'Chick',ja:'ヒヨコ',romaji:'hiyoko',how:'One square forward, and only forward.'},
 {id:'hen',icon:'🐔',en:'Hen',ja:'ニワトリ',romaji:'niwatori',how:'A chick that reached the far row. Everywhere but backwards on the diagonal.'}
];
export const pieceById=id=>PIECES.find(p=>p.id===id);
export const other=side=>side==='me'?'them':'me';
// Your back row is the bottom one; his is the top. A lion that reaches the other man's back
// row has won, so "the far row" means something different to each of you.
export const homeRow=side=>side==='me'?RANKS-1:0,farRow=side=>homeRow(other(side));
const VALUE={lion:1000,giraffe:60,elephant:60,chick:25,hen:55};
export const WIN=100000;
// Long enough that nobody meets it by playing properly, short enough that two lions shuffling
// at each other stops being a game somebody has to sit through.
export const MAX_PLY=200;
// The starting position: giraffe, lion, elephant along the back, a chick in front of the lion,
// and the same again turned around for him.
export function newGame(){
 const board=Array(SQUARES).fill(null);
 board[at(3,0)]={piece:'giraffe',side:'me'};board[at(3,1)]={piece:'lion',side:'me'};board[at(3,2)]={piece:'elephant',side:'me'};
 board[at(2,1)]={piece:'chick',side:'me'};
 board[at(0,0)]={piece:'elephant',side:'them'};board[at(0,1)]={piece:'lion',side:'them'};board[at(0,2)]={piece:'giraffe',side:'them'};
 board[at(1,1)]={piece:'chick',side:'them'};
 return {board,hands:{me:[],them:[]},turn:'me',over:null,ply:0};
}
// Where one piece on one square can go. Off the board and onto your own piece are the only
// two things that stop it — there is no check in this game, so walking into trouble is legal
// and simply loses.
export function movesFor(board,from){
 const cell=board[from];if(!cell)return [];
 const flip=cell.side==='me'?1:-1,row=rowOf(from),col=colOf(from),out=[];
 for(const [dr,dc] of STEPS[cell.piece]){
  const r=row+dr*flip,c=col+dc;
  if(r<0||r>=RANKS||c<0||c>=FILES)continue;
  const to=at(r,c);
  if(board[to]?.side===cell.side)continue;
  out.push(to);
 }
 return out;
}
// A piece in hand goes on any empty square at all. No two-chick rule, no restriction on the
// square — that is the real game, and explaining an exception to a five-year-old is worse.
export const dropsFor=board=>board.map((cell,i)=>cell?null:i).filter(i=>i!==null);
export const attacked=(board,square,by)=>board.some((cell,i)=>cell?.side===by&&movesFor(board,i).includes(square));
export function legalMoves(game,side=game.turn){
 if(game.over)return [];
 const out=[];
 game.board.forEach((cell,from)=>{
  if(cell?.side===side)for(const to of movesFor(game.board,from))out.push({from,to});
 });
 const empty=dropsFor(game.board);
 for(const piece of new Set(game.hands[side]))for(const to of empty)out.push({drop:piece,to});
 return out;
}
// Playing one. A taken hen goes back to being a chick in the hand, a chick that lands on the
// far row is a hen and has no choice about it, and the game ends the moment a lion is taken or
// a lion arrives on the far row with nothing able to take it there.
export function play(game,move){
 if(game.over)return game;
 const side=game.turn,board=[...game.board];
 const hands={me:[...game.hands.me],them:[...game.hands.them]};
 const taken=board[move.to];
 if(taken){
  if(taken.side===side)return game;
  hands[side].push(taken.piece==='hen'?'chick':taken.piece);
 }
 if(move.drop){
  const held=hands[side].indexOf(move.drop);
  if(held<0||taken)return game;
  hands[side].splice(held,1);
  board[move.to]={piece:move.drop,side};
 }else{
  const moving=board[move.from];
  if(!moving||moving.side!==side||!movesFor(game.board,move.from).includes(move.to))return game;
  board[move.from]=null;
  const promoted=moving.piece==='chick'&&rowOf(move.to)===farRow(side);
  board[move.to]=promoted?{piece:'hen',side}:moving;
 }
 const next={board,hands,turn:other(side),over:null,ply:game.ply+1,last:move};
 if(taken?.piece==='lion')next.over={winner:side,how:'capture'};
 else if(!move.drop&&board[move.to].piece==='lion'&&rowOf(move.to)===farRow(side)&&!attacked(board,move.to,other(side)))
  next.over={winner:side,how:'try'};
 else if(!legalMoves(next).length)next.over={winner:side,how:'stuck'};
 else if(next.ply>=MAX_PLY)next.over={winner:null,how:'draw'};
 return next;
}
export const score=(game,side)=>{
 if(game.over)return game.over.winner===side?WIN:game.over.winner?-WIN:0;
 let total=0;
 for(const cell of game.board)if(cell)total+=(cell.side===side?1:-1)*VALUE[cell.piece];
 // A piece in the hand is worth a little less than one already pointed at something.
 for(const piece of game.hands[side])total+=Math.round(VALUE[piece]*0.9);
 for(const piece of game.hands[other(side)])total-=Math.round(VALUE[piece]*0.9);
 return total;
};
// Plain alpha-beta over twelve squares, scored from the point of view of whoever is to move.
// A win found sooner is worth more than the same win found later, so it takes the lion now
// rather than admiring the position for another move.
function search(game,depth,alpha,beta){
 if(game.over)return game.over.winner?(game.over.winner===game.turn?WIN+depth:-WIN-depth):0;
 if(depth===0)return score(game,game.turn);
 let best=-Infinity;
 for(const move of legalMoves(game)){
  const value=-search(play(game,move),depth-1,-beta,-alpha);
  if(value>best)best=value;
  if(best>alpha)alpha=best;
  if(alpha>=beta)break;
 }
 return best;
}
// Three opponents, and every one of them looks an odd number of moves ahead. An even depth
// ends the search on his own move, so he sees himself take a piece and never sees it taken
// back — which makes a deeper even search play worse than a shallower odd one, and made the
// middle level lose to the easy one often enough to notice.
export const LEVELS=[
 {id:'chick',icon:'🐤',en:'Chick',ja:'ヒヨコ',depth:1,how:'Takes what is in front of him and thinks no further.'},
 {id:'giraffe',icon:'🦒',en:'Giraffe',ja:'キリン',depth:3,how:'Looks a move or two ahead. Will set a trap.'},
 {id:'lion',icon:'🦁',en:'Lion',ja:'ライオン',depth:5,how:'Sees the whole thing coming. Beat him and you have beaten him.'}
];
export const levelById=id=>LEVELS.find(l=>l.id===id)||LEVELS[0];
// His move. Equal-looking moves are picked between at random, because a machine that answers
// the same opening the same way every time stops being an opponent after three games.
export function aiMove(game,depth=3,rand=Math.random){
 const moves=legalMoves(game);
 if(!moves.length)return null;
 let best=-Infinity,pick=[];
 for(const move of moves){
  const value=-search(play(game,move),depth-1,-Infinity,Infinity);
  if(value>best){best=value;pick=[move];}
  else if(value===best)pick.push(move);
 }
 return pick[Math.floor(rand()*pick.length)]||pick[0];
}
// What a win is worth. A harder opponent pays more, because otherwise nobody would pick one,
// and a short game pays more than a long one — in this game a long one usually means both
// lions shuffling about rather than anything being risked.
export const shogiWorth=(depth,plies)=>depth*20+Math.max(0,40-plies);
