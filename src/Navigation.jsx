import React,{useEffect,useRef,useState} from 'react';
import {Camera,Dices,Sparkles,MessageSquare,Lightbulb,House,CalendarDays,Ticket,UtensilsCrossed,Coins,PiggyBank,Trophy,NotebookPen,MapPin,Users,LifeBuoy,Inbox,Mail,FerrisWheel,ShoppingBag,BookOpen,Bell,Search,Heart,MoreHorizontal,ChevronRight,CloudSun,ListChecks,ClipboardList,Circle,SlidersHorizontal,ChevronUp} from 'lucide-react';
import {PAGES,primaryNav,moreSections,navActive} from './nav-data.js';
import {swipeVertical} from './swipe.js';
const ICONS={today:House,days:CalendarDays,tickets:Ticket,food:UtensilsCrossed,money:Coins,challenges:Trophy,games:Dices,photos:Camera,
 diary:NotebookPen,places:MapPin,meeting:Users,help:LifeBuoy,options:Inbox,parks:FerrisWheel,weather:CloudSun,todo:ListChecks,
 planning:ClipboardList,inbox:Mail,
 shopping:ShoppingBag,spending:PiggyBank,phrases:MessageSquare,facts:Lightbulb,guide:BookOpen,updates:Bell,search:Search,thanks:Heart,mascot:Sparkles,
 personalise:SlidersHorizontal};
// A page with no icon of its own still gets a row. The bug this fixes: weather, the to-do list,
// the planning board and forwarded email had no entry here, so More rendered <undefined/> and
// the whole screen came down with it — the one screen that reaches every other screen.
export const iconFor=id=>ICONS[id]||Circle;
const SLACK=8;
export function BottomNav({tab,user,go,unread,prefs}){
 const strip=useRef(null);
 // The five tabs swipe sideways when the phone is too narrow for them. More does not travel
 // with them: it is pinned to the end of the bar, because it is the way to every other screen
 // and a way out that can be swiped off the edge is no way out at all.
 useEffect(()=>{
  const box=strip.current,on=box?.querySelector('.active');
  if(!box||!on||!box.scrollTo)return;
  const behavior=window.matchMedia?.('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';
  box.scrollTo({left:on.offsetLeft-(box.clientWidth-on.offsetWidth)/2,behavior});
 },[tab,user?.name,user?.role,prefs]);
 // Which way there is more to swipe, so the strip can fade on that side. A tab cut off by a
 // hard edge reads as the end of the bar; a tab fading out reads as something to swipe for.
 const [swipe,setSwipe]=useState('');
 useEffect(()=>{
  const box=strip.current;
  if(!box)return;
  const mark=()=>{
   // A couple of stray pixels of overflow are not worth a fade, so SLACK has to be cleared
   // before the strip admits to being a scroller at all.
   const room=box.scrollWidth-box.clientWidth;
   setSwipe(room<SLACK?'':box.scrollLeft<SLACK?'end':box.scrollLeft>room-SLACK?'start':'both');
  };
  mark();
  box.addEventListener('scroll',mark,{passive:true});
  const watch=window.ResizeObserver&&new ResizeObserver(mark);
  watch?.observe(box);
  return ()=>{box.removeEventListener('scroll',mark);watch?.disconnect();};
 },[user?.name,user?.role,prefs]);
 // Up the bar for everything else, down to come back. The bar is already a sideways swipe
 // between the screens on it, so up and down are the two directions it was not using, and
 // they are the two a thumb resting there can do without looking. The More button does the
 // same thing for anybody who would rather press something.
 const drag=useRef(null);
 const bar=primaryNav(user,prefs);
 const moreOn=navActive(tab,'more',user,prefs);
 return <nav className="bottom-nav" aria-label="Main navigation"
  onTouchStart={e=>{drag.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}}
  onTouchEnd={e=>{
   const from=drag.current;drag.current=null;
   if(!from)return;
   const way=swipeVertical(from,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});
   if(way===1&&!moreOn)go('more');
   else if(way===-1&&moreOn)go(bar[0]);
  }}>
  {/* Something to aim at, and the only sign on the screen that the bar does anything but sit
      there. It is drawn rather than written because it is under the thumb at all times. */}
  <button type="button" className="nav-grip" aria-label={moreOn?'Close the menu':'Open the whole menu'}
   onClick={()=>go(moreOn?bar[0]:'more')}><ChevronUp size={14}/></button>
  <div className="nav-tabs" data-swipe={swipe||undefined} ref={strip}>
   {bar.map(id=>{
    const Icon=iconFor(id),active=navActive(tab,id,user,prefs);
    return <button key={id} className={active?'active':''} aria-current={active?'page':undefined} onClick={()=>go(id)}>
     <Icon size={22}/><span>{PAGES[id].label}</span>
    </button>;
   })}
  </div>
  <button className={`nav-more${moreOn?' active':''}`} aria-current={moreOn?'page':undefined} onClick={()=>go('more')}>
   <MoreHorizontal size={22}/><span>More</span>
   {unread&&<i aria-hidden="true"/>}
  </button>
 </nav>;
}
export function MorePage({user,tab,go,children,prefs}){
 return <>
  <p className="eyebrow">EVERYTHING FOR OUR TRIP</p>
  <h1>More</h1>
  {moreSections(user,prefs).map(([title,ids])=><section className="more-section" key={title}>
   <h2>{title}</h2>
   {ids.map(id=>{const Icon=iconFor(id);return <button className={`more-row${tab===id?' current':''}`} key={id} onClick={()=>go(id)}>
    <span className="more-icon"><Icon size={20}/></span>
    <span><strong>{PAGES[id].label}</strong><small>{PAGES[id].note}</small></span>
    <ChevronRight size={18}/>
   </button>;})}
  </section>)}
  {children}
 </>;
}
