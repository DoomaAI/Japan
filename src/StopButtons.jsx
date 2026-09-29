import React from 'react';
import {useWobble,mergeVisible} from './wobble.js';
// The row of buttons under a stop, in this person's order. Press and hold any of them and the
// row wobbles like an iPhone's home screen, and they can be dragged about (see wobble.js).
//
// Each button sits in a slot of its own so it can be picked up and hit-tested without touching
// the button itself, which keeps doing exactly what it did before when the row is still. Only
// the buttons this stop shows can be dragged; the rest keep their places in the order.
export default function StopButtons({order,setOrder,buttons,label}){
 const shown=order.filter(id=>buttons[id]);
 const w=useWobble({ids:shown,onMove:next=>setOrder(mergeVisible(order,next))});
 return <>
  <div className="card-links" data-wobbling={w.editing||undefined} aria-label={label} {...w.rowProps}>
   {w.order.map(id=>{const {held,...item}=w.item(id);
    return <span key={id} className={`card-link-slot${held?' held':''}`} {...item}>{buttons[id]}</span>;})}
  </div>
  {/* Outside the row, so it is on screen however far along the row has been scrolled. */}
  {w.editing&&<div ref={w.bar} className="wobble-done" role="status">
   <small>Drag them into the order you want{shown.length>1?'. Arrow keys work too.':'.'}</small>
   <button type="button" onClick={w.finish}>Done</button>
  </div>}
 </>;
}
