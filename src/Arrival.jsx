import React from 'react';
import PageTitle from './PageTitle.jsx';
import {ExternalLink,PlaneLanding,PlaneTakeoff} from 'lucide-react';
import {VISIT_JAPAN_WEB,VJW_STEPS,TRAVEL_DECLARATION,ATD_STEPS} from './arrival-data.js';
import GoingHome from './GoingHome.jsx';
// Arrival paperwork: Visit Japan Web for landing in Japan, and the Australia Travel Declaration
// and what to declare for landing at home.
const Steps=({steps})=><ol className="arrival-steps">{steps.map(([t,d])=><li key={t}><strong>{t}</strong><span>{d}</span></li>)}</ol>;
export default function Arrival({homeFirst=false}){
 const japan=<section className="arrival-part" key="japan"><h2><PlaneLanding size={20}/> Landing in Japan: Visit Japan Web</h2>
  <p>Japan’s own site for immigration and customs. About fifteen minutes for the family, done before the flight, and the queues at Haneda are shorter for it.</p>
  <Steps steps={VJW_STEPS}/><a className="button" href={VISIT_JAPAN_WEB} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Open Visit Japan Web</a></section>;
 const home=<section className="arrival-part" key="home"><h2><PlaneTakeoff size={20}/> Landing at home: the Australia Travel Declaration</h2>
  <Steps steps={ATD_STEPS}/><a className="button" href={TRAVEL_DECLARATION} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Border Force: passenger cards</a>
  <GoingHome open/></section>;
 return <>
  <p className="eyebrow">BOTH ENDS OF THE FLIGHT</p><PageTitle help={<><p>What to fill in before landing in Japan, and before landing back in Australia. The rules change, so each links to the official page. Checked September 2026.</p></>}>Arrival paperwork</PageTitle>
  {homeFirst?[home,japan]:[japan,home]}
 </>;
}
