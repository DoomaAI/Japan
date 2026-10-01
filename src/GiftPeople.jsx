import React,{useState} from 'react';
import {Gift,Plus,ChevronDown,Sparkles,ExternalLink,ShoppingBag,Check} from 'lucide-react';
import {GIFT} from './shopping-groups.js';
import {AGE_GROUPS,DESCRIBE_TIPS,GIFT_INTERESTS,findInterest,interestLabel,ageLabel,giftPeople,giftProgress,giftIdeas} from './gift-data.js';

// People to buy for back home. Each one is a name, what they are into and a budget; opening
// them shows what is already on the shopping list for them, ideas that fit with where and on
// which day of the trip, and the guide's own ideas when asked. Rules live in src/gift-data.js.
const yenRange=([a,b])=>a===b?`¥${a.toLocaleString()}`:`¥${a.toLocaleString()}–${b.toLocaleString()}`;
const DECLARE_NOTE={food:'Declare: food',plants:'Declare: plant material',animal:'Declare: animal product',wood:'Declare: wood',soil:'Not allowed: soil'};

function PersonForm({person,busy,save,cancel,removeIt}){
 const [chosen,setChosen]=useState(person.interests||[]);
 const toggle=id=>setChosen(c=>c.includes(id)?c.filter(x=>x!==id):[...c,id]);
 function submit(e){e.preventDefault();const f=new FormData(e.currentTarget);
  save({name:f.get('name'),relation:f.get('relation'),age:f.get('age'),budget:f.get('budget')===''?null:Number(f.get('budget')),interests:chosen,likes:f.get('likes'),avoid:f.get('avoid'),notes:f.get('notes')});}
 return <form className="feature-card gift-form" onSubmit={submit}>
  <h2>{person.id?`Edit ${person.name}`:'Someone to buy for'}</h2>
  <div className="form-row"><label>Name<input name="name" required maxLength={80} defaultValue={person.name||''}/></label><label>Who they are<input name="relation" maxLength={80} defaultValue={person.relation||''} placeholder="Aunt, neighbour, Sam’s teacher"/></label></div>
  <div className="form-row"><label>Age<select name="age" defaultValue={person.age||''}>{AGE_GROUPS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Budget (yen)<input name="budget" type="number" min="0" max="1000000" step="1" defaultValue={person.budget??''}/></label></div>
  <fieldset><legend>What they are into</legend><div className="chips">{GIFT_INTERESTS.map(i=><label className="chip" key={i.id}><input type="checkbox" checked={chosen.includes(i.id)} onChange={()=>toggle(i.id)}/><span aria-hidden="true">{i.emoji}</span> {i.label}</label>)}</div></fieldset>
  {chosen.length>0&&<div className="callout gift-asks"><span><strong>Worth finding out</strong>{chosen.map(id=>findInterest(id)).filter(Boolean).map(i=><small key={i.id}>{i.emoji} {i.label}: {i.ask}</small>)}</span></div>}
  <label>What they love<textarea name="likes" maxLength={500} defaultValue={person.likes||''} placeholder="Cats, gin, Studio Ghibli, gardening, her new kitchen"/></label>
  <label>Better to avoid<input name="avoid" maxLength={300} defaultValue={person.avoid||''} placeholder="No alcohol, nut allergy, no more ornaments"/></label>
  <label>Notes<textarea name="notes" maxLength={1000} defaultValue={person.notes||''} placeholder="Sizes, what they already have, what we said we would bring"/></label>
  <details className="gift-tips"><summary>How to describe someone so the ideas fit</summary><ul>{DESCRIBE_TIPS.map(t=><li key={t}>{t}</li>)}</ul></details>
  <div className="row wrap"><button className="primary" disabled={busy}>Save</button><button type="button" onClick={cancel}>Cancel</button>{removeIt&&<button type="button" className="danger" onClick={removeIt}>Remove</button>}</div>
 </form>;
}

function Idea({idea,add,busy,dayLabel,guide}){
 const when=idea.anywhere?'Almost anywhere':idea.days?.length?`Next there ${dayLabel(idea.days[0])}${idea.days.length>1?` (+${idea.days.length-1} more days)`:''}`:guide&&idea.day?`There ${dayLabel(idea.day)}`:'';
 const price=idea.yen?.length===2?yenRange(idea.yen):Number.isFinite(idea.yen)?`about ¥${idea.yen.toLocaleString()}`:'';
 return <div className="list-row gift-idea"><span><strong>{idea.title}</strong>{idea.why&&<small>{idea.why}</small>}<small>{[idea.where,idea.area].filter(Boolean).join(' · ')}</small><small>{[when,price].filter(Boolean).join(' · ')}</small>{idea.tip&&<small>{idea.tip}</small>}{idea.declare&&<small className="gift-declare">{DECLARE_NOTE[idea.declare]}</small>}{idea.website&&<a href={idea.website} target="_blank" rel="noreferrer"><ExternalLink size={13}/> Website</a>}</span><button type="button" disabled={busy} onClick={add}><Plus size={15}/>Add to list</button></div>;
}

export default function GiftPeople({state,user,today,mutate,busy,request,accept,config,notice,remove,dayLabel}){
 const people=giftPeople(state),parent=user.role==='parent';
 const [edit,setEdit]=useState(null),[open,setOpen]=useState(()=>new Set()),[asking,setAsking]=useState(''),[want,setWant]=useState({});
 const toggle=id=>setOpen(o=>{const n=new Set(o);n.has(id)?n.delete(id):n.add(id);return n;});
 const progress=people.map(p=>giftProgress(state,p)),sorted=people.map((p,i)=>[p,progress[i]]).sort(([a,A],[b,B])=>A.done-B.done||a.name.localeCompare(b.name));
 const covered=progress.filter(p=>p.done).length;
 async function save(fields){if(await mutate({type:edit.id?'giftPersonEdit':'giftPersonAdd',id:edit.id,...fields}))setEdit(null);}
 function removeIt(p){setEdit(null);remove({type:'giftPersonRemove',id:p.id},{type:'giftPersonAdd',...p},`${p.name} taken off the people to buy for.`);}
 const addIdea=(p,idea,guide)=>{
  const top=Array.isArray(idea.yen)?idea.yen[1]:idea.yen;
  const budget=Number.isFinite(top)?(p.budget!=null?Math.min(top,p.budget):top):null;
  return mutate({type:'shoppingAdd',title:idea.title,person:GIFT,giftPersonId:p.id,quantity:1,budget,day:(guide?idea.day:idea.days?.[0])||null,
   store:[idea.where,idea.area].filter(Boolean).join(' · ').slice(0,2000),url:idea.website||'',notes:[idea.why,idea.tip].filter(Boolean).join(' '),taxFree:false});
 };
 async function ask(p){setAsking(p.id);try{accept(await request('gift-ideas',{personId:p.id,want:want[p.id]||''}));}catch(e){notice?.(e.message);}finally{setAsking('');}}
 const mine=p=>parent||p.createdBy===user.name;
 return <section className="gift-people">
  <div className="section-heading"><div><p className="eyebrow">SOUVENIRS FOR HOME</p><h2><Gift size={20}/> People to buy for</h2></div>{!edit&&<button onClick={()=>setEdit({interests:[]})}><Plus size={16}/>Add someone</button>}</div>
  {people.length>0&&<p><small>{covered} of {people.length} have something bought. Open someone for ideas of what to get and where.</small></p>}
  {!people.length&&!edit&&<p><small>Write down who we are bringing something back for and what they are into, and each gets ideas of what to buy and on which day we pass the shop.</small></p>}
  {edit&&<PersonForm key={edit.id||'new'} person={edit} busy={busy} save={save} cancel={()=>setEdit(null)} removeIt={edit.id&&mine(edit)?()=>removeIt(edit):null}/>}
  <div className="shop-list">{sorted.map(([p,pr])=>{const shown=open.has(p.id),guide=state.giftIdeas?.[p.id];
   return <article className={`feature-card shop-card ${pr.done?'finished':''} ${shown?'open':''}`} key={p.id}>
    <div className="shop-head"><span className="gift-status" aria-hidden="true">{pr.done?<Check size={18}/>:<Gift size={18}/>}</span><button type="button" className="shop-toggle" aria-expanded={shown} onClick={()=>toggle(p.id)}><span><strong>{p.name}</strong><small>{[p.relation,p.interests.map(interestLabel).join(', '),p.budget!=null&&`¥${p.budget.toLocaleString()}`,pr.done?'Bought':pr.planned?`${pr.planned} on the list`:'Nothing yet'].filter(Boolean).join(' · ')}</small></span><ChevronDown size={18} aria-hidden="true"/></button></div>
    {shown&&<div className="shop-more">
     {(p.likes||p.avoid||p.age||p.notes)&&<p><small>{[p.age&&ageLabel(p.age),p.likes&&`Loves ${p.likes}`,p.avoid&&`Avoid ${p.avoid}`,p.notes].filter(Boolean).join(' · ')}</small></p>}
     {pr.items.length>0&&<><h3>On the shopping list</h3>{pr.items.map(s=><div className="list-row" key={s.id}><span>{s.boughtAt?'✓ ':''}{s.title}<small>{[s.store,s.budget!=null&&`¥${s.budget.toLocaleString()}`,s.boughtAt?'Bought':'Still to get'].filter(Boolean).join(' · ')}</small></span></div>)}{pr.over&&<p className="callout"><small>¥{pr.spent.toLocaleString()} planned, over the ¥{p.budget.toLocaleString()} budget.</small></p>}</>}
     <h3>Ideas</h3>
     {(ideas=>ideas.length?ideas.slice(0,8).map(x=><Idea key={x.title} idea={x} busy={busy} dayLabel={dayLabel} add={()=>addIdea(p,x,false)}/>):<p><small>Nothing in the built-in ideas fits {p.budget!=null?'that budget ':''}on the days we have left. Try more interests, or ask the guide.</small></p>)(giftIdeas(state,p,today))}
     {guide&&<><h3><Sparkles size={15}/> From the guide</h3>{guide.ideas.map(x=><Idea key={x.title} guide idea={x} busy={busy} dayLabel={dayLabel} add={()=>addIdea(p,x,true)}/>)}{guide.note&&<p><small>{guide.note}</small></p>}</>}
     {config?.giftIdeas&&<div className="gift-ask"><label>Anything in particular for the guide?<input maxLength={120} value={want[p.id]||''} onChange={e=>setWant(w=>({...w,[p.id]:e.target.value}))} placeholder="Something small for her desk"/></label><button type="button" disabled={!!asking||busy} onClick={()=>ask(p)}><Sparkles size={15}/>{asking===p.id?'Looking…':guide?'Ask the guide again':'Ask the guide for ideas'}</button></div>}
     <div className="row wrap">{mine(p)&&<button onClick={()=>setEdit(p)}>Edit {p.name}</button>}</div>
    </div>}
   </article>;})}</div>
  <p className="callout"><ShoppingBag size={18}/><span>Adding an idea puts it on the shopping list above, marked for them, with the shop and the day we are there.</span></p>
 </section>;
}
