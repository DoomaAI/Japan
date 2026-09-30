import React,{useState} from 'react';
import {Baby,Lock,Unlock} from 'lucide-react';
import {CODE_LENGTH,validCode,codeMatches} from './hand-over.js';
import {isChild} from './child-levels.js';
// Settings, for a parent: pick a boy, set the four digits, and the phone becomes his.
export function HandOver({state,user,hand}){
 const boys=(state?.members||[]).filter(n=>isChild(state,n));
 const [name,setName]=useState(boys[0]||''),[code,setCode]=useState('');
 if(!boys.length||!hand)return null;
 return <section className="settings-section">
  <h2>Hand this phone to one of the boys</h2>
  <p>For a queue or a train: the phone becomes his for a while, with his reading and awareness dials and his pages, and none of yours. A four-digit code takes it back. It is kept on this phone only; nothing you do while it is his is any different to doing it for him from your own view.</p>
  <form className="row wrap" onSubmit={e=>{e.preventDefault();if(name&&validCode(code)){hand({name,code});setCode('');}}}>
   <label>Whose turn<select value={name} onChange={e=>setName(e.target.value)}>{boys.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
   <label>Code to take it back<input inputMode="numeric" pattern="\d*" maxLength={CODE_LENGTH} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,CODE_LENGTH))} placeholder="4 digits" aria-label="Four-digit code"/></label>
   <button className="primary" disabled={!name||!validCode(code)}><Baby size={16}/> Hand it to {name||'…'}</button>
  </form>
 </section>;
}
// The strip across the top while the phone is a boy's, with the way back for a parent.
export function HandedBanner({user,handed,takeBack}){
 const [open,setOpen]=useState(false),[code,setCode]=useState(''),[wrong,setWrong]=useState(false);
 if(!user?.handed)return null;
 const submit=e=>{e.preventDefault();if(codeMatches(handed,code)){takeBack();setOpen(false);setCode('');setWrong(false);}else setWrong(true);};
 return <div className="handed-banner" role="status">
  <span><Baby size={16}/> <strong>{user.name}’s turn</strong> on {user.heldBy}’s phone</span>
  {open
   ?<form onSubmit={submit} className="row"><input autoFocus inputMode="numeric" pattern="\d*" maxLength={CODE_LENGTH} value={code} onChange={e=>{setCode(e.target.value.replace(/\D/g,'').slice(0,CODE_LENGTH));setWrong(false);}} aria-label="Code" placeholder="Code"/><button className="primary" disabled={!validCode(code)}><Unlock size={14}/> Back to {user.heldBy}</button>{wrong&&<small>Not the code.</small>}</form>
   :<button type="button" onClick={()=>setOpen(true)}><Lock size={14}/> Give it back</button>}
 </div>;
}
