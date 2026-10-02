import React,{useState} from 'react';
import {CircleHelp} from 'lucide-react';
// Every page used to open with a paragraph or two of why before anything you could touch. That is
// for the first visit and the odd question, so it waits behind the ? beside the title, out of the
// way on the twentieth. A line that changes with the trip (a count, a status) stays on the page.
export default function PageTitle({children,help}){
 const [open,setOpen]=useState(false);
 if(!help)return <h1>{children}</h1>;
 return <>
  <div className="page-title"><h1>{children}</h1>
   <button type="button" className="title-help-toggle" aria-label="About this page" aria-expanded={open} onClick={()=>setOpen(o=>!o)}><CircleHelp size={22}/></button></div>
  {open&&<div className="title-help">{help}</div>}
 </>;
}
