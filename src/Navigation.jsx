import React,{useCallback,useEffect,useRef,useState} from 'react';
import {LocateFixed,Clapperboard,Printer,Smartphone,BookLock,PlaneLanding,AlarmClock,MailQuestion,BookImage,Stamp,Crown,GalleryHorizontalEnd,History,Wheat,Eye,Camera,Dices,Sparkles,MessageSquare,Lightbulb,House,CalendarDays,Ticket,UtensilsCrossed,Coins,PiggyBank,Trophy,NotebookPen,MapPin,Users,LifeBuoy,Inbox,Mail,FerrisWheel,ShoppingBag,BookOpen,Bell,Search,Heart,MoreHorizontal,ChevronRight,CloudSun,ListChecks,Luggage,ClipboardList,MessageCircleQuestion,Circle,Camera as CameraIcon,SlidersHorizontal,Settings,ChevronUp,CalendarCheck,Radar,Map as MapIcon,ShieldAlert,Receipt,CreditCard,Medal,LayoutGrid,ChevronDown,Star,Check,Plus,Store,Footprints,DoorOpen,PlaneTakeoff,SearchX,Repeat,Hourglass,GraduationCap,X,ChevronLeft,EyeOff,Undo2,PanelBottom} from 'lucide-react';
import {PAGES,FIXED,BAR_MAX,moveInMore,hideInMore,primaryNav,moreSections,navActive,hiddenNav,favourites,toggleFavourite,FAV_MAX,favRows,pickerSections,menuLayout,placeScreen,moveScreen} from './nav-data.js';
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
 // keyboard closes on the Home Screen app (iOS 26 leaves the visual viewport's offset behind) —
 // and everything pinned to "the bottom" then floats halfway up with the page showing underneath
 // it and scrolls along with it. The visual viewport is what is actually on the glass, so whenever
 // the bar's bottom edge sits above it, the bar is moved down by the gap, and the concierge bell
 // with it through --viewport-drop. It never moves up: with the keyboard open the bar belongs
 // behind it, as it always has.
 const nav=useRef(null),[drop,setDrop]=useState(0);
 useEffect(()=>{
  const vv=window.visualViewport,box=nav.current,root=document.documentElement;
  if(!vv||!box)return;
  let frame=0,current=0,timer=0;
  const measure=()=>{
   frame=0;
   const bottom=box.getBoundingClientRect().bottom-current,seen=vv.offsetTop+vv.height;
   const gap=seen-bottom>1?Math.round(seen-bottom):0;
   if(gap!==current){current=gap;setDrop(gap);root.style.setProperty('--viewport-drop',`${gap}px`);}
  };
  const soon=()=>{if(!frame)frame=requestAnimationFrame(measure);};
  // Closing the keyboard is where iOS leaves the stale layout behind. Nudging the scroll position
  // alone is not enough on iOS 26: taking the page out of layout and straight back, in the same
  // frame so nothing is painted in between, makes it work the viewport out again from scratch.
  // Only after a keyboard, so a tap on an ordinary button does not relay the whole page out.
  const KEYED='input:not([type=checkbox],[type=radio],[type=range],[type=button],[type=submit],[type=file],[type=color]),textarea,select,[contenteditable]:not([contenteditable=false])';
  const typing=()=>document.activeElement?.matches?.(KEYED);
  const repair=()=>{
   if(typing())return;
   const x=window.scrollX,y=window.scrollY,was=root.style.display;
   root.style.display='none';void root.offsetHeight;root.style.display=was;void root.offsetHeight;
   window.scrollTo(x,y);soon();
  };
  const settle=()=>{clearTimeout(timer);timer=setTimeout(repair,250);};
  const left=e=>{if(e.target?.matches?.(KEYED))settle();};
  // Back from another app or the app switcher, the same stale bottom can come back with it.
  const shown=()=>{if(document.visibilityState==='visible')settle();};
  // The keyboard going away also shows as the visual viewport growing back to its full height.
  let tallest=vv.height,shrunk=false;
  const resized=()=>{
   if(vv.height<tallest-80)shrunk=true;
   else if(shrunk&&vv.height>tallest-2){shrunk=false;settle();}
   tallest=Math.max(tallest,vv.height);soon();
  };
  const events=[[vv,'scroll'],[window,'resize'],[window,'scroll'],[window,'orientationchange']];
  for(const [on,type] of events)on.addEventListener(type,soon,{passive:true});
  vv.addEventListener('resize',resized,{passive:true});
  window.addEventListener('pageshow',settle);
  document.addEventListener('visibilitychange',shown);
  document.addEventListener('focusout',left);
  soon();
  return ()=>{
   for(const [on,type] of events)on.removeEventListener(type,soon);
   vv.removeEventListener('resize',resized);window.removeEventListener('pageshow',settle);
   document.removeEventListener('visibilitychange',shown);document.removeEventListener('focusout',left);
   if(frame)cancelAnimationFrame(frame);clearTimeout(timer);root.style.removeProperty('--viewport-drop');
  };
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
 {sheet&&<FavSheet user={user} prefs={prefs} setPrefs={setPrefs} tab={tab} go={go} close={closeSheet} all={allScreens} bottom={navH} drop={drop} startChoosing={sheet==='choose'}/>}
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
// lose your place. Arranging is in the sheet too, because a list you can only change on another
// screen is a list nobody changes — and it arranges the bar as well as the favourites, as two
// rows that never share a screen. Every screen is listed by section with two switches, Bar and
// a star, so where each one lives is plain and a tap moves it; the chips along the top can also
// be dragged within a row or from one row to the other. Tapping is the main way because it
// works one-handed, with a screen reader and in a long scrolled list; dragging is the quick way
// for order.
function FavSheet({user,prefs,setPrefs,tab,go,close,all,bottom,drop,startChoosing}){
 const [saved,setSaved]=useSavedFavourites();
 const layout=menuLayout(user,prefs,saved),{bar}=layout;
 const favs=layout.favs,full=favs.length>=FAV_MAX;
 const [choosing,setChoosing]=useState(!!startChoosing),[find,setFind]=useState('');
 const [said,setSaid]=useState('');
 useEffect(()=>{if(!said)return;const t=setTimeout(()=>setSaid(''),2600);return ()=>clearTimeout(t);},[said]);
 const save=next=>{
  if(next.refused){setSaid(next.refused);return;}
  if(next.bar.join()!==bar.join())setPrefs?.({bar:next.bar,hidden:hiddenNav(user,prefs)});
  if(next.favs.join()!==favs.join()||!Array.isArray(saved))setSaved(next.favs);
 };
 const place=(id,to,onto)=>save(placeScreen(user,prefs,saved,id,to,onto));
 const toggle=(id,to)=>place(id,(to==='bar'?bar:favs).includes(id)?null:to);
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
 // while arranging, back to the favourites). The list underneath is left to scroll.
 const head={
  onTouchStart:e=>{drag.current={x:e.touches[0].clientX,y:e.touches[0].clientY};},
  onTouchEnd:e=>{
   const from=drag.current;drag.current=null;
   const way=swipeVertical(from,{x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY});
   if(way===1&&!choosing)all();
   else if(way===-1)choosing?setChoosing(false):close();
  }
 };
 // A chip is dragged within its row or across to the other one, and takes the place of the chip
 // it is let go on (or goes last, let go on a row's empty space). Home is first on the bar and
 // does not move. A tap picks a chip out and gives it arrows for anybody who would rather press,
 // and the arrow keys do the same on a focused chip.
 const [picked,setPicked]=useState(null),[live,setLive]=useState(null),hold=useRef(null);
 const shown=live||layout;
 const shift=(id,by)=>{const row=bar.includes(id)?'bar':'fav',list=row==='bar'?bar:favs,next=list[list.indexOf(id)+by];
  if(next&&!(row==='bar'&&next===bar[0]))place(id,row,next);};
 const chip={
  onPointerDown:e=>{const el=e.target.closest('[data-chip]');if(!el||e.button>0||e.target.closest('.fav-chip-tool')||el.dataset.chip===bar[0])return;
   hold.current={id:el.dataset.chip,x:e.clientX,y:e.clientY,moving:false,next:null};
   try{el.setPointerCapture(e.pointerId);}catch{}},
  onPointerMove:e=>{const h=hold.current;if(!h)return;
   if(!h.moving&&Math.hypot(e.clientX-h.x,e.clientY-h.y)<8)return;
   h.moving=true;setPicked(h.id);
   const under=document.elementFromPoint(e.clientX,e.clientY),zone=under?.closest?.('[data-zone]')?.dataset.zone;
   if(!zone)return;
   const onto=under.closest('[data-chip]')?.dataset.chip;
   if(onto===h.id)return;
   const next=moveScreen(layout,h.id,zone,onto);
   if(!next.refused){h.next=next;setLive(next);}},
  onPointerUp:()=>{const h=hold.current;hold.current=null;if(!h)return;
   if(h.moving){setLive(null);setPicked(null);if(h.next)save(h.next);}
   else setPicked(p=>p===h.id?null:h.id);},
  onPointerCancel:()=>{hold.current=null;setLive(null);setPicked(null);}
 };
 const row=(zone,ids,title,cap,none)=><div className={`fav-zone fav-zone-${zone}`}>
  <h3>{title}<small className={ids.length>=cap?'full':undefined}>{zone==='bar'?ids.length-1:ids.length} of {zone==='bar'?cap-1:cap}</small></h3>
  <div className="fav-chosen" data-zone={zone} aria-label={`${title}, in order`}>
   {ids.length?ids.map((id,i)=>{const Icon=iconFor(id),on=picked===id,home=zone==='bar'&&i===0;
    const first=zone==='bar'?i<=1:i===0;
    return <span key={id} data-chip={id} className={`fav-chip${on?' picked':''}${live&&on?' dragging':''}${home?' fixed':''}`}>
     {on&&<button type="button" className="fav-chip-tool" aria-label={`Move ${PAGES[id].label} earlier`} disabled={first} onClick={()=>shift(id,-1)}><ChevronLeft size={15}/></button>}
     <button type="button" className="fav-chip-name" aria-pressed={home?undefined:on} aria-label={home?`${PAGES[id].label}, always first`:`${PAGES[id].label}, ${zone==='bar'?i:i+1} of ${zone==='bar'?ids.length-1:ids.length}`}
      onKeyDown={e=>{const by={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1}[e.key];if(by&&!home){e.preventDefault();shift(id,by);}}}>
      <Icon size={15}/><span>{PAGES[id].label}</span>
     </button>
     {on&&<button type="button" className="fav-chip-tool" aria-label={`Move ${PAGES[id].label} later`} disabled={i===ids.length-1} onClick={()=>shift(id,1)}><ChevronRight size={15}/></button>}
     {!home&&<button type="button" className="fav-chip-tool fav-chip-x" aria-label={`Take ${PAGES[id].label} off ${zone==='bar'?'the bar':'favourites'}`} onClick={()=>{setPicked(null);place(id,null);}}><X size={14}/></button>}
    </span>;})
    :<span className="fav-chosen-none">{none}</span>}
  </div>
 </div>;
 const style={bottom,'--fav-bottom':`${bottom}px`,'--fav-rows':favRows(favs.length),...drop?{transform:`translate(-50%,${drop}px)`}:{}};
 return <>
  <div className="fav-sheet-veil" aria-hidden="true" onClick={close}/>
  <section ref={sheet} className={`fav-sheet${choosing?' choosing':''}`} style={style} role="dialog" aria-label={choosing?'Arrange the bar and favourites':'Favourites'}>
   <div className="fav-sheet-head" {...head}>
    <span className="fav-sheet-grabber" aria-hidden="true"/>
    <h2>{choosing?'Bar & favourites':'Favourites'}</h2>
    {!choosing&&<small className={full?'full':undefined}>{favs.length} of {FAV_MAX}</small>}
    {choosing
     ?<button type="button" className="fav-sheet-action primary" onClick={()=>{setChoosing(false);setFind('');setPicked(null);}}><Check size={15}/>Done</button>
     :<>
      <button type="button" className="fav-sheet-action" onClick={()=>setChoosing(true)}><Star size={15}/>Arrange</button>
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
    <div className="fav-zones" {...chip}>
     {row('bar',shown.bar,'On the bar',BAR_MAX,'')}
     {row('fav',shown.favs,'Favourites',FAV_MAX,'None yet. Star a screen below, or drag one here.')}
    </div>
    <p className="fav-sheet-hint" role="status" aria-live="polite">{said||'Each screen goes on the bar or in favourites, not both. Tap Bar or the star below, or drag a chip within a row or across to the other.'}</p>
    <input type="search" className="fav-find" placeholder="Find a screen" aria-label="Find a screen" value={find} onChange={e=>setFind(e.target.value)}/>
    {sections.length?sections.map(([title,ids])=><section key={title} className="fav-pick-section">
     <h3>{title}</h3>
     <div className="fav-pick-grid">{ids.map(id=>{const Icon=iconFor(id),label=PAGES[id].label;
      const where=bar.includes(id)?'bar':favs.includes(id)?'fav':null;
      const why=to=>moveScreen(layout,id,where===to?null:to).refused;
      return <div key={id} className={`fav-pick${where?` on ${where}`:''}`}>
       <Icon size={18}/><span>{label}{where&&<small>{where==='bar'?'On the bar':'Favourite'}</small>}</span>
       <span className="fav-pick-where" role="group" aria-label={`Where ${label} goes`}>
        <button type="button" aria-pressed={where==='bar'} aria-label={`${label} on the bar`} title={why('bar')} disabled={!!why('bar')} onClick={()=>toggle(id,'bar')}><PanelBottom size={15}/><span>Bar</span></button>
        <button type="button" aria-pressed={where==='fav'} aria-label={`${label} in favourites`} title={why('fav')} disabled={!!why('fav')} onClick={()=>toggle(id,'fav')}><Star size={15}/></button>
       </span>
      </div>;})}</div>
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
// Every card carries arrows and an eye underneath it, so the menu can be put in this person's
// order and the screens they never open put away right here, without a mode to switch on first
// or a trip to Customise. The card itself still opens its screen. Arrows rather than dragging,
// for the same reasons as the bar's own list in Customise.
const HOLD=450,SLOP=10;
export function MorePage({user,tab,go,children,prefs,home,setPrefs}){
 const [where,setWhere]=useState(false);
 const [undo,setUndo]=useState(null);
 const [saved,setSaved]=useSavedFavourites();
 const barIds=primaryNav(user,prefs),onBar=new Set(barIds),onHome=homePages(home);
 const favs=favourites(user,saved,barIds),starred=new Set(favs),full=favs.length>=FAV_MAX;
 const sections=moreSections(user,prefs,where);
 // Every section starts folded. The one holding the screen you came from opens on its own,
 // so going back to More lands where you left it rather than on a wall of shut headings.
 const [open,setOpenState]=useState(()=>Object.fromEntries(sections.map(([title,ids])=>[title,isOpen(`more.${title}`,undefined,ids.includes(tab))])));
 const fold=title=>setOpenState(o=>({...o,[title]:setOpen(`more.${title}`,!o[title])}));
 // A long press stars or unstars a card; the tap that ends it does not also open the screen.
 const [said,setSaid]=useState(''),press=useRef(null),eat=useRef(false);
 const star=id=>{
  const on=starred.has(id);
  // On the bar already, so a star would be a second way to the same screen.
  if(onBar.has(id)){setSaid(`${PAGES[id].label} is on your bar. Swipe up the bar and tap Arrange to move it.`);return;}
  if(!on&&full){setSaid(`Favourites are full at ${FAV_MAX}. Take one out first.`);return;}
  setSaved(toggleFavourite(user,saved,id,barIds));
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
 // Long enough to reach Undo after putting a card away; the plain notes go sooner.
 useEffect(()=>{if(!said)return;const t=setTimeout(()=>setSaid(''),undo?6000:2400);return ()=>clearTimeout(t);},[said]);
 useEffect(()=>()=>clearTimeout(press.current?.timer),[]);
 const shift=(ids,id,by)=>setPrefs?.(moveInMore(prefs,ids,id,by));
 const putAway=id=>{
  if(!setPrefs||FIXED.includes(id))return;
  setUndo(prefs);setPrefs(hideInMore(prefs,id));
  setSaid(`${PAGES[id].label} put away · back from Customise`);
 };
 useEffect(()=>{if(!said)setUndo(null);},[said]);
 const card=(id,i,ids)=>{
  const Icon=iconFor(id),bar=onBar.has(id),widget=onHome.has(id),on=starred.has(id);
  const label=PAGES[id].label;
  return <div className={`more-card-wrap${setPrefs?' arranging':''}`} key={id}>
   <button type="button" {...holdProps(id)} className={`right-now-tile${tab===id?' current':''}${where&&!bar&&!widget?' more-elsewhere':''}`} title={PAGES[id].note} onClick={()=>go(id)}>
    <Icon size={22}/><span>{PAGES[id].label}</span>
    {/* A favourite is marked where it sits, so it is plain which are chosen. */}
    {on&&<Star className="more-fav-mark" size={13} aria-label="In favourites"/>}
    {where&&(bar||widget)&&<span className="more-tags">{bar&&<span className="tag">Bar</span>}{widget&&<span className="tag">Home</span>}</span>}
   </button>
   {setPrefs&&<span className="more-card-tools">
    <button type="button" aria-label={`Move ${label} earlier`} disabled={i===0} onClick={()=>shift(ids,id,-1)}><ChevronLeft size={16}/></button>
    <button type="button" aria-label={`Put ${label} away`} disabled={FIXED.includes(id)} onClick={()=>putAway(id)}><EyeOff size={15}/></button>
    <button type="button" aria-label={`Move ${label} later`} disabled={i===ids.length-1} onClick={()=>shift(ids,id,1)}><ChevronRight size={16}/></button>
   </span>}
  </div>;
 };
 return <div className="more-page">
  <p className="eyebrow">EVERYTHING FOR OUR TRIP</p>
  <h1>More</h1>
  <div className="more-fav-line">
   <Star size={16}/>
   <span><strong>Favourites · {favs.length}</strong><small>One swipe up the bar, from any screen. Hold a card below to star it; Edit arranges the bar too.</small></span>
   <button type="button" className="more-edit" onClick={openFavourites}>Edit</button>
  </div>
  <button type="button" className={`more-where${where?' on':''}`} aria-pressed={where} onClick={()=>setWhere(!where)}>
   <LayoutGrid size={16}/>{where?'Hide what is on my bar and Home':'Show what is on my bar and Home'}
  </button>
  {setPrefs&&<p className="more-arrange-hint">Tap a card to open it. The arrows under it move it along its section, and the eye puts it away.</p>}
  {sections.map(([title,ids])=>{const shut=!(open[title]??false);
   return <section className={`more-section${shut?' shut':''}`} key={title}>
    <h2><button type="button" className="more-fold" aria-expanded={!shut} onClick={()=>fold(title)}>
     <span>{title}</span><small>{ids.length}</small><ChevronDown size={18}/>
    </button></h2>
    {!shut&&<div className="right-now more-grid">{ids.map((id,i)=>card(id,i,ids))}</div>}
   </section>;})}
  <p className="more-said" role="status" aria-live="polite">{said}{undo&&<> <button type="button" className="more-undo" onClick={()=>{setPrefs(undo);setUndo(null);setSaid('');}}><Undo2 size={14}/>Undo</button></>}</p>
  {children}
 </div>;
}
