import React from 'react';
import {Camera,Dices,MessageSquare,House,CalendarDays,Ticket,UtensilsCrossed,Coins,Trophy,NotebookPen,MapPin,Users,LifeBuoy,Inbox,FerrisWheel,ShoppingBag,BookOpen,Bell,Search,Heart,MoreHorizontal,ChevronRight} from 'lucide-react';
import {PAGES,primaryNav,moreSections,navActive} from './nav-data.js';
const ICONS={today:House,days:CalendarDays,tickets:Ticket,food:UtensilsCrossed,money:Coins,challenges:Trophy,games:Dices,photos:Camera,
 diary:NotebookPen,places:MapPin,meeting:Users,help:LifeBuoy,options:Inbox,parks:FerrisWheel,
 shopping:ShoppingBag,phrases:MessageSquare,guide:BookOpen,updates:Bell,search:Search,thanks:Heart};
export function BottomNav({tab,user,go,unread}){
 return <nav className="bottom-nav" aria-label="Main navigation">
  {[...primaryNav(user),'more'].map(id=>{
   const Icon=id==='more'?MoreHorizontal:ICONS[id],active=navActive(tab,id,user);
   return <button key={id} className={active?'active':''} aria-current={active?'page':undefined} onClick={()=>go(id)}>
    <Icon size={22}/><span>{id==='more'?'More':PAGES[id].label}</span>
    {id==='more'&&unread&&<i aria-hidden="true"/>}
   </button>;
  })}
 </nav>;
}
export function MorePage({user,tab,go,children}){
 return <>
  <p className="eyebrow">EVERYTHING FOR OUR TRIP</p>
  <h1>More</h1>
  {moreSections(user).map(([title,ids])=><section className="more-section" key={title}>
   <h2>{title}</h2>
   {ids.map(id=>{const Icon=ICONS[id];return <button className={`more-row${tab===id?' current':''}`} key={id} onClick={()=>go(id)}>
    <span className="more-icon"><Icon size={20}/></span>
    <span><strong>{PAGES[id].label}</strong><small>{PAGES[id].note}</small></span>
    <ChevronRight size={18}/>
   </button>;})}
  </section>)}
  {children}
 </>;
}
