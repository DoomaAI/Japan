import React,{useEffect,useRef,useState} from 'react';
import {Stamp,History,Wheat,Eye,Camera,Dices,Sparkles,MessageSquare,Lightbulb,House,CalendarDays,Ticket,UtensilsCrossed,Coins,PiggyBank,Trophy,NotebookPen,MapPin,Users,LifeBuoy,Inbox,Mail,FerrisWheel,ShoppingBag,BookOpen,Bell,Search,Heart,MoreHorizontal,ChevronRight,CloudSun,ListChecks,Luggage,ClipboardList,MessageCircleQuestion,Circle,Camera as CameraIcon,SlidersHorizontal,Settings,ChevronUp,CalendarCheck,Radar,Map as MapIcon,Clapperboard,ShieldAlert,Receipt,CreditCard,Medal,LayoutGrid} from 'lucide-react';
import {PAGES,primaryNav,moreSections,navActive,hiddenNav,rightNow} from './nav-data.js';
import {useWobble} from './wobble.js';
import {homePages} from './home-widgets.js';
import {swipeVertical} from './swipe.js';
const ICONS={today:House,bin:History,allergy:Wheat,days:CalendarDays,glance:CalendarCheck,tickets:Ticket,food:UtensilsCrossed,money:Coins,ledger:Receipt,paying:CreditCard,hunts:Medal,noticed:Eye,challenges:Trophy,games:Dices,photos:Camera,
 diary:NotebookPen,highlights:Clapperboard,places:MapPin,meeting:Users,safety:ShieldAlert,help:LifeBuoy,options:Inbox,parks:FerrisWheel,weather:CloudSun,todo:ListChecks,packing:Luggage,trackers:Radar,memorymap:MapIcon,
 planning:ClipboardList,inbox:Mail,ask:MessageCircleQuestion,
 shopping:ShoppingBag,shortlist:CameraIcon,spending:PiggyBank,phrases:MessageSquare,facts:Lightbulb,stamps:Stamp,guide:BookOpen,updates:Bell,search:Search,thanks:Heart,mascot:Sparkles,
 personalise:SlidersHorizontal,settings:Settings};
// A page with no icon of its own still gets a row. The bug this fixes: weather, the to-do list,
// the planning board and forwarded email had no entry here, so More rendered <undefined/> and
// the whole screen came down with it — the one screen that reaches every other screen.
export const iconFor=id=>ICONS[id]||Circle;
const SLACK=8;
export function BottomNav({tab,user,go,unread,prefs,setPrefs}){
 const bar=primaryNav(user,prefs);
 const moreOn=navActive(tab,'more',user,prefs);
 const pinned=bar[0],shortcuts=bar.slice(1);
 // Press and hold a shortcut and they wobble, to be dragged into a new order like the icons on
 // a home screen. Home and More are pinned, so only the shortcuts between them move.
 const w=useWobble({ids:shortcuts,onMove:next=>setPrefs?.({bar:[pinned,...next],hidden:hiddenNav(user,prefs)})});
 const strip=w.row;
 // The shortcuts swipe sideways, like the days along the top. Home and More do not travel
 // with them: Home is pinned to the start of the bar and More to the end, because they are the
 // way back and the way to every other screen, and a way out that can be swiped off the edge
 // is no way out at all.
 useEffect(()=>{
  const box=strip.current,on=box?.querySelector('.active');
  if(!box||!on||!box.scrollTo)return;
  // Only when it is actually cut off, and only as far as it takes. Centring every tab tapped
  // slid the whole strip sideways under the thumb, so the tab next to it was never where it
  // had been a moment ago.
  const left=on.offsetLeft,right=left+on.offsetWidth,view=box.scrollLeft+box.clientWidth;
  const to=left<box.scrollLeft?left-SLACK:right>view?right-box.clientWidth+SLACK:null;
  if(to===null)return;
  const behavior=window.matchMedia?.('(prefers-reduced-motion:reduce)').matches?'auto':'smooth';
  box.scrollTo({left:Math.max(0,to),behavior});
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
 // iOS sometimes loses track of where the bottom of the screen is — most often after the
 // keyboard closes on the Home Screen app — and a bar pinned to "the bottom" then floats
 // halfway up with the page showing underneath it. The visual viewport is what is actually on
 // the glass, so whenever the bar's bottom edge sits above it, the bar is moved down by the
 // gap. It never moves up: with the keyboard open the bar belongs behind it, as it always has.
 const nav=useRef(null),[drop,setDrop]=useState(0);
 useEffect(()=>{
  const vv=window.visualViewport,box=nav.current;
  if(!vv||!box)return;
  let frame=0,current=0;
  const measure=()=>{
   frame=0;
   const bottom=box.getBoundingClientRect().bottom-current,seen=vv.offsetTop+vv.height;
   const gap=seen-bottom>1?Math.round(seen-bottom):0;
   if(gap!==current){current=gap;setDrop(gap);}
  };
  const soon=()=>{if(!frame)frame=requestAnimationFrame(measure);};
  // Closing the keyboard is where iOS leaves the stale height behind, and a nudge of the
  // scroll position is what makes it work the layout out again.
  const settle=()=>setTimeout(()=>{window.scrollTo(window.scrollX,window.scrollY);soon();},250);
  const events=[[vv,'resize'],[vv,'scroll'],[window,'resize'],[window,'scroll'],[window,'orientationchange'],[window,'pageshow']];
  for(const [on,type] of events)on.addEventListener(type,soon,{passive:true});
  document.addEventListener('focusout',settle);
  soon();
  return ()=>{for(const [on,type] of events)on.removeEventListener(type,soon);document.removeEventListener('focusout',settle);if(frame)cancelAnimationFrame(frame);};
 },[]);
 // Up the bar for everything else, down to come back. The bar is already a sideways swipe
 // between the screens on it, so up and down are the two directions it was not using, and
 // they are the two a thumb resting there can do without looking. The More button does the
 // same thing for anybody who would rather press something.
 const drag=useRef(null);
 const tab_=(id,extra)=>{
  const Icon=iconFor(id),active=navActive(tab,id,user,prefs);
  const {held,...item}=extra?{}:w.item(id);
  return <button key={id} className={[extra,active&&'active',held&&'held'].filter(Boolean).join(' ')||undefined} aria-current={active?'page':undefined} onClick={()=>go(id)} {...item}>
   <Icon size={22}/><span>{PAGES[id].label}</span>
  </button>;
 };
 return <nav className="bottom-nav" aria-label="Main navigation" ref={nav}
  style={drop?{transform:`translate(-50%,${drop}px)`}:undefined}
  onTouchStart={e=>{drag.current=w.editing?null:{x:e.touches[0].clientX,y:e.touches[0].clientY};}}
  onTouchEnd={e=>{
   // A shortcut dragged about while the bar wobbles is not a swipe to open the menu.
   const from=drag.current;drag.current=null;
   if(!from||w.editing)return;
   const way=swipeVertical(from,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});
   if(way===1&&!moreOn)go('more');
   else if(way===-1&&moreOn)go(bar[0]);
  }}>
  {/* Something to aim at, and the only sign on the screen that the bar does anything but sit
      there. It is drawn rather than written because it is under the thumb at all times. */}
  <button type="button" className="nav-grip" aria-label={moreOn?'Close the menu':'Open the whole menu'}
   onClick={()=>go(moreOn?bar[0]:'more')}><ChevronUp size={14}/></button>
  {tab_(pinned,'nav-home')}
  <div className="nav-tabs" data-swipe={swipe||undefined} data-wobbling={w.editing||undefined} {...w.rowProps}>
   {w.order.map(id=>tab_(id))}
  </div>
  <button className={`nav-more${moreOn?' active':''}`} aria-current={moreOn?'page':undefined} onClick={()=>go('more')}>
   <MoreHorizontal size={22}/><span>More</span>
   {unread&&<i aria-hidden="true"/>}
  </button>
  {w.editing&&<div ref={w.bar} className="wobble-done" role="status">
   <small>Drag the shortcuts into the order you want. Home and More stay at the ends.</small>
   <button type="button" onClick={w.finish}>Done</button>
  </div>}
 </nav>;
}
// More lists every screen the bar does not. A button at the top brings the bar's own screens in
// too and marks which are a shortcut on the bar along the bottom or a widget on Home, so it is
// plain what is already one tap away; it is off to begin with, so the list reads as it always has.
export function MorePage({user,tab,go,children,prefs,home}){
 const [where,setWhere]=useState(false);
 const onBar=new Set(primaryNav(user,prefs)),onHome=homePages(home);
 return <>
  <p className="eyebrow">EVERYTHING FOR OUR TRIP</p>
  <h1>More</h1>
  {/* Right now: six tiles for the moments that do not wait, before the twelve-screen list. */}
  <nav className="right-now" aria-label="Right now">{rightNow(user).map(id=>{const Icon=iconFor(id);return <button type="button" className={`right-now-tile${tab===id?' current':''}`} key={id} onClick={()=>go(id)}><Icon size={22}/><span>{PAGES[id].label}</span></button>;})}</nav>
  <button type="button" className={`more-where${where?' on':''}`} aria-pressed={where} onClick={()=>setWhere(!where)}>
   <LayoutGrid size={16}/>{where?'Hide what is on my bar and Home':'Show what is on my bar and Home'}
  </button>
  {moreSections(user,prefs,where).map(([title,ids])=><section className="more-section" key={title}>
   <h2>{title}</h2>
   {ids.map(id=>{const Icon=iconFor(id),bar=onBar.has(id),widget=onHome.has(id);
    return <button className={`more-row${tab===id?' current':''}${where&&!bar&&!widget?' more-elsewhere':''}`} key={id} onClick={()=>go(id)}>
    <span className="more-icon"><Icon size={20}/></span>
    <span><strong>{PAGES[id].label}</strong><small>{PAGES[id].note}</small>
     {where&&(bar||widget)&&<span className="more-tags">{bar&&<span className="tag">Shortcut on the bar</span>}{widget&&<span className="tag">Widget on Home</span>}</span>}</span>
    <ChevronRight size={18}/>
   </button>;})}
  </section>)}
  {children}
 </>;
}
