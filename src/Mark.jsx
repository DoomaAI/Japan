// A small picture beside a label: the emoji the data was written with, and the line icon that
// means the same thing. Both are drawn; the look decides which shows. The printed guide shows
// the emoji; Washi shows the line icon, and simply leaves the emoji out where there is none,
// because the label beside it already says what it is. On the boys' own pages Washi keeps the
// emoji too (house-theme.css). Purely decorative either way, so hidden from screen readers.
import React from 'react';
import {IdCard,TrainFront,BatteryFull,PlugZap,Banknote,Droplet,Umbrella,Shirt,Sun,Ticket,Luggage,Backpack,DoorOpen,Footprints,ConciergeBell,Tag,BedDouble,Timer,FerrisWheel,Swords,Grid3x3,Target,Mountain,Landmark,Bath,Moon,Wind,Thermometer,Ship,Utensils,Pin} from 'lucide-react';
const LINES={
 '🛂':IdCard,'🚃':TrainFront,'🚄':TrainFront,'🔋':BatteryFull,'🔌':PlugZap,'💴':Banknote,'💧':Droplet,'☂':Umbrella,'🧥':Shirt,'🧢':Sun,
 '🎟':Ticket,'🧳':Luggage,'🎒':Backpack,'🚪':DoorOpen,'🚶':Footprints,'🛎':ConciergeBell,'🏷':Tag,'🛏':BedDouble,
 '☀':Sun,'🌙':Moon,'🌡':Thermometer,'🌬':Wind,'👟':Footprints,'🧣':Shirt,'⛴':Ship,'🍣':Utensils,'📌':Pin,
 '⏱':Timer,'🎢':FerrisWheel,'🥋':Swords,'🎱':Grid3x3,'🎯':Target,'🥾':Mountain,'⛩':Landmark,'♨':Bath,'🧦':Footprints
};
export const lineFor=emoji=>LINES[String(emoji||'').replace(/\uFE0F/g,'')]||null;
export default function Mark({emoji,size=15}){
 if(!emoji)return null;
 const Line=lineFor(emoji);
 return <span className="mark" aria-hidden="true"><span className="mark-emoji">{emoji}</span>{Line&&<Line className="mark-line" size={size}/>}</span>;
}
