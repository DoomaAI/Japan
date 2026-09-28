import React from 'react';
import {Utensils,Coffee,ShoppingBag,TrainFront,FerrisWheel,Landmark,BedDouble,ClipboardCheck,MapPin} from 'lucide-react';
import {entryType} from './entry-types.js';
const ICONS={food:Utensils,cafe:Coffee,shopping:ShoppingBag,transport:TrainFront,entertainment:FerrisWheel,sightseeing:Landmark,hotel:BedDouble,admin:ClipboardCheck,other:MapPin};
// A small icon at the start of the stop's title — down the day at a glance, on What's next and on
// the card — so it costs no line of its own. Each type keeps one colour so a run of meals or
// trains shows up before any title is read; the word is there for a screen reader and a long press.
export default function EntryIcon({step,size=14}){
 const t=entryType(step),Icon=ICONS[t.id];
 return <span className={`entry-type entry-${t.id}`} title={t.label} aria-label={t.label} role="img"><Icon size={size} strokeWidth={2.2} aria-hidden="true"/></span>;
}
