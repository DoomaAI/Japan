import React,{useEffect,useRef,useState} from 'react';
import {Camera,Dices,Sparkles,MessageSquare,Lightbulb,House,CalendarDays,Ticket,UtensilsCrossed,Coins,PiggyBank,Trophy,NotebookPen,MapPin,Users,LifeBuoy,Inbox,Mail,FerrisWheel,ShoppingBag,BookOpen,Bell,Search,Heart,MoreHorizontal,ChevronRight,CloudSun,ListChecks,ClipboardList,SlidersHorizontal,Circle} from 'lucide-react';
import {PAGES,primaryNav,moreSections,navActive} from './nav-data.js';
const ICONS={today:House,days:CalendarDays,tickets:Ticket,food:UtensilsCrossed,money:Coins,challenges:Trophy,games:Dices,photos:Camera,
 diary:NotebookPen,places:MapPin,meeting:Users,help:LifeBuoy,options:Inbox,parks:FerrisWheel,weather:CloudSun,todo:ListChecks,
 planning:ClipboardList,inbox:Mail,
 shopping:ShoppingBag,spending:PiggyBank,phrases:MessageSquare,facts:Lightbulb,guide:BookOpen,updates:Bell,search:Search,thanks:Heart,mascot:Sparkles,settings:SlidersHorizontal};
// A page with no icon of its own still gets a row. The bug this fixes: weather, the to-do list,
// the planning board and forwarded email had no entry here, so More rendered <undefined/> and
// the whole screen came down with it — the one screen that reaches every other screen.
export const iconFor=id=>ICONS[id]||Circle;
const SLACK=8;
export function BottomNav({tab,user,go,unread}){
 const strip=useRef(null);
 // The five tabs swipe sideways when the phone is too narrow for them. More does not travel
 // with them: it is pinned to the end of the bar, because it is the way to every other screen
 // and a way out that can be swiped off the edge is no way out at all.
 useEffect(()=>{
  const box=strip.current,on=box?.querySelector('.active');
  if(!box||!on||!box.scrollTo)return;
  const behavior=window.matchMedia?.('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';
  box.scrollTo({left:on.offsetLeft-(box.clientWidth-on.offsetWidth)/2,behavior});
 },[tab,user?.name,user?.role]);
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
 },[user?.name,user?.role]);
 const moreOn=navActive(tab,'more',user);
 return <nav className="bottom-nav" aria-label="Main navigation">
  <div className="nav-tabs" data-swipe={swipe||undefined} ref={strip}>
   {primaryNav(user).map(id=>{
    const Icon=iconFor(id),active=navActive(tab,id,user);
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
export function MorePage({user,tab,go,children}){
 return <>
  <p className="eyebrow">EVERYTHING FOR OUR TRIP</p>
  <h1>More</h1>
  {moreSections(user).map(([title,ids])=><section className="more-section" key={title}>
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
