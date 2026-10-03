import React,{useEffect,useRef,useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {ArrowUp,ArrowDown,Plus,X,Eye,EyeOff,RotateCcw,GripVertical} from 'lucide-react';
import {underFinger,follow,settle} from './lift.js';
import {PAGES,BAR_MIN,BAR_MAX,FIXED,pagesFor,primaryNav,hiddenNav,addableNav,cleanNav,emptyNav} from './nav-data.js';
import {iconFor} from './Navigation.jsx';
import {TIP_KINDS,readTips,writeTips,toggleTip} from './opening-tips.js';
import {HOME_WIDGETS,homeOrder,cleanHome,moveWidget,placeWidget,toggleWidget,emptyHome} from './home-widgets.js';
// Four of us carry the same app. Lauren opens tickets and the plan; Boston opens his missions
// and his money; Nate opens three screens in sixteen days and would open two if the third one
// stopped moving. One bottom bar cannot be right for all of them, so this is where each phone
// is told what belongs on it and in what order, and what to put away entirely.
//
// Hold a row’s handle, then drag it to the green line where it should go, or use the arrows. Only the handle takes the drag, so the rest of
// the row still scrolls the page; the arrows stay for anybody without a steady hand, and for a
// screen reader, and a drag let go of over nothing slides back and changes nothing.
//
// Nothing put away is lost. Everything hidden is listed at the bottom of this screen with a
// button to bring it back, and this screen cannot be hidden itself — nor can Home, which is
// the way back from wherever a bad arrangement leaves you.
// Dragging by the handle works as it does on the day at a glance. A finger rests on the handle
// for a moment before the row lifts, so a thumb scrolling past carries on scrolling (a mouse
// needs no hold); the row follows the finger, the page scrolls near the top and bottom, and it
// lands on the green line between two rows rather than on a row, so where it goes is never a
// guess about above or below. The list is the ids in order, each row carrying data-drag-id;
// place(id,before) saves it in front of the row before, or at the end for END.
const HOLD=220,SLOP=8,END=':end';
function useDragOrder(list,place){
 const drag=useRef(null),[held,setHeld]=useState(null),[gap,setGap]=useState(null);
 const letGo=()=>{clearTimeout(drag.current?.timer);drag.current=null;setHeld(null);setGap(null);};
 // Once a row is lifted the page must not scroll under the finger; before that, a swipe scrolls.
 useEffect(()=>{const stop=e=>{if(drag.current?.lifted)e.preventDefault();};document.addEventListener('touchmove',stop,{passive:false});return()=>{document.removeEventListener('touchmove',stop);clearTimeout(drag.current?.timer);};},[]);
 const lift=d=>{d.lifted=true;setHeld(d.id);try{navigator.vibrate?.(12);}catch{}};
 // The line nearest the finger, among the rows of this list only.
 const gapAt=(y,row)=>{for(const r of row.parentElement.querySelectorAll(':scope>[data-drag-id]')){if(r===row)continue;const b=r.getBoundingClientRect();if(y<b.top+b.height/2)return r.dataset.dragId;}return END;};
 // The two lines either side of the row being carried would leave it where it is.
 const still=(d,g)=>g===d.id||g===(list[list.indexOf(d.id)+1]??END);
 const grip=(id,label)=><button type="button" className="rank-grip menu-grip" aria-label={`Drag ${label}`}
  onPointerDown={e=>{if(e.button>0)return;e.currentTarget.setPointerCapture?.(e.pointerId);const d={id,x:e.clientX,y:e.clientY,scroll:window.scrollY,row:e.currentTarget.closest('[data-drag-id]'),gap:null,lifted:false};drag.current=d;if(e.pointerType==='mouse')lift(d);else d.timer=setTimeout(()=>{if(drag.current===d)lift(d);},HOLD);}}
  onPointerMove={e=>{const d=drag.current;if(!d)return;
   if(!d.lifted){if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>SLOP)letGo();return;}
   follow(d.row,0,e.clientY-d.y+window.scrollY-d.scroll);
   const g=gapAt(e.clientY,d.row);d.gap=still(d,g)?null:g;setGap(d.gap);
   if(e.clientY<100)window.scrollBy(0,-16);if(e.clientY>window.innerHeight-100)window.scrollBy(0,16);}}
  onPointerUp={()=>{const d=drag.current;letGo();if(!d?.lifted)return;settle(d.row,d.gap===null);if(d.gap!==null)place(d.id,d.gap);}}
  onPointerCancel={()=>{const d=drag.current;letGo();if(d?.lifted)settle(d.row,true);}}><GripVertical size={18}/></button>;
 // The classes for a row: lifted while it is carried, and the green line above it (or, for the
 // last row, below it) where the carried row will land.
 const rowClass=id=>[held===id&&'held',gap===id&&'drop-before',gap===END&&id===list.at(-1)&&'drop-after'].filter(Boolean).join(' ');
 return {grip,rowClass};
}
export default function Personalise({user,prefs,setPrefs,home,setHome,held=[]}){
 const bar=primaryNav(user,prefs),hidden=hiddenNav(user,prefs);
 const save=next=>setPrefs(cleanNav({...next,order:prefs?.order},user));
 const hide=id=>{if(!FIXED.includes(id))save({bar:bar.filter(x=>x!==id),hidden:[...hidden,id]});};
 const unhide=id=>save({bar,hidden:hidden.filter(x=>x!==id)});
 const row=id=>{const Icon=iconFor(id);return <><span className="more-icon"><Icon size={19}/></span>
  <span><strong>{PAGES[id].label}</strong><small>{PAGES[id].note}</small></span></>;};
 return <>
  <p className="eyebrow">YOUR PHONE, YOUR WAY</p><PageTitle help={<><p>This is your phone only. Nobody else's menu changes, and nothing here changes the trip.</p></>}>Customise</PageTitle>
  <HomeWidgets home={home} setHome={setHome} held={held}/>
  <BarShortcuts user={user} prefs={prefs} setPrefs={setPrefs}/>
  <OpeningTips/>
  <h2>Put away what you never open</h2>
  <p>A screen you put away disappears from the bar and from More. It is still here, at the
   bottom of this page, whenever you want it back.</p>
  <div className="menu-add">{pagesFor(user).filter(id=>!FIXED.includes(id)&&!hidden.includes(id)).map(id=>{
   const Icon=iconFor(id);
   return <button key={id} type="button" onClick={()=>hide(id)}><Icon size={16}/>{PAGES[id].label}<EyeOff size={14}/></button>;})}</div>
  {!!hidden.length&&<>
   <h2>Put away ({hidden.length})</h2>
   <ol className="menu-order">{hidden.map(id=><li key={id}>
    {row(id)}
    <span className="menu-buttons">
     <button type="button" onClick={()=>unhide(id)}><Eye size={16}/> Bring it back</button>
    </span>
   </li>)}</ol>
  </>}
  <button type="button" onClick={()=>{if(confirm('Put the menu back the way it started?'))setPrefs(emptyNav());}}>
   <RotateCcw size={16}/> Start again</button>
 </>;
}
// What the opening screen shows while the trip loads. Used here and in Settings.
export function OpeningTips(){
 const [tips,setTips]=React.useState(readTips);
 return <>
  <h2>While the app opens</h2>
  <p>The opening screen shows a fact from the guide, a Japanese word or a practical tip while
   the trip loads, and stays until that card has finished. Choose any of them, or turn them all off
   to go straight in.</p>
  <div className="menu-add" role="group" aria-label="Tips while the app opens">{TIP_KINDS.map(o=>
   <button key={o.id} type="button" aria-pressed={tips.includes(o.id)} className={tips.includes(o.id)?'primary':undefined}
    onClick={()=>setTips(writeTips(toggleTip(tips,o.id)))}>{o.label}</button>)}</div>
  {!tips.length&&<p><small>No tips: the trip opens as soon as it is ready.</small></p>}
 </>;
}
// The shortcuts along the bottom, in order, with what else could go on. Used here and in
// Settings, so the order can be changed from whichever screen somebody goes looking in.
// Home is pinned first and More last, outside the strip that scrolls, so neither is listed as
// something to move: only the shortcuts between them are.
export function BarShortcuts({user,prefs,setPrefs}){
 const bar=primaryNav(user,prefs),hidden=hiddenNav(user,prefs),spare=addableNav(user,prefs);
 // The first change to a bar nobody has touched starts from the one they have been using,
 // rather than from nothing — otherwise moving one row down would rebuild the whole bar.
 const withBar=list=>setPrefs(cleanNav({bar:list,hidden,order:prefs?.order},user));
 const move=(id,by)=>{
  const at=bar.indexOf(id),to=at+by;
  if(at<1||to<1||to>=bar.length)return;
  const list=[...bar];list[at]=list[to];list[to]=id;
  withBar(list);
 };
 const drop=id=>{if(bar.length>BAR_MIN&&!FIXED.includes(id))withBar(bar.filter(x=>x!==id));};
 const place=(id,before)=>{const list=bar.filter(x=>x!==id),at=before===END?list.length:list.indexOf(before);if(at<1)return;list.splice(at,0,id);withBar(list);};
 const add=id=>{if(bar.length<BAR_MAX)withBar([...bar,id]);};
 const shortcuts=bar.slice(1),{grip,rowClass}=useDragOrder(shortcuts,place);
 return <>
  <h2>The bar along the bottom</h2>
  <p>Home is always at the left end and More at the right. The shortcuts between them come in
   this order, and swipe sideways like the days along the top when there are more than fit.
   Swipe the bar up for everything else, and down to come back. You can have
   up to {BAR_MAX-1} shortcuts. Hold a row’s handle, then drag it to the green line where it should go, or use the arrows. You can also press and hold one on the bar until they wobble,
   then drag them where you want.</p>
  <ol className="menu-order">{shortcuts.map((id,i)=>{const Icon=iconFor(id);return <li key={id} data-drag-id={id} className={rowClass(id)||undefined}>
   {grip(id,PAGES[id].label)}
   <span className="more-icon"><Icon size={19}/></span>
   <span><strong>{PAGES[id].label}</strong><small>{PAGES[id].note}</small></span>
   <span className="menu-buttons">
    <button type="button" aria-label={`Move ${PAGES[id].label} up`} disabled={i===0} onClick={()=>move(id,-1)}><ArrowUp size={16}/></button>
    <button type="button" aria-label={`Move ${PAGES[id].label} down`} disabled={i===shortcuts.length-1} onClick={()=>move(id,1)}><ArrowDown size={16}/></button>
    <button type="button" className="danger" aria-label={`Take ${PAGES[id].label} off the bar`}
     disabled={FIXED.includes(id)||bar.length<=BAR_MIN} onClick={()=>drop(id)}><X size={16}/></button>
   </span>
  </li>;})}</ol>
  {bar.length>=BAR_MAX&&<p className="callout">That is {BAR_MAX-1}, which is as many as the bar
   holds. Take one off to put another on.</p>}
  <h2>Put something else on it</h2>
  {spare.length
   ?<div className="menu-add">{spare.map(id=>{const Icon=iconFor(id);
     return <button key={id} type="button" disabled={bar.length>=BAR_MAX} onClick={()=>add(id)}>
      <Icon size={16}/>{PAGES[id].label}<Plus size={14}/></button>;})}</div>
   :<p>Everything you can see is already on the bar.</p>}
 </>;
}
// Home is a column of widgets, and this is where they are put in order or put away. The same
// arrows as the bar, for the same reasons, plus an eye: a widget put away is still listed here,
// greyed, so there is never anything to go looking for to bring it back.
export function HomeWidgets({home,setHome,held=[]}){
 if(!setHome)return null;
 // A widget the awareness dial holds back on this phone is not offered to arrange either.
 const {hidden}=cleanHome(home),order=homeOrder(home).filter(id=>!held.includes(id));
 // A drop is placed in the full order, which has the held-back widgets in it too.
 const place=(id,before)=>{const all=homeOrder(home).filter(x=>x!==id),at=before===END?all.indexOf(order.filter(x=>x!==id).at(-1))+1:all.indexOf(before);if(at>=0)setHome(placeWidget(home,id,at));};
 const {grip,rowClass}=useDragOrder(order,place);
 return <>
  <h2>Your Home screen</h2>
  <p>Home shows these, top to bottom, under the day and its dates. Move them into the order you
   want, holding a row’s handle and dragging it to the green line, or with the arrows, and put away the ones you do not need. The day’s buttons — the day at a glance, adjust the
   day, we’re tired, useful apps — live on Today and start put away here; tap the eye to add any of
   them to Home too. It changes Home on this phone only. To put a card away just for today, use the
   eye on the card itself on Home; it comes back tomorrow by itself.</p>
  <ol className="menu-order home-widgets">{order.map((id,i)=>{const off=hidden.includes(id);
   return <li key={id} data-drag-id={id} className={[off&&'is-hidden',rowClass(id)].filter(Boolean).join(' ')||undefined}>
    {grip(id,HOME_WIDGETS[id].label)}
    <span><strong>{HOME_WIDGETS[id].label}</strong><small>{off?'Put away · ':''}{HOME_WIDGETS[id].note}</small></span>
    <span className="menu-buttons">
     <button type="button" aria-label={`Move ${HOME_WIDGETS[id].label} up`} disabled={i===0} onClick={()=>setHome(moveWidget(home,id,-1))}><ArrowUp size={16}/></button>
     <button type="button" aria-label={`Move ${HOME_WIDGETS[id].label} down`} disabled={i===order.length-1} onClick={()=>setHome(moveWidget(home,id,1))}><ArrowDown size={16}/></button>
     <button type="button" aria-pressed={!off} aria-label={off?`Show ${HOME_WIDGETS[id].label} on Home`:`Put ${HOME_WIDGETS[id].label} away`} onClick={()=>setHome(toggleWidget(home,id))}>{off?<EyeOff size={16}/>:<Eye size={16}/>}</button>
    </span>
   </li>;})}</ol>
  <button type="button" onClick={()=>{if(confirm('Put Home back the way it started?'))setHome(emptyHome());}}>
   <RotateCcw size={16}/> Reset Home</button>
 </>;
}
