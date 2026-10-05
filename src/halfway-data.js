// Halfway Wrapped: Spotify's year-in-review shape, for a trip still going. The numbers so far,
// the stop everyone rated highest, and each person's favourite, as one square picture for the
// share sheet. Everything is counted out of the recap story's own cards, so the two can never
// disagree; this only picks the lines that fit on a square and draws them.
import {recapStory} from './recap-story.js';
import {tripCountdown} from './timing.js';
export const HALFWAY_FROM=0.5;
// From halfway on, and only while the trip is under way.
export function halfwayDue(state,today){
 const c=tripCountdown(state.days||[],today);
 return !!c&&c.phase==='during'&&c.day/c.total>=HALFWAY_FROM;
}
// What the card is called on the day: "Halfway there" only for its first two days, then the trip
// so far, and the last day by name, so day 16 of 16 is never called halfway.
export function halfwayHeadline(dayNumber,total){
 if(dayNumber>=total)return 'Our last day';
 return dayNumber<=Math.ceil(total*HALFWAY_FROM)+1?'Halfway there':'The trip so far';
}
export function halfwayCard(state,{today}={}){
 const cards=recapStory(state,{today,parent:false}),c=tripCountdown(state.days||[],today);
 const title=cards.find(x=>x.kind==='title'),numbers=cards.find(x=>x.kind==='numbers'),top=cards.find(x=>x.kind==='top'),people=cards.filter(x=>x.kind==='person');
 if(!title||!c)return null;
 return {
  title:title.title,dayNumber:c.day,total:c.total,headline:halfwayHeadline(c.day,c.total),
  stats:(numbers?.stats||[]).slice(0,6),
  top:top?.moments?.[0]||null,
  favourites:people.filter(p=>p.favourite).map(p=>({person:p.person,title:p.favourite.title,stars:p.favourite.stars})),
  places:(cards.find(x=>x.kind==='places')?.places||[]).map(p=>p.city)
 };
}
// The lines, in order, that go on the square: a pure list so it can be checked without a canvas.
export function halfwayLines(card){
 const lines=[['eyebrow',`Day ${card.dayNumber} of ${card.total} · so far`],['title',card.title]];
 if(card.places.length)lines.push(['small',card.places.join(' · ')]);
 for(const [icon,n,label] of card.stats)lines.push(['stat',`${icon} ${n.toLocaleString('en')} ${label}`]);
 if(card.top)lines.push(['top',`★ ${card.top.average.toFixed(1)} · ${card.top.title}`]);
 for(const f of card.favourites)lines.push(['fav',`${f.person}: ${f.title}`]);
 lines.push(['foot','Pasfield family · Japan 2026']);
 return lines;
}
const FONT={eyebrow:'600 34px',title:'700 72px',small:'400 32px',stat:'600 44px',top:'600 40px',fav:'400 36px',foot:'400 28px'};
// The height each line takes, its type size and a little air, so nothing sits on the line above.
const RISE={eyebrow:34,title:80,small:34,stat:48,top:44,fav:40,foot:28},AIR={eyebrow:14,title:26,small:30,stat:12,top:22,fav:8,foot:0};
// A line broken to fit: words kept whole, at most `max` lines, the last one ended with an ellipsis.
export function wrapLine(measure,text,width,max=2){
 const words=String(text).split(' '),out=[];let line='';
 for(const w of words){const next=line?`${line} ${w}`:w;if(measure(next)<=width||!line)line=next;else{out.push(line);line=w;}}
 if(line)out.push(line);
 if(out.length>max){const cut=out.slice(0,max);cut[max-1]=cut[max-1].replace(/\s+\S*$/,'')+'…';return cut;}
 return out;
}
export function drawHalfway(card,canvas){
 const W=1080,pad=80;canvas.width=W;canvas.height=W;
 const ctx=canvas.getContext('2d');
 const g=ctx.createLinearGradient(0,0,W,W);g.addColorStop(0,'#16383b');g.addColorStop(1,'#28665a');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,W);
 ctx.fillStyle='#da684f';ctx.beginPath();ctx.arc(W-140,150,90,0,Math.PI*2);ctx.fill();
 ctx.textAlign='left';ctx.textBaseline='alphabetic';
 const lines=halfwayLines(card),body=lines.filter(([k])=>k!=='foot'),foot=lines.find(([k])=>k==='foot');
 let y=pad;
 for(const [kind,text] of body){
  ctx.font=`${FONT[kind]} 'DM Sans',system-ui,-apple-system,sans-serif`;
  ctx.globalAlpha=kind==='eyebrow'||kind==='small'?.8:1;
  ctx.fillStyle=kind==='top'?'#e0c37a':'#fff';
  const width=W-pad*2-(kind==='title'||kind==='eyebrow'?220:0),rows=wrapLine(t=>ctx.measureText(t).width,text,width,kind==='title'||kind==='small'?2:1);
  for(const row of rows){y+=RISE[kind];if(y>W-pad-70)break;ctx.fillText(row,pad,y);}
  y+=AIR[kind];
  if(y>W-pad-70)break;
 }
 if(foot){ctx.font=`${FONT.foot} 'DM Sans',system-ui,-apple-system,sans-serif`;ctx.globalAlpha=.8;ctx.fillStyle='#fff';ctx.fillText(foot[1],pad,W-pad+10);}
 ctx.globalAlpha=1;
 return canvas;
}
