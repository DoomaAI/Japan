// The two days the trip is a journey rather than a place: the day we fly to Japan and the day we
// fly home. Both are the plan's own dates (the first and the last), read in the plan's clock, so
// the party starts at Tokyo's midnight on every phone at once.
export const OUT_PIECES=['✈️','🌸','🗾','🎌','🏯','🍣','🗻','🏮','🎉','✨'];
export const HOME_PIECES=['✈️','🏠','🦘','🐨','🌏','💚','💛','🌸','🎉','✨'];
export function travelDay(days,today){
 const dates=(days||[]).map(d=>d.date).filter(Boolean).sort(),first=dates[0],last=dates.at(-1);
 if(!first||!today)return null;
 if(today===first)return {kind:'out',date:today,title:'We’re off to Japan!',sub:'Day 1 · in the air today, in Japan tonight. Passports out!',page:'arrival',action:'Landing paperwork',pieces:OUT_PIECES};
 if(today===last)return {kind:'home',date:today,title:'Homeward bound!',sub:`${dates.length} days of Japan, and every one of us coming home with a story`,page:'flyinghome',action:'Flying home',pieces:HOME_PIECES};
 return null;
}
// The burst is once a phone, once a day: the card stays all day, the fuss does not.
export const travelDayKey=date=>`japan.travelday.${date}`;
