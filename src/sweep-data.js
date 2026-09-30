// The checkout sweep. Every hotel room has the same six hiding places, and every family has left
// a charger in one of them. On a move day the packing nudge opens a short list to walk once
// round the room before the bags go to the desk. Ticks live on this phone for that day only: a
// sweep is one person at the door, and nobody wants last week's ticks.
export const SWEEP=[
 {id:'charger',title:'The charger in the wall by the bed',note:'And the one behind the desk, and the cable in the bathroom socket.'},
 {id:'safe',title:'The safe',note:'Passports, the spare cash, the good watch. Open it and leave it open.'},
 {id:'bed',title:'Under the beds and the pillows',note:'The boys’ toys and whatever they took to bed.'},
 {id:'bathroom',title:'The bathroom shelf and the shower',note:'Toothbrushes, the razor, the hair things, the boys’ bath toy.'},
 {id:'wardrobe',title:'The wardrobe and every hanger',note:'The jacket on the hook behind the door counts.'},
 {id:'fridge',title:'The fridge',note:'The drinks, and the medicine that had to stay cold.'},
 {id:'window',title:'The windowsill and the curtain rail',note:'Where the washing was drying.'},
 {id:'drawers',title:'The desk and bedside drawers',note:'Chargers, cards, the guide, the boys’ stamp book.'},
 {id:'key',title:'The room keys and the luggage tags',note:'Keys back to the desk; forwarding labels filled in before the bags leave.'}
];
const KEY=date=>`japan.sweep.${date}`;
export const readSweep=date=>{try{const v=JSON.parse(localStorage.getItem(KEY(date)));return Array.isArray(v)?v.filter(id=>SWEEP.some(s=>s.id===id)):[];}catch{return [];}};
export const writeSweep=(date,ids)=>{try{localStorage.setItem(KEY(date),JSON.stringify(ids));}catch{}};
export const toggleSweep=(ids,id)=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
export const sweepWords=ids=>ids.length>=SWEEP.length?'Room swept. Nothing left behind.':ids.length?`${SWEEP.length-ids.length} of ${SWEEP.length} still to look in`:'Once round the room before the bags go';
