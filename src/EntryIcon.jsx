import React from 'react';
import {Utensils,Coffee,ShoppingBag,TrainFront,FerrisWheel,Landmark,BedDouble,ClipboardCheck,MapPin} from 'lucide-react';
import {entryType} from './entry-types.js';
const ICONS={food:Utensils,cafe:Coffee,shopping:ShoppingBag,transport:TrainFront,entertainment:FerrisWheel,sightseeing:Landmark,hotel:BedDouble,admin:ClipboardCheck,other:MapPin};
// The icon alone down the day at a glance, where it is read as a column; the icon and its word on
// the card, where there is room to say it. Each type keeps one colour so a run of meals or trains
// shows up before any title is read.
export default function EntryIcon({step,size=14,label=false}){
 const t=entryType(step),Icon=ICONS[t.id];
 return <span className={`entry-type entry-${t.id}${label?' with-label':''}`} title={t.label} aria-label={label?undefined:t.label} role={label?undefined:'img'}><Icon size={size} strokeWidth={2.2} aria-hidden="true"/>{label&&<span>{t.label}</span>}</span>;
}
