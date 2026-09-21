import React,{useState} from 'react';
import {Dices,Check,Sparkles,RotateCcw,Trash2} from 'lucide-react';
import Mascot,{MascotBadge} from './Mascot.jsx';
import {THEMES,VIBES,CHOICES,SAYINGS,DEFAULT_MASCOT,TEXT_FIELDS,themeFor,paletteFor,mascotFor,mascotReady,randomMascot,describeMascot} from './mascot-data.js';
// Designing the character. It is guided rather than a blank page: the spirits come with
// their own stories so a choice means something, and picking one lays out a whole look that
// can then be pulled apart piece by piece. Nothing here needs a connection — the character
// is a handful of words, and it saves like any other progress.
const STEPS=[
 {id:'spirit',label:'Spirit',hint:'Who are you, in the old stories?'},
 {id:'look',label:'Look',hint:'Shape and colours.'},
 {id:'face',label:'Face',hint:'Eyes, mouth and markings.'},
 {id:'gear',label:'Gear',hint:'What you wear, hold and stand in front of.'},
 {id:'name',label:'Name',hint:'A name, a shout and a power.'}
];
// Every choice is shown as the character it would make, because the boy choosing it is five
// and should not have to read "asanoha" to find out what it looks like.
function Choices({field,draft,onChange,busy}){
 return <div className="choice-grid">{CHOICES[field].map(o=>{const on=draft[field]===o.id;
  return <button key={o.id} type="button" disabled={busy} className={`choice${on?' selected':''}`} aria-pressed={on} onClick={()=>onChange(o.id)}>
   <Mascot mascot={{...draft,[field]:o.id}} size={44} label={`${o.label} ${field}`}/>
   <span><strong>{o.label}</strong>{o.note&&<small>{o.note}</small>}</span>
  </button>;})}</div>;
}
export default function MascotMaker({state,user,mutate,busy,notice,go}){
 const members=state.members||[];
 const [person,setPerson]=useState(user.name);
 const saved=mascotFor(state,person),canEdit=user.role==='parent'||person===user.name;
 const [draft,setDraft]=useState(()=>saved?{...DEFAULT_MASCOT,...saved}:randomMascot());
 const [who,setWho]=useState(person),[step,setStep]=useState(0),[vibe,setVibe]=useState('');
 // Switching to somebody else picks up their character rather than handing them yours.
 if(who!==person){setWho(person);setDraft(saved?{...DEFAULT_MASCOT,...saved}:randomMascot());setStep(0);}
 const set=patch=>setDraft(d=>({...d,...patch}));
 const theme=themeFor(draft.theme),palette=paletteFor(draft.palette);
 const dirty=JSON.stringify({...DEFAULT_MASCOT,...(saved||{}),updatedAt:0,updatedBy:0})!==JSON.stringify({...draft,updatedAt:0,updatedBy:0});
 const named=mascotReady(draft);
 // Picking a new spirit lays out its whole look. Picking the one you already have leaves
 // your own changes alone, so nobody loses a character by tapping its card twice.
 const chooseTheme=id=>set(id===draft.theme?{theme:id}:{theme:id,...themeFor(id).suggest});
 async function save(){
  if(!named){notice('Give your character a name first.');return;}
  if(await mutate({type:'mascotSave',person,mascot:{...draft}}))notice(`${draft.name} is ready. You will see them beside ${person==='Damien'||person===user.name?'your':person+'’s'} name around the app.`);
 }
 return <>
  <p className="eyebrow">OUR TRIP MASCOTS</p><h1>Design your character</h1>
  <p>Build yourself a Japanese character out of the old stories — a fox spirit, a river imp, a roof-top lion dog — or something out of a Japanese film. Once it has a name it stands beside you everywhere else in the app: your missions, your spending, your photos.</p>
  {members.length>1&&<label>Whose character<select value={person} onChange={e=>setPerson(e.target.value)}>{members.map(n=><option key={n}>{n}</option>)}</select></label>}
  {!canEdit&&<p className="callout">This is {person}’s character. Switch back to your own name to change anything.</p>}
  <div className="mascot-preview">
   <Mascot mascot={draft} size={132}/>
   <div>
    <strong>{draft.name||'Not named yet'}</strong>
    <small>{theme.name} · {theme.ja} {theme.romaji} · {palette.label}</small>
    {draft.meaning&&<small>{draft.name} means {draft.meaning}.</small>}
    {draft.saying&&<p className="mascot-saying">{draft.saying}</p>}
    {draft.power&&<p className="mascot-power"><Sparkles size={15}/>{draft.power}</p>}
    {canEdit&&<div className="row wrap">
     <button type="button" disabled={busy} onClick={()=>setDraft(randomMascot())}><Dices size={18}/> Surprise me</button>
     <button type="button" disabled={busy} onClick={()=>setDraft(randomMascot(draft.theme))}><RotateCcw size={18}/> Reshuffle this spirit</button>
    </div>}
   </div>
  </div>
  {canEdit&&<>
   <div className="mascot-steps-bar">
    <Mascot mascot={draft} size={42} className="mascot-mini" label={`${draft.name||'Your character'}, as it stands`}/>
    <div className="mascot-steps">{STEPS.map((s,i)=><button key={s.id} type="button" className={step===i?'selected':''} aria-current={step===i?'step':undefined} onClick={()=>setStep(i)}><b>{i+1}</b>{s.label}</button>)}</div>
   </div>
   <p className="mascot-hint">{STEPS[step].hint}</p>
   {step===0&&<>
    <div className="segmented mascot-vibes"><button className={vibe?'':'selected'} onClick={()=>setVibe('')}>All of them</button>{VIBES.map(([id,label])=><button key={id} className={vibe===id?'selected':''} onClick={()=>setVibe(id)}>{label}</button>)}</div>
    <div className="theme-grid">{THEMES.filter(t=>!vibe||t.vibe===vibe).map(t=><button type="button" key={t.id} disabled={busy} className={`theme-card${draft.theme===t.id?' selected':''}`} aria-pressed={draft.theme===t.id} onClick={()=>chooseTheme(t.id)}>
     <Mascot mascot={{theme:t.id,...t.suggest}} size={72}/>
     <span><strong>{t.name}</strong><small>{t.ja} · {t.romaji}</small><small className="theme-lore">{t.lore}</small><small className="theme-known">Known for: {t.known}</small></span>
    </button>)}</div>
    <p><small>Choosing a spirit lays out a whole look for you. Every part of it can be changed in the next steps, and a fox spirit in a samurai helmet is entirely allowed.</small></p>
   </>}
   {step===1&&<><h3>Shape</h3><Choices field="shape" draft={draft} onChange={id=>set({shape:id})} busy={busy}/>
    <h3>Colour</h3><Choices field="palette" draft={draft} onChange={id=>set({palette:id})} busy={busy}/></>}
   {step===2&&<><h3>Eyes</h3><Choices field="eyes" draft={draft} onChange={id=>set({eyes:id})} busy={busy}/>
    <h3>Mouth</h3><Choices field="mouth" draft={draft} onChange={id=>set({mouth:id})} busy={busy}/>
    <h3>Markings</h3><Choices field="marking" draft={draft} onChange={id=>set({marking:id})} busy={busy}/></>}
   {step===3&&<><h3>On your head</h3><Choices field="headwear" draft={draft} onChange={id=>set({headwear:id})} busy={busy}/>
    <h3>In your hand</h3><Choices field="item" draft={draft} onChange={id=>set({item:id})} busy={busy}/>
    <h3>Behind you</h3><Choices field="pattern" draft={draft} onChange={id=>set({pattern:id})} busy={busy}/></>}
   {step===4&&<>
    <h3>A name from the stories</h3>
    <div className="choice-grid">{theme.names.map(n=><button type="button" key={n.romaji} disabled={busy} className={`choice${draft.name===n.name?' selected':''}`} onClick={()=>set({name:n.name,romaji:n.romaji,meaning:n.meaning})}>
     <span><strong>{n.name} · {n.romaji}</strong><small>{n.meaning}</small></span></button>)}</div>
    <div className="form-row">
     <label>Name<input value={draft.name} maxLength={TEXT_FIELDS.name} onChange={e=>set({name:e.target.value})} placeholder="コン"/></label>
     <label>How to say it<input value={draft.romaji} maxLength={TEXT_FIELDS.romaji} onChange={e=>set({romaji:e.target.value})} placeholder="Kon"/></label>
    </div>
    <label>What it means<input value={draft.meaning} maxLength={TEXT_FIELDS.meaning} onChange={e=>set({meaning:e.target.value})} placeholder="the sound a fox makes"/></label>
    <h3>Your shout</h3>
    <div className="choice-grid">{SAYINGS.map(s=>{const text=`${s.ja} ${s.romaji} — ${s.en}`;return <button type="button" key={s.romaji} disabled={busy} className={`choice${draft.saying===text?' selected':''}`} onClick={()=>set({saying:text})}>
     <span><strong>{s.ja}</strong><small>{s.romaji} · {s.en}</small></span></button>;})}</div>
    <label>Or your own<input value={draft.saying} maxLength={TEXT_FIELDS.saying} onChange={e=>set({saying:e.target.value})} placeholder="がんばれ！ Ganbare — keep going!"/></label>
    <h3>Your power</h3>
    <div className="choice-grid">{theme.powers.map(p=><button type="button" key={p} disabled={busy} className={`choice${draft.power===p?' selected':''}`} onClick={()=>set({power:p})}><span><strong>{p}</strong></span></button>)}</div>
    <label>Or your own<input value={draft.power} maxLength={TEXT_FIELDS.power} onChange={e=>set({power:e.target.value})} placeholder="Finds the last empty seat on any train"/></label>
   </>}
   <div className="row wrap mascot-actions">
    {step<STEPS.length-1&&<button type="button" className="primary" onClick={()=>setStep(step+1)}>Next · {STEPS[step+1].label}</button>}
    <button type="button" className={step===STEPS.length-1?'primary':''} disabled={busy||!dirty||!named} onClick={save}><Check size={18}/> {saved?'Save changes':'Save my character'}</button>
    {dirty&&saved&&<button type="button" disabled={busy} onClick={()=>setDraft({...DEFAULT_MASCOT,...saved})}>Undo my changes</button>}
    {saved&&<button type="button" className="danger" disabled={busy} onClick={async()=>{if(confirm(`Remove ${person}’s character? The picture goes back to a letter.`)&&await mutate({type:'mascotRemove',person}))setDraft(randomMascot());}}><Trash2 size={18}/> Remove</button>}
   </div>
   {!named&&<p className="callout">Give your character a name in step 5 before saving. Everything else is already chosen for you.</p>}
  </>}
  <h2 className="section-heading">The family’s characters</h2>
  <div className="mascot-gallery">{members.map(n=>{const m=mascotFor(state,n);
   return <article className="mascot-card" key={n}>
    <MascotBadge state={state} person={n} size={70}/>
    <div><strong>{n}</strong>{mascotReady(m)?<><small>{describeMascot(m)}</small>{m.saying&&<small>{m.saying}</small>}{m.power&&<small><Sparkles size={13}/> {m.power}</small>}</>:<small>No character yet.</small>}</div>
    {(user.role==='parent'||n===user.name)&&<button type="button" onClick={()=>{setPerson(n);setStep(0);}}>{mascotReady(m)?'Change':'Design one'}</button>}
   </article>;})}</div>
  <p><small>Characters are ours alone: they are drawn inside the app from the parts chosen here, so they work with no signal and nothing is uploaded anywhere.</small></p>
 </>;
}
