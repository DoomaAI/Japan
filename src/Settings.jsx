import React,{useState} from 'react';
import HowThisWorks from './HowThisWorks.jsx';
import {MessageSquare,Lightbulb,Mic,Eye,ArrowUp,ArrowDown,RotateCcw,ExternalLink,Ticket,Image,MessageCircleQuestion,BookOpen,Bell,Compass,Share2,CalendarDays,Copy,Zap} from 'lucide-react';
import {SETTINGS,settingOn} from './settings.js';
import Notifications from './Notifications.jsx';
import {BarShortcuts} from './Personalise.jsx';
import {CARD_LINKS,linkOrder,stepLink} from './card-links.js';
import {DEEP_LINKS,deepLinkUrl} from './deep-links.js';
import {THEMES,readTheme,saveTheme,applyTheme,LOOKS,LOOK_CHOICES,readLook,saveLook,applyLook} from './theme.js';
import {READING,AWARENESS,childLevels,defaultReading,defaultAwareness,readingLabel,awarenessLabel,isChild} from './child-levels.js';
import {HandOver} from './HandOver.jsx';
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
// Family at home can follow the trip: a link with no login that shows the days so far, the
// photos, the stars and the diary, and none of the tickets, places, hotels or money. A parent
// makes it, copies it to whoever should have it, and can stop it at any time.
export const followMessage=url=>`We're in Japan! Follow along with our trip: the photos, what we did each day and the diary, updated as we go. No login needed.\n\n${url}\n\nIt's a private link, so please don't pass it on.`;
function FollowLink({request,notice}){
 const [busy,setBusy]=useState(false),[link,setLink]=useState('');
 const make=async()=>{setBusy(true);try{const r=await request('follow-link',{});setLink(r.url);await navigator.clipboard?.writeText(r.url).catch(()=>{});notice('Follow-along link copied. Send it to family at home.');}catch(e){notice(e.message);}finally{setBusy(false);}};
 // Sending it is the point, so the phone's own share sheet opens with the message written:
 // Messages, WhatsApp or email, whichever the person at home actually reads. A phone with no
 // share sheet gets the message copied instead.
 const share=async()=>{setBusy(true);try{const url=link||(await request('follow-link',{})).url;setLink(url);const text=followMessage(url);
  if(navigator.share){try{await navigator.share({title:'Follow our Japan trip',text});}catch(e){if(e?.name!=='AbortError')throw e;}}
  else{await navigator.clipboard.writeText(text);notice('Message and link copied. Paste it into a text or an email.');}}
  catch(e){notice(e.message||'The link could not be shared.');}finally{setBusy(false);}};
 const stop=async()=>{if(!confirm('Stop the follow-along link? Anyone who has it will no longer be able to open it.'))return;setBusy(true);try{await request('follow-link',{stop:true});setLink('');notice('The follow-along link has been stopped. Making a new one gives a different link.');}catch(e){notice(e.message);}finally{setBusy(false);}};
 return <section className="settings-section">
  <h2>Follow along from home</h2>
  <p>A link for grandparents and friends: the days so far, the photos, the stops we did with our stars and what we said, and the diary. No tickets, bookings, hotels, places, positions or money, and nothing about the days still to come.</p>
  <div className="row wrap">
   <button type="button" className="primary" disabled={busy} onClick={share}><Share2 size={16}/> Send to family at home</button>
   <button type="button" disabled={busy} onClick={make}><Copy size={16}/> Copy the link</button>
   <button type="button" className="danger" disabled={busy} onClick={stop}>Stop the link</button>
  </div>
  {link&&<textarea readOnly value={link} rows={2}/>}
  <p><small>Anyone holding the link can see the photos, so send it only to people you would show them to.</small></p>
 </section>;
}
// The addresses a Shortcut can open. iOS gives a web app no widget and no share-sheet entry,
// but the Shortcuts app opens an address, Siri runs a Shortcut by name, and the Action button
// runs one on a press; so these are the way "Hey Siri, Japan to-do" gets made.
function DeepLinks({notice}){
 const origin=typeof location!=='undefined'?location.origin:'';
 const copy=async link=>{const url=deepLinkUrl(link,origin);try{await navigator.clipboard.writeText(url);notice?.(`Copied. In Shortcuts, add “Open URLs” and paste it${link.takes?`, then add ${link.takes} on the end`:''}.`);}catch{notice?.(url);}};
 return <section className="settings-section">
  <h2>Shortcuts, Siri and the Action button</h2>
  <p>Each of these is an address that does one thing the moment the app opens. In the Shortcuts app make a new shortcut, add <strong>Open URLs</strong>, paste the address, and give it a name: Siri then runs it by that name, and on an iPhone 15 Pro or later it can go on the Action button too.</p>
  <ul className="deep-links">{DEEP_LINKS.map(link=><li key={link.id}>
   <span className="more-icon" aria-hidden="true"><Zap size={18}/></span>
   <span><strong>{link.label}</strong><small>{link.how}</small><code>{deepLinkUrl(link,origin)}{link.takes?'…':''}</code></span>
   <button type="button" aria-label={`Copy the address for ${link.label}`} onClick={()=>copy(link)}><Copy size={16}/></button>
  </li>)}</ul>
  <p><small>The address only opens on a phone already signed in to the trip; on any other phone it shows the front door.</small></p>
 </section>;
}
// Light or dark, chosen here rather than left to the phone, because midday at a ramen counter
// and midnight in a hotel room want different things and the phone only knows the clock.
function Appearance(){
 const [theme,setTheme]=useState(readTheme);
 const pick=id=>{setTheme(saveTheme(id));applyTheme(id);};
 const [look,setLook]=useState(readLook);
 const pickLook=id=>{setLook(saveLook(id));applyLook(id);};
 return <section className="settings-section">
  <h2>Appearance</h2>
  <div className="segmented theme-picker" role="radiogroup" aria-label="Appearance">{THEMES.map(([id,label])=><button type="button" key={id} role="radio" aria-checked={theme===id} className={theme===id?'selected':''} onClick={()=>pick(id)}>{label}</button>)}</div>
  {/* Hidden until there is a second look to choose between. */}
  {LOOKS.length>1&&<div className="segmented theme-picker" role="radiogroup" aria-label="Look">{LOOK_CHOICES.map(([id,label])=><button type="button" key={id} role="radio" aria-checked={look===id} className={look===id?'selected':''} onClick={()=>pickLook(id)}>{label}</button>)}</div>}
  <p><small>Photos and the original guide stay as they are; everything else takes the darker colours. Match the phone follows the phone’s own light and dark schedule.</small></p>
 </section>;
}
// What each of the boys is ready for: two dials a parent sets, each starting from the age on
// his travel-party profile. Reading decides how the words reach him — read aloud at a story's
// pace, sounded out, or read on his own — and awareness decides how much of the trip's
// machinery his phone shows: the leave-by clock, the reports, the check-in, the emergency page,
// Ask. They are separate because they do not move together, and either can be moved any
// evening, so a boy who reads the kana puzzle by himself on Tuesday gets the pages to match on
// Wednesday. Kept on the trip, not the phone, so his link and a parent's phone standing in for
// him agree.
function Dial({name,label,levels,value,isDefault,age,fallback,save,busy}){
 const current=levels.find(([id])=>id===value)||levels.at(-1);
 return <div className="setting-dial">
  <div className="section-heading"><strong>{label}</strong>{age!==null&&<small>{isDefault?`From ${name}’s age, ${age}`:`Set by hand · from age ${age} it would be ${fallback}`}</small>}</div>
  <div className="segmented theme-picker" role="radiogroup" aria-label={`${label} for ${name}`}>{levels.map(([id,text])=><button type="button" key={id} role="radio" aria-checked={value===id} className={value===id?'selected':''} disabled={busy} onClick={()=>save(id)}>{text}</button>)}</div>
  <p><small>{current[2]}</small></p>
  {!isDefault&&age!==null&&<button type="button" disabled={busy} onClick={()=>save('')}><RotateCcw size={16}/> Back to the age default</button>}
 </div>;
}
export function ChildLevels({state,mutate,busy}){
 const boys=(state?.members||[]).filter(n=>isChild(state,n));
 if(!boys.length)return null;
 return <section className="settings-section">
  <h2>What the boys are ready for</h2>
  <p>Two dials for each of them, starting from the age on his profile. <strong>Reading</strong> is how the words reach him; <strong>awareness</strong> is how much of the trip’s workings his phone shows. Move either any time.</p>
  {boys.map(name=>{
   const l=childLevels(state,name);
   const save=field=>value=>mutate({type:'childLevels',name,[field]:value});
   return <div className="party-person" key={name}>
    <h3>{name}{l.age!==null?` · ${l.age}`:''}</h3>
    {l.age===null&&<p className="callout">Give {name} an age under Who we are, on the Planning board, and both dials start from it.</p>}
    <Dial name={name} label="Reading" levels={READING} value={l.reading} isDefault={!l.readingSet} age={l.age} fallback={readingLabel(defaultReading(l.age))} save={save('reading')} busy={busy}/>
    <Dial name={name} label="Awareness" levels={AWARENESS} value={l.awareness} isDefault={!l.awarenessSet} age={l.age} fallback={awarenessLabel(defaultAwareness(l.age))} save={save('awareness')} busy={busy}/>
   </div>;})}
  <p><small>Held on the trip, so {boys.join(' and ')}’s own phones follow it the next time they refresh. Nothing already ticked, rated or written is touched.</small></p>
 </section>;
}
export default function Settings({user,state,mutate,busy,hand,settings,change,navPrefs,setNavPrefs,linkPrefs,setLinkPrefs,request,notice,config}){
 return <>
  <p className="eyebrow">YOUR PHONE, YOUR CHOICE</p>
  <h1>Settings</h1>
  <p>The phrase and the fact are the only things the app puts on your screen without being asked.</p>
 <HowThisWorks><p>Turn one off and it stops opening{user?.name?` on ${user.name}’s phone`:''} — everybody else keeps theirs.</p></HowThisWorks>
  <Appearance/>
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
  {user?.role==='parent'&&state&&mutate&&<ChildLevels state={state} mutate={mutate} busy={busy}/>}
  {user?.role==='parent'&&state&&hand&&<HandOver state={state} user={user} hand={hand}/>}
  {request&&<Notifications config={config} request={request} notice={notice} user={user}/>}
  {user?.role==='parent'&&request&&<TripCalendar request={request} notice={notice}/>}
  {user?.role==='parent'&&request&&<FollowLink request={request} notice={notice}/>}
  <DeepLinks notice={notice}/>
  {setNavPrefs&&<section className="settings-section"><BarShortcuts user={user} prefs={navPrefs} setPrefs={setNavPrefs}/></section>}
  {setLinkPrefs&&<section className="settings-section"><StopButtonOrder prefs={linkPrefs} setPrefs={setLinkPrefs}/></section>}
  <p><small>Remembered on this phone under your own name, so it takes effect with no signal and changes nothing for anybody else. Turning one back on brings it straight back, starting with today’s if you have not already marked it; nothing you have already seen is ever offered twice.</small></p>
 </>;
}
