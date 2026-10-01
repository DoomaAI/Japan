// The photo that develops tomorrow, and the moment. Two of Dispo's and BeReal's ideas on the
// photo of the day. Film: a photo taken with the Film switch on is saved as usual and hidden from
// every phone, the photographer's included, until seven the next morning, when the morning brief
// says the roll is in. The moment: once a day, at a time picked from the date so it is the same on
// every phone, a two-minute window opens; a photo taken in it is marked, and the moment's photos
// sit together in that evening's vote.
export const DEVELOP_HOUR='07:00';
const nextDay=day=>{const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);};
export const developsAt=p=>Date.parse(`${nextDay(p.day)}T${DEVELOP_HOUR}:00+09:00`);
export const isDeveloping=(p,now=Date.now())=>!!p?.film&&!!p.day&&now<developsAt(p);
// The roll for a morning: film photos from the day before, now out.
export const rollFor=(state,today,now=Date.now())=>(state?.photos||[]).filter(p=>p.film&&nextDay(p.day)===today&&!isDeveloping(p,now));
export const developingCount=(state,day,now=Date.now())=>(state?.photos||[]).filter(p=>p.day===day&&isDeveloping(p,now)).length;
// The moment: a minute between 10:00 and 19:58 Japan time, from the date alone.
export const MOMENT_FROM=600,MOMENT_TO=1198,MOMENT_MINUTES=2,MOMENT_GRACE=3;
const seed=day=>{let h=2166136261;for(const c of String(day)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export function momentFor(day){
 const minute=MOMENT_FROM+seed(`moment|${day}`)%(MOMENT_TO-MOMENT_FROM);
 const clock=`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
 const start=Date.parse(`${day}T${clock}:00+09:00`);
 return {clock,start,end:start+MOMENT_MINUTES*60000};
}
export const inMoment=(day,now=Date.now())=>{const m=momentFor(day);return now>=m.start&&now<m.end;};
// The server allows a few minutes after the window for an upload still on its way.
export const momentAccepts=(day,now=Date.now())=>{const m=momentFor(day);return now>=m.start&&now<m.end+MOMENT_GRACE*60000;};
// What a phone is sent of a photo still developing: that it exists, whose it is, and nothing of it.
export const developingStub=p=>({id:p.id,by:p.by,for:p.for,day:p.day,film:true,developing:true,at:p.at,moment:!!p.moment});
