// How round the corners are, as one dial rather than eight hundred numbers. Every pixel radius
// written into our CSS becomes that radius times --round (1 unless a look says otherwise), and
// every pill (100px and over) becomes --pill (999px unless a look says otherwise). Circles —
// anything in % — are left alone: an avatar or a tick stays a circle in every look. So does a
// game board, for the same reason it keeps its colours at night (see BOARDS in dark-theme.mjs).
// It runs at build time beside the dark theme, so the stylesheets stay written in plain numbers.
import {BOARDS} from './dark-theme.mjs';
const RADIUS=/(border(?:-(?:top|bottom)-(?:left|right))?-radius\s*:\s*)([^;{}]+)/g;
const scale=value=>value.replace(/(^|[\s/])(\d*\.?\d+)px\b/g,(all,lead,n)=>{
 const px=Number(n);
 if(!px)return all;
 return lead+(px>=100?'var(--pill,999px)':`calc(${n}px * var(--round,1))`);
});
export function cornersCss(css){
 return css.replace(/([^{}]*)\{([^{}]*)\}/g,(all,selector,body)=>BOARDS.test(selector)?all:`${selector}{${body.replace(RADIUS,(m,prop,value)=>prop+scale(value))}}`);
}
