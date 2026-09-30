// One object for what kind of plan this is and where and for whom it happens: the type, the
// time zone, the country and currency, the languages, the members and their roles. Everything
// that used to be a constant about Japan, yen or this family reads from here, and a plan that is
// a dinner in Sydney or a wedding in the Hunter Valley says so in its own record rather than by
// editing code. This is layer 1 of the modular build order (docs/commercialisation.md) plus the
// plan type from docs/design/events-and-rsvp.md. It is shared by the phone and the server, so it
// has no dependencies and no side effects.
//
// A plan's type decides which modules are on by default. Types name the modules they switch
// off rather than the ones they keep, so a page added to the app later is on everywhere until a
// type says otherwise, and the family trip, type `trip`, switches off nothing at all. An organiser
// can override any module for their plan under `plan.modules`.
// The pages that only make sense on a journey: days away, luggage, paperwork at the border,
// the destination's own content and the boys' trip games. Every type other than a trip starts
// from this list and keeps back the ones it needs.
const TRIP_ONLY=['days','packing','trackers','windows','arrival','flyinghome','homefront','vault','guide','printguide','parks','apps','local','phrases','allergy','stamps','facts','challenges','spending','showtell','mascot','games','leaderboard','capsule','book','recap','diary','nexttime','predictions','shop','thanks','nightstand','hunts','food','money','paying','shopping','shortlist','lost'];
const without=(list,keep)=>list.filter(id=>!keep.includes(id));
export const PLAN_TYPES=[
 {id:'outing',label:'Outing',note:'A dinner, drinks or a day out: hours to a day, people who know each other',
  off:TRIP_ONLY},
 {id:'party',label:'Party',note:'A birthday, a housewarming, a farewell or a kids’ party: an invitation, who is coming, what to bring',
  off:without(TRIP_ONLY,['allergy','hunts','games','shopping','thanks','book'])},
 {id:'registration',label:'Registration',note:'A class, a tour, a tee time or a team dinner with limited places',
  off:[...TRIP_ONLY,'noticed','memorymap']},
 {id:'wedding',label:'Wedding',note:'A wedding, an engagement or a milestone: households, the run sheet, the day and the year after',
  off:without(TRIP_ONLY,['days','allergy','capsule','book','recap','diary','printguide','thanks','shopping','windows'])},
 {id:'event',label:'Multi-day event',note:'An offsite, a reunion, a conference or a carnival over several days',
  off:without(TRIP_ONLY,['days','packing','printguide','food','allergy','diary','recap','book','windows'])},
 {id:'trip',label:'Trip',note:'Days to weeks away: everything the app does',
  off:[]}
];
export const PLAN_TYPE_IDS=PLAN_TYPES.map(t=>t.id);
export const planType=id=>PLAN_TYPES.find(t=>t.id===id)||PLAN_TYPES.at(-1);
// What the family trip has always assumed, now written down once. A plan without a record of
// its own is this one, so every trip saved before the record existed reads exactly as it did.
export const DEFAULT_PLAN={type:'trip',title:'',timeZone:'Asia/Tokyo',country:'JP',currency:'JPY',homeCountry:'AU',homeCurrency:'AUD',locale:'en-AU',language:'en',destinationLanguage:'ja',dialCode:'81',modules:{}};
// The record as kept on the plan, filled in from the defaults and, for the title, from the old
// trip name, so ensureFeatures can put it on any state it is handed.
export function planOf(state){
 const p=state?.plan||{};
 const out={...DEFAULT_PLAN,...p,modules:{...(p.modules||{})}};
 if(!out.title)out.title=state?.tripName||'';
 if(!PLAN_TYPE_IDS.includes(out.type))out.type='trip';
 return out;
}
// Members and roles are on the state already; the context is the plan record with them attached,
// which is what a prompt, a calendar, a look or a screen wants in one hand.
export const planContext=state=>({...planOf(state),members:state?.members||[],roles:ROLES});
// Roles by type, as the commercial version names them, mapped from the two the family app has.
// Layer 2 replaces the family's fixed names with these; until then the map is the one place the
// two vocabularies meet.
export const ROLES={parent:'organiser',child:'minor',viewer:'viewer'};
// Whether a module (a page id from nav-data.js, or a Home widget id) is on for this plan: the
// organiser's own switch first, then the type's defaults. Anything unnamed is on. Takes either
// the whole state or the plan record itself.
const recordOf=x=>x&&typeof x==='object'&&'modules' in x&&'type' in x?planOf({plan:x}):planOf(x);
export function moduleOn(planOrState,id){
 const plan=recordOf(planOrState),own=plan.modules?.[id];
 if(typeof own==='boolean')return own;
 return !planType(plan.type).off.includes(id);
}
// Every module that is off for this plan, the type's and the organiser's together.
export const modulesOff=planOrState=>{const plan=recordOf(planOrState);return [...new Set([...planType(plan.type).off,...Object.keys(plan.modules)])].filter(id=>!moduleOn(plan,id));};
// The checks the server runs on a change to the plan record. A time zone is anything Intl can
// format in; the rest are the ISO shapes. Unknown fields are refused rather than dropped, so a
// typo in a client cannot silently fail to save.
export const PLAN_FIELDS=['type','title','timeZone','country','currency','homeCountry','homeCurrency','locale','language','destinationLanguage','dialCode','modules'];
export const validTimeZone=z=>{if(typeof z!=='string'||!z||z.length>64)return false;try{new Intl.DateTimeFormat('en',{timeZone:z});return true;}catch{return false;}};
export const validLocale=l=>{if(typeof l!=='string'||!l||l.length>20)return false;try{return Intl.getCanonicalLocales(l).length===1;}catch{return false;}};
export function validPlanPatch(p,knownModules=null){
 if(!p||typeof p!=='object'||Array.isArray(p))return 'Invalid plan settings.';
 for(const [k,v] of Object.entries(p)){
  if(!PLAN_FIELDS.includes(k))return 'Unsupported plan setting.';
  if(k==='type'&&!PLAN_TYPE_IDS.includes(v))return 'Choose a kind of plan from the list.';
  if(k==='title'&&(typeof v!=='string'||v.length>120))return 'Keep the title under 120 characters.';
  if(k==='timeZone'&&!validTimeZone(v))return 'Use a time zone name such as Australia/Sydney.';
  if(['country','homeCountry'].includes(k)&&!/^[A-Z]{2}$/.test(v))return 'Use a two-letter country code.';
  if(['currency','homeCurrency'].includes(k)&&!/^[A-Z]{3}$/.test(v))return 'Use a three-letter currency code.';
  if(k==='locale'&&!validLocale(v))return 'Use a locale such as en-AU.';
  if(['language','destinationLanguage'].includes(k)&&!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(v))return 'Use a language code such as en or ja.';
  if(k==='dialCode'&&!/^\d{1,4}$/.test(v))return 'Use the country’s dialling code, digits only.';
  if(k==='modules'){
   if(!v||typeof v!=='object'||Array.isArray(v))return 'Invalid module switches.';
   for(const [id,on] of Object.entries(v)){
    if(typeof on!=='boolean'&&on!==null)return 'A module is on, off or left to the kind of plan.';
    if(knownModules&&!knownModules.includes(id))return 'Unknown module.';
   }
  }
 }
 return null;
}
// Applying a checked patch: a module switched to null goes back to the type's default rather
// than being stored as a third state.
export function applyPlanPatch(plan,p){
 const next={...planOf({plan}),...p,modules:{...planOf({plan}).modules}};
 for(const [id,on] of Object.entries(p.modules||{})){if(on===null)delete next.modules[id];else next.modules[id]=on;}
 return next;
}
