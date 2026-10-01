// How amounts and dates read on a card. Dates are given in Japan time, where the plan happens.
export const yen=n=>`¥${Math.round(n||0).toLocaleString('en-AU')}`;
// "Tue 29 Sep" for a plan date.
export const shortDay=date=>new Intl.DateTimeFormat('en-AU',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Tokyo'}).format(new Date(date+'T12:00:00+09:00'));
// "Tue 3:15 pm" for a moment something happened, or '' when there is none.
export const shortWhen=iso=>iso?new Intl.DateTimeFormat('en-AU',{weekday:'short',hour:'numeric',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(iso)):'';
