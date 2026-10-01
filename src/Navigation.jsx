import React,{useCallback,useEffect,useRef,useState} from 'react';
import {LocateFixed,Clapperboard,Printer,Smartphone,BookLock,PlaneLanding,AlarmClock,MailQuestion,BookImage,Stamp,Crown,GalleryHorizontalEnd,History,Wheat,Eye,Camera,Dices,Sparkles,MessageSquare,Lightbulb,House,CalendarDays,Ticket,UtensilsCrossed,Coins,PiggyBank,Trophy,NotebookPen,MapPin,Users,LifeBuoy,Inbox,Mail,FerrisWheel,ShoppingBag,BookOpen,Bell,Search,Heart,MoreHorizontal,ChevronRight,CloudSun,ListChecks,Luggage,ClipboardList,MessageCircleQuestion,Circle,Camera as CameraIcon,SlidersHorizontal,Settings,ChevronUp,CalendarCheck,Radar,Map as MapIcon,ShieldAlert,Receipt,CreditCard,Medal,LayoutGrid,ChevronDown,Star,Check,Plus,Store,Footprints,DoorOpen,PlaneTakeoff,SearchX,Repeat,Hourglass,GraduationCap,X,ChevronLeft} from 'lucide-react';
import {PAGES,primaryNav,moreSections,navActive,hiddenNav,favourites,toggleFavourite,dropFavourite,FAV_MAX,favRows,pickerSections} from './nav-data.js';
import {isOpen,setOpen} from './fold.js';
import {useWobble} from './wobble.js';
import {homePages} from './home-widgets.js';
import {swipeVertical} from './swipe.js';
const ICONS={today:House,guests:Users,invitation:Mail,bin:History,allergy:Wheat,days:CalendarDays,glance:CalendarCheck,tickets:Ticket,food:UtensilsCrossed,money:Coins,ledger:Receipt,paying:CreditCard,hunts:Medal,local:Footprints,noticed:Eye,nexttime:Repeat,capsule:Hourglass,showtell:GraduationCap,challenges:Trophy,games:Dices,photos:Camera,
 diary:NotebookPen,places:MapPin,meeting:Users,safety:ShieldAlert,lost:SearchX,help:LifeBuoy,options:Inbox,parks:FerrisWheel,weather:CloudSun,nightstand:AlarmClock,todo:ListChecks,packing:Luggage,shop:Store,trackers:Radar,memorymap:MapIcon,whereabouts:LocateFixed,
 planning:ClipboardList,inbox:Mail,ask:MessageCircleQuestion,
 shopping:ShoppingBag,shortlist:CameraIcon,spending:PiggyBank,phrases:MessageSquare,facts:Lightbulb,stamps:Stamp,arrival:PlaneLanding,homefront:DoorOpen,flyinghome:PlaneTakeoff,vault:BookLock,apps:Smartphone,windows:AlarmClock,predictions:MailQuestion,book:BookImage,printguide:Printer,recap:GalleryHorizontalEnd,highlights:Clapperboard,leaderboard:Crown,guide:BookOpen,updates:Bell,search:Search,thanks:Heart,mascot:Sparkles,
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
 // Up the bar for your favourites, up again for everything, down to come back. The bar is
 // already a sideways swipe between the screens on it, so up and down are the two directions it
 // was not using, and they are the two a thumb resting there can do without looking. The handle
 // and the More button were both opening More, two controls for one job; now the handle opens
 // the favourites over the screen you are on, and More is still the whole menu.
 const drag=useRef(null),[sheet,setSheet]=useState(false);
 const closeSheet=useCallback(()=>setSheet(false),[]);
 const allScreens=useCallback(()=>{setSheet(false);go('more');},[go]);
 // Wherever you end up, the sheet is done with.
 useEffect(()=>{setSheet(false);},[tab]);
 // Edit on More opens it straight on Choose, over More.
 useEffect(()=>{
  const choose=()=>setSheet('choose');
  window.addEventListener('japan:choose-favourites',choose);
  return ()=>window.removeEventListener('japan:choose-favourites',choose);
 },[]);
 // The sheet sits on top of the bar, so it needs to know how tall the bar is today: the
 // safe area, the wobble note and the text size all change it.
 const [navH,setNavH]=useState(0);
 useEffect(()=>{
  const box=nav.current;
  if(!box)return;
  const mark=()=>setNavH(box.offsetHeight);
  mark();
  const watch=window.ResizeObserver&&new ResizeObserver(mark);
  watch?.observe(box);
  return ()=>watch?.disconnect();
 },[]);
 const tab_=(id,extra)=>{
  const Icon=iconFor(id),active=navActive(tab,id,user,prefs);
  const {held,...item}=extra?{}:w.item(id);
  return <button key={id} className={[extra,active&&'active',held&&'held'].filter(Boolean).join(' ')||undefined} aria-current={active?'page':undefined} onClick={()=>go(id)} {...item}>
   <Icon size={22}/><span>{PAGES[id].label}</span>
  </button>;
 };
 return <>
 {sheet&&<FavSheet user={user} prefs={prefs} tab={tab} go={go} close={closeSheet} all={allScreens} bottom={navH} drop={drop} startChoosing={sheet==='choose'}/>}
 <nav className="bottom-nav" aria-label="Main navigation" ref={nav}
  style={{'--nav-n':bar.length+1,...drop?{transform:`translate(-50%,${drop}px)`}:{}}}
  onTouchStart={e=>{drag.current=w.editing?null:{x:e.touches[0].clientX,y:e.touches[0].clientY};}}
  onTouchEnd={e=>{
   // A shortcut dragged about while the bar wobbles is not a swipe to open the menu.
   const from=drag.current;drag.current=null;
   if(!from||w.editing)return;
   const way=swipeVertical(from,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});
   // Two steps up, like a map's sheet: favourites first, then the whole menu.
   if(way===1&&!moreOn)sheet?allScreens():setSheet(true);
   else if(way===-1&&sheet)setSheet(false);
   else if(way===-1&&moreOn)go(bar[0]);
  }}>
  {/* Something to aim at, and the only sign on the screen that the bar does anything but sit
      there. It is drawn rather than written because it is under the thumb at all times. */}
  <button type="button" className="nav-grip" aria-label={moreOn?'Close the menu':sheet?'Close favourites':'Open favourites'}
   aria-expanded={moreOn?undefined:sheet} onClick={()=>moreOn?go(bar[0]):setSheet(!sheet)}>{sheet?<ChevronDown size={14}/>:<ChevronUp size={14}/>}</button>
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
 </nav>
 </>;
}
// Favourites live in one place on the phone and are changed from two: the sheet and a long press
// on More. Both can be on the screen at once (Edit on More opens the sheet over it), so each
// change is announced and every copy reads the list again, rather than each keeping its own.
const FAV_KEY='japan.more.favourites',FAV_EVENT='japan:favourites';
const readFavs=()=>{try{const s=localStorage.getItem(FAV_KEY);return s===null?null:JSON.parse(s);}catch{return null;}};
export function useSavedFavourites(){
 const [saved,setSaved]=useState(readFavs);
 useEffect(()=>{
  const sync=()=>setSaved(readFavs());
  window.addEventListener(FAV_EVENT,sync);
  return ()=>window.removeEventListener(FAV_EVENT,sync);
 },[]);
 const save=next=>{
  try{localStorage.setItem(FAV_KEY,JSON.stringify(next));}catch{}
  setSaved(next);window.dispatchEvent(new Event(FAV_EVENT));
 };
 return [saved,save];
}
// Anything that wants the sheet open on Choose — Edit on More — asks for it by name.
export const openFavourites=()=>window.dispatchEvent(new Event('japan:choose-favourites'));
// The favourites, over whatever screen you are on, so a look at the yen or a phrase does not
// lose your place. Choosing is in the sheet too, because a list you can only change on another
// screen is a list nobody changes. It opens out to every screen, by section, each one plainly
// ticked or not, with the chosen ones along the top in their order and a count against the cap.
function FavSheet({user,prefs,tab,go,close,all,bottom,drop,startChoosing}){
 const [saved,setSaved]=useSavedFavourites();
 const favs=favourites(user,saved),chosen=new Set(favs),full=favs.length>=FAV_MAX;
 const [choosing,setChoosing]=useState(!!startChoosing),[find,setFind]=useState('');
 const save=next=>setSaved(favourites(user,next));
 const toggle=id=>save(toggleFavourite(user,saved,id));
 const sections=choosing?pickerSections(user,prefs,find):[];
 const sheet=useRef(null),drag=useRef(null);
 useEffect(()=>{
  const key=e=>{if(e.key==='Escape')choosing?setChoosing(false):close();};
  document.addEventListener('keydown',key);
  return ()=>document.removeEventListener('keydown',key);
 },[choosing,close]);
 useEffect(()=>{sheet.current?.querySelector('button')?.focus({preventScroll:true});},[choosing]);
 const open=id=>{close();go(id);};
 // The top of the sheet swipes like the bar: up for the whole menu, down to put it away (or,
 // while choosing, back to the favourites). The list underneath is left to scroll.
 const head={
  onTouchStart:e=>{drag.current={x:e.touches[0].clientX,y:e.touches[0].clientY};},
  onTouchEnd:e=>{
   const from=drag.current;drag.current=null;
   const way=swipeVertical(from,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});
   if(way===1&&!choosing)all();
   else if(way===-1)choosing?setChoosing(false):close();
  }
 };
 // The order is set here now that More has no row of its own. A chip is dragged along the row
 // and takes the place of the one it is let go on; a tap picks one out and gives it arrows for
 // anybody who would rather press, and the arrow keys do the same on a focused chip.
 const [picked,setPicked]=useState(null),[live,setLive]=useState(null),hold=useRef(null);
 const order=live||favs;
 const shift=(id,by)=>{const next=order[order.indexOf(id)+by];if(next)save(dropFavourite(favs,id,next));};
 const chip={
  onPointerDown:e=>{const el=e.target.closest('[data-chip]');if(!el||e.button>0||e.target.closest('.fav-chip-tool'))return;
   hold.current={id:el.dataset.chip,x:e.clientX,y:e.clientY,moving:false,list:favs};
   try{el.setPointerCapture(e.pointerId);}catch{}},
  onPointerMove:e=>{const h=hold.current;if(!h)return;
   if(!h.moving&&Math.hypot(e.clientX-h.x,e.clientY-h.y)<8)return;
   h.moving=true;setPicked(h.id);
   const onto=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-chip]')?.dataset.chip;
   if(onto&&onto!==h.id){h.list=dropFavourite(h.list,h.id,onto);setLive(h.list);}},
  onPointerUp:()=>{const h=hold.current;hold.current=null;if(!h)return;
   if(h.moving){setLive(null);setPicked(null);if(h.list.join()!==favs.join())save(h.list);}
   else setPicked(p=>p===h.id?null:h.id);},
  onPointerCancel:()=>{hold.current=null;setLive(null);setPicked(null);}
 };
 const style={bottom,'--fav-bottom':`${bottom}px`,'--fav-rows':favRows(favs.length),...drop?{transform:`translate(-50%,${drop}px)`}:{}};
 return <>
  <div className="fav-sheet-veil" aria-hidden="true" onClick={close}/>
  <section ref={sheet} className={`fav-sheet${choosing?' choosing':''}`} style={style} role="dialog" aria-label={choosing?'Choose favourites':'Favourites'}>
   <div className="fav-sheet-head" {...head}>
    <span className="fav-sheet-grabber" aria-hidden="true"/>
    <h2>{choosing?'Choose favourites':'Favourites'}</h2>
    <small className={full?'full':undefined}>{favs.length} of {FAV_MAX}</small>
    {choosing
     ?<button type="button" className="fav-sheet-action primary" onClick={()=>{setChoosing(false);setFind('');setPicked(null);}}><Check size={15}/>Done</button>
     :<>
      <button type="button" className="fav-sheet-action" onClick={()=>setChoosing(true)}><Star size={15}/>Choose</button>
      <button type="button" className="fav-sheet-action" onClick={all}><LayoutGrid size={15}/>All screens</button>
     </>}
   </div>
   {!choosing&&(favs.length
    ?<nav className="fav-sheet-grid" aria-label="Favourites">{favs.map(id=>{const Icon=iconFor(id);
     return <button type="button" key={id} className={`fav-tile${tab===id?' current':''}`} title={PAGES[id].note} onClick={()=>open(id)}>
      <Icon size={22}/><span>{PAGES[id].label}</span>
     </button>;})}</nav>
    :<p className="fav-sheet-empty">Nothing here yet. <button type="button" onClick={()=>setChoosing(true)}>Choose up to {FAV_MAX} screens</button> to keep one swipe away.</p>)}
   {choosing&&<div className="fav-sheet-body">
    <div className="fav-chosen" aria-label="Chosen, in order" {...chip}>
     {order.length?order.map((id,i)=>{const Icon=iconFor(id),on=picked===id;
      return <span key={id} data-chip={id} className={`fav-chip${on?' picked':''}${live&&on?' dragging':''}`}>
       {on&&<button type="button" className="fav-chip-tool" aria-label={`Move ${PAGES[id].label} earlier`} disabled={i===0} onClick={()=>shift(id,-1)}><ChevronLeft size={15}/></button>}
       <button type="button" className="fav-chip-name" aria-pressed={on} aria-label={`${PAGES[id].label}, ${i+1} of ${order.length}`}
        onKeyDown={e=>{const by={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[e.key];if(by){e.preventDefault();shift(id,by);}}}>
        <Icon size={15}/><span>{PAGES[id].label}</span>
       </button>
       {on&&<button type="button" className="fav-chip-tool" aria-label={`Move ${PAGES[id].label} later`} disabled={i===order.length-1} onClick={()=>shift(id,1)}><ChevronRight size={15}/></button>}
       <button type="button" className="fav-chip-tool fav-chip-x" aria-label={`Take ${PAGES[id].label} out of favourites`} onClick={()=>{setPicked(null);toggle(id);}}><X size={14}/></button>
      </span>;})
      :<span className="fav-chosen-none">None chosen yet. Tap any screen below.</span>}
    </div>
    <p className="fav-sheet-hint">{full?`That’s all ${FAV_MAX}. Take one out to add another.`:'Tap a screen below to add or remove it. Drag the ones above into order, or tap one for arrows.'}</p>
    <input type="search" className="fav-find" placeholder="Find a screen" aria-label="Find a screen" value={find} onChange={e=>setFind(e.target.value)}/>
    {sections.length?sections.map(([title,ids])=><section key={title} className="fav-pick-section">
     <h3>{title}</h3>
     <div className="fav-pick-grid">{ids.map(id=>{const Icon=iconFor(id),on=chosen.has(id);
      return <button type="button" key={id} className={`fav-pick${on?' on':''}`} aria-pressed={on} disabled={!on&&full} onClick={()=>toggle(id)}>
       <Icon size={18}/><span>{PAGES[id].label}</span><i aria-hidden="true">{on?<Check size={13}/>:<Plus size={13}/>}</i>
      </button>;})}</div>
    </section>):<p className="fav-sheet-hint">No screen called that.</p>}
   </div>}
  </section>
 </>;
}
// More lists every screen the bar does not, as cards in folding sections so the whole menu fits
// on one screen with everything shut. Favourites are one swipe up the bar from anywhere, so More
// no longer repeats them as a row: one line says how many there are and opens the sheet to
// change them, and down in the sections a star marks each one. Hold any card to star or unstar
// it there and then. A button marks which cards are already a shortcut on the bar or a widget
// on Home, so it is plain what is one tap away; it is off to begin with.
const HOLD=450,SLOP=10;
export function MorePage({user,tab,go,children,prefs,home}){
 const [where,setWhere]=useState(false);
 const [saved,setSaved]=useSavedFavourites();
 const favs=favourites(user,saved),starred=new Set(favs),full=favs.length>=FAV_MAX;
 const onBar=new Set(primaryNav(user,prefs)),onHome=homePages(home);
 const sections=moreSections(user,prefs,where);
 // Every section starts folded. The one holding the screen you came from opens on its own,
 // so going back to More lands where you left it rather than on a wall of shut headings.
 const [open,setOpenState]=useState(()=>Object.fromEntries(sections.map(([title,ids])=>[title,isOpen(`more.${title}`,undefined,ids.includes(tab))])));
 const fold=title=>setOpenState(o=>({...o,[title]:setOpen(`more.${title}`,!o[title])}));
 // A long press stars or unstars a card; the tap that ends it does not also open the screen.
 const [said,setSaid]=useState(''),press=useRef(null),eat=useRef(false);
 const star=id=>{
  const on=starred.has(id);
  if(!on&&full){setSaid(`Favourites are full at ${FAV_MAX}. Take one out first.`);return;}
  setSaved(favourites(user,toggleFavourite(user,saved,id)));
  try{navigator.vibrate?.(12);}catch{}
  setSaid(on?`${PAGES[id].label} taken out of favourites`:`${PAGES[id].label} added to favourites`);
 };
 const holdProps=id=>({
  onPointerDown:e=>{if(e.button>0)return;eat.current=false;clearTimeout(press.current?.timer);
   press.current={x:e.clientX,y:e.clientY,timer:setTimeout(()=>{press.current=null;eat.current=true;star(id);},HOLD)};},
  onPointerMove:e=>{const p=press.current;if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>SLOP){clearTimeout(p.timer);press.current=null;}},
  onPointerUp:()=>{clearTimeout(press.current?.timer);press.current=null;},
  onPointerCancel:()=>{clearTimeout(press.current?.timer);press.current=null;},
  onContextMenu:e=>e.preventDefault(),
  onClickCapture:e=>{if(eat.current){e.preventDefault();e.stopPropagation();eat.current=false;}}
 });
 useEffect(()=>{if(!said)return;const t=setTimeout(()=>setSaid(''),2400);return ()=>clearTimeout(t);},[said]);
 useEffect(()=>()=>clearTimeout(press.current?.timer),[]);
 const card=id=>{
  const Icon=iconFor(id),bar=onBar.has(id),widget=onHome.has(id),on=starred.has(id);
  return <div className="more-card-wrap" key={id} {...holdProps(id)}>
   <button type="button" className={`right-now-tile${tab===id?' current':''}${where&&!bar&&!widget?' more-elsewhere':''}`} title={PAGES[id].note} onClick={()=>go(id)}>
    <Icon size={22}/><span>{PAGES[id].label}</span>
    {/* A favourite is marked where it sits, so it is plain which are chosen. */}
    {on&&<Star className="more-fav-mark" size={13} aria-label="In favourites"/>}
    {where&&(bar||widget)&&<span className="more-tags">{bar&&<span className="tag">Bar</span>}{widget&&<span className="tag">Home</span>}</span>}
   </button>
  </div>;
 };
 return <div className="more-page">
  <p className="eyebrow">EVERYTHING FOR OUR TRIP</p>
  <h1>More</h1>
  <div className="more-fav-line">
   <Star size={16}/>
   <span><strong>Favourites · {favs.length}</strong><small>One swipe up the bar, from any screen. Hold a card below to star it.</small></span>
   <button type="button" className="more-edit" onClick={openFavourites}>Edit</button>
  </div>
  <button type="button" className={`more-where${where?' on':''}`} aria-pressed={where} onClick={()=>setWhere(!where)}>
   <LayoutGrid size={16}/>{where?'Hide what is on my bar and Home':'Show what is on my bar and Home'}
  </button>
  {sections.map(([title,ids])=>{const shut=!(open[title]??false);
   return <section className={`more-section${shut?' shut':''}`} key={title}>
    <h2><button type="button" className="more-fold" aria-expanded={!shut} onClick={()=>fold(title)}>
     <span>{title}</span><small>{ids.length}</small><ChevronDown size={18}/>
    </button></h2>
    {!shut&&<div className="right-now more-grid">{ids.map(id=>card(id))}</div>}
   </section>;})}
  <p className="more-said" role="status" aria-live="polite">{said}</p>
  {children}
 </div>;
}
