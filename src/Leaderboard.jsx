import React from 'react';
import {Crown} from 'lucide-react';
import {rankings,crowns} from './leaderboard-data.js';
const MEDAL={1:'🥇',2:'🥈',3:'🥉'};
// The family leaderboard: a crown for each board somebody leads, then every board in full.
export default function Leaderboard({state,user,go}){
 const boards=rankings(state),table=crowns(state);
 return <>
  <p className="eyebrow">FRIENDLY COMPETITION</p><h1>Family leaderboard</h1>
  <p>Who has tried the most, ridden the most and spotted the most. Counted from what everyone has ticked, and a tie is a tie.</p>
  <ol className="crown-table">{table.map(r=><li key={r.person} className={r.person===user?.name?'me':''}><strong>{r.person}</strong><span>{Array.from({length:r.crowns},(_,i)=><Crown key={i} size={16}/>)}{!r.crowns&&<small>No crowns yet</small>}</span></li>)}</ol>
  <div className="boards">{boards.map(b=><section className="board" key={b.id}>
   <h2><span aria-hidden="true">{b.icon}</span> {b.label}</h2>
   <ol>{b.rows.map(r=><li key={r.person} className={r.person===user?.name?'me':''}><span className="board-place">{r.place?MEDAL[r.place]||r.place:'–'}</span><span>{r.person}</span><b>{r.count}</b></li>)}</ol>
  </section>)}</div>
  <button type="button" className="button" onClick={()=>go('stamps')}>Open the stamp book</button>
 </>;
}
