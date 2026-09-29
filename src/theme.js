// Light, dark, or whatever the phone is doing. A choice about this screen rather than a fact
// about the trip, so it lives on the phone under one key, applies before the first paint so a
// dark phone never flashes white, and degrades to light when storage is refused. Dark is a
// choice rather than automatic because the app is read at a ramen counter at midday as often
// as in a hotel room at night, and the phone's own setting does not know which.
export const THEMES=[['light','Light'],['dark','Dark'],['auto','Match the phone']];
export const THEME_KEY='japan.theme';
const device=()=>{try{return typeof localStorage==='undefined'?null:localStorage;}catch{return null;}};
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
