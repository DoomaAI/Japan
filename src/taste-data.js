// A guide that learns. The profiles say what each of us expected to like; the trip so far says
// what actually landed. This reads the stars on stops, the foods rated, the stops skipped, the
// shop finds starred and the things we stopped to notice, and turns them into a few plain lines
// per person — "rides and trains land with Boston (4.8★ over 6); museums do not (2.0★ over 2)" —
// that go to every suggestion, near-here search and question alongside the profiles. Nothing is
// stored: it is worked out afresh from the trip, so a changed star changes what is learned.
import {FOOD} from './food-data.js';
// The themes a stop can belong to, finer than the stop sorts: "sightseeing" is both a temple and
// a museum, and those are exactly the two a family tends to feel differently about.
export const THEMES=[
 ['temples','temples and shrines',/\b(temple|shrine|jingu|-ji\b|taisha|inari|buddha|pagoda)\b/i],
 ['museums','museums and galleries',/\b(museum|gallery|exhibition|science|aquarium)\b/i],
 ['rides','rides and theme parks',/\b(ride|coaster|disney|universal|nintendo|mario|ride|mountain|cruise|railroad|parade|show)\b/i],
 ['trains','trains and transport sights',/\b(shinkansen|train|railway|tram|monorail|station tour)\b/i],
 ['matcha','matcha, cafés and sweets',/\b(matcha|caf[eé]|coffee|tea|cheesecake|sweets?|dessert|parfait|crepe|mochi)\b/i],
 ['street','markets and street food',/\b(market|takoyaki|okonomiyaki|yokocho|street food|stall|ameyoko|nishiki|dotonbori)\b/i],
 ['meals','sit-down meals',/\b(dinner|lunch|sukiyaki|sushi|ramen|tonkatsu|wagyu|kaiseki|restaurant)\b/i],
 ['shopping','shopping and toys',/\b(shop|shopping|toys?|gachapon|pok[eé]mon|character|souvenir|kiddy|arcade|games)\b/i],
 ['nature','gardens, parks and nature',/\b(garden|park|bamboo|forest|deer|river|walk|stroll|hike)\b/i],
 ['views','views and towers',/\b(tower|sky|observation|rooftop|view|lookout)\b/i],
 ['sport','sport and sumo',/\b(sumo|baseball|giants|stadium|dome|match)\b/i]
];
export const themesOf=step=>THEMES.filter(([,,re])=>re.test(`${step?.title||''} ${step?.place||''}`)).map(([id])=>id);
const themeLabel=id=>THEMES.find(([t])=>t===id)?.[1]||id;
const avg=list=>list.reduce((a,b)=>a+b,0)/list.length;
const LANDS=4.2,FLAT=2.8,ENOUGH=2;
// One person's taste so far: themes that land and themes that do not, foods loved and not, and
// how sure each line is (how many stars it stands on).
export function tasteOf(state,name){
 const byTheme=new Map();
 for(const [id,entry] of Object.entries(state?.stepReviews||{})){
  const r=entry?.ratings?.[name];if(!r)continue;
  const step=(state.steps||[]).find(s=>s.id===id);if(!step)continue;
  for(const t of themesOf(step))byTheme.set(t,[...(byTheme.get(t)||[]),r]);
 }
 const themes=[...byTheme.entries()].map(([id,rs])=>({id,label:themeLabel(id),avg:Math.round(avg(rs)*10)/10,n:rs.length}));
 const lands=themes.filter(t=>t.n>=ENOUGH&&t.avg>=LANDS).sort((a,b)=>b.avg-a.avg||b.n-a.n);
 const flat=themes.filter(t=>t.n>=ENOUGH&&t.avg<=FLAT).sort((a,b)=>a.avg-b.avg);
 const foodName=id=>FOOD.find(f=>f.id===id)?.en||(state.foodItems||[]).find(f=>f.id===id)?.en||null;
 const foods=Object.entries(state?.food||{}).map(([id,e])=>({name:foodName(id),r:e?.ratings?.[name]})).filter(f=>f.name&&f.r);
 return {name,lands,flat,
  lovedFoods:foods.filter(f=>f.r>=4.5).sort((a,b)=>b.r-a.r).map(f=>f.name).slice(0,6),
  notFoods:foods.filter(f=>f.r<=2).map(f=>f.name).slice(0,4),
  noticed:(state?.noticed||[]).filter(n=>n.by===name&&!n.report).slice(-3).map(n=>n.text),
  rated:themes.reduce((a,t)=>a+t.n,0)};
}
// What the family as a whole has passed over: stops skipped, by theme, when a theme keeps being
// skipped. Worth knowing before suggesting a fourth museum.
export function skippedThemes(state){
 const count=new Map();
 for(const s of state?.steps||[])if(s.status==='skipped')for(const t of themesOf(s))count.set(t,(count.get(t)||0)+1);
 return [...count.entries()].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]).map(([id,n])=>({id,label:themeLabel(id),n}));
}
// The lines, as read by a person or a model.
export function tasteLines(state,name){
 const t=tasteOf(state,name),out=[];
 if(t.lands.length)out.push(`${t.lands.map(x=>`${x.label} (${x.avg}★ over ${x.n})`).join(', ')} ${t.lands.length>1?'land':'lands'} with ${name}`);
 if(t.flat.length)out.push(`${t.flat.map(x=>`${x.label} (${x.avg}★ over ${x.n})`).join(', ')} ${t.flat.length>1?'do':'does'} not`);
 if(t.lovedFoods.length)out.push(`loved: ${t.lovedFoods.join(', ')}`);
 if(t.notFoods.length)out.push(`not for ${name}: ${t.notFoods.join(', ')}`);
 if(t.noticed.length)out.push(`stopped to notice: ${t.noticed.map(n=>`“${String(n).slice(0,80)}”`).join('; ')}`);
 return out;
}
// The block every model call gets, after the profiles. Empty until something has been rated.
export function learnedBrief(state){
 const lines=(state?.members||[]).map(n=>({n,l:tasteLines(state,n)})).filter(x=>x.l.length);
 const skipped=skippedThemes(state);
 if(!lines.length&&!skipped.length)return '';
 return ['What the trip so far has shown, from their own stars, foods, skips and noticings — weigh suggestions towards what landed and away from what did not, ahead of what the profiles guessed:',
  ...lines.map(x=>`- ${x.n}: ${x.l.join('; ')}`),
  ...(skipped.length?[`- Skipped more than once: ${skipped.map(s=>`${s.label} (${s.n})`).join(', ')}`]:[])].join('\n');
}
