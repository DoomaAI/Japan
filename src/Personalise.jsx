import React from 'react';
import PageTitle from './PageTitle.jsx';
import {Plus,X,Eye,EyeOff,RotateCcw} from 'lucide-react';
import {useDragOrder} from './drag-order.jsx';
import {placeBefore} from './drag-list.js';
import {PAGES,BAR_MIN,BAR_MAX,FIXED,pagesFor,primaryNav,hiddenNav,addableNav,cleanNav,emptyNav} from './nav-data.js';
import {iconFor} from './Navigation.jsx';
import {TIP_KINDS,readTips,writeTips,toggleTip} from './opening-tips.js';
import {HOME_WIDGETS,homeOrder,cleanHome,dropWidget,toggleWidget,emptyHome} from './home-widgets.js';
// Four of us carry the same app. Lauren opens tickets and the plan; Boston opens his missions
// and his money; Nate opens three screens in sixteen days and would open two if the third one
// stopped moving. One bottom bar cannot be right for all of them, so this is where each phone
// is told what belongs on it and in what order, and what to put away entirely.
//
// Hold a row’s handle, then drag it to the green line where it should go (drag-order.jsx). Only
// the handle takes the drag, so the rest of the row still scrolls the page, and the arrow keys on
// a focused handle move it for a screen reader or a keyboard, so no row needs arrow buttons.
//
// Nothing put away is lost. Everything hidden is listed at the bottom of this screen with a
// button to bring it back, and this screen cannot be hidden itself — nor can Home, which is
// the way back from wherever a bad arrangement leaves you.
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
 const drop=id=>{if(bar.length>BAR_MIN&&!FIXED.includes(id))withBar(bar.filter(x=>x!==id));};
 const place=(id,before)=>{if(before===bar[0])return;const list=placeBefore(bar,id,before);if(list.join()!==bar.join())withBar(list);};
 const add=id=>{if(bar.length<BAR_MAX)withBar([...bar,id]);};
 const shortcuts=bar.slice(1),{grip,rowClass}=useDragOrder(shortcuts,place);
 return <>
  <h2>The bar along the bottom</h2>
  <p>Home is always at the left end and More at the right. The shortcuts between them come in
   this order, and swipe sideways like the days along the top when there are more than fit.
   Swipe the bar up for everything else, and down to come back. You can have
   up to {BAR_MAX-1} shortcuts. Hold a row’s handle and drag it to the green line where it
   should go, or press and hold one on the bar until they wobble, then drag them where you want.</p>
  <ol className="menu-order">{shortcuts.map(id=>{const Icon=iconFor(id);return <li key={id} data-drag-id={id} className={rowClass(id)||undefined}>
   {grip(id,PAGES[id].label)}
   <span className="more-icon"><Icon size={19}/></span>
   <span><strong>{PAGES[id].label}</strong><small>{PAGES[id].note}</small></span>
   <span className="menu-buttons">
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
// Home is a column of widgets, and this is where they are put in order, put away or brought
// back. A handle to drag, as on the bar, and an eye: a widget put away is still listed here,
// greyed, so there is never anything to go looking for to bring it back. Moving and removing
// can also be done on Home itself, by holding a card until Home wobbles.
export function HomeWidgets({home,setHome,held=[]}){
 if(!setHome)return null;
 // A widget the awareness dial holds back on this phone is not offered to arrange either.
 const {hidden}=cleanHome(home),order=homeOrder(home).filter(id=>!held.includes(id));
 // A drop is placed in the full order, which has the held-back widgets in it too.
 const place=(id,before)=>setHome(dropWidget(home,id,before,order));
 const {grip,rowClass}=useDragOrder(order,place);
 return <>
  <h2>Your Home screen</h2>
  <p>Home shows these, top to bottom. Hold a row’s handle and drag it to the green line to move
   it, and tap the eye to take it off Home or put it back. You can also hold any card on Home
   until they wobble, then drag them about or tap − to take one off. The day’s buttons — the day
   at a glance, adjust the day, we’re tired, useful apps — live on Today and start put away here.
   It changes Home on this phone only.</p>
  <ol className="menu-order home-widgets">{order.map(id=>{const off=hidden.includes(id);
   return <li key={id} data-drag-id={id} className={[off&&'is-hidden',rowClass(id)].filter(Boolean).join(' ')||undefined}>
    {grip(id,HOME_WIDGETS[id].label)}
    <span><strong>{HOME_WIDGETS[id].label}</strong><small>{off?'Put away · ':''}{HOME_WIDGETS[id].note}</small></span>
    <span className="menu-buttons">
     <button type="button" aria-pressed={!off} aria-label={off?`Show ${HOME_WIDGETS[id].label} on Home`:`Put ${HOME_WIDGETS[id].label} away`} onClick={()=>setHome(toggleWidget(home,id))}>{off?<EyeOff size={16}/>:<Eye size={16}/>}</button>
    </span>
   </li>;})}</ol>
  <button type="button" onClick={()=>{if(confirm('Put Home back the way it started?'))setHome(emptyHome());}}>
   <RotateCcw size={16}/> Reset Home</button>
 </>;
}
