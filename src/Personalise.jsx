import React from 'react';
import {ArrowUp,ArrowDown,Plus,X,Eye,EyeOff,RotateCcw} from 'lucide-react';
import {PAGES,BAR_MIN,BAR_MAX,FIXED,pagesFor,primaryNav,hiddenNav,addableNav,cleanNav,emptyNav} from './nav-data.js';
import {iconFor} from './Navigation.jsx';
import {HOME_WIDGETS,homeOrder,cleanHome,moveWidget,toggleWidget,emptyHome} from './home-widgets.js';
// Four of us carry the same app. Lauren opens tickets and the plan; Boston opens his missions
// and his money; Nate opens three screens in sixteen days and would open two if the third one
// stopped moving. One bottom bar cannot be right for all of them, so this is where each phone
// is told what belongs on it and in what order, and what to put away entirely.
//
// Arrows rather than dragging. A drag-and-drop list is the obvious way to order five things and
// the wrong one here: it fights the page scroll on a phone, it needs a steady hand, and the
// person most likely to be rearranging this is five. Two arrows and a cross can be pressed by
// anybody, work with a screen reader, and cannot half-happen.
//
// Nothing put away is lost. Everything hidden is listed at the bottom of this screen with a
// button to bring it back, and this screen cannot be hidden itself — nor can Home, which is
// the way back from wherever a bad arrangement leaves you.
export default function Personalise({user,prefs,setPrefs,home,setHome}){
 const bar=primaryNav(user,prefs),hidden=hiddenNav(user,prefs),spare=addableNav(user,prefs);
 const save=next=>setPrefs(cleanNav(next,user));
 // The first change to a bar nobody has touched starts from the one they have been using,
 // rather than from nothing — otherwise moving one row down would rebuild the whole bar.
 const withBar=list=>save({bar:list,hidden});
 const move=(id,by)=>{
  const at=bar.indexOf(id),to=at+by;
  if(at<0||to<0||to>=bar.length)return;
  const list=[...bar];list[at]=list[to];list[to]=id;
  withBar(list);
 };
 const drop=id=>{if(bar.length>BAR_MIN&&!FIXED.includes(id))withBar(bar.filter(x=>x!==id));};
 const add=id=>{if(bar.length<BAR_MAX)withBar([...bar,id]);};
 const hide=id=>{if(!FIXED.includes(id))save({bar:bar.filter(x=>x!==id),hidden:[...hidden,id]});};
 const unhide=id=>save({bar,hidden:hidden.filter(x=>x!==id)});
 const row=id=>{const Icon=iconFor(id);return <><span className="more-icon"><Icon size={19}/></span>
  <span><strong>{PAGES[id].label}</strong><small>{PAGES[id].note}</small></span></>;};
 return <>
  <p className="eyebrow">YOUR PHONE, YOUR MENU</p><h1>My menu</h1>
  <p>This is your phone only. Nobody else's menu changes, and nothing here changes the trip.</p>
  <HomeWidgets home={home} setHome={setHome}/>
  <h2>The bar along the bottom</h2>
  <p>These are the buttons at the bottom of the screen, in this order. Swipe the bar sideways
   to reach the ones that do not fit, swipe it up for everything else, and swipe it down to
   come back. You can have between {BAR_MIN} and {BAR_MAX} of them.</p>
  <ol className="menu-order">{bar.map((id,i)=><li key={id}>
   {row(id)}
   <span className="menu-buttons">
    <button type="button" aria-label={`Move ${PAGES[id].label} up`} disabled={i===0} onClick={()=>move(id,-1)}><ArrowUp size={16}/></button>
    <button type="button" aria-label={`Move ${PAGES[id].label} down`} disabled={i===bar.length-1} onClick={()=>move(id,1)}><ArrowDown size={16}/></button>
    <button type="button" className="danger" aria-label={`Take ${PAGES[id].label} off the bar`}
     disabled={FIXED.includes(id)||bar.length<=BAR_MIN} onClick={()=>drop(id)}><X size={16}/></button>
   </span>
  </li>)}</ol>
  {bar.length>=BAR_MAX&&<p className="callout">That is {BAR_MAX}, which is as many as the bar
   holds. Take one off to put another on.</p>}
  <h2>Put something else on it</h2>
  {spare.length
   ?<div className="menu-add">{spare.map(id=>{const Icon=iconFor(id);
     return <button key={id} type="button" disabled={bar.length>=BAR_MAX} onClick={()=>add(id)}>
      <Icon size={16}/>{PAGES[id].label}<Plus size={14}/></button>;})}</div>
   :<p>Everything you can see is already on the bar.</p>}
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
// Home is a column of widgets, and this is where they are put in order or put away. The same
// arrows as the bar, for the same reasons, plus an eye: a widget put away is still listed here,
// greyed, so there is never anything to go looking for to bring it back.
function HomeWidgets({home,setHome}){
 if(!setHome)return null;
 const {hidden}=cleanHome(home),order=homeOrder(home);
 return <>
  <h2>Your Home screen</h2>
  <p>Home shows these, top to bottom, under the day and its dates. Move them into the order you
   want and put away the ones you do not need. It changes Home on this phone only.</p>
  <ol className="menu-order home-widgets">{order.map((id,i)=>{const off=hidden.includes(id);
   return <li key={id} className={off?'is-hidden':undefined}>
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
