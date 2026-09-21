import React from 'react';
import {MessageSquare,Lightbulb} from 'lucide-react';
import {SETTINGS,settingOn} from './settings.js';
const ICONS={dailyPhrase:MessageSquare,dailyFact:Lightbulb};
// The one screen that turns things off. Each row says what it is, what it will do next time,
// and what stays behind either way — because the fear that stops somebody switching a thing
// off is not knowing what else goes with it. Nothing here is lost by turning it off: the
// phrasebook and the whole collection of facts are pages of their own and stay exactly where
// they were, and everything already seen stays in the log.
export default function Settings({user,settings,change}){
 return <>
  <p className="eyebrow">YOUR PHONE, YOUR CHOICE</p>
  <h1>Settings</h1>
  <p>These two are the only things the app puts on your screen without being asked. Turn one off and it stops opening{user?.name?` on ${user.name}’s phone`:''} — everybody else keeps theirs.</p>
  <section className="settings-section">
   <h2>What opens on its own</h2>
   {SETTINGS.map(s=>{
    const on=settingOn(settings,s.id),Icon=ICONS[s.id];
    return <div className="setting-row" key={s.id}>
     <span className="setting-icon" aria-hidden="true">{Icon&&<Icon size={20}/>}</span>
     <span className="setting-text"><strong>{s.label}</strong><small>{on?s.on:s.off}</small></span>
     <button type="button" role="switch" aria-checked={on} aria-label={s.label}
      className={`setting-switch${on?' on':''}`} onClick={()=>change(s.id,!on)}>
      <i aria-hidden="true"/><span>{on?'On':'Off'}</span>
     </button>
    </div>;
   })}
  </section>
  <p><small>Remembered on this phone under your own name, so it takes effect with no signal and changes nothing for anybody else. Turning one back on brings it straight back, starting with today’s if you have not already marked it; nothing you have already seen is ever offered twice.</small></p>
 </>;
}
