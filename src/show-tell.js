// The show-and-tell page. Term starts the week we land, and the first thing each boy is asked
// is what he did in the holidays. One page each, out of what the app already holds: three of
// his photos, the missions he finished, one thing he noticed, a phrase he can say, the stop he
// starred highest, and a few sentences to read out, with the phone reading them first.
import {photosFor,photoOfTheDay,photoOwner,stepRatings,phraseLogFor} from './trip-features.js';
import {noticedFor} from './noticed-data.js';
import {stampsFor} from './stamp-data.js';
export function showTellFor(state,boy,today){
 const days=state?.days||[],steps=state?.steps||[];
 const winners=days.map(d=>photoOfTheDay(state,d.date)?.winners?.[0]).filter(p=>p&&photoOwner(p)===boy);
 const own=days.flatMap(d=>photosFor(state,d.date)).filter(p=>p.pathname&&photoOwner(p)===boy&&!winners.includes(p));
 const photos=[...winners,...own].slice(0,3);
 const missions=(state?.challenges||[]).filter(c=>c.completions?.[boy]).map(c=>({id:c.id,title:c.title,icon:c.icon||'',day:c.day}));
 const noticed=noticedFor(state,{person:boy})[0]||null;
 const phrase=phraseLogFor(state,boy)[0]||null;
 const rated=steps.map(s=>({step:s,stars:stepRatings(state,s.id)[boy]||0})).filter(x=>x.stars>0).sort((a,b)=>b.stars-a.stars);
 const favourite=rated[0]?{title:rated[0].step.title,stars:rated[0].stars,day:rated[0].step.day}:null;
 const stops=steps.filter(s=>s.status==='done'&&(s.participants||[]).includes(boy)).length;
 const cities=[...new Set(days.map(d=>d.city).filter(Boolean))];
 // The stamp book, as one number: everything he has in it, the family's and his own.
 const stamps=stampsFor(state,boy,today).length;
 return {boy,photos,missions,noticed,phrase,favourite,stops,days:days.length,cities,stamps};
}
// The sentences to read out, in a child's own register, from what is actually there.
export function showTellSpeech(pack){
 if(!pack)return '';
 const s=[`In the holidays I went to Japan for ${pack.days} days.`];
 if(pack.cities.length)s.push(`We went to ${pack.cities.length===1?pack.cities[0]:`${pack.cities.slice(0,-1).join(', ')} and ${pack.cities.at(-1)}`}.`);
 if(pack.favourite)s.push(`My favourite thing was ${pack.favourite.title}.`);
 if(pack.missions.length)s.push(`I did ${pack.missions.length} mission${pack.missions.length===1?'':'s'}, like ${pack.missions[0].title.toLowerCase()}.`);
 if(pack.stamps)s.push(`I collected ${pack.stamps} stamp${pack.stamps===1?'':'s'} in my stamp book.`);
 if(pack.noticed?.text)s.push(`I noticed ${pack.noticed.text.replace(/\.$/,'')}.`);
 if(pack.phrase?.en)s.push(`I can say ${pack.phrase.en.replace(/[.!?]$/,'').toLowerCase()} in Japanese: ${pack.phrase.ja}`);
 s.push('Thank you for listening.');
 return s.join(' ');
}
