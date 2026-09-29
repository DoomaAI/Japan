import React,{useState} from 'react';
import {MessageSquare,Lightbulb,Mic,Eye,ArrowUp,ArrowDown,RotateCcw,ExternalLink,Ticket,Image,MessageCircleQuestion,BookOpen,Bell,Compass,Share2,CalendarDays,Copy} from 'lucide-react';
import {SETTINGS,settingOn} from './settings.js';
import {BarShortcuts} from './Personalise.jsx';
import {CARD_LINKS,linkOrder,stepLink} from './card-links.js';
const ICONS={dailyPhrase:MessageSquare,dailyFact:Lightbulb,transcribeVoice:Mic,routeLookOpen:Eye};
// The one screen that turns things off. Each row says what it is, what it will do next time,
// and what stays behind either way — because the fear that stops somebody switching a thing
// off is not knowing what else goes with it. Nothing here is lost by turning it off: the
// phrasebook and the whole collection of facts are pages of their own and stay exactly where
// they were, and everything already seen stays in the log.
function SettingRow({s,settings,change}){
 const on=settingOn(settings,s.id),Icon=ICONS[s.id];
 return <div className="setting-row">
  <span className="setting-icon" aria-hidden="true">{Icon&&<Icon size={20}/>}</span>
  <span className="setting-text"><strong>{s.label}</strong><small>{on?s.on:s.off}</small></span>
  <button type="button" role="switch" aria-checked={on} aria-label={s.label}
   className={`setting-switch${on?' on':''}`} onClick={()=>change(s.id,!on)}>
   <i aria-hidden="true"/><span>{on?'On':'Off'}</span>
  </button>
 </div>;
}
// The buttons under each stop, in order, with arrows. The same order the wobble-and-drag on a
// stop changes, for anybody who would rather tap than hold and drag, or cannot find the hold.
const LINK_ICONS={website:ExternalLink,tickets:Ticket,photos:Image,voice:Mic,ask:MessageCircleQuestion,guide:BookOpen,remind:Bell,nearby:Compass,share:Share2};
const LINK_EMOJI={park:'🎢',sumo:'🥋',eyespy:'🗻'};
function StopButtonOrder({prefs,setPrefs}){
 const order=linkOrder(prefs),set=list=>setPrefs({order:list});
 return <>
  <h2>The buttons on each stop</h2>
  <p>These sit under every stop, in this order. Some only turn up where they apply, like the park
   map on a park day, and keep their place for when they do. You can also press and hold any of
   them on a stop until they wobble, then drag them where you want.</p>
  <ol className="menu-order">{order.map((id,i)=>{const Icon=LINK_ICONS[id];return <li key={id}>
   <span className="more-icon" aria-hidden="true">{Icon?<Icon size={19}/>:LINK_EMOJI[id]}</span>
   <span><strong>{CARD_LINKS[id].label}</strong><small>{CARD_LINKS[id].note}</small></span>
   <span className="menu-buttons">
    <button type="button" aria-label={`Move ${CARD_LINKS[id].label} earlier`} disabled={i===0} onClick={()=>set(stepLink(order,id,-1))}><ArrowUp size={16}/></button>
    <button type="button" aria-label={`Move ${CARD_LINKS[id].label} later`} disabled={i===order.length-1} onClick={()=>set(stepLink(order,id,1))}><ArrowDown size={16}/></button>
   </span>
  </li>;})}</ol>
  {prefs?.order&&<button type="button" onClick={()=>setPrefs({order:null})}><RotateCcw size={16}/> Put them back how they were</button>}
 </>;
}
// The trip in the phone's own Calendar: every fixed booking with an alert at the leave-by time,
// which is the one thing the app cannot do for itself with the screen off. A parent subscribes
// once; the link can be handed to the other phones.
function TripCalendar({request,notice}){
 const [busy,setBusy]=useState(false),[link,setLink]=useState('');
 const fetchLink=async()=>{const r=await request('calendar-link',{});setLink(r.url);return r.url;};
 const subscribe=async()=>{setBusy(true);try{const url=await fetchLink();location.href=url;notice('Your phone should now offer to add the Japan 2026 calendar.');}catch(e){notice(e.message);}finally{setBusy(false);}};
 const copy=async()=>{setBusy(true);try{const url=link||await fetchLink();await navigator.clipboard.writeText(url);notice('Calendar link copied. Open it on the other phone to subscribe there.');}catch(e){notice(e.message||'Select and copy the link.');}finally{setBusy(false);}};
 return <section className="settings-section">
  <h2>Trip calendar</h2>
  <p>Every fixed booking, with an alert at the leave-by time and another ten minutes before, in this phone’s own Calendar, so the lock screen says when to go even with the app closed. Subscribe once; the phone checks for changes about every hour.</p>
  <div className="row wrap">
   <button type="button" className="primary" disabled={busy} onClick={subscribe}><CalendarDays size={16}/> Subscribe on this phone</button>
   <button type="button" disabled={busy} onClick={copy}><Copy size={16}/> Copy the link</button>
  </div>
  {link&&<textarea readOnly value={link} rows={2}/>}
  <p><small>Anyone holding the link can read the bookings, so share it only with the family.</small></p>
 </section>;
}
export default function Settings({user,settings,change,navPrefs,setNavPrefs,linkPrefs,setLinkPrefs,request,notice}){
 return <>
  <p className="eyebrow">YOUR PHONE, YOUR CHOICE</p>
  <h1>Settings</h1>
  <p>The phrase and the fact are the only things the app puts on your screen without being asked. Turn one off and it stops opening{user?.name?` on ${user.name}’s phone`:''} — everybody else keeps theirs.</p>
  <section className="settings-section">
   <h2>What opens on its own</h2>
   {SETTINGS.filter(s=>!s.group).map(s=><SettingRow key={s.id} s={s} settings={settings} change={change}/>)}
  </section>
  <section className="settings-section">
   <h2>Voice notes</h2>
   {SETTINGS.filter(s=>s.group==='voice').map(s=><SettingRow key={s.id} s={s} settings={settings} change={change}/>)}
  </section>
  <section className="settings-section">
   <h2>Route cards</h2>
   {SETTINGS.filter(s=>s.group==='route').map(s=><SettingRow key={s.id} s={s} settings={settings} change={change}/>)}
  </section>
  {user?.role==='parent'&&request&&<TripCalendar request={request} notice={notice}/>}
  {setNavPrefs&&<section className="settings-section"><BarShortcuts user={user} prefs={navPrefs} setPrefs={setNavPrefs}/></section>}
  {setLinkPrefs&&<section className="settings-section"><StopButtonOrder prefs={linkPrefs} setPrefs={setLinkPrefs}/></section>}
  <p><small>Remembered on this phone under your own name, so it takes effect with no signal and changes nothing for anybody else. Turning one back on brings it straight back, starting with today’s if you have not already marked it; nothing you have already seen is ever offered twice.</small></p>
 </>;
}
