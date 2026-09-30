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
export function halfwayCard(state,{today}={}){
 const cards=recapStory(state,{today,parent:false}),c=tripCountdown(state.days||[],today);
 const title=cards.find(x=>x.kind==='title'),numbers=cards.find(x=>x.kind==='numbers'),top=cards.find(x=>x.kind==='top'),people=cards.filter(x=>x.kind==='person');
 if(!title||!c)return null;
 return {
  title:title.title,dayNumber:c.day,total:c.total,
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
const GAP={eyebrow:44,title:96,small:60,stat:62,top:70,fav:50,foot:40};
// Drawn on a 1080 square in the app's colours, for the share sheet.
export function drawHalfway(card,canvas){
 const W=1080,pad=80;canvas.width=W;canvas.height=W;
 const ctx=canvas.getContext('2d');
 const g=ctx.createLinearGradient(0,0,W,W);g.addColorStop(0,'#16383b');g.addColorStop(1,'#28665a');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,W);
 ctx.fillStyle='#da684f';ctx.beginPath();ctx.arc(W-140,150,90,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='alphabetic';
 const lines=halfwayLines(card),fit=(t,max)=>{let s=t;while(ctx.measureText(s).width>max&&s.length>4)s=s.slice(0,-2);return s===t?t:s+'…';};
 let y=pad+40;
 for(const [kind,text] of lines){
  ctx.font=`${FONT[kind]} 'DM Sans',system-ui,-apple-system,sans-serif`;
  ctx.globalAlpha=kind==='eyebrow'||kind==='small'||kind==='foot'?.8:1;
  if(kind==='foot'){ctx.textAlign='left';y=W-pad;}
  if(kind==='top'){ctx.fillStyle='#e0c37a';}else ctx.fillStyle='#fff';
  ctx.fillText(fit(text,W-pad*2-(kind==='title'?200:0)),pad,y);
  y+=GAP[kind];
  if(kind==='small')y+=20;
  if(y>W-pad-60&&kind!=='foot')break;
 }
 ctx.globalAlpha=1;
 return canvas;
}
