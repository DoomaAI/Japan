import TicketAttachments from './TicketAttachments.jsx';
import LocationDirectory,{GuideLocations} from './LocationDirectory.jsx';
import {destinationFor,resolveLocation,showLocationDetails} from './locations.js';
import {ensureFeatures,pendingProgress,phoneLinks,isTrainLeg,EYE_SPY,eyeSpySpotted} from './trip-features.js';
import {Challenges,Shopping,SpeakRules} from './AdventurePages.jsx';
import {NextUp,RunningLate,OfflineReadiness,Updates} from './HomeFeatures.jsx';
import {ThankYouNote,ThankYouEditor} from './ThankYou.jsx';
import TicketViewer from './TicketViewer.jsx';
import DocumentThumb from './DocumentThumb.jsx';
import Currency from './Currency.jsx';
import SayIt from './SayIt.jsx';
import Phrasebook,{PhraseOfDay} from './Phrasebook.jsx';
import {phraseForDay} from './phrasebook-data.js';
import {phraseSeenBy,phraseQueue} from './trip-features.js';
import FunFacts,{FactOfDay} from './FunFacts.jsx';
import {factForDay} from './fact-data.js';
import {factSeenBy,factQueue} from './trip-features.js';
import {PHRASES} from './phrases.js';
import Settings from './Settings.jsx';
import {readSettings,writeSetting,settingOn} from './settings.js';
import {BottomNav,MorePage} from './Navigation.jsx';
import {primaryNav,moreIds,PAGES} from './nav-data.js';
import {pageRule} from './spoken-rules.js';
import EyeSpy from './EyeSpy.jsx';
import ParkGuide from './ParkGuide.jsx';
import FoodList,{FoodCard} from './FoodList.jsx';
import {parkForDay} from './park-data.js';
import {THANK_YOU_FROM,THANK_YOU_TO} from './trip-features.js';
import {MeetingCard,QuickCapture,GlobalSearch,Diary} from './PracticalPages.jsx';
import MediaGallery from './MediaGallery.jsx';
import Planning from './Planning.jsx';
import Nearby from './Nearby.jsx';
import TodoList,{DayTodos} from './TodoList.jsx';
import Spending from './Spending.jsx';
import Sumo from './Sumo.jsx';
import StepReview from './StepReview.jsx';
import WeatherPage from './WeatherPage.jsx';
import {useForecastCheck} from './Weather.jsx';
import DayTimeline from './DayTimeline.jsx';
import VoiceNotes from './VoiceNotes.jsx';
import Games from './Games.jsx';
import Weather,{MorningNeeds} from './Weather.jsx';
import DocumentReader from './DocumentReader.jsx';
import EmailInbox from './EmailInbox.jsx';
import PhotoDay from './PhotoDay.jsx';
import MascotMaker from './MascotMaker.jsx';
import {MascotBadge} from './Mascot.jsx';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {upload} from '@vercel/blob/client';
import {ArrowLeft,ArrowRight,Check,ChevronDown,ChevronRight,Clock,Compass,MapPin,CalendarDays,BookOpen,House,LifeBuoy,Plus,LockKeyhole,LockKeyholeOpen,Ticket,ExternalLink,Navigation,Share2,Users,Download,WifiOff,X,SkipForward,RotateCcw,Play,Search,FileText,Trash2,Bell,Languages,Copy,CheckCircle2,AlertCircle,Cloud,MoreHorizontal,GripVertical,ArrowUp,ArrowDown,Inbox,Archive,ArchiveRestore,Trophy,ShoppingBag,Heart,Phone,MessageCircle,Eye,RefreshCw,FerrisWheel,Mic,ThumbsUp,ListChecks,Image as ImageIcon} from 'lucide-react';
import {activeSteps,japanDate,japanClock,minutes,asClock,scheduleProposal,calendarEvent} from './timing.js';
import {todoProgress,inboxWaiting,SUMO_DAY,sumo as sumoState,ticketList,isArchived,attachmentsOf} from './trip-features.js';
import {armPlayback} from './speech.js';
import {PhraseAudio} from './PhraseAudio.jsx';
import {typesText} from './swipe.js';
import './style.css';
import './guide-theme.css';

const API='/api/';
const APPS={maps:['Google Maps','https://maps.google.com/'],translate:['Google Translate','https://translate.google.com/?sl=en&tl=ja&op=translate'],qantas:['Qantas','https://www.qantas.com/au/en/qantas-app.html'],disney:['Tokyo Disney Resort','https://www.tokyodisneyresort.jp/en/tdr/app.html'],usj:['Universal Studios Japan','https://www.usj.co.jp/web/en/us/service-guide/theme-park-services/official-app'],japan:['Visit Japan Web','https://www.vjw.digital.go.jp/']};
const fmtDay=(d,opts={weekday:'short',day:'numeric',month:'short'})=>new Intl.DateTimeFormat('en-AU',{...opts,timeZone:'Asia/Tokyo'}).format(new Date(d+'T12:00:00+09:00'));
const isMapLink=place=>{try{const u=new URL(place);return u.protocol==='https:'&&(['maps.app.goo.gl','maps.google.com'].includes(u.hostname)||(u.hostname==='www.google.com'&&u.pathname.startsWith('/maps')));}catch{return false;}};
const directions=(place,mode='transit')=>isMapLink(place)?place:'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(place)+'&travelmode='+mode;
const maps=place=>isMapLink(place)?place:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(place);
const stored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
async function request(path,data){const r=await fetch(API+path,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});let b;try{b=await r.json();}catch{throw new Error('The connection was interrupted. Please try again.');}if(!r.ok){const e=new Error(b.error||'Please try again.');e.status=r.status;throw e;}return b;}
function Link({href,children,...props}){return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;}
function Button({icon:Icon,children,...props}){return <button {...props}>{Icon&&<Icon size={18}/>} {children}</button>;}
function Dialog({title,children,onClose,wide=false}){const ref=useRef();useEffect(()=>{const d=ref.current;d.showModal();return()=>d.close();},[]);return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}} className={wide?'wide':''}><header><h2>{title}</h2><button className="icon" aria-label="Close" onClick={onClose}><X/></button></header><div className="dialog-body">{children}</div></dialog>;}
async function copyOrShare(url,title,share=false){if(share&&navigator.share){await navigator.share({title,url});return;}await navigator.clipboard.writeText(url);}
const TABS=[...Object.keys(PAGES),'more'];
// What a phone can do with no signal and hand over later. Everything here either records
// something that happened or adds something new, so it is still right whenever it lands.
// What is missing is deliberate: anything that reshapes the plan needs the latest revision
// to be safe, a stale exchange rate or forecast overwriting a fresh one is worse than not
// saving it, and a janken hand thrown into a queue is not a game, it is a message.
const OFFLINE_OPS=['status','challengeStatus','challengeSkip','eyeSpy','parkRide','foodTried','foodRating','phraseSeen','factSeen','gameScore',
 'journal','shoppingAdd','shoppingStatus','acknowledge','thankYouSeen','phraseAdd','foodAdd','documentNote','voiceNoteLabel','voiceNoteRemove',
 'proposalAdd','proposalVote','proposalMust','todoAdd','todoStatus','spendAdd','spendBought','spendRequest','sumoResult','sumoPredict','stepRating','stepThought','mascotSave','mascotRemove'];
function App(){
 const [envelope,setEnvelope]=useState(null),[config,setConfig]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[toast,setToast]=useState('');
 const [tab,setTab]=useState(TABS.includes(new URLSearchParams(location.search).get('tab'))?new URLSearchParams(location.search).get('tab'):'today'),[day,setDay]=useState(new URLSearchParams(location.search).get('day')||stored('japan.position',{}).day||japanDate()),[selected,setSelected]=useState(new URLSearchParams(location.search).get('step')||stored('japan.position',{}).step||null);
 const [focus,setFocus]=useState(new URLSearchParams(location.search).get('item')||null);
 const [updateReady,setUpdateReady]=useState(false),[modal,setModal]=useState(null),[busy,setBusy]=useState(false),[online,setOnline]=useState(navigator.onLine),[now,setNow]=useState(new Date()),[queue,setQueue]=useState(stored('japan.queue',[])),[conflict,setConflict]=useState(false);
 const [guidePage,setGuidePage]=useState(Number(new URLSearchParams(location.search).get('page'))||1),[guideIndex,setGuideIndex]=useState([]),[query,setQuery]=useState(''),[saved,setSaved]=useState(stored('japan.saved',[])),[clockShortcut,setClockShortcut]=useState(localStorage.getItem('japan.shortcut')||'');
 const state=envelope?.state,user=envelope?.user,parent=user?.role==='parent';
 const directions=(place,mode='transit')=>{const target=destinationFor(state||{},place);return isMapLink(target)?target:'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(target)+'&travelmode='+mode;};
 const maps=place=>{const target=destinationFor(state||{},place);return isMapLink(target)?target:'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(target);};
 const envRef=useRef(envelope),queueRef=useRef(queue),working=useRef(false),touch=useRef(null),noteShown=useRef(''),phraseSeen=useRef(''),factShown=useRef(''),landed=useRef(false);
 envRef.current=envelope;queueRef.current=queue;
 function notice(s){setToast(s);}
 function accept(e){e={...e,state:ensureFeatures(e.state)};envRef.current=e;setEnvelope(e);localStorage.setItem('japan.snapshot',JSON.stringify({...e,savedAt:Date.now()}));}
 function saveQueue(q){queueRef.current=q;setQueue(q);localStorage.setItem('japan.queue',JSON.stringify(q));}
 function updateUrl(d,id,page){if(d)localStorage.setItem('japan.position',JSON.stringify({day:d,step:id||null}));const p=new URLSearchParams();if(d)p.set('day',d);if(id)p.set('step',id);if(page)p.set('page',page);history.replaceState(null,'','/?'+p);}
 async function refresh(){try{const e=await request('state');accept(e);setOnline(navigator.onLine);setError('');return e;}catch(e){if(e.status===401){localStorage.removeItem('japan.snapshot');setEnvelope(null);setError(e.message);}throw e;}}
 useEffect(()=>{
  let stop=false;
  (async()=>{try{
   const cfg=await request('config');if(stop)return;setConfig(cfg);
   const fragment=new URLSearchParams(location.hash.slice(1)),join=fragment.get('join');
   if(join){history.replaceState(null,'',location.pathname+location.search);await request('join',{token:join});}
   const e=await request('state');if(stop)return;accept(e);
   if(!e.state.days.some(d=>d.date===day)){setDay(e.state.days[0].date);setSelected(null);}
   if(new URLSearchParams(location.search).has('page'))setTab('guide');
  }catch(e){const cache=stored('japan.snapshot',null);if(!e.status&&cache&&Date.now()-cache.savedAt<45*86400000){setEnvelope({...cache,state:ensureFeatures(cache.state)});setOnline(false);if(!cache.state.days.some(d=>d.date===day))setDay(cache.state.days[0].date);}else setError(e.message);}finally{if(!stop)setLoading(false);}})();
  const on=()=>setOnline(true),off=()=>setOnline(false);window.addEventListener('online',on);window.addEventListener('offline',off);
  if('serviceWorker'in navigator&&!import.meta.env.DEV)navigator.serviceWorker.register('/sw.js').then(reg=>{
   // A Home Screen app can sit on an old build for days. Watch for a new one and offer a reload.
   const watch=worker=>worker&&worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)setUpdateReady(true);});
   watch(reg.waiting);reg.addEventListener('updatefound',()=>watch(reg.installing));
   const look=()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{});};
   document.addEventListener('visibilitychange',look);look();
  }).catch(()=>{});
  return()=>{stop=true;window.removeEventListener('online',on);window.removeEventListener('offline',off);};
 },[]);
 useEffect(()=>{const i=setInterval(()=>setNow(new Date()),30000);return()=>clearInterval(i);},[]);
 // Tell iOS once, at the start, that anything this page plays is media rather than a
 // notification noise. Safari starts every page in the category the silent switch mutes, and
 // the type has to be set early and then left alone.
 // iOS ignores an audio session claimed before anyone has touched the page, so the claim
 // waits for the first touch rather than being spent at load — and the silent loop that
 // holds the session is unlocked inside that same gesture.
 useEffect(()=>{armPlayback();},[]);
 useEffect(()=>{
  if(tab!=='guide')return;
  const onKey=e=>{
   if(typesText(e.target))return;
   if(e.key==='ArrowLeft')turnPage(-1);else if(e.key==='ArrowRight')turnPage(1);
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 });
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),6000);return()=>clearTimeout(t);},[toast]);
 async function flush(force=false){
  if(working.current||!queueRef.current.length||!navigator.onLine)return;
  working.current=true;
  try{let e=await request('state');
   if(!force&&e.revision!==queueRef.current[0].revision){accept(e);setConflict(true);return;}
   const dropped=[];
   while(queueRef.current.length){
    const q=queueRef.current[0];
    try{e=await request('mutate',{revision:e.revision,operation:q.operation});accept(e);saveQueue(queueRef.current.slice(1));}
    catch(err){
     // A change the server will never accept — the activity was deleted while we were out of
     // signal, say — must not sit at the head of the queue blocking everything behind it.
     if(!err.status||err.status===409||err.status>=500)throw err;
     dropped.push(err.message||'One update could not be saved.');saveQueue(queueRef.current.slice(1));
    }
   }
   setConflict(false);
   notice(dropped.length?`Synced, except ${dropped.length} update${dropped.length>1?'s':''} the family plan had moved past: ${dropped[0]}`:'Your updates are synced with the family.');
  }catch(e){if(e.status===409)setConflict(true);notice(e.message);}finally{working.current=false;}
 }
 useEffect(()=>{if(!envelope||!online)return;flush();const t=setInterval(()=>{if(!working.current&&!queueRef.current.length)refresh().catch(()=>{});},15000);return()=>clearInterval(t);},[!!envelope,online]);
 async function mutate(operation){
  if(working.current){notice('Finishing the previous change. Try again in a moment.');return false;}
  operation={...operation,operationId:crypto.randomUUID()};
  const rev=envRef.current.revision;
  if(!navigator.onLine||queueRef.current.length){
   if(!OFFLINE_OPS.includes(operation.type)){notice('Reconnect and sync pending updates before editing the plan.');return false;}
   const at=operation.at||new Date().toISOString();operation.at=at;
   saveQueue([...queueRef.current,{revision:rev,operation}]);
   notice('Progress saved on this phone. It will sync when connected.');return true;
  }
  working.current=true;setBusy(true);
  try{const result=await request('mutate',{revision:rev,operation});accept(result);return result;}
  catch(e){if(e.status===409){await refresh().catch(()=>{});notice('Someone changed the trip. The latest plan is loaded; review and try your change again.');}else if(!e.status&&OFFLINE_OPS.includes(operation.type)){
    operation.at=operation.at||new Date().toISOString();saveQueue([...queueRef.current,{revision:rev,operation}]);notice('Progress saved on this phone; waiting to sync.');
   }else notice(e.message);return false;
  }finally{working.current=false;setBusy(false);}
 }
 const visibleState=state?pendingProgress(state,queue):null;
 const [photoPerson,setPhotoPerson]=useState(()=>new URLSearchParams(location.search).get('who')||'');
 // What this person has asked not to be shown, kept on their own phone and read under their
 // own name, because two people sharing a phone do not share an opinion about a pop-up.
 //
 // Read while rendering rather than in an effect. The bug that costs: the person arrives with
 // the trip, a moment after the first render, and an effect that goes and fetches their
 // settings afterwards runs in the same commit as the pop-up's own effect — so the phrase
 // opens on the defaults and the person who switched it off last night sees it anyway.
 const [settingsAt,bumpSettings]=useState(0);
 const settings=useMemo(()=>readSettings(user?.name),[user?.name,settingsAt]);
 const changeSetting=(id,value)=>{writeSetting(user?.name,id,value);bumpSettings(n=>n+1);};
 const forecast=useForecastCheck({state:visibleState||{days:[]},day:null,mutate,notice});
 const today=state?.days.find(d=>d.date===day),steps=visibleState?activeSteps(visibleState,day):[],current=steps.find(s=>s.id===selected)||steps.find(s=>!['done','skipped'].includes(s.status))||steps.at(-1),index=steps.findIndex(s=>s.id===current?.id);
 const done=steps.filter(s=>s.status==='done').length,nextFixed=steps.find(s=>s.locked&&!['done','skipped'].includes(s.status)&&s.id!==current?.id),groups=state?[...new Set(state.steps.filter(s=>s.day===day&&s.group).map(s=>s.group))]:[];
 function go(id,d,item){setFocus(item||null);if(d&&state.days.some(x=>x.date===d)){setDay(d);setSelected(null);}setTab(id);setQuery('');setModal(null);history.replaceState(null,'','/?'+new URLSearchParams({tab:id,day:d||day,...(item?{item}:{})}));}
 function selectDay(d){setDay(d);setSelected(null);setTab('today');updateUrl(d);}
 function selectStep(s){if(s.day===null){setTab('options');setQuery(s.title);setModal(null);return;}setModal(null);setDay(s.day);setSelected(s.id);setTab('today');updateUrl(s.day,s.id);}
 function move(delta){const s=steps[index+delta];if(s){setSelected(s.id);updateUrl(day,s.id);}}
 function openPage(n){setGuidePage(n);setTab('guide');setModal(null);updateUrl(day,null,n);}
 // Seventy-two pages is a lot of arrow-tapping, so the guide turns like a book: swipe it, or
 // use the arrow keys. Clamped at both ends rather than wrapping, because page 1 coming after
 // page 72 is disorienting when you are looking for something.
 function selectPhotoDay(d){setDay(d);history.replaceState(null,'','/?'+new URLSearchParams({tab:'photos',day:d}));}
 // Whose photos you are looking at lives in the address, so a profile can link straight to
 // somebody's and the back button does what it looks like it does.
 function choosePhotoPerson(name){
  setPhotoPerson(name);
  history.replaceState(null,'','/?'+new URLSearchParams(name?{tab:'photos',who:name}:{tab:'photos',day}));
 }
 function turnPage(delta){
  const n=Math.min(72,Math.max(1,guidePage+delta));
  if(n===guidePage)return;
  setGuidePage(n);updateUrl(day,null,n);
 }
 async function saveOffline(url,key){if(!('caches'in window)){notice('Offline saving is unavailable in this browser.');return;}try{const r=await fetch(url);if(!r.ok)throw new Error('Could not download.');const c=await caches.open('japan-private-v1');await c.put(url,r);const next=[...new Set([...saved,key])];setSaved(next);localStorage.setItem('japan.saved',JSON.stringify(next));notice('Downloaded on this phone.');}catch{notice('Download failed. Try again while connected.');}}
 async function shareStep(s){try{await copyOrShare(`${location.origin}/?day=${s.day}&step=${s.id}`,s.title,true);}catch(e){if(e.name!=='AbortError')notice('Use your browser’s Share button to send this page.');}}
 useEffect(()=>{
  if(!state)return;const ctx=document.modelContext;if(!ctx?.registerTool)return;const lifecycle=new AbortController();
  Promise.resolve(ctx.registerTool({name:'read_trip_day',description:'Read the selected Japan itinerary day. No changes.',inputSchema:{type:'object',properties:{date:{type:'string'}},required:['date'],additionalProperties:false},annotations:{readOnlyHint:true},execute({date}){const s=envRef.current.state;if(!s.days.some(d=>d.date===date))throw new Error('Unknown trip day');return activeSteps(s,date).map(({id,title,time,status})=>({id,title,time,status}));}},{signal:lifecycle.signal})).catch(()=>{});
  return()=>lifecycle.abort();
 },[!!state]);
 // Lauren’s private daily note. The server only ever sends her the note for the current
 // Japan day; Damien keeps the list, and nobody else receives any of it.
 const noteForMe=user?.name===THANK_YOU_TO?state?.thankYou?.today||null:null;
 const noteRead=!!noteForMe&&(!!state.thankYou.seen?.[noteForMe.day]||localStorage.getItem(`japan.note.${noteForMe.day}`)==='read');
 useEffect(()=>{
  if(!noteForMe||noteRead||noteShown.current===noteForMe.day)return;
  noteShown.current=noteForMe.day;setModal({type:'thankyou',note:noteForMe});
 },[noteForMe?.day,noteForMe?.id,noteRead]);
 useEffect(()=>{if(tab==='thanks'&&user&&user.name!==THANK_YOU_FROM)setTab('today');},[tab,user?.name]);
 useEffect(()=>{if(tab==='inbox'&&user&&!parent)setTab('today');},[tab,user?.role]);
 // Nate and Boston open straight onto their own missions, unless a link names a screen.
 useEffect(()=>{
  if(!user||landed.current)return;landed.current=true;
  const link=new URLSearchParams(location.search);
  if(user.role==='child'&&!link.get('tab')&&!link.get('step')&&!link.get('page'))setTab('challenges');
 },[user?.name]);
 // Whether today is a day of the trip at all. The daily pop-ups hang off this: the phrase
 // first, then the fun fact, each once per person per day, and Lauren's private note ahead of
 // both — so they queue rather than stacking up on the same screen.
 const todayJapan=japanDate(now);
 const dayOnTrip=state?.days.some(d=>d.date===todayJapan)?todayJapan:null;
 const todaysPhrase=dayOnTrip?phraseForDay(state.days,dayOnTrip):null;
 // Turned off under Settings counts as done with it: the pop-up never opens, and the fun
 // fact behind it stops waiting on a phrase that is never coming.
 const phraseDone=!settingOn(settings,'dailyPhrase')||!todaysPhrase||!!phraseSeenBy(state,dayOnTrip)[user?.name]||localStorage.getItem(`japan.phrase.${dayOnTrip}`)==='seen';
 useEffect(()=>{
  // It waits for a clear screen, so it lands after her note is closed rather than on top of it.
  if(!todaysPhrase||phraseDone||modal||phraseSeen.current===dayOnTrip)return;
  if(noteForMe&&!noteRead)return;
  phraseSeen.current=dayOnTrip;setModal({type:'phrase',phrase:todaysPhrase,day:dayOnTrip});
 },[todaysPhrase?.id,phraseDone,noteForMe?.day,noteRead,modal]);
 async function seePhrase(day,phraseIds=[]){
  localStorage.setItem(`japan.phrase.${day}`,'seen');
  await mutate({type:'phraseSeen',day,person:user.name,phraseIds});
  setModal(null);
 }
 // Today's fun fact, once per person per day, about what that day actually holds. It queues
 // behind Lauren's note and the phrase rather than stacking on top of either, so a morning
 // never opens onto three pop-ups at once.
 const todaysFact=dayOnTrip?factForDay(state.days,dayOnTrip):null;
 const factDone=!settingOn(settings,'dailyFact')||!todaysFact||!!factSeenBy(state,dayOnTrip)[user?.name]||localStorage.getItem(`japan.fact.${dayOnTrip}`)==='seen';
 useEffect(()=>{
  if(!todaysFact||factDone||modal||factShown.current===dayOnTrip)return;
  if(noteForMe&&!noteRead)return;
  if(todaysPhrase&&!phraseDone)return;
  factShown.current=dayOnTrip;setModal({type:'fact',day:dayOnTrip});
 },[todaysFact?.id,factDone,todaysPhrase?.id,phraseDone,noteForMe?.day,noteRead,modal]);
 async function seeFact(day,factIds=[]){
  localStorage.setItem(`japan.fact.${day}`,'seen');
  await mutate({type:'factSeen',day,person:user.name,factIds});
  setModal(null);
 }
 async function readNote(note){
  localStorage.setItem(`japan.note.${note.day}`,'read');
  if(navigator.onLine&&!state.thankYou.seen?.[note.day])await mutate({type:'thankYouSeen',day:note.day});
  setModal(null);
 }
 if(loading)return <main className="entry"><div className="brand-mark">日</div><h1>Japan 2026</h1><p>Opening your family trip…</p></main>;
 if(!state)return <main className="entry"><img className="entry-photo" src="/cover.jpg" alt="Pasfield family Japan Travel Guide 2026 cover"/><div className="brand-mark">日</div><p className="eyebrow">THE PASFIELD FAMILY</p><h1>Japan, together.</h1><p>Open your private family link to join the trip. No email or password needed.</p>{error&&<p className="callout">{error}</p>}<p>The private parent link is prepared when the app is deployed. No setup key is required.</p></main>;
 // One place decides what a phrase sounds like, so every SayIt on every screen offers the
 // family's own recording where there is one without being handed props down five levels.
 return <PhraseAudio.Provider value={{clips:visibleState?.phraseAudio||{},user,request,accept,notice,config,busy}}>
  <div className="app">
  <header className="topbar"><a className="brand" href="/" onClick={e=>{e.preventDefault();setTab('today');}}><span className="brand-mark" aria-hidden="true">✿</span><span>Japan <b>2026</b><small>THE PASFIELD FAMILY</small></span></a><div className="top-actions">{noteForMe&&<button className="icon thank-you-button" aria-label={`A note from ${THANK_YOU_FROM}`} onClick={()=>setModal({type:'thankyou',note:noteForMe})}><Heart size={20}/>{!noteRead&&<i/>}</button>}<button className="icon" aria-label="Search everything" onClick={()=>go('search')}><Search size={20}/></button><button className="icon notification-button" aria-label="Family updates" onClick={()=>go('updates')}><Bell size={20}/>{state.alerts.some(a=>!a.seenBy?.[user.name])&&<i/>}</button><span className="local-clock"><Clock size={14}/>{japanClock(now)}<small>JAPAN</small></span><button className="avatar" aria-label="Family settings" onClick={()=>setModal({type:'family'})}><MascotBadge state={state} person={user.name} size={38}/></button></div></header>
  <div className="syncbar">{!online?<><WifiOff size={14}/> Offline · saved on this phone</>:user.demo?<><AlertCircle size={14}/> Local preview · family sharing needs setup</>:queue.length?<><Clock size={14}/>{queue.length} update{queue.length!==1?'s':''} waiting to sync</>:<><Cloud size={14}/> Shared family plan <span>Signed in as {user.name}</span></>}</div>
  {conflict&&<div className="conflict"><strong>The family changed the plan while you were offline.</strong><p>Your {queue.length} progress update(s) are still saved. Review them against the latest itinerary.</p><div className="row"><Button onClick={()=>setModal({type:'pending'})}>Review updates</Button><Button onClick={()=>{saveQueue([]);setConflict(false);}}>Discard my pending updates</Button></div></div>}
  <main>
  {/* One of these on every page, first thing, for the five-year-old holding the phone. It says
      what this screen is for in words he can follow rather than reading the heading at him. */}
  <SpeakRules id={`page-${tab}`} text={pageRule(tab)} label="What is this page?"/>
  {tab==='today'&&<>
   <div className="day-heading"><div><p className="eyebrow">{today?.city} / {fmtDay(day)}</p><h1>{today?.title}</h1></div><button className="icon" aria-label="Choose day" onClick={()=>setTab('days')}><CalendarDays/></button></div>
   <div className="date-strip" aria-label="Trip days">{state.days.map(d=><button key={d.date} className={day===d.date?'selected':''} onClick={()=>selectDay(d.date)}><span>{fmtDay(d.date,{weekday:'short'})}</span><strong>{d.date.slice(-2)}</strong>{d.date===japanDate()&&<i aria-label="Today"/>}</button>)}</div>
   {!!today?.pages?.length&&<section className="day-guide" aria-label="Original guide pages for this day"><div className="section-heading"><div><p className="eyebrow">YOUR ORIGINAL TRAVEL GUIDE</p><h2>This day in the guide</h2></div><Button icon={BookOpen} onClick={()=>openPage(today.pages[0])}>Read guide</Button></div><p>Swipe through the pages · tap any page to read it in full.</p><div className="day-guide-pages" key={day}>{today.pages.map(p=><button key={p} className="day-guide-page" onClick={()=>openPage(p)} aria-label={`Read original guide page ${p}`}><img src={`/api/guide?page=${p}`} alt={`Original travel guide page ${p}`} loading="lazy"/><span>Page {p}<ChevronRight size={16}/></span></button>)}</div></section>}
   <MorningNeeds state={visibleState} day={day} clock={japanClock(now)} today={japanDate(now)}/>
   <Weather state={visibleState} day={day} mutate={mutate} busy={busy} online={online} notice={notice} dayLabel={fmtDay} go={go}/>
   <NextUp state={visibleState} day={day} now={now} selectStep={selectStep} open={setModal} go={go} parent={parent}/>
   <div className="day-tools"><span><CheckCircle2 size={16}/>{done} of {steps.length} completed</span><div><Button icon={ImageIcon} onClick={()=>setModal({type:'media',day})}>Photos</Button><Button icon={Mic} onClick={()=>setModal({type:'voice',day})}>Voice</Button><Button icon={Ticket} onClick={()=>setModal({type:'tickets'})}>Tickets</Button>{config?.nearby&&<Button icon={Compass} onClick={()=>setModal({type:'nearby'})}>Near here</Button>}{parent&&<Button icon={Plus} onClick={()=>setModal({type:'edit',step:null})}>Add</Button>}</div></div>
   <DayTodos state={visibleState} user={user} day={day} mutate={mutate} busy={busy} go={go}/>
   {groups.length>0&&<div className="option-bar">{groups.map(g=><label key={g}>Choose a plan<select disabled={!parent||busy} value={state.choices[g]||''} onChange={e=>mutate({type:'choose',group:g,option:e.target.value})}>{[...new Set(state.steps.filter(s=>s.group===g).map(s=>s.option))].map(o=><option key={o}>{o}</option>)}</select></label>)}</div>}
   <div className="today-layout"><section className="step-area">
   {current?<article className={`step-card ${current.status==='done'?'complete':''}`} onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{if(!touch.current||['BUTTON','A','INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(dx)>65&&Math.abs(dy)<50)move(dx<0?1:-1);touch.current=null;}}>
    <div className="card-top"><span className="eyebrow">STEP {index+1} / {steps.length}</span><div className="row"><span className={`tag ${current.kind}`}>{current.locked?'Fixed time':current.kind==='optional'?'Optional':current.review?'Check details':'Flexible'}</span>{parent&&<button className="icon" aria-label={current.locked?'Unlock time':'Lock time'} onClick={()=>mutate({type:'lock',id:current.id,locked:!current.locked})}>{current.locked?<LockKeyhole size={19}/>:<LockKeyholeOpen size={19}/>}</button>}</div></div>
    <div className="time-display">{current.time||'Any time'}{current.time&&<span>JST</span>}</div>
    <h2>{current.title}</h2>
    {current.place&&<p className="place-line"><MapPin size={17}/>{current.place}</p>}{resolveLocation(state,current)&&<small className="matched-address">{resolveLocation(state,current).address}</small>}
    {phoneLinks(current.phone)&&<ContactRow phone={phoneLinks(current.phone)} title={current.title}/>}
    {current.notes&&<p className="step-notes">{current.notes}</p>}
    {current.review&&<p className="callout"><AlertCircle size={18}/> Check the booking or original guide before relying on this step.</p>}
    <div className="timing-details">{current.originalTime&&current.originalTime!==current.time&&<span>Original target {current.originalTime}</span>}{current.bookingTime&&<span><Ticket size={14}/> Booking {current.bookingTime}</span>}{current.bookingReference&&<span>Ref: {current.bookingReference}</span>}{current.startedAt&&<span>Started {japanClock(new Date(current.startedAt))}</span>}{current.completedAt&&<span className="done-note">Completed {japanClock(new Date(current.completedAt))}{current.time&&` · ${Math.round((new Date(current.completedAt)-new Date(current.day+'T'+current.time+':00+09:00'))/60000)} min vs start target`}</span>}</div>
    <div className="participants">{current.participants.map(p=><span key={p} className="person">{p}</span>)}{current.pending&&<span className="tag">Waiting to sync</span>}</div>
    <div className="primary-actions"><Link className="button primary" href={directions(current.place?current:today.hotel)}><Navigation size={18}/>Directions</Link><Button icon={Languages} onClick={()=>setModal({type:'show',step:current})}>Show someone</Button></div>
    <Link className="button website-link" href={current.website||`https://www.google.com/search?q=${encodeURIComponent((current.place||current.title)+' official website Japan')}`}><ExternalLink size={16}/>{current.website?'Website / booking page':'Find website'}</Link>
    <div className="card-links"><button onClick={()=>setModal({type:'media',step:current})}><ImageIcon size={16}/>Photos / videos</button><button onClick={()=>setModal({type:'voice',step:current})}><Mic size={16}/>Voice note</button><button onClick={()=>openPage(current.page)}><BookOpen size={16}/>Guide p.{current.page}</button><button onClick={()=>setModal({type:'tickets',step:current})}><Ticket size={16}/>Tickets{state.documents.filter(d=>d.stepId===current.id&&!isArchived(d)).length?` (${state.documents.filter(d=>d.stepId===current.id&&!isArchived(d)).length})`:''}</button><button onClick={()=>setModal({type:'alarm',step:current})}><Bell size={16}/>Remind me</button>{config?.nearby&&<button onClick={()=>setModal({type:'nearby',step:current})}><Compass size={16}/>Food & amenities near here</button>}<button aria-label="Share this step" onClick={()=>shareStep(current)}><Share2 size={16}/></button></div>
    {parkForDay(day)&&<button className="eyespy-invite" onClick={()=>setModal({type:'park',park:parkForDay(day)})}><span className="eyespy-invite-icon" aria-hidden="true">🎢</span><span>Ride checklist and park map<strong>{parkForDay(day).name}</strong></span><ChevronRight size={18}/></button>}
    {day===SUMO_DAY&&<button className="eyespy-invite" onClick={()=>setModal({type:'sumo'})}><span className="eyespy-invite-icon" aria-hidden="true">🥋</span><span>Today's sumo card<strong>{sumoState(state).bouts.length?`${sumoState(state).bouts.length} bouts, times and match-ups`:'Match-ups, times and who is who'}</strong></span><ChevronRight size={18}/></button>}
    {isTrainLeg(current)&&<button className="eyespy-invite" onClick={()=>setModal({type:'eyespy',step:current})}><span className="eyespy-invite-icon" aria-hidden="true">🗻</span><span>Window I spy<strong>{EYE_SPY.length} things to spot from the train</strong></span><ChevronRight size={18}/></button>}
    <div className="completion-actions">{current.status==='done'?<Button className="done-button" icon={RotateCcw} disabled={busy} onClick={()=>mutate({type:'status',id:current.id,status:'todo'})}>Completed · Undo</Button>:<><Button icon={Play} disabled={busy||(!parent&&!current.participants.includes(user.name))} onClick={()=>mutate({type:'status',id:current.id,status:'started'})}>{current.status==='started'?'Started':'Started / arrived'}</Button><Button className="done-button" icon={Check} disabled={busy||(!parent&&!current.participants.includes(user.name))} onClick={async()=>{const done=current.id,used=ticketList(state,{step:current,all:false}).length;if(await mutate({type:'status',id:done,status:'done'})){
     // Stay on the thing that was just finished, which is what the message has always promised
     // and is the moment anybody has an opinion about it worth recording.
     // Say what else the tick did, because a booking quietly leaving the list is the kind of
     // thing that is alarming to notice later and reassuring to be told now.
     setSelected(done);updateUrl(day,done);notice(`Completed.${used?` ${used} ticket${used===1?'':'s'} marked used — undo brings ${used===1?'it':'them'} back.`:''} Rate it below, or swipe when you’re ready for the next step.`);}}}>Done</Button></>}{parent&&<button className="icon" aria-label="Edit or skip activity" onClick={()=>setModal({type:'edit',step:current})}><MoreHorizontal/></button>}</div>
    <StepReview state={visibleState} user={user} step={current} mutate={mutate} busy={busy}/>
    {current.status==='skipped'&&<p className="callout">Skipped · <button onClick={()=>mutate({type:'status',id:current.id,status:'todo'})}>Restore step</button></p>}
   </article>:<div className="empty"><h2>A little room for discovery.</h2><p>Add your first stop for this day.</p></div>}
   <div className="swipe-controls"><Button icon={ArrowLeft} disabled={index<=0} onClick={()=>move(-1)}>Previous</Button><span>Swipe to explore</span><Button disabled={index>=steps.length-1} onClick={()=>move(1)}>Next <ArrowRight size={18}/></Button></div>
   <div className="quick-links"><Link href={directions(today?.hotel)}><House size={18}/><span>Tonight’s hotel<strong>{today?.hotel}</strong></span><ExternalLink size={15}/></Link>{nextFixed&&<button onClick={()=>selectStep(nextFixed)}><LockKeyhole size={18}/><span>Next fixed time<strong>{nextFixed.time} · {nextFixed.title}</strong></span><ChevronRight size={18}/></button>}</div>
   <div className="row wrap">{parent&&<Button icon={Clock} onClick={()=>setModal({type:'reschedule'})}>Adjust the day</Button>}<Button icon={Compass} onClick={()=>setModal({type:'tired'})}>We’re tired</Button><Button icon={ExternalLink} onClick={()=>setModal({type:'apps'})}>Useful apps</Button></div>
   </section><DayTimeline steps={steps} current={current} today={today} parent={parent} busy={busy} selectStep={selectStep} mutate={mutate}/></div>
  </>}
  {tab==='challenges'&&<Challenges key={day+(focus||'')} initialId={focus} state={visibleState} user={user} day={day} mutate={mutate} busy={busy}/>}
  {tab==='shopping'&&<Shopping key={focus||'shopping'} initialId={focus} state={state} user={user} day={day} mutate={mutate} busy={busy}/>}
  {tab==='meeting'&&<MeetingCard key={day} state={state} user={user} day={day} mutate={mutate} busy={busy}/>}
  {tab==='updates'&&<Updates state={state} user={user} mutate={mutate} busy={busy}/>}
  {tab==='photos'&&<><p className="eyebrow">THROUGH THEIR EYES</p><h1>Photos</h1>{!photoPerson&&<div className="form-row"><label>Day<select value={day} onChange={e=>selectPhotoDay(e.target.value)}>{state.days.map(d=><option key={d.date} value={d.date}>{fmtDay(d.date)} · {d.title}</option>)}</select></label></div>}<PhotoDay state={visibleState} user={user} day={day} config={config} busy={busy} setBusy={setBusy} request={request} accept={accept} mutate={mutate} notice={notice} dayLabel={fmtDay} person={photoPerson} setPerson={choosePhotoPerson}/></>}
  {tab==='mascot'&&<MascotMaker state={visibleState} user={user} mutate={mutate} busy={busy} notice={notice} go={go}/>}
  {tab==='games'&&<Games state={visibleState} user={user} day={day} mutate={mutate} busy={busy} setBusy={setBusy} online={online} refresh={refresh} dayLabel={fmtDay} config={config} request={request} accept={accept} notice={notice}/>}
  {tab==='facts'&&<><p className="eyebrow">SOMETHING WORTH KNOWING EVERY DAY</p><h1>Fun facts</h1><p>A fact a day about what is actually coming up, taken out of the guide. Swipe for more whenever you want another.</p><FunFacts state={visibleState} user={user} day={japanDate(now)} mutate={mutate} busy={busy} openPage={openPage}/></>}
  {tab==='phrases'&&<><p className="eyebrow">A LITTLE JAPANESE GOES A LONG WAY</p><h1>Phrases</h1><Phrasebook state={visibleState} user={user} day={japanDate(now)} mutate={mutate} busy={busy} request={request} notice={notice} config={config}/></>}
  {tab==='money'&&<><p className="eyebrow">WHAT DOES THAT COST?</p><h1>Yen converter</h1><Currency state={visibleState} user={user} mutate={mutate} busy={busy} notice={notice}/></>}
  {tab==='food'&&<><p className="eyebrow">EATING OUR WAY THROUGH JAPAN</p><h1>Food we want to try</h1><FoodList state={visibleState} user={user} mutate={mutate} busy={busy} setBusy={setBusy} notice={notice} show={setModal} request={request} config={config}/></>}
  {tab==='parks'&&<><p className="eyebrow">THREE BIG DAYS</p><h1>Theme park rides</h1><ParkGuide state={visibleState} user={user} park={parkForDay(day)} mutate={mutate} busy={busy} open={setModal}/></>}
  {tab==='thanks'&&user.name===THANK_YOU_FROM&&<ThankYouEditor state={state} mutate={mutate} busy={busy}/>}
  {tab==='settings'&&<Settings user={user} settings={settings} change={changeSetting}/>}
  {tab==='search'&&<GlobalSearch state={visibleState} request={request} selectStep={selectStep} open={setModal} go={go} openPage={openPage}/>}
  {tab==='weather'&&<WeatherPage key={day} state={visibleState} day={day} now={now} check={forecast.check} checking={forecast.checking} busy={busy} online={online}/>}
  {tab==='todo'&&<TodoList state={visibleState} user={user} mutate={mutate} busy={busy} go={go}/>}
  {tab==='spending'&&<Spending state={visibleState} user={user} mutate={mutate} busy={busy} go={go} notice={notice} today={japanDate(now)}/>}
  {tab==='inbox'&&parent&&<EmailInbox state={state} config={config} busy={busy} mutate={mutate} request={request} accept={accept} notice={notice} go={go}/>}
  {tab==='planning'&&<Planning key={focus||'planning'} initialId={focus} state={visibleState} user={user} day={day} mutate={mutate} busy={busy} selectStep={selectStep} go={go} request={request} config={config}/>}
  {tab==='diary'&&<Diary key={day} state={visibleState} user={user} day={day} mutate={mutate} busy={busy} open={setModal} notice={notice}/>}
  {tab==='more'&&<MorePage user={user} tab={tab} go={go}><div className="row wrap"><Button icon={ImageIcon} onClick={()=>setModal({type:'media'})}>Family gallery</Button><Button icon={Mic} onClick={()=>setModal({type:'voice'})}>Voice notes</Button><Button icon={Download} onClick={()=>setModal({type:'offline'})}>Offline readiness</Button>{parent&&<Button icon={Plus} onClick={()=>setModal({type:'capture'})}>Quick capture</Button>}</div></MorePage>}
  {tab==='tickets'&&<><p className="eyebrow">ALL THE DETAILS, TOGETHER</p><h1>Tickets & reservations</h1>{parent&&inboxWaiting(state)>0&&<p className="inbox-badge"><Inbox size={16}/>{inboxWaiting(state)} forwarded email{inboxWaiting(state)===1?'':'s'} waiting to be filed.<button onClick={()=>go('inbox')}>Open them</button></p>}{parent&&<DocumentReader config={config} busy={busy} setBusy={setBusy} request={request} notice={notice} mutate={mutate}/>}<Tickets state={state} user={user} config={config} busy={busy} setBusy={setBusy} accept={accept} mutate={mutate} notice={notice} saved={saved} saveOffline={saveOffline} selectStep={selectStep}/></>}
  {tab==='options'&&<><p className="eyebrow">NO DATE NEEDED</p><h1>Options & ideas</h1><p>Notes, places to try and anything we missed. Add an idea to a day when it fits.</p><div className="row wrap"><Button icon={ThumbsUp} onClick={()=>go('planning')}>Planning board · vote on ideas</Button></div>{parent&&<Button className="primary" icon={Plus} onClick={()=>setModal({type:'edit',step:null,backlog:true})}>Add an idea or note</Button>}<label className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search our ideas"/></label><div className="place-grid">{state.steps.filter(s=>s.day===null&&`${s.title} ${s.place} ${s.notes}`.toLowerCase().includes(query.toLowerCase())).map(s=><div className="option-card" key={s.id}><h2>{s.title}</h2>{s.backlogFrom?.day&&<small>Saved from {fmtDay(s.backlogFrom.day)}</small>}<p>{s.place}</p><p>{s.notes}</p>{phoneLinks(s.phone)&&<ContactRow phone={phoneLinks(s.phone)} title={s.title}/>}<div className="row wrap">{s.website&&<Link className="button" href={s.website}>Website</Link>}{s.place&&<Link className="button" href={maps(s.place)}>Maps</Link>}<Button icon={Ticket} onClick={()=>setModal({type:'tickets',step:s})}>Files</Button>{parent&&<><Button onClick={()=>setModal({type:'edit',step:s})}>Edit</Button><Button className="primary" onClick={()=>setModal({type:'schedule',step:s})}>Add to a day</Button></>}</div></div>)}</div>{!state.steps.some(s=>s.day===null)&&<div className="empty"><Inbox/><h2>A place for possibilities</h2><p>Add a café, a note or a saved stop here. No time or day required.</p></div>}</>}
  {tab==='days'&&<><p className="eyebrow">21 SEPTEMBER — 6 OCTOBER</p><h1>Our days in Japan</h1><Button icon={ImageIcon} onClick={()=>setModal({type:'media'})}>Family photo & video gallery</Button><div className="journey-cover"><img src="/cover.jpg" alt="Original first-page cover of the Pasfield family Japan Travel Guide 2026"/></div><div className="days-grid">{state.days.map((d,i)=>{const ss=activeSteps(visibleState,d.date);return <button className="day-tile" key={d.date} onClick={()=>selectDay(d.date)}><div><span className="eyebrow">DAY {i+1} · {fmtDay(d.date)}</span><span className="tag">{ss.filter(s=>s.status==='done').length}/{ss.length}</span></div>{todoProgress(visibleState,d.date).open>0&&<span className="tag todo-tag"><ListChecks size={12}/>{todoProgress(visibleState,d.date).open} to do</span>}<h2>{d.title}</h2><p><MapPin size={15}/>{d.city}</p><small>{d.hotel}</small><ChevronRight className="tile-arrow"/></button>;})}</div></>}
  {tab==='places'&&<><p className="eyebrow">FAVOURITES & FINDING OUR WAY</p><h1>Places to go</h1><div className="map-frame"><iframe src={state.mapEmbed} title="Our Japan Google My Map" loading="lazy" referrerPolicy="no-referrer" allowFullScreen/><p>Your saved Google map · internet and map access required. If the map does not load here, use Open our map below. Embedding requires public map sharing.</p></div><div className="row wrap"><Link className="button primary" href={state.mapUrl}><ExternalLink size={18}/>Open our map</Link><Button icon={Plus} disabled={!parent} onClick={()=>setModal({type:'edit',step:null})}>Add a stop</Button></div><LocationDirectory key={focus||'locations'} initialId={focus} state={state} parent={parent} mutate={mutate} busy={busy} day={day} selectStep={selectStep} openPage={openPage} notice={notice}/></>}
  {tab==='guide'&&<><p className="eyebrow">THE ORIGINAL 72-PAGE GUIDE</p><h1>Our travel guide</h1><div className="row wrap"><label>Jump to a day<select aria-label="Jump to guide pages for a day" value={state.days.find(d=>d.pages?.includes(guidePage))?.date||''} onChange={e=>{const d=state.days.find(d=>d.date===e.target.value);if(d?.pages?.length){setDay(d.date);setGuidePage(d.pages[0]);updateUrl(d.date,null,d.pages[0]);}}}><option value="" disabled>Choose a day</option>{state.days.filter(d=>d.pages?.length).map(d=><option key={d.date} value={d.date}>{fmtDay(d.date)} · {d.title}</option>)}</select></label><Button icon={CalendarDays} onClick={()=>selectDay(state.days.find(d=>d.pages?.includes(guidePage))?.date||day)}>Back to day</Button></div><div className="guide-controls"><Button icon={ArrowLeft} aria-label="Previous page" disabled={guidePage<=1} onClick={()=>turnPage(-1)}/><label>Page <select value={guidePage} onChange={e=>{setGuidePage(+e.target.value);updateUrl(day,null,+e.target.value);}}>{Array.from({length:72},(_,i)=><option key={i+1}>{i+1}</option>)}</select> of 72</label><Button icon={ArrowRight} aria-label="Next page" disabled={guidePage>=72} onClick={()=>turnPage(1)}/><Button icon={Download} onClick={()=>saveOffline(`/api/guide?page=${guidePage}`,`page-${guidePage}`)}>{saved.includes(`page-${guidePage}`)?'Saved':'Save page'}</Button><Button icon={Share2} onClick={()=>copyOrShare(`${location.origin}/?page=${guidePage}`,'Japan guide',true).catch(()=>{})}/></div><div className="guide-view" onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{if(!touch.current)return;const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;if(Math.abs(dx)>55&&Math.abs(dy)<45)turnPage(dx<0?1:-1);touch.current=null;}}><img className="guide-image" key={guidePage} src={`/api/guide?page=${guidePage}`} alt={`Japan travel guide page ${guidePage}`} onError={()=>notice('This page is not downloaded. Connect to view and save it.')}/><p className="guide-hint"><small>Swipe the page to turn it · {guidePage} of 72</small></p></div><GuideLocations state={state} page={guidePage} go={go}/><details className="guide-search" onToggle={async e=>{if(e.currentTarget.open&&!guideIndex.length){try{const i=await request('guide-index');setGuideIndex(i);}catch{notice('Search needs an internet connection.');}}}}><summary>Search guide text</summary><input placeholder="Search food, shopping, places…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&guideIndex.filter(p=>p.text.toLowerCase().includes(query.toLowerCase())).map(p=><button key={p.number} onClick={()=>{setGuidePage(p.number);updateUrl(day,null,p.number);}}>Page {p.number} <ChevronRight size={14}/></button>)}</details></>}
  {tab==='help'&&<><p className="eyebrow">A LITTLE HELP, ALWAYS HANDY</p><h1>Find our way</h1><div className="help-grid"><Link className="help-card dark" href={directions(today?.hotel)}><House/><h2>Take me to our hotel</h2><p>{today?.hotel}</p><span>Open directions <ArrowRight size={18}/></span></Link><button className="help-card" onClick={()=>setModal({type:'show',step:current||{title:today?.hotel,place:today?.hotel,japanese:''}})}><Languages/><h2>Show someone</h2><p>Large destination name and Japanese help.</p></button><Link className="help-card" href={APPS.translate[1]}><Languages/><h2>Google Translate</h2><p>Translate text; use the official app for camera and conversation.</p></Link><button className="help-card" onClick={()=>setModal({type:'tickets'})}><Ticket/><h2>Tickets & documents</h2><p>All family bookings in one place.</p></button>{config?.nearby&&<button className="help-card" onClick={()=>setModal({type:'nearby'})}><Compass/><h2>Food & amenities near here</h2><p>Toilets, a convenience store, cash or somewhere to eat, from where we are standing.</p></button>}</div><h2>Useful apps</h2><AppLinks/><h2>Before we rely on the plan</h2>{state.notices.map(n=><p className="callout" key={n.id}><AlertCircle size={18}/>{n.text}</p>)}<details><summary>Offline access and iPhone setup</summary><p>In Safari, tap Share → Add to Home Screen → Open as Web App. Each family member opens their own invite link first.</p><p>Your loaded itinerary is saved on this phone. Use Save page and Save file offline before going offline. Maps, live translations and external apps need their own offline preparation.</p><p>Offline progress queues on this phone. Reconnect to sync. Conflicting changes are shown for review.</p><p>Private downloads remain on a phone until cleared, even if its invite is later revoked.</p><Button icon={Download} onClick={async()=>{setBusy(true);try{for(const p of today.pages){const r=await fetch(`/api/guide?page=${p}`);if(!r.ok)throw new Error();const c=await caches.open('japan-private-v1');await c.put(`/api/guide?page=${p}`,r);}const next=[...new Set([...saved,...today.pages.map(p=>`page-${p}`)])];setSaved(next);localStorage.setItem('japan.saved',JSON.stringify(next));notice('All guide pages for this day are downloaded.');}catch{notice('Some pages could not download. Please retry.');}finally{setBusy(false);}}} disabled={busy}>Download this day’s guide pages</Button></details></>}
  </main>
  <BottomNav tab={tab} user={user} go={go} unread={state.alerts.some(a=>!a.seenBy?.[user.name])}/>
  {updateReady&&<div className="toast update-toast" role="status"><RefreshCw size={16}/>A newer version of the app is ready.<button className="primary" onClick={()=>location.reload()}>Reload</button></div>}
  {toast&&<div className="toast" role="status">{toast}<button aria-label="Dismiss" onClick={()=>setToast('')}><X size={16}/></button></div>}
  {modal&&<Dialog title={{edit:modal.step?'Edit activity':'Add a stop',tickets:'Tickets & documents',media:modal.step?modal.step.title:modal.day?fmtDay(modal.day)+' · Photos & videos':'Family gallery',show:'Show someone',alarm:'Remind me',family:'Our family',reschedule:'Adjust the day',tired:'Take it easier',apps:'Useful apps',nearby:'Food & amenities near here',sumo:'Today at the sumo',schedule:'Add to a day',pending:'Updates waiting to sync',recovery:'Keep your parent link',late:'We’re running late',offline:'Offline readiness',capture:'Quick capture',phrase:'Phrase of the day',fact:'Fun fact of the day',eyespy:'Window I spy',park:modal.park?.name||'Theme park rides',foodcard:modal.item?.en||'Show someone',voice:modal.step?`${modal.step.title} · voice notes`:modal.day?fmtDay(modal.day)+' · Voice notes':'Voice notes',thankyou:`A note from ${THANK_YOU_FROM}`}[modal.type]} onClose={()=>setModal(null)} wide={['tickets','media','eyespy','park','voice','nearby','sumo'].includes(modal.type)}>
   {modal.type==='sumo'&&<Sumo state={visibleState} user={user} day={SUMO_DAY} mutate={mutate} busy={busy} request={request} config={config} notice={notice} now={now}/>}
   {modal.type==='nearby'&&<Nearby state={visibleState} user={user} day={day} step={modal.step} request={request} mutate={mutate} busy={busy} notice={notice} selectStep={selectStep} close={()=>setModal(null)}/>}
   {modal.type==='voice'&&<VoiceNotes state={visibleState} user={user} day={modal.day} step={modal.step} config={config} busy={busy} setBusy={setBusy} request={request} accept={accept} mutate={mutate} notice={notice} dayLabel={fmtDay}/>}
   {modal.type==='foodcard'&&<FoodCard item={modal.item} notice={notice}/>}
   {modal.type==='park'&&<ParkGuide state={visibleState} user={user} park={modal.park} mutate={mutate} busy={busy} open={setModal}/>}
   {modal.type==='phrase'&&<PhraseOfDay queue={phraseQueue(visibleState,user.name,modal.day)} day={modal.day} dateLabel={fmtDay(modal.day)} busy={busy} dismiss={ids=>seePhrase(modal.day,ids)}/>}
   {modal.type==='fact'&&<FactOfDay queue={factQueue(visibleState,user.name,modal.day)} dateLabel={fmtDay(modal.day)} busy={busy} young={user.name==='Nate'} dismiss={ids=>seeFact(modal.day,ids)} openPage={async(page,ids)=>{await seeFact(modal.day,ids);openPage(page);}}/>}
   {modal.type==='eyespy'&&<EyeSpy state={visibleState} user={user} step={modal.step} mutate={mutate} busy={busy}/>}
   {modal.type==='thankyou'&&<ThankYouNote note={modal.note} seenAt={state.thankYou.seen?.[modal.note.day]} busy={busy} dismiss={()=>readNote(modal.note)}/>}
   {modal.type==='late'&&<RunningLate state={state} day={day} mutate={mutate} busy={busy} close={()=>setModal(null)}/>}
   {modal.type==='offline'&&<OfflineReadiness state={state} day={day} notice={notice} refresh={refresh}/>}
   {modal.type==='capture'&&<QuickCapture state={state} day={day} user={user} mutate={mutate} busy={busy} setBusy={setBusy} request={request} accept={accept} config={config} notice={notice} close={()=>setModal(null)}/>}
   {modal.type==='schedule'&&<form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);if(await mutate({type:'schedule',id:modal.step.id,day:f.get('day'),time:f.get('time')||null}))setModal(null);}}><h3>{modal.step.title}</h3><label>Day<select name="day" defaultValue={day}>{state.days.map(d=><option key={d.date} value={d.date}>{fmtDay(d.date)}</option>)}</select></label><label>Time (optional)<input name="time" type="time"/></label>{modal.step.backlogFrom?.bookingTime&&<p className="callout">Previous booking: {modal.step.backlogFrom.bookingTime}. Confirm any new reservation separately.</p>}<Button className="primary">Add to itinerary</Button></form>}
   {modal.type==='edit'&&<StepForm step={modal.step} day={modal.backlog?null:day} state={state} busy={busy} onSave={async op=>{if(await mutate(op))setModal(null);}} onCancel={()=>setModal(null)}/>}
   {modal.type==='show'&&<ShowLocation state={state} step={modal.step} notice={notice} maps={maps}/>}

   {modal.type==='media'&&<MediaGallery initialSearch={modal.initialSearch} state={state} user={user} day={modal.day} step={modal.step} config={config} busy={busy} setBusy={setBusy} accept={accept} mutate={mutate} notice={notice} request={request}/>}
   {modal.type==='tickets'&&<Tickets initialSearch={modal.initialSearch} initialArchived={!!modal.archived} state={state} user={user} step={modal.step} config={config} busy={busy} setBusy={setBusy} accept={accept} mutate={mutate} notice={notice} saved={saved} saveOffline={saveOffline} selectStep={selectStep}/>}
   {modal.type==='family'&&<Family user={user} state={state} notice={notice} onLogout={async()=>{try{await request('logout',{});}catch{}localStorage.removeItem('japan.snapshot');localStorage.removeItem('japan.queue');localStorage.removeItem('japan.saved');localStorage.removeItem('japan.position');localStorage.removeItem('japan.capture');localStorage.removeItem('japan.guide-index');Object.keys(localStorage).filter(k=>k.startsWith('japan.offline-external.')||k.startsWith('japan.note.')||k.startsWith('japan.phrase.')||k.startsWith('japan.needs.')).forEach(k=>localStorage.removeItem(k));await caches.delete('japan-private-v1');location.href='/';}}/>}
   
   {modal.type==='apps'&&<AppLinks day={day}/>}
   {modal.type==='alarm'&&<><p><strong>{modal.step.title}</strong><br/>{fmtDay(modal.step.day)} · {modal.step.time||'No target time'} Japan time</p>{!modal.step.time?<p>Set a target time first.</p>:<><Button className="primary" icon={CalendarDays} onClick={()=>{const file=new Blob([calendarEvent(modal.step)],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='japan-reminder.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Open the calendar file to add the event and 15-minute alert.');}}>Add to Calendar</Button><p>A dated calendar event with a 15-minute alert. Check it was added on your phone.</p><details><summary>Use a phone alarm Shortcut</summary><p>Create an Apple Shortcut named <strong>Japan Alarm</strong>: receive text input → Get Dictionary from Input → Get Dictionary Value “time” → Create Alarm. Use dictionary value “label” for the alarm label.</p><p>This creates a Clock alarm for a time of day, not a future trip date. Use it only for today, with the phone timezone set to Japan. Test once on each phone.</p><label>Installed shortcut name<input value={clockShortcut} placeholder="Japan Alarm" onChange={e=>{setClockShortcut(e.target.value);localStorage.setItem('japan.shortcut',e.target.value);}}/></label>{clockShortcut&&modal.step.day===japanDate()&&Intl.DateTimeFormat().resolvedOptions().timeZone==='Asia/Tokyo'?<a className="button" href={`shortcuts://run-shortcut?name=${encodeURIComponent(clockShortcut)}&input=text&text=${encodeURIComponent(JSON.stringify({time:modal.step.time,label:modal.step.title}))}`}>Run alarm shortcut</a>:<p>Alarm link becomes available on the activity day when this phone uses Japan time.</p>}</details><p className="callout">If the itinerary changes, update any calendar event or phone alarm yourself. Existing reminders do not change automatically.</p></>}</>}
   {modal.type==='reschedule'&&<Reschedule steps={steps} mutate={mutate} close={()=>setModal(null)}/>}
   {modal.type==='tired'&&<><p>Keep the next fixed booking and take out a little of the walking or waiting.</p>{nextFixed&&<p className="callout">Protect {nextFixed.time} · {nextFixed.title}</p>}{steps.filter(s=>s.kind==='optional'&&!s.locked&&s.status==='todo').map(s=><div className="list-row" key={s.id}><span>{s.time} {s.title}</span>{parent&&<Button onClick={()=>mutate({type:'backlog',id:s.id})}>Save to Options</Button>}</div>)}<Link className="button primary" href={directions(today.hotel,'driving')}>Driving directions to hotel</Link></>}
   {modal.type==='pending'&&<><p>The current shared plan is loaded behind this panel. Applying your updates changes only progress, not the schedule.</p>{queue.map(q=><p key={q.operation.operationId}>{state.steps.find(s=>s.id===q.operation.id)?.title||state.challenges.find(c=>c.id===q.operation.id)?.title} → {q.operation.status||(q.operation.done?'Completed':'Reset')} at {japanClock(new Date(q.operation.at))}</p>)}<Button className="primary" onClick={async()=>{await flush(true);setModal(null);}}>Apply my progress to the latest plan</Button></>}
  </Dialog>}
  </div>
 </PhraseAudio.Provider>;
}

function ContactRow({phone,title}){
 return <div className="contact-row"><a className="button" href={phone.tel}><Phone size={16}/>Call</a>{phone.whatsapp&&<Link className="button" href={phone.whatsapp} aria-label={`Message ${title} on WhatsApp`}><MessageCircle size={16}/>WhatsApp</Link>}<span>{phone.written}{phone.assumed&&<small>Dialling {phone.international} · add + and a country code if it is not Japanese</small>}</span></div>;
}
function AppLinks({day}){const ids=day==='2026-09-25'?['usj','maps','translate']:day>='2026-09-29'&&day<='2026-10-01'?['disney','maps','translate']:['maps','translate','qantas','disney','usj','japan'];return <div className="app-links">{ids.map(id=><Link key={id} href={APPS[id][1]}><span>{APPS[id][0]}</span><ExternalLink size={18}/></Link>)}</div>;}
function StepForm({step,day,state,busy,onSave,onCancel}){
 const [form,setForm]=useState(step?{locationId:resolveLocation(state,step)?.id||null,travelMinutes:20,arrivalBuffer:15,bookingReference:'',website:'',phone:'',...step}:{locationId:null,travelMinutes:20,arrivalBuffer:15,locked:false,bookingTime:null,bookingReference:'',website:'',phone:'',title:'',day,time:'',duration:30,place:'',japanese:'',notes:'',kind:'flexible',page:state.days.find(d=>d.date===day)?.pages[0]||1,participants:[...state.members],group:'',option:''});
 const [position,setPosition]=useState('end'),[at,setAt]=useState(step?.completedAt?step.day+'T'+japanClock(new Date(step.completedAt)):'');
 const field=(k,v)=>setForm({...form,[k]:v,...(k==='place'?{locationId:null}:{})});
 return <form onSubmit={e=>{e.preventDefault();let patch=Object.fromEntries(['title','day','time','duration','place','japanese','notes','kind','page','participants','group','option','bookingTime','bookingReference','locked','website','phone','travelMinutes','arrivalBuffer','locationId'].map(k=>[k,form[k]]));patch.time=patch.time||null;patch.bookingTime=patch.bookingTime||null;if(form.day===null){patch.time=null;patch.bookingTime=null;patch.locked=false;}patch.travelMinutes=Number(patch.travelMinutes);patch.arrivalBuffer=Number(patch.arrivalBuffer);patch.duration=Number(patch.duration);patch.page=Number(patch.page);if(!step&&position!=='end'){const target=state.steps.find(s=>s.id===position);patch.order=target.order-0.5;}onSave(step?{type:'patch',id:step.id,patch}:{type:'add',step:patch});}}>
  <label>Activity<input required value={form.title} maxLength={250} onChange={e=>field('title',e.target.value)}/></label>
  <div className="form-row"><label>Day<select value={form.day||''} disabled={form.locked&&!!step} onChange={e=>field('day',e.target.value||null)}>{form.day===null&&<option value="">Options — no date</option>}{state.days.map(d=><option key={d.date} value={d.date}>{fmtDay(d.date)}</option>)}</select></label><label>Japan time<input type="time" value={form.time||''} disabled={form.day===null||(form.locked&&!!step)} onChange={e=>field('time',e.target.value)}/></label></div>
  {form.locked&&!!step&&<p className="callout">Turn off the time lock below to change the date, target time or booking time.</p>}
  <div className="form-row"><label>Estimated minutes<input type="number" min="0" max="1440" value={form.duration} onChange={e=>field('duration',e.target.value)}/></label><label>Type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value,locked:e.target.value==='fixed'})}><option value="flexible">Flexible</option><option value="optional">Optional</option>{form.day!==null&&<option value="fixed">Fixed booking / time</option>}<option value="review">Needs checking</option></select></label></div>
  {form.day!==null&&<fieldset><legend>Reservation & time lock</legend><label className="checkline"><input type="checkbox" checked={!!form.locked} onChange={e=>field('locked',e.target.checked)}/>Lock this step against rescheduling</label><div className="form-row"><label>Booking time (Japan)<input type="time" value={form.bookingTime||''} disabled={form.locked&&!!step} onChange={e=>field('bookingTime',e.target.value)}/></label><label>Booking reference<input maxLength={250} value={form.bookingReference||''} onChange={e=>field('bookingReference',e.target.value)}/></label></div><Button type="button" disabled={!form.bookingTime||(form.locked&&!!step)} onClick={()=>field('time',form.bookingTime)}>Use booking time as target</Button><p>Record a reservation made with the provider. Editing here does not make or change the actual booking. Upload its confirmation under Tickets.</p></fieldset>}
  <div className="form-row"><label>Travel estimate (minutes)<input type="number" min="0" max="360" value={form.travelMinutes} onChange={e=>field('travelMinutes',e.target.value)}/></label><label>Arrive early (minutes)<input type="number" min="0" max="360" value={form.arrivalBuffer} onChange={e=>field('arrivalBuffer',e.target.value)}/></label></div><p>Used for the leave-by estimate and late-day planning. Check live travel times in Maps.</p>
  <label>Website / booking page<input type="url" value={form.website||''} maxLength={2000} placeholder="https://…" onChange={e=>field('website',e.target.value)}/></label>
  <label>Phone number<input type="tel" value={form.phone||''} maxLength={40} placeholder="+81 3 1234 5678" onChange={e=>field('phone',e.target.value)}/></label>
  {phoneLinks(form.phone)?.assumed&&<p className="callout"><Phone size={18}/>Read as a Japanese number: {phoneLinks(form.phone).international}. Start with + and a country code for anywhere else.</p>}
  <label>Link a location from our map<select value={form.locationId||''} onChange={e=>{const l=(state.locations||[]).find(l=>l.id===e.target.value);setForm({...form,locationId:l?.id||null,...(l?{place:l.name}:{})});}}><option value="">Use the place entered below</option>{(state.locations||[]).map(l=><option key={l.id} value={l.id}>{l.city} · {l.name}</option>)}</select></label>
  <label>Place name, address or Google Maps link<input value={form.place} maxLength={250} onChange={e=>field('place',e.target.value)}/></label><label>Japanese name / address (if known)<input value={form.japanese} onChange={e=>field('japanese',e.target.value)}/></label>
  <label>Notes<textarea value={form.notes} maxLength={4000} onChange={e=>field('notes',e.target.value)}/></label>
  <fieldset><legend>Who’s going?</legend><div className="checks">{state.members.map(n=><label key={n}><input type="checkbox" checked={form.participants.includes(n)} onChange={e=>field('participants',e.target.checked?[...form.participants,n]:form.participants.filter(x=>x!==n))}/>{n}</label>)}</div></fieldset>
  {!step&&form.day!==null&&<label>Insert before<select value={position} onChange={e=>setPosition(e.target.value)}><option value="end">End of day</option>{state.steps.filter(s=>s.day===form.day).sort((a,b)=>a.order-b.order).map(s=><option key={s.id} value={s.id}>{s.time} {s.title}</option>)}</select></label>}
  <details><summary>Options and guide link</summary><p>Give alternative plans the same group name, and a different option name. Steps in the same option stay together.</p><label>Option group<input value={form.group} onChange={e=>field('group',e.target.value)}/></label><label>Option name<input value={form.option} onChange={e=>field('option',e.target.value)}/></label><label>Original guide page<input type="number" min="1" max="72" value={form.page} onChange={e=>field('page',e.target.value)}/></label></details>
  <div className="row wrap"><Button className="primary" disabled={busy||!form.participants.length}>Save activity</Button><Button type="button" onClick={onCancel}>Cancel</Button></div>
  {step&&<><hr/><div className="row wrap">{step.day&&<Button type="button" icon={Inbox} disabled={step.locked} onClick={()=>onSave({type:'backlog',id:step.id})}>Missed / save to Options</Button>}<Button type="button" icon={SkipForward} onClick={()=>onSave({type:'status',id:step.id,status:'skipped'})}>Skip this step</Button><Button type="button" icon={RotateCcw} onClick={()=>onSave({type:'status',id:step.id,status:'todo'})}>Reset progress</Button><Button type="button" className="danger" disabled={step.locked} icon={Trash2} onClick={()=>{if(confirm('Remove this activity? Its linked documents will remain in Tickets.'))onSave({type:'remove',id:step.id});}}>Delete</Button></div>{step.completedAt&&<><label>Correct completion time (Japan)<input type="datetime-local" value={at} onChange={e=>setAt(e.target.value)}/></label><Button type="button" onClick={()=>onSave({type:'status',id:step.id,status:'done',at:new Date(at+':00+09:00').toISOString()})}>Update completion time</Button></>}</>}
 </form>;
}
function Reschedule({steps,mutate,close}){const [delta,setDelta]=useState(15);const proposal=scheduleProposal(steps,Number(delta));return <><p>Shift unfinished flexible activities. Locked times and completed steps stay in place. Durations are editable estimates.</p><label>Move by minutes<input type="number" min="-240" max="240" step="5" value={delta} onChange={e=>setDelta(e.target.value)}/></label>{proposal.conflicts.map((c,i)=><p className="callout" key={i}>{c}</p>)}<div className="reschedule-list">{proposal.changes.map(c=><div className="list-row" key={c.id}><span>{steps.find(s=>s.id===c.id).title}</span><strong>{c.time}</strong></div>)}</div><Button className="primary" disabled={!proposal.changes.length||!!proposal.conflicts.length} onClick={async()=>{if(await mutate({type:'reschedule',changes:proposal.changes}))close();}}>Apply revised times</Button>{proposal.conflicts.length>0&&<p>Resolve the overlaps by shortening or skipping steps, then try again.</p>}</>;}
function Tickets({state,user,step,initialSearch='',initialArchived=false,config,busy,setBusy,accept,mutate,notice,saved,saveOffline,selectStep}){
 const [file,setFile]=useState(null),[progress,setProgress]=useState(0),[view,setView]=useState(null),[all,setAll]=useState(!step),[failedUpload,setFailedUpload]=useState(null),[search,setSearch]=useState(initialSearch),[categoryFilter,setCategoryFilter]=useState(''),[personFilter,setPersonFilter]=useState(''),[editing,setEditing]=useState(null),[reset,setReset]=useState(0),[showArchived,setShowArchived]=useState(initialArchived);
 // Remount the form after every save so the next ticket starts blank, with no file carried over.
 const clearForm=()=>{setEditing(null);setFile(null);setFailedUpload(null);setProgress(0);setReset(n=>n+1);};
 // The used tickets are counted through the same filters as the list, so the number beside the
 // toggle is the number of tickets the toggle would actually show.
 const filters={step,all,category:categoryFilter,person:personFilter,search};
 const docs=ticketList(state,{...filters,archived:showArchived}),usedCount=ticketList(state,{...filters,archived:true}).length,parent=user.role==='parent';
 async function submit(e){e.preventDefault();const f=new FormData(e.currentTarget),title=f.get('title'),person=f.get('person'),stepId=f.get('stepId')||null,url=f.get('url'),category=f.get('category'),reference=f.get('reference'),notes=f.get('notes'),tags=[...new Set(String(f.get('tags')||'').split(',').map(t=>t.trim()).filter(Boolean))];
  if(editing){if(await mutate({type:'editDocument',id:editing.id,title,person,stepId,category,reference,notes,tags})){clearForm();notice('Details updated.');}return;}
  if(url){if(await mutate({type:'documentLink',title,url,person,stepId,category,reference,notes,tags})){clearForm();notice('Link added.');}return;}
  if(!file){if(await mutate({type:'documentNote',title,person,stepId,category,reference,notes,tags})){clearForm();notice('Details saved for the family.');}return;}
  if(file.size>25*1024*1024){notice('Choose a document smaller than 25 MB.');return;}
  setBusy(true);try{const blob=failedUpload||await upload(`tickets/${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`,file,{access:'private',handleUploadUrl:'/api/upload',onUploadProgress:p=>setProgress(p.percentage)});setFailedUpload(blob);const result=await request('document',{pathname:blob.pathname,title,person,stepId,category,reference,notes,tags});accept(result);clearForm();notice('Document added to the family trip.');}catch(e){notice(e.message||'Upload failed. Try again.');}finally{setBusy(false);}}
 return <><div className="document-filters"><label>Search<input type="search" value={search} placeholder="Name, reference, note or tag" onChange={e=>setSearch(e.target.value)}/></label><div className="form-row"><label>Type<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="">All types</option><option value="reservation">Reservations</option><option value="ticket">Tickets / QR</option><option value="luggage">Luggage</option><option value="other">Other</option></select></label><label>For<select value={personFilter} onChange={e=>setPersonFilter(e.target.value)}><option value="">Everyone</option><option>Family</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label></div></div>{step&&<label className="checkline"><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/>Show all family documents</label>}{(showArchived||usedCount>0)&&<label className="checkline"><input type="checkbox" checked={showArchived} onChange={e=>{setShowArchived(e.target.checked);setView(null);}}/>Show used tickets ({usedCount})</label>}{showArchived&&<p className="callout"><Archive size={18}/>Tickets marked as used. They stay out of the list, the swipe-through strip and the offline download until they are put back.</p>}{!docs.length&&(showArchived?<div className="empty"><Archive size={30}/><h3>Nothing has been marked used yet</h3><p>Archive a ticket once it has been scanned, the bag collected or the meal eaten. It stays here in full.</p></div>:<div className="empty"><Ticket size={30}/><h3>Keep the little details here</h3><p>Add tickets, reservations, luggage tags, forwarding receipts or collection numbers as you go.</p></div>)}
 {docs.map(d=><div className={`document-row${isArchived(d)?' archived':''}`} key={d.id}><DocumentThumb doc={d} attachments={attachmentsOf(state,d)} onView={setView}/><div><strong>{d.title}</strong><small>{d.person} · {{ticket:'Ticket',reservation:'Reservation',luggage:'Luggage / tag',other:'Other'}[d.category||'ticket']} · {d.type==='note'?'Saved details':d.type==='link'?'Link':d.type==='application/pdf'?'PDF':'Photo / QR'}{saved.includes(`doc-${d.id}`)?' · Saved offline':''}{isArchived(d)?` · Used · ${d.archivedWith&&state.steps.find(s=>s.id===d.archivedWith)?`ticked off with ‘${state.steps.find(s=>s.id===d.archivedWith).title}’`:'archived'} ${fmtDay(japanDate(new Date(d.archivedAt)))}${d.archivedBy?` by ${d.archivedBy}`:''}`:''}</small>{d.reference&&<p className="document-note"><strong>Reference:</strong> {d.reference}</p>}{d.notes&&<p className="document-note">{d.notes}</p>}<div className="row wrap">{(d.tags||[]).map(t=><button className="tag" key={t} onClick={()=>setSearch(t)}>{t}</button>)}</div><div className="row wrap">{d.type==='note'?null:d.type==='link'?<Link href={d.url}>Open link <ExternalLink size={13}/></Link>:<><button onClick={()=>setView(d)}>Open full-screen</button><button onClick={()=>saveOffline(`/api/document?id=${d.id}`,`doc-${d.id}`)}>Save file offline</button></>}{parent&&<button onClick={()=>setEditing(d)}>Edit details / tags</button>}{d.stepId&&state.steps.find(s=>s.id===d.stepId)?.day&&<button onClick={()=>selectStep(state.steps.find(s=>s.id===d.stepId))}>View activity</button>}{parent&&<button disabled={busy} onClick={async()=>{const used=!isArchived(d);if(await mutate({type:'archiveDocument',id:d.id,archived:used}))notice(used?'Marked used. Find it under ‘Show used tickets’.':'Back on the ticket list.');}}>{isArchived(d)?<><ArchiveRestore size={15}/>Put back on the list</>:<><Archive size={15}/>Used · archive</>}</button>}{parent&&<button className="danger" onClick={()=>{if(confirm('Remove this ticket and all its attached files from the trip? Saved copies on phones remain.'))mutate({type:'removeDocument',id:d.id});}}>Remove</button>}</div><TicketAttachments ticket={d} attachments={attachmentsOf(state,d)} members={state.members} user={user} enabled={config?.uploads} busy={busy} setBusy={setBusy} request={request} accept={accept} notice={notice} onView={setView} onEdit={setEditing} saveOffline={saveOffline} onRemove={a=>{if(confirm('Remove this file from the ticket?'))mutate({type:'removeDocument',id:a.id});}}/></div></div>)}
 {view&&<TicketViewer documents={state.documents} tickets={docs} view={view} setView={setView}/>}
 {parent&&<details key={editing?.id||`new-${reset}`} open={!!editing||!state.documents.length}><summary>{editing?'Edit details and tags':'Add a ticket, reservation or luggage tag'}</summary>{!config?.uploads&&<p className="callout">File uploads will work after private Blob storage is connected. Links and written details can be added now.</p>}<form onSubmit={submit}><label>Type<select name="category" defaultValue={editing?.category||'ticket'}><option value="ticket">Ticket / QR code</option><option value="reservation">Reservation</option><option value="luggage">Luggage tag / forwarding receipt</option><option value="other">Other</option></select></label><label>Title<input name="title" defaultValue={editing?.title||''} required placeholder="Blue suitcase tag / dinner reservation" maxLength={250}/></label><div className="form-row"><label>For<select name="person" defaultValue={editing?.person||'Family'}><option>Family</option>{state.members.map(n=><option key={n}>{n}</option>)}</select></label><label>Attach to<select name="stepId" defaultValue={editing?.stepId||step?.id||''}><option value="">General trip document</option>{state.steps.map(s=><option key={s.id} value={s.id}>{s.day?s.day.slice(5):'Options'} · {s.title}</option>)}</select></label></div><label>Reference / tag / collection number<input name="reference" defaultValue={editing?.reference||''} maxLength={250} placeholder="Bag tag or booking number"/></label><label>Notes<textarea name="notes" defaultValue={editing?.notes||''} maxLength={4000} placeholder="Which bag, collection place, delivery hotel or reservation details"/></label><label>Tags (comma-separated)<input name="tags" defaultValue={(editing?.tags||[]).join(', ')} placeholder="Tokyo, dinner, flight, blue bag"/></label>{!editing&&<><label>First PDF or photo (up to 25 MB)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={!config?.uploads||busy} onChange={e=>{setFile(e.target.files[0]);setFailedUpload(null);}}/></label><label>Take a photo now<input type="file" accept="image/jpeg,image/png" capture="environment" disabled={!config?.uploads||busy} onChange={e=>{setFile(e.target.files[0]);setFailedUpload(null);}}/></label>{file&&<p>Selected: {file.name}</p>}<label>Or paste a booking link<input name="url" type="url" placeholder="https://…"/></label></>}<Button className="primary" disabled={busy}>{busy?`Uploading ${Math.round(progress)}%…`:failedUpload?'Retry saving attachment':editing?'Save changes':'Save to family trip'}</Button>{editing&&<Button type="button" onClick={()=>setEditing(null)}>Cancel edit</Button>}<p>After saving, use ‘Add photos / files to this ticket’ to attach multiple images and label each person. For rotating QR codes, add the official ticket link or app. Downloaded screenshots may not be valid.</p></form></details>}</>;
}
function Family({user,state,notice,onLogout}){const [invites,setInvites]=useState([]),[link,setLink]=useState(''),[name,setName]=useState('Lauren'),[busy,setBusy]=useState(false);const load=()=>request('invites').then(r=>setInvites(r.invites)).catch(e=>notice(e.message));useEffect(()=>{if(user.role==='parent')load();},[]);return <><p>You’re using the trip as <strong>{user.name}</strong> · {user.role==='parent'?'Parent editor':'Family member'}</p><div className="family-people">{state.members.map(n=><span key={n}><MascotBadge state={state} person={n} size={45}/>{n}</span>)}</div>{user.role==='parent'&&<><h3>Invite the family</h3><p>Each person gets their own private link. Anyone holding a parent link can edit the trip and see tickets. Links expire after 45 days.</p><label>Family member<select value={name} onChange={e=>setName(e.target.value)}>{state.members.map(n=><option key={n}>{n}</option>)}</select></label><Button className="primary" icon={Share2} disabled={busy} onClick={async()=>{setBusy(true);try{const r=await request('invites',{name,role:['Damien','Lauren'].includes(name)?'parent':'child'});setLink(r.url);await load();}catch(e){notice(e.message);}finally{setBusy(false);}}}>Create private invite link</Button>{link&&<><textarea readOnly value={link}/><Button icon={Copy} onClick={()=>navigator.clipboard.writeText(link).then(()=>notice('Private invite copied.')).catch(()=>notice('Select and copy the link.'))}>Copy link</Button></>}{invites.map(i=><div className="list-row" key={i.id}><span>{i.name} · {i.role}{i.revoked?' · revoked':''}</span>{i.id!=='owner'&&i.id!==user.id&&!i.revoked&&<button className="danger" onClick={async()=>{if(!confirm('Revoke this invite and its online sessions? Offline downloads cannot be remotely removed.'))return;try{await request('revoke',{id:i.id});load();}catch(e){notice(e.message);}}}>Revoke</button>}</div>)}</>}<details><summary>Recent family changes</summary>{(state.history||[]).slice(0,30).map(h=><p key={h.id}><strong>{h.by}</strong> · {h.title}<small>{japanClock(new Date(h.at))} · {h.type}</small></p>)}</details><Button icon={Download} onClick={()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='japan-trip-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Download itinerary backup</Button><hr/><Button className="danger" onClick={()=>{if(confirm('Sign out and remove saved itinerary and tickets from this phone?'))onLogout();}}>Sign out and clear this phone</Button></>;}

createRoot(document.getElementById('root')).render(<App/>);

function ShowLocation({state,step,notice,maps}){
 const {english,japanese,address,copyText}=showLocationDetails(state,step);
 return <><p className="eyebrow">PLEASE HELP US FIND THIS PLACE</p><SayIt phrase={PHRASES.goHere}/><div className="destination">{japanese&&<h2 className="destination-japanese" lang="ja">{japanese}</h2>}<h3>{english}</h3>{address&&<p>{address}</p>}</div>{!japanese&&<p>Japanese details haven’t been added for this place yet. Edit the activity to add its Japanese name or address, or open Maps.</p>}<div className="row wrap"><Link className="button primary" href={maps(step)}>Show in Maps</Link><Button icon={Copy} onClick={()=>navigator.clipboard.writeText(copyText).then(()=>notice('Location details copied.')).catch(()=>notice('Select the location details to copy them.'))}>Copy location</Button><Link className="button" href={`https://translate.google.com/?sl=en&tl=ja&text=${encodeURIComponent(english)}&op=translate`}>Translate location</Link></div><hr/><SayIt phrase={PHRASES.lost} size="small"/></>;
}
