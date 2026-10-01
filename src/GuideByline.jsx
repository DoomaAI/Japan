import React from 'react';
import {Compass} from 'lucide-react';
import {guideOf} from './guide-data.js';
// The one guide's name on whatever it said: an answer, a near-here search, a set of suggestions,
// the night-before check. One name across the four, so it reads as one guide.
export default function GuideByline({state,verb='From'}){
 return <p className="guide-by"><Compass size={14} aria-hidden="true"/><small>{verb} {guideOf(state).name}, your guide</small></p>;
}
