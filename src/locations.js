export const locationKey=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g,' ').trim();
export function resolveLocation(state,target){
 if(!target)return null;
 if(typeof target==='object'&&Object.hasOwn(target,'locationId'))return (state.locations||[]).find(l=>l.id===target.locationId)||null;
 const raw=typeof target==='string'?target:target.place;
 const exact=(state.locations||[]).filter(l=>(l.aliases||[l.name]).includes(raw));
 if(exact.length===1)return exact[0];
 const key=locationKey(raw);
 if(!key)return null;
 const matches=(state.locations||[]).filter(l=>(l.aliases||[l.name]).some(a=>locationKey(a)===key));
 return matches.length===1?matches[0]:null;
}
export function locationDestination(location){return [location.name,location.address||[location.district,location.city,'Japan'].filter(Boolean).join(', ')].filter(Boolean).join(', ');}
export function destinationFor(state,target){const match=resolveLocation(state,target);return match?locationDestination(match):typeof target==='string'?target:target?.place||target?.title||'';}
export function locationDirections(location,mode='transit'){return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',destination:locationDestination(location),travelmode:mode});}
export function locationsForPage(state,page){
 const ids=new Set(state.steps.filter(s=>s.page===page).map(s=>resolveLocation(state,s)?.id).filter(Boolean));
 return (state.locations||[]).filter(l=>ids.has(l.id)||(l.guidePages||[]).includes(page));
}

// Use the activity's own wording first; linked catalogue names enrich existing trips.
export function showLocationDetails(state,step){
 const location=resolveLocation(state,step);
 const english=step?.place||location?.name||step?.title||'';
 const japanese=step?.japanese?.trim()||location?.japanese||'';
 const address=location?.japaneseAddress||location?.address||'';
 return {english,japanese,address,copyText:[japanese,english,address].filter(Boolean).join('\n')};
}
