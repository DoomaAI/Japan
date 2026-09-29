// Who a stop was booked through, when that is not the place itself: the hotel reserved on
// Booking.com, the tea ceremony on Klook, the shinkansen on SmartEX. The place keeps its own
// website; the booking lives with whoever took the money, and that is where it gets changed,
// cancelled or shown at the desk. So the stop carries the two apart — `website` for the place,
// `bookedVia` (a name) and `bookedViaUrl` (the booking in that app or site) for the booking.
//
// A name we know brings its own link, so "Booking.com" typed on its own still opens somewhere
// useful. On a phone with the app installed these https links open in the app.
export const BOOKING_PLATFORMS=[
 {label:'Booking.com',url:'https://secure.booking.com/mytrips.html',words:['booking.com']},
 {label:'Agoda',url:'https://www.agoda.com/',words:['agoda']},
 {label:'Expedia',url:'https://www.expedia.com.au/trips',words:['expedia']},
 {label:'Hotels.com',url:'https://au.hotels.com/',words:['hotels.com']},
 {label:'Airbnb',url:'https://www.airbnb.com.au/trips',words:['airbnb']},
 {label:'Trip.com',url:'https://au.trip.com/',words:['trip.com']},
 {label:'Jalan',url:'https://www.jalan.net/en/',words:['jalan']},
 {label:'Rakuten Travel',url:'https://travel.rakuten.com/',words:['rakuten travel','travel.rakuten']},
 {label:'Klook',url:'https://www.klook.com/en-AU/',words:['klook']},
 {label:'KKday',url:'https://www.kkday.com/en-au/',words:['kkday']},
 {label:'Viator',url:'https://www.viator.com/en-AU/',words:['viator']},
 {label:'GetYourGuide',url:'https://www.getyourguide.com/',words:['getyourguide','get your guide']},
 {label:'TableCheck',url:'https://www.tablecheck.com/en/',words:['tablecheck']},
 {label:'OMAKASE',url:'https://omakase.in/en',words:['omakase.in']},
 {label:'OpenTable',url:'https://www.opentable.com.au/',words:['opentable']},
 {label:'SmartEX',url:'https://smart-ex.jp/en/',words:['smartex','smart-ex']},
 {label:'Eki-net',url:'https://www.eki-net.com/en/',words:['eki-net','ekinet']},
 {label:'Tokyo Disney Resort app',url:'https://www.tokyodisneyresort.jp/en/tdr/app.html',words:['tokyodisneyresort','tokyo disney resort'],guess:false},
 {label:'Universal Studios Japan app',url:'https://www.usj.co.jp/web/en/us',words:['usj.co.jp','universal studios japan'],guess:false}
];
const squash=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
// The platform a typed name means, forgiving case, spaces and dots: "booking.com", "Booking com"
// and "BOOKING.COM" are all the same company.
export function platformFor(name){
 const n=squash(name);
 if(!n)return null;
 return BOOKING_PLATFORMS.find(p=>squash(p.label)===n||p.words.some(w=>squash(w)===n))||null;
}
const host=v=>{try{const u=new URL(v);return u.protocol==='https:'?u.hostname.replace(/^www\./,''):'';}catch{return '';}};
const platformHost=p=>host(p.url).replace(/^(secure|au)\./,'');
// What the stop shows: the name, and where tapping it goes. The link saved against the booking
// wins over the platform's front door; a link with no name is named for the platform it is on,
// or failing that its address.
export function bookedVia(step){
 const name=String(step?.bookedVia||'').trim(),link=host(step?.bookedViaUrl)?step.bookedViaUrl:'';
 if(!name&&!link)return null;
 const h=host(link),known=name?platformFor(name):BOOKING_PLATFORMS.find(p=>h===platformHost(p)||h.endsWith('.'+platformHost(p)))||null;
 return {label:known?.label||name||h,href:link||known?.url||'',known:!!known};
}
// A forwarded confirmation usually says who sent it, somewhere in the subject or the body. The
// first agent named is the one it came through; nothing named means nothing guessed. The parks
// are left out: a hotel "near Tokyo Disney Resort" was not booked through Disney.
export function guessPlatform(...texts){
 const hay=texts.map(t=>String(t||'').toLowerCase()).join('\n');
 let best=null,at=Infinity;
 for(const p of BOOKING_PLATFORMS.filter(p=>p.guess!==false))for(const w of p.words){const i=hay.indexOf(w);if(i>=0&&i<at){best=p;at=i;}}
 return best?.label||'';
}
