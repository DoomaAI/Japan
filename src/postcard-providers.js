// The postcard's print-and-post provider: the seam, with no provider chosen yet. Today the
// Postcard button hands the card to the phone's share sheet (postcard-data.js), which works. When
// a provider is picked, it is one adapter in server/postcard.mjs and a POSTCARD_PROVIDER setting;
// the card, the address checks and the page do not change.
//
// The candidates, as assessed on 1 October 2026 from their public pages — prices and terms to be
// confirmed with each before signing up. "api" means the app could post the card itself; "app"
// means a person sends it through the provider's own app, which the share sheet already reaches.
export const POSTCARD_PROVIDERS=[
 {id:'postgrid',name:'PostGrid',kind:'api',url:'https://www.postgrid.com.au/postcard-api/',
  fit:'Best fit to build in: a REST postcard API that prints in Australia for Australian addresses, from about US$0.82 a card. Test keys before going live.'},
 {id:'clicksend',name:'ClickSend',kind:'api',url:'https://www.clicksend.com/au/post/',
  fit:'Melbourne company with a post API (letters and postcards) beside its SMS. Worth a quote: local billing and support.'},
 {id:'stannp',name:'Stannp',kind:'api',url:'https://www.stannp.com/uk/api-postcard-mailing',
  fit:'Postcard API that dispatches from the UK, US or Canada to any country. Fine for a postcard from Japan; slower to an Australian letterbox.'},
 {id:'lob',name:'Lob',kind:'api',url:'https://www.lob.com/',
  fit:'Mature postcard API with good documentation, but built around the US; international sending is limited.'},
 {id:'touchnote',name:'TouchNote',kind:'app',url:'https://touchnote.com/au/postcards/',
  fit:'Consumer app, prints in Brisbane. Has partnered before but has no open public API; best used from the share sheet.'},
 {id:'auspost',name:'Australia Post',kind:'app',url:'https://auspost.com.au/',
  fit:'Its own app sends photo postcards; no developer API for it. Again a share-sheet send.'}
];
export const postcardProvider=id=>POSTCARD_PROVIDERS.find(p=>p.id===id)||null;
// An address the provider can print: the checks every provider makes, done before anything is sent.
const AU_STATES=['ACT','NSW','NT','QLD','SA','TAS','VIC','WA'];
export function addressProblem(a){
 if(!a||typeof a!=='object')return 'Add the address.';
 if(!String(a.name||'').trim())return 'Who is it to?';
 if(!String(a.line1||'').trim())return 'Add the street address.';
 if(!String(a.city||'').trim())return 'Add the suburb or town.';
 const country=String(a.country||'AU').toUpperCase();
 if(country==='AU'){
  if(!/^\d{4}$/.test(String(a.postcode||'').trim()))return 'An Australian postcode is four digits.';
  if(!AU_STATES.includes(String(a.state||'').toUpperCase()))return `The state is one of ${AU_STATES.join(', ')}.`;
 }else if(!String(a.postcode||'').trim())return 'Add the postcode.';
 return '';
}
// The job every adapter takes: a photo for the front, the words for the back, one address.
export function postcardJob(card,photo,address){
 const problem=addressProblem(address);if(problem)return {error:problem};
 const text=String(card?.text||'').trim().slice(0,600);if(!text)return {error:'The card has no words.'};
 if(!photo?.id)return {error:'Choose a photo for the front.'};
 const clean=k=>String(address[k]||'').trim().slice(0,80);
 return {job:{photoId:photo.id,text,to:{name:clean('name'),line1:clean('line1'),line2:clean('line2'),city:clean('city'),state:clean('state').toUpperCase(),postcode:clean('postcode'),country:(clean('country')||'AU').toUpperCase()}}};
}
