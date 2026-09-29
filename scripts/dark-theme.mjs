// Dark mode without rewriting a stylesheet by hand. Every colour written into our CSS — a hex, an
// rgb() or rgba(), white or black — becomes a custom property whose light value is exactly what
// was written, and whose dark value is the same colour with its lightness turned over: hue kept,
// saturation eased, so a pale green card becomes a deep green one and dark ink becomes pale ink.
// Every pairing of text on background keeps its contrast because both sides turn over together.
// It runs at build time, so the stylesheets stay written in plain colours and anything added
// later is dark-ready without anybody remembering to be.
//
// The phone chooses: dark when the phone is in dark mode, unless the page is told otherwise by
// data-theme on <html>, which is how a person's own choice in Settings wins either way.
const HEX=/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b/gi;
const RGB=/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/gi;
const NAMED=/(?<![-\w.#])(white|black)(?![-\w])/gi;

export function parseColour(text){
 const t=text.trim().toLowerCase();
 if(t==='white')return [255,255,255,1];
 if(t==='black')return [0,0,0,1];
 const rgb=/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(t);
 if(rgb)return [+rgb[1],+rgb[2],+rgb[3],rgb[4]===undefined?1:+rgb[4]];
 let h=t.replace('#','');
 if(h.length<=4)h=[...h].map(c=>c+c).join('');
 const n=i=>parseInt(h.slice(i,i+2),16);
 return [n(0),n(2),n(4),h.length===8?n(6)/255:1];
}
const toHsl=([r,g,b])=>{
 r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;
 if(max===min)return [0,0,l];
 const d=max-min,s=l>.5?d/(2-max-min):d/(max+min);
 const h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;
 return [h*60,s,l];
};
const fromHsl=(h,s,l)=>{
 const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1));
 return [f(0),f(8),f(4)].map(v=>Math.round(v*255));
};
const hex=([r,g,b,a])=>'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')+(a<1?Math.round(a*255).toString(16).padStart(2,'0'):'');
// The dark counterpart of one colour. Shadows and scrims — dark and see-through — stay dark, since
// a shadow that turned pale would glow. Everything else has its lightness turned over into a
// range that never reaches pure black or pure white, which reads better on a phone at night.
export function darkOf(text){
 const [r,g,b,a]=parseColour(text),[h,s,l]=toHsl([r,g,b]);
 if(a<.6&&l<.5)return hex([0,0,0,Math.min(1,a*1.6)]);
 // Strong mid-tones — the accent, a warning red — are both a fill under text and text on a
 // surface, so they keep their lightness (lifted a touch) rather than turning over into mud.
 if(l>.4&&l<.65&&s>.3)return hex([...fromHsl(h,s*.9,Math.max(l,.6)),a]);
 // Near-white paper loses most of its tint, or a cream page turns into a brown one.
 const flipped=.1+(1-l)*.82,eased=s*(l>.9?.2:l>.8?.45:.8);
 return hex([...fromHsl(h,eased,flipped),a]);
}
const key=text=>{const [r,g,b,a]=parseColour(text);return 'c'+hex([r,g,b,a]).slice(1);};
// Colours in declaration values only: selectors, comments and names are left alone.
export function themeCss(css){
 const seen=new Map();
 const swap=m=>{const k=key(m);if(!seen.has(k))seen.set(k,m);return `var(--${k})`;};
 const out=css.replace(/\/\*[\s\S]*?\*\/|([\w-]+)(\s*:\s*)([^;{}]+)/g,(all,prop,colon,value)=>{
  if(!prop)return all;
  return prop+colon+value.replace(HEX,swap).replace(RGB,swap).replace(NAMED,swap);
 });
 if(!seen.size)return css;
 const light=[...seen].map(([k,v])=>`--${k}:${hex(parseColour(v))}`).join(';');
 const dark=[...seen].map(([k,v])=>`--${k}:${darkOf(v)}`).join(';');
 return `:root{${light}}@media screen and (prefers-color-scheme:dark){:root:not([data-theme=light]){${dark};color-scheme:dark}}@media screen{:root[data-theme=dark]{${dark};color-scheme:dark}}\n`+out;
}
// The same pair for a colour written in a script — a chart's axis, an SVG's fill — so drawings
// can ask for either.
export function pair(text){return {light:hex(parseColour(text)),dark:darkOf(text)};}
