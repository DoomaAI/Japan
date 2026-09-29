import React from 'react';
import {highlightsMaterial} from './recap-data.js';
// A placeholder for the trip's highlights video. It shows what the video will be made from, so
// the family can see it filling up during the trip, and says plainly that the making is still
// to come. See docs/roadmap.md for how the video is meant to be put together.
export default function Highlights({state,dayLabel}){
 const m=highlightsMaterial(state);
 const stat=(n,label)=><li><strong>{n.toLocaleString('en-AU')}</strong> {label}</li>;
 return <>
  <p className="eyebrow">THE TRIP, IN A FEW MINUTES</p>
  <h1>Trip highlights</h1>
  <div className="callout"><strong>Coming after the trip.</strong> The highlights video is not built yet. This page shows what it will be made from, and it fills up as we go.</div>
  <h2>What the video will be</h2>
  <p>About three minutes, day by day: each day's photo of the day, the stops we rated highest, short clips from our videos, and a line or two of what each of us said, with our own voice notes over the top.</p>
  <p>Claude picks the moments and writes the captions. The phone puts the pictures together into a video you can save and send. Nothing is invented: every picture in it is one of ours.</p>
  <h2>Kept so far</h2>
  <ul>
   {stat(m.galleryPhotos,'photos in the family gallery')}
   {stat(m.videos,'videos')}
   {stat(m.boysPhotos,'photos from the boys')}
   {stat(m.voiceNotes,'voice notes')}
   {stat(m.daysWithWinner,`of ${m.days.length} days with a photo of the day`)}
  </ul>
  {m.topRated.length>0&&<><h2>Our favourite moments so far</h2><ol>
   {m.topRated.map(({step,average})=><li key={step.id}>{step.title} <small>· {dayLabel?dayLabel(step.day):step.day} · {average} out of 5</small></li>)}
  </ol></>}
 </>;
}
