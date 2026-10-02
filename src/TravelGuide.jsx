import React,{useEffect,useMemo,useRef,useState} from 'react';
import PageTitle from './PageTitle.jsx';
import {Printer,BedDouble,Lightbulb,Ticket,Map as MapIcon,ListOrdered,Clock,Phone,Languages,TriangleAlert,Camera} from 'lucide-react';
import {travelGuide,cropFrame,longDate,shortDate} from './travel-guide-data.js';
import {project,scaleBar} from './day-map-data.js';
const page=n=>n===1?'/cover.jpg':`/api/guide?page=${n}`;
const photo=id=>`/api/photo?id=${encodeURIComponent(id)}`;
const dm=date=>longDate(date).split(' ').slice(1).join(' ');
// A piece of an original guide page: the whole page, scaled and moved inside a frame the shape
// of the piece, so the printer is sent the original picture and nothing is re-drawn.
function Crop({art,alt,className=''}){
 const f=cropFrame(art);
 return <div className={`tg-crop ${className}`} style={{aspectRatio:f.ratio}}>
  <img src={page(art.page)} alt={alt} style={{width:`${f.width}%`,left:`${f.left}%`,top:`${f.top}%`}} loading="eager" decoding="async"/></div>;
}
// The day's stops where they are, in the order we go, numbered as the steps beside it are.
function Sketch({map}){
 const W=320,H=260,{points,kmPerPx}=project(map.marks,W,H,26),bar=scaleBar(kmPerPx,W);
 return <svg className="tg-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Sketch map of the day's stops">
  <rect width={W} height={H} rx="6" className="tg-map-bg"/>
  <polyline points={map.path.map(i=>`${points[i].x},${points[i].y}`).join(' ')} className="tg-map-route"/>
  {map.marks.map((m,i)=>{const p=points[i],label=m.stops.map(s=>s.n).join(','),short=label.length>5?`${m.stops[0].n}+`:label;
   return <g key={i} className={`tg-map-mark${m.exact?'':' rough'}`}><circle cx={p.x} cy={p.y} r={short.length>2?12:9.5}/><text x={p.x} y={p.y+3.5}>{short}</text></g>;})}
  <g className="tg-map-north" transform={`translate(${W-18},22)`}><path d="M0,-10 L5,5 L0,2 L-5,5 Z"/><text y="16">N</text></g>
  <g className="tg-map-scale" transform={`translate(12,${H-12})`}><line x2={bar.px}/><text y="-4">{bar.label}</text></g>
 </svg>;
}
function Heading({eyebrow,title,sub,side}){
 return <header className="tg-head">{side&&<span className="tg-side" aria-hidden="true">{side}</span>}
  {eyebrow&&<p className="tg-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{sub&&<p className="tg-sub">{sub}</p>}</header>;
}
function Box({icon:Icon,title,children,className=''}){
 return <section className={`tg-box ${className}`}><h3>{Icon&&<Icon size={15} aria-hidden="true"/>}{title}</h3>{children}</section>;
}
// The original's banners carry their own tab down the right edge, so only a day drawn without
// its banner gets ours.
function Day({c,art,maps}){
 return <article className="tg-sheet tg-day">
  {art&&c.banner?<div className="tg-banner"><Crop art={c.banner} alt={`${c.title}, from the original guide page ${c.banner.page}`}/></div>
   :<div className="tg-banner plain"><span className="tg-tab">{c.side}</span></div>}
  <div className="tg-title"><p className="tg-eyebrow">Day {c.number} · {c.eyebrow}</p><h2>{c.title}</h2>{c.lede&&<p className="tg-sub">{c.lede}</p>}</div>
  {c.glance.length>0&&<Box icon={Clock} title="The day at a glance" className="tg-glance"><ol>{c.glance.map(g=><li key={g.time+g.title} className={g.fixed?'fixed':''}><b>{g.time}</b><span>{g.title}</span>{g.fixed&&<small>Booked</small>}</li>)}</ol></Box>}
  <div className="tg-cols">
   <Box icon={ListOrdered} title="Step by step" className="tg-steps"><ol>{c.items.map(s=><li key={s.id} className={`${s.optional?'optional ':''}${s.fixed?'fixed':''}`}>
    <i>{s.n}</i><div><p><b>{s.time?`${s.time}${s.until?`–${s.until}`:''}`:'Any time'}</b> {s.title}{s.fixed&&<em className="tg-flag">Booked</em>}{s.optional&&<em className="tg-flag soft">If time</em>}{s.check&&<em className="tg-flag warn">Check</em>}</p>
     {(s.place||s.japanese)&&<p className="tg-place">{s.place}{s.japanese&&<span lang="ja"> {s.japanese}</span>}</p>}
     {s.who&&<p className="tg-who">{s.who}</p>}
     {s.notes&&<p className="tg-note">{s.notes}</p>}</div></li>)}</ol>
    {c.items.length===0&&<p>Nothing planned yet — a free day.</p>}</Box>
   <div className="tg-aside">
    {maps&&c.map&&<Box icon={MapIcon} title="Where the day goes"><Sketch map={c.map}/><p className="tg-small">Numbers match the steps. A sketch, not a street map{c.map.rough?'; ringed dashes are placed in their neighbourhood':''}.</p></Box>}
    {c.tip&&<Box icon={Lightbulb} title="From our notes" className="tg-tip"><p className="tg-tip-about">{c.tip.about}</p><p>{c.tip.text}</p></Box>}
    {c.bookings.length>0&&<Box icon={Ticket} title="Bookings for the day"><ul className="tg-list">{c.bookings.map(b=><li key={b.id}><b>{b.title}</b>{b.reference&&<span> · Ref {b.reference}</span>}{b.person&&<span> · {b.person}</span>}</li>)}</ul></Box>}
    {c.hotel&&<Box icon={BedDouble} title={c.moving?'Tonight, a new hotel':'Tonight'}><p className="tg-hotel">{c.hotel}</p></Box>}
   </div>
  </div>
  {c.photos.length>0?<Box icon={Camera} title="Our photos from the day" className="tg-strip"><div>{c.photos.map(id=><img key={id} src={photo(id)} alt="" loading="eager"/>)}</div></Box>
   :art&&c.pages.length>1&&<Box title={`In the original guide · pages ${c.pages.join(', ')}`} className="tg-strip pages"><div>{c.pages.map(n=><img key={n} src={page(n)} alt={`Original guide page ${n}`} loading="eager"/>)}</div></Box>}
 </article>;
}
// Every picture has to have arrived before the printer is asked, or the PDF has holes in it.
function picturesReady(root,ms=15000){
 const imgs=[...(root?.querySelectorAll('img')||[])].filter(i=>!i.complete);
 return Promise.race([Promise.all(imgs.map(i=>new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});}))),new Promise(r=>setTimeout(r,ms))]);
}
export default function TravelGuide({state,today,dayLabel}){
 const [range,setRange]=useState('all'),[day,setDay]=useState(today&&state.days.some(d=>d.date===today)?today:state.days[0]?.date||'');
 const [maps,setMaps]=useState(true),[art,setArt]=useState(true),[front,setFront]=useState(true),[waiting,setWaiting]=useState(false);
 const box=useRef(null);
 const printedOn=dayLabel?dayLabel(today,{day:'numeric',month:'long',year:'numeric'}):today;
 const g=useMemo(()=>travelGuide(state,{range,day,today,maps,printedOn}),[state,range,day,today,maps,printedOn]);
 const extras=front&&range!=='day';
 useEffect(()=>{const after=()=>document.body.classList.remove('print-guide');addEventListener('afterprint',after);return()=>{removeEventListener('afterprint',after);after();};},[]);
 const print=async()=>{setWaiting(true);await picturesReady(box.current);setWaiting(false);document.body.classList.add('print-guide');setTimeout(()=>window.print(),50);};
 return <div className="travel-guide" ref={box}>
  <div className="tg-controls"><p className="eyebrow">TO PRINT OR SAVE AS A PDF</p><PageTitle help={<><p>The original guide, rebuilt from the plan as it stands today: every change we have made is in it, the original's pictures are kept where they still belong, and each day gets its chapter — the day at a glance, the steps in order, a sketch of where they are, the bookings and tonight's hotel.</p></>}>Our travel guide</PageTitle>
   <div className="form-row">
    <label>Which days<select value={range} onChange={e=>setRange(e.target.value)}><option value="all">The whole trip</option><option value="ahead">From today on</option><option value="day">One day</option></select></label>
    {range==='day'&&<label>Day<select value={day} onChange={e=>setDay(e.target.value)}>{state.days.map((d,i)=><option key={d.date} value={d.date}>Day {i+1} · {shortDate(d.date)} · {d.title}</option>)}</select></label>}
   </div>
   <div className="row wrap tg-options">
    <label className="check"><input type="checkbox" checked={art} onChange={e=>setArt(e.target.checked)}/>Pictures from the original guide</label>
    <label className="check"><input type="checkbox" checked={maps} onChange={e=>setMaps(e.target.checked)}/>Sketch maps</label>
    {range!=='day'&&<label className="check"><input type="checkbox" checked={front} onChange={e=>setFront(e.target.checked)}/>Cover, hotels, trip at a glance and the back page</label>}
   </div>
   <button type="button" className="primary" onClick={print} disabled={waiting||!g.chapters.length}><Printer size={18}/>{waiting?'Getting the pictures ready…':`Print or save as PDF · ${g.chapters.length} ${g.chapters.length===1?'day':'days'}`}</button>
   <p className="tg-small">Print on A4 with background graphics on, so the colour bands and pictures come out. {g.chapters.length} {g.chapters.length===1?'chapter':'chapters'}{extras?' plus the front and back pages':''}.</p>
  </div>
  {extras&&<>
   <section className="tg-sheet tg-cover">{art?<img src={page(1)} alt="The Pasfield family Japan travel guide 2026" loading="eager"/>:<div className="tg-cover-plain"><p>{g.family}</p><h2>{g.title}</h2><p>Travel guide</p></div>}
    <p className="tg-edition">{g.days} days · {g.nights} nights · {dm(g.from)} – {dm(g.to)} · Printed {g.printedOn} from the plan as it stands</p></section>
   <section className="tg-sheet tg-front">
    <Heading eyebrow={g.title} title="Where we’re staying" sub={`${g.nights} nights across ${[...new Set(g.legs.map(l=>l.city))].join(', ')}`} side="Where we’re staying"/>
    <div className="tg-journey"><h3>Our journey</h3><ol>{g.legs.map((l,i)=><li key={l.city+l.from}><i>{i+1}</i><b>{l.city}</b><span>{shortDate(l.from).slice(4)} – {shortDate(l.to).slice(4)}</span></li>)}</ol></div>
    <div className="tg-stays">{g.stays.map(s=><article key={s.hotel+s.from} className="tg-stay">
     <header><i>{s.n}</i><div><h3>{s.hotel}</h3>{s.japanese&&<p lang="ja">{s.japanese}</p>}</div><p className="tg-nights"><b>{s.nights} {s.nights===1?'night':'nights'}</b>{shortDate(s.from)} –<br/>{shortDate(s.to)}</p></header>
     {art&&s.art&&<Crop art={s.art} alt={s.hotel}/>}
     {(s.address||s.japaneseAddress)&&<div className="tg-address">{s.address&&<p><small>Address (English)</small>{s.address}</p>}{s.japaneseAddress&&<p lang="ja"><small>Address (Japanese)</small>{s.japaneseAddress}</p>}</div>}
    </article>)}</div>
   </section>
   <section className="tg-sheet tg-front">
    <Heading eyebrow={g.title} title="The trip at a glance" sub="Every day, where we sleep, and what is booked to a time" side="Trip summary"/>
    <table className="tg-summary"><thead><tr><th>Day</th><th>Date</th><th>Where</th><th>The day</th><th>Booked to a time</th><th>Hotel</th></tr></thead>
     <tbody>{g.summary.map(d=><tr key={d.date}><td>{d.number}</td><td>{shortDate(d.date)}</td><td>{d.city}</td><td>{d.title}</td><td>{d.fixed.map(f=><div key={f.title+f.time}>{f.time&&<b>{f.time} </b>}{f.title}</div>)}</td><td>{d.hotel}</td></tr>)}</tbody></table>
    <div className="tg-cols even">
     {g.checks.length>0&&<Box icon={TriangleAlert} title="Check before relying on it" className="tg-checks"><ul className="tg-list">{g.checks.map(t=><li key={t}>{t}</li>)}</ul></Box>}
     <Box icon={Languages} title="If you only remember six" className="tg-phrases"><ul>{g.phrases.map(p=><li key={p.en}><b lang="ja">{p.ja}</b><span>{p.say}</span><small>{p.en}</small></li>)}</ul></Box>
    </div>
   </section>
  </>}
  {g.chapters.map(c=><Day key={c.date} c={c} art={art} maps={maps}/>)}
  {extras&&<section className="tg-sheet tg-back">
   <Heading eyebrow="Keep this page" title="If something goes wrong" sub="Numbers that work from any phone in Japan, and where we are staying in Japanese to show a driver" side="Keep this page"/>
   <div className="tg-cols even">
    <Box icon={Phone} title="Emergency numbers"><ul className="tg-numbers">{g.emergency.map(e=><li key={e.title}><b>{e.number}</b>{e.title}</li>)}</ul></Box>
    <Box icon={Phone} title="Australian help"><ul className="tg-numbers">{g.consular.map(e=><li key={e.title}><b>{e.number}</b>{e.title}</li>)}</ul></Box>
   </div>
   <Box icon={BedDouble} title="Show the driver" className="tg-driver"><ul>{g.stays.map(s=><li key={s.hotel+s.from}><b lang="ja">{s.japanese||s.hotel}</b>{s.japaneseAddress&&<span lang="ja">{s.japaneseAddress}</span>}<small>{s.hotel} · {shortDate(s.from)} – {shortDate(s.to)}</small></li>)}</ul></Box>
   <p className="tg-small">Times, prices and opening hours in this guide are the plan, not a promise: check the booking, the official app or Maps on the day. Printed {g.printedOn}.</p>
  </section>}
 </div>;
}
