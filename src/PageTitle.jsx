import React,{useState} from 'react';
import {CircleHelp} from 'lucide-react';
// Every page used to open with a paragraph or two of why before anything you could touch. That is
// for the first visit and the odd question, so it waits behind the ? beside the title, out of the
// way on the twentieth. A line that changes with the trip (a count, a status) stays on the page.
// A section heading inside a screen takes the same ?, as an h2 with its own row (`className`) and
// whatever sits at the far end of it (`aside`).
export default function PageTitle({children,help,as:H='h1',className='',aside=null}){
 const [open,setOpen]=useState(false);
 if(!help)return className?<div className={className}><H>{children}</H>{aside}</div>:<H>{children}</H>;
 return <>
  <div className={`page-title${className?` ${className}`:''}`}><H>{children}</H>
   <button type="button" className="title-help-toggle" aria-label="About this page" aria-expanded={open} onClick={()=>setOpen(o=>!o)}><CircleHelp size={H==='h1'?22:18}/></button>{aside}</div>
  {open&&<div className="title-help">{help}</div>}
 </>;
}
