// The photos from the handout, built into the app as data rather than fetched, so they are
// there in the basement with no signal. Each is a small greyscale square, a few kilobytes.
const PHOTOS=import.meta.glob('./sumo-photos/*.jpg',{eager:true,query:'?inline',import:'default'});
export const sumoPhoto=name=>PHOTOS[`./sumo-photos/${String(name||'').trim().toLowerCase()}.jpg`]||null;
