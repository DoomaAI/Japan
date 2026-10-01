// The Blend, Spotify's pairwise card, at the end of the trip: for any two of us, what we both
// starred, the foods we both loved, and the stop we disagreed about most. Two boys who never agree
// on anything find out they both gave the bullet train five stars. Drawn as a square for the share
// sheet, the same way as the halfway card.
import {FOOD} from './food-data.js';
import {tripCountdown} from './timing.js';
import {wrapLine} from './halfway-data.js';
export const BOTH_LOVED=4.5,BLEND_FROM=2;
// From the last couple of days of the trip, and after it.
export function blendDue(state,today){
 const c=tripCountdown(state.days||[],today);
 return !!c&&(c.phase==='after'||(c.phase==='during'&&c.days<=BLEND_FROM));
}
export function blendFor(state,a,b){
 if(!a||!b||a===b)return null;
 const both=[],gaps=[];
 for(const [id,e] of Object.entries(state.stepReviews||{})){
  const ra=e?.ratings?.[a],rb=e?.ratings?.[b];if(!ra||!rb)continue;
  const step=(state.steps||[]).find(s=>s.id===id);if(!step)continue;
  if(ra>=BOTH_LOVED&&rb>=BOTH_LOVED)both.push({title:step.title,day:step.day,stars:Math.min(ra,rb)});
  gaps.push({title:step.title,day:step.day,[a]:ra,[b]:rb,gap:Math.abs(ra-rb)});
 }
 const name=id=>FOOD.find(f=>f.id===id)?.en||(state.foodItems||[]).find(f=>f.id===id)?.en||null;
 const foods=Object.entries(state.food||{}).filter(([,e])=>e?.ratings?.[a]>=BOTH_LOVED&&e?.ratings?.[b]>=BOTH_LOVED).map(([id])=>name(id)).filter(Boolean);
 const apart=gaps.filter(g=>g.gap>=1.5).sort((x,y)=>y.gap-x.gap)[0]||null;
 const rated=gaps.length;
 const match=rated?Math.round(100*gaps.filter(g=>g.gap<1).length/rated):null;
 return {a,b,both:both.sort((x,y)=>y.stars-x.stars||x.day.localeCompare(y.day)).slice(0,5),foods:foods.slice(0,4),apart,rated,match};
}
// The lines on the square, as a pure list so it can be checked without a canvas.
export function blendLines(bl){
 const lines=[['eyebrow','Japan 2026 · the Blend'],['title',`${bl.a} + ${bl.b}`]];
 if(bl.match!==null)lines.push(['small',`${bl.match}% in tune, over ${bl.rated} stop${bl.rated===1?'':'s'} you both rated`]);
 if(bl.both.length){lines.push(['head','Both gave it five stars']);for(const s of bl.both)lines.push(['item',`★ ${s.title}`]);}
 if(bl.foods.length)lines.push(['item',`Both loved: ${bl.foods.join(', ')}`]);
 if(bl.apart)lines.push(['head','Never agreed on'],['item',`${bl.apart.title}: ${bl.a} ${bl.apart[bl.a]}★, ${bl.b} ${bl.apart[bl.b]}★`]);
 if(!bl.both.length&&!bl.apart)lines.push(['small','Rate a few more stops each and the Blend fills in.']);
 lines.push(['foot','Pasfield family · Japan 2026']);
 return lines;
}
const FONT={eyebrow:'600 34px',title:'700 76px',small:'400 32px',head:'700 38px',item:'500 38px',foot:'400 28px'};
const RISE={eyebrow:34,title:84,small:34,head:40,item:44,foot:28},AIR={eyebrow:16,title:24,small:30,head:10,item:8,foot:0};
export function drawBlend(bl,canvas){
 const W=1080,pad=80;canvas.width=W;canvas.height=W;
 const ctx=canvas.getContext('2d');
 const g=ctx.createLinearGradient(0,0,W,W);g.addColorStop(0,'#3d2a5c');g.addColorStop(1,'#16383b');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,W);
 ctx.globalAlpha=.9;ctx.fillStyle='#da684f';ctx.beginPath();ctx.arc(W-190,160,90,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#e0c37a';ctx.beginPath();ctx.arc(W-110,160,90,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 const lines=blendLines(bl),body=lines.filter(([k])=>k!=='foot'),foot=lines.find(([k])=>k==='foot');
 let y=pad;
 for(const [kind,text] of body){
  ctx.font=`${FONT[kind]} 'DM Sans',system-ui,-apple-system,sans-serif`;
  ctx.globalAlpha=kind==='eyebrow'||kind==='small'?.8:1;ctx.fillStyle=kind==='head'?'#e0c37a':'#fff';
  const rows=wrapLine(t=>ctx.measureText(t).width,text,W-pad*2-(kind==='title'||kind==='eyebrow'?300:0),kind==='small'?2:1);
  for(const row of rows){y+=RISE[kind];if(y>W-pad-70)break;ctx.fillText(row,pad,y);}
  y+=AIR[kind];if(y>W-pad-70)break;
 }
 if(foot){ctx.font=`${FONT.foot} 'DM Sans',system-ui,-apple-system,sans-serif`;ctx.globalAlpha=.8;ctx.fillStyle='#fff';ctx.fillText(foot[1],pad,W-pad+10);}
 ctx.globalAlpha=1;return canvas;
}
