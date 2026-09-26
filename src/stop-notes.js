// Route details the guide left out: where we are coming from, the line, every station in
// between with its number, and which exit to take for the stop after. Written once onto a stop
// the family has not renamed or given notes of its own.
export const NOTES_SEED=1;
export const STOP_NOTES={
 '2026-09-26-07':{title:'Return towards Kyoto Station',notes:[
  'From: % Arabica by Togetsukyo Bridge. Walk north up the main street (Nagatsuji-dori), about 15 minutes, to JR Saga-Arashiyama Station (嵯峨嵐山 · JR-E08).',
  'Line: JR Sagano Line (San\'in Line), platform for Kyoto (京都方面). Every train ends at Kyoto, so ride to the last stop. Let Limited Express (特急) trains go; they need an extra ticket.',
  'Stops: 7 stops, about 15–20 minutes on a Local (普通). A Rapid (快速) skips some of them.',
  'Uzumasa JR-E07 · Hanazono JR-E06 · Emmachi JR-E05 · Nijo JR-E04 · Tambaguchi JR-E03 · Umekoji-Kyotonishi JR-E02 · Kyoto JR-E01',
  'Exit: Sagano Line trains arrive at platforms 31–33, at the west end of Kyoto Station. Go out through the Central Gate (中央口) on the Kyoto Tower side and follow signs for JR Kyoto Isetan (ジェイアール京都伊勢丹), on the west side of the concourse. The food hall is on B1.',
 ].join('\n')},
};
export function notesSeeded(state){
 if((state.notesSeed||0)>=NOTES_SEED)return state;
 const steps=(state.steps||[]).map(s=>{
  const plan=STOP_NOTES[s.id];
  return plan&&s.title===plan.title&&!s.notes?{...s,notes:plan.notes}:s;
 });
 return {...state,steps,notesSeed:NOTES_SEED};
}
