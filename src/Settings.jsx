import React,{useState} from 'react';
import HowThisWorks from './HowThisWorks.jsx';
import {Sparkles,MessageSquare,Lightbulb,Mic,Eye,ArrowUp,ArrowDown,RotateCcw,ExternalLink,Ticket,Image,MessageCircleQuestion,BookOpen,Bell,Compass,Share2,CalendarDays,Copy,Zap,Tv,Trash2,Send,Mail,Plus} from 'lucide-react';
import {SETTINGS,settingOn} from './settings.js';
import Notifications from './Notifications.jsx';
import {BarShortcuts} from './Personalise.jsx';
import {CARD_LINKS,linkOrder,stepLink} from './card-links.js';
import {DEEP_LINKS,deepLinkUrl} from './deep-links.js';
import {THEMES,readTheme,saveTheme,applyTheme,LOOKS,LOOK_CHOICES,readLook,saveLook,applyLook} from './theme.js';
import {READING,AWARENESS,childLevels,defaultReading,defaultAwareness,readingLabel,awarenessLabel,isChild} from './child-levels.js';
import {HandOver} from './HandOver.jsx';
import {FRAME_SERVICES,frameService,SHORTCUT_STEPS,ALBUM_NAME} from './frame-mail-data.js';
import {guideOf,GUIDE_VOICES} from './guide-data.js';
import {PLAN_TYPES,planOf,modulesOff,validTimeZone} from './plan-context.js';
import {PAGES} from './nav-data.js';
const ICONS={voiceAssistant:Sparkles,dailyPhrase:MessageSquare,dailyFact:Lightbulb,transcribeVoice:Mic,routeLookOpen:Eye};
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
function FollowLink({state,config,request,accept,notice}){
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
  <Frames state={state} config={config} request={request} accept={accept} notice={notice}/>
 </section>;
}
// The guide: one name and one voice for Ask, What's near here, the suggestions and the night-
// before check. A parent names it and picks how it talks; everyone sees the name on what it says.
function GuideSettings({state,mutate,busy}){
 const g=guideOf(state),[name,setName]=useState(g.name),[voice,setVoice]=useState(g.voice);
 const changed=name.trim()!==g.name||voice!==g.voice;
 return <section className="settings-section guide-settings">
  <h2><Compass size={18}/> Your guide</h2>
  <p>Ask about our trip, What’s near here, the suggestions and the night-before check are one guide, with one voice and the same memory of the trip so far: what we loved, what we skipped, what we ate and what we last asked.</p>
  <form className="guide-form" onSubmit={e=>{e.preventDefault();mutate({type:'guideSet',name,voice});}}>
   <label>Name<input value={name} maxLength={20} onChange={e=>setName(e.target.value)} placeholder="Tabi"/></label>
   <fieldset><legend>How it talks</legend>{GUIDE_VOICES.map(v=><label key={v.id} className="checkline"><input type="radio" name="voice" value={v.id} checked={voice===v.id} onChange={()=>setVoice(v.id)}/> <span><strong>{v.label}</strong> <small>{v.line}</small></span></label>)}</fieldset>
   <button className="primary" disabled={busy||!changed||!name.trim()}>Save</button>
  </form>
 </section>;
}
// The frames at home. Each screen frame has a key and a name of its own, so taking one off
// leaves the follow link and the other frames working; a real photo frame is sent its photos by
// email instead, every night and on request.
function Frames({state,config,request,accept,notice}){
 const [busy,setBusy]=useState(false),[frames,setFrames]=useState(null),[service,setService]=useState('aura'),[kind,setKind]=useState('screen');
 const list=frames||state?.frameKeys||[],mailed=state?.frameEmails||[];
 const run=async fn=>{setBusy(true);try{await fn();}catch(e){notice(e.message);}finally{setBusy(false);}};
 const copy=(url,album)=>navigator.clipboard?.writeText(url).then(()=>notice(album?'Feed link copied. Paste it into the Shortcut on their iPhone or iPad.':'Frame link copied. Open it on the frame and add it to the home screen or bookmarks.'),()=>notice(url));
 const addKey=e=>{e.preventDefault();const form=e.currentTarget,label=new FormData(form).get('label');run(async()=>{const r=await request('frame-link',{action:'add',label,kind});setFrames(r.frames);form.reset();if(r.url)await copy(r.url,kind==='album');});};
 const addMail=e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);run(async()=>{accept(await request('frame-email',{action:'add',service,label:f.get('label'),address:f.get('address'),fromNow:f.get('fromNow')==='on'}));form.reset();notice('Frame added. It gets its photos tonight, or press Send now.');});};
 return <>
  <h3><Tv size={16}/> Screen frames</h3>
  <p>An old iPad on a stand, a laptop or a TV browser, showing one photo at a time with the day and the city in a corner. The photo of the day is on it; put any other photo on from the Photos page. It keeps the screen awake, dims after ten at night, and a tap on the photo claps. Each frame has its own link, so taking one off leaves the others and the follow link working.</p>
  {!!list.length&&<ul className="frame-list">{list.map(f=><li key={f.id}><span><strong>{f.label}</strong><small>{f.kind==='album'?`Apple album · ${f.fed?`${f.fed} photo${f.fed===1?'':'s'} fetched${f.fedAt?`, last ${new Date(f.fedAt).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}`:''}`:'nothing fetched yet'}`:`Screen · added by ${f.createdBy||'a parent'}`}</small></span>
   <button type="button" disabled={busy} onClick={()=>run(async()=>{const r=await request('frame-link',{action:'url',id:f.id});await copy(r.url,f.kind==='album');})}><Copy size={15}/> {f.kind==='album'?'Copy feed':'Copy link'}</button>
   {f.kind==='album'&&f.fed>0&&<button type="button" disabled={busy} onClick={()=>confirm(`Send every photo to “${f.label}” again on its next fetch?`)&&run(async()=>setFrames((await request('frame-link',{action:'restart',id:f.id})).frames))}><RotateCcw size={15}/> Again</button>}
   <button type="button" className="icon danger" aria-label={`Take ${f.label} off`} disabled={busy} onClick={()=>confirm(`Take “${f.label}” off? Its link stops working at once.`)&&run(async()=>setFrames((await request('frame-link',{action:'remove',id:f.id})).frames))}><Trash2 size={15}/></button></li>)}</ul>}
  <form className="row wrap frame-add" onSubmit={addKey}>
   <select value={kind} onChange={e=>setKind(e.target.value)} aria-label="Kind of frame"><option value="screen">A screen with a browser</option><option value="album">Apple TV or Mac (iCloud album)</option></select>
   <input name="label" maxLength={40} required placeholder={kind==='album'?'Name it: Nana’s Apple TV':'Name it: Nana’s kitchen iPad'} aria-label="Frame name"/><button disabled={busy}><Plus size={16}/> {kind==='album'?'Add it and copy its feed':'Add a frame and copy its link'}</button></form>
  {(kind==='album'||list.some(f=>f.kind==='album'))&&<details className="frame-shortcut" open={kind==='album'||undefined}><summary>Setting up an Apple TV or Mac</summary>
   <p><small>Apple does not let another app add to an iCloud shared album, so their own iPhone or iPad fetches the new photos every evening with a Shortcut and saves them into an album, “{ALBUM_NAME}”, which their Apple TV or Mac shows. It needs their iCloud Photos turned on, and the same Apple account on the TV.</small></p>
   <ol>{SHORTCUT_STEPS.map(t=><li key={t}>{t}</li>)}</ol>
   <p><small>Each photo is handed over once. If the album is deleted, press Again and the next fetch brings them all back.</small></p>
  </details>}
  <h3><Mail size={16}/> Photo frames that take email</h3>
  <p>Aura, Nixplay and Skylight frames each have an email address for photos. The app sends the same photos as the screen frames — the photo of the day and the ones you put on — each one once, every night and when you press Send now.</p>
  {!config?.frameMail&&<p className="notice-line"><small>Needs an email service to send from: set <code>RESEND_API_KEY</code> and <code>FRAME_MAIL_FROM</code> in the deployment settings. Frames can be added now and will be sent to once it is set.</small></p>}
  {!!mailed.length&&<ul className="frame-list">{mailed.map(m=><li key={m.id}><span><strong>{m.label}</strong><small>{frameService(m.service).label} · {m.address}{m.lastSentAt?` · last sent ${new Date(m.lastSentAt).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}`:' · nothing sent yet'}</small></span>
   {config?.frameMail&&<button type="button" disabled={busy} onClick={()=>run(async()=>{const r=await request('frame-email',{action:'send',id:m.id});accept(r);notice(r.sent?`${r.sent} photo${r.sent===1?'':'s'} sent to ${m.label}.`:`${m.label} already has every photo.`);})}><Send size={15}/> Send now</button>}
   <button type="button" className="icon danger" aria-label={`Take ${m.label} off`} disabled={busy} onClick={()=>confirm(`Stop sending photos to “${m.label}”?`)&&run(async()=>accept(await request('frame-email',{action:'remove',id:m.id})))}><Trash2 size={15}/></button></li>)}</ul>}
  <form className="frame-add frame-mail" onSubmit={addMail}>
   <label>Frame<select value={service} onChange={e=>setService(e.target.value)}>{FRAME_SERVICES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
   <p><small>{frameService(service).hint}</small></p>
   <label>Its email address<input name="address" type="email" required maxLength={120} placeholder="the frame’s own address"/></label>
   <label>Name<input name="label" maxLength={40} placeholder="Grandpa’s Aura"/></label>
   <label className="checkline"><input type="checkbox" name="fromNow"/> Only photos from now on</label>
   <button className="primary" disabled={busy}><Plus size={16}/> Add the frame</button>
  </form>
 </>;
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
// What kind of plan this is, and where. The record behind every date, every price and the menu
// itself (src/plan-context.js). A parent can rename the plan, move its clock, or call it a
// dinner rather than a trip, and the pages a dinner has no use for leave the menu on every phone
// at the next refresh. The list under the picker says exactly which, before the change is made,
// because the fear that stops somebody changing a thing is not knowing what goes with it.
function ThisPlan({state,mutate,busy}){
 const plan=planOf(state);
 const [title,setTitle]=useState(plan.title),[zone,setZone]=useState(plan.timeZone),[type,setType]=useState(plan.type);
 const off=modulesOff({...plan,type}).map(id=>PAGES[id]?.label||id);
 const dirty=title!==plan.title||zone!==plan.timeZone||type!==plan.type,zoneOk=validTimeZone(zone);
 const save=async()=>{const patch={};if(title!==plan.title)patch.title=title.trim();if(zone!==plan.timeZone)patch.timeZone=zone.trim();if(type!==plan.type)patch.type=type;await mutate({type:'planSettings',patch});};
 return <section className="settings-section">
  <h2>This plan</h2>
  <label>Name<input value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/></label>
  <label>Kind of plan<select value={type} onChange={e=>setType(e.target.value)}>{PLAN_TYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
  <p><small>{PLAN_TYPES.find(t=>t.id===type)?.note}.{off.length?` Not offered on a ${PLAN_TYPES.find(t=>t.id===type)?.label.toLowerCase()}: ${off.join(', ')}.`:' Every page is on.'}</small></p>
  <label>Time zone<input value={zone} placeholder="Asia/Tokyo" onChange={e=>setZone(e.target.value)}/></label>
  {!zoneOk&&<p className="callout">Use a time zone name such as Australia/Sydney or Asia/Tokyo.</p>}
  <p><small>{plan.currency} prices, {plan.homeCurrency} at home · {plan.country}, from {plan.homeCountry} · {plan.destinationLanguage} spoken there, {plan.language} in the app. These come with the plan for now; the commercial build lets an organiser set them.</small></p>
  <button type="button" className="primary" disabled={busy||!dirty||!zoneOk} onClick={save}>Save plan settings</button>
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
export default function Settings({user,state,mutate,busy,hand,settings,change,navPrefs,setNavPrefs,linkPrefs,setLinkPrefs,request,notice,config,accept}){
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
   <h2>AI assistant</h2>
   {SETTINGS.filter(s=>s.group==='assistant').map(s=><SettingRow key={s.id} s={s} settings={settings} change={change}/>)}
  </section>
  <section className="settings-section">
   <h2>Voice notes</h2>
   {SETTINGS.filter(s=>s.group==='voice').map(s=><SettingRow key={s.id} s={s} settings={settings} change={change}/>)}
  </section>
  <section className="settings-section">
   <h2>Route cards</h2>
   {SETTINGS.filter(s=>s.group==='route').map(s=><SettingRow key={s.id} s={s} settings={settings} change={change}/>)}
  </section>
  {user?.role==='parent'&&state&&mutate&&<ThisPlan state={state} mutate={mutate} busy={busy}/>}
  {user?.role==='parent'&&state&&mutate&&<ChildLevels state={state} mutate={mutate} busy={busy}/>}
  {user?.role==='parent'&&state&&hand&&<HandOver state={state} user={user} hand={hand}/>}
  {request&&<Notifications config={config} request={request} notice={notice} user={user}/>}
  {user?.role==='parent'&&request&&<TripCalendar request={request} notice={notice}/>}
  {user?.role==='parent'&&mutate&&<GuideSettings state={state} mutate={mutate} busy={busy}/>}
  {user?.role==='parent'&&request&&<FollowLink state={state} config={config} request={request} accept={accept} notice={notice}/>}
  <DeepLinks notice={notice}/>
  {setNavPrefs&&<section className="settings-section"><BarShortcuts user={user} prefs={navPrefs} setPrefs={setNavPrefs}/></section>}
  {setLinkPrefs&&<section className="settings-section"><StopButtonOrder prefs={linkPrefs} setPrefs={setLinkPrefs}/></section>}
  <p><small>Remembered on this phone under your own name, so it takes effect with no signal and changes nothing for anybody else. Turning one back on brings it straight back, starting with today’s if you have not already marked it; nothing you have already seen is ever offered twice.</small></p>
 </>;
}
