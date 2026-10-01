// Light, dark, or whatever the phone is doing. A choice about this screen rather than a fact
// about the trip, so it lives on the phone under one key, applies before the first paint so a
// dark phone never flashes white, and degrades to light when storage is refused. Dark is a
// choice rather than automatic because the app is read at a ramen counter at midday as often
// as in a hotel room at night, and the phone's own setting does not know which.
import {localStore as device} from './browser.js';
export const THEMES=[['light','Light'],['dark','Dark'],['auto','Match the phone']];
export const THEME_KEY='japan.theme';
export function readTheme(store=device()){
 // Stored plain, but read tolerantly: a copy written through the JSON-backed hook is the same choice in quotes.
 try{const v=String(store?.getItem(THEME_KEY)??'').replace(/^"|"$/g,'');return THEMES.some(([id])=>id===v)?v:'light';}catch{return 'light';}
}
export function saveTheme(theme,store=device()){
 const id=THEMES.some(([t])=>t===theme)?theme:'light';
 try{store?.setItem(THEME_KEY,id);}catch{}
 return id;
}
// Whether the screen is dark right now, given the choice and what the phone says.
export const isDark=(theme,prefersDark=false)=>theme==='dark'||(theme==='auto'&&prefersDark);
// The bar above the app takes the page colour, so the status bar does not sit as a pale strip
// over a dark screen. Anything the browser refuses (no document, no meta) is simply skipped.
export const THEME_COLOUR={light:'#f4f3ef',dark:'#121311'};
export function applyTheme(theme,doc=typeof document==='undefined'?null:document,prefersDark=typeof matchMedia==='function'&&matchMedia('(prefers-color-scheme: dark)').matches){
 if(!doc)return theme;
 doc.documentElement.dataset.theme=theme;
 // index.html carries one per phone scheme; a choice made here overrides both.
 const metas=doc.querySelectorAll?[...doc.querySelectorAll('meta[name="theme-color"]')]:[doc.querySelector('meta[name="theme-color"]')];
 for(const meta of metas)meta?.setAttribute('content',THEME_COLOUR[isDark(theme,prefersDark)?'dark':'light']);
 return theme;
}
// Which look, separate from light or dark: the palette and type a trip is dressed in. A look is a
// CSS block under :root[data-look=<id>] plus one line in LOOKS, and Settings shows a picker once
// there is more than one. Washi (house-theme.css) is the house look; the printed guide's is kept
// beside it for anyone who prefers it. A person can choose a look for their phone, or leave it to the destination, which
// is the default: a trip to Italy should not open dressed as Japan. The destination is one
// constant until the trip context (commercialisation build order, layer 1) supplies it.
export const LOOKS=[['washi','Washi'],['guide','The printed guide']];
export const BY_COUNTRY='country';
export const LOOK_CHOICES=[[BY_COUNTRY,'Match the destination'],...LOOKS];
// ISO 3166 country to its look. A country with none of its own falls back to the first look.
export const COUNTRY_LOOKS={JP:'washi'};
export const TRIP_COUNTRY='JP';
export const LOOK_KEY='japan.look';
const lookChoice=v=>LOOK_CHOICES.some(([id])=>id===v);
export function readLook(store=device()){
 try{const v=String(store?.getItem(LOOK_KEY)??'').replace(/^"|"$/g,'');return lookChoice(v)?v:BY_COUNTRY;}catch{return BY_COUNTRY;}
}
export function saveLook(look,store=device()){
 const id=lookChoice(look)?look:BY_COUNTRY;
 try{store?.setItem(LOOK_KEY,id);}catch{}
 return id;
}
// The look actually worn: the person's own choice if it still exists, otherwise the destination's.
export const resolveLook=(choice,country=TRIP_COUNTRY)=>LOOKS.some(([id])=>id===choice)?choice:COUNTRY_LOOKS[String(country||'').toUpperCase()]||LOOKS[0][0];
export function applyLook(choice,country=TRIP_COUNTRY,doc=typeof document==='undefined'?null:document){
 const look=resolveLook(choice,country);
 if(doc)doc.documentElement.dataset.look=look;
 return look;
}
