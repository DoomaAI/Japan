// Flying home with what we bought. Three questions the airport asks that the shopping list
// never did: what goes on the Incoming Passenger Card, whether the haul is inside the duty-free
// allowance, and whether it fits in the cases. All three are read off lists the family already
// keeps — the shopping list, the purchase shortlist, the boys' purses — so nothing is typed twice.
//
// The classing is by words in the item's name against the declare categories in going-home.js.
// It is a prompt, not a ruling: a thing it cannot place is listed as "have a look", and the rule
// on the card stays "if in doubt, declare it".
import {DECLARE} from './going-home.js';
import {ageOf} from './child-levels.js';
import {yenPerAud,yenToAud} from './trip-features.js';
const WORDS={
 food:['kitkat','kit kat','snack','sweet','lolly','lollies','chocolate','choc','tea','matcha','cracker','senbei','noodle','ramen','candy','mochi','sake','whisky','whiskey','beer','shochu','umeshu','curry','dashi','miso','soy','biscuit','cookie','pocky','gum','jelly','wagashi','castella','tokyo banana','yokan','furikake','seasoning','spice','sauce','instant','cup noodle','coffee','honey','jam','cheese','wine'],
 plants:['seed','rice','bean','nut','mushroom','shiitake','flower','bonsai','wreath','grain','wheat','barley','bamboo shoot','dried fruit','pine cone','moss','plant','bulb'],
 animal:['bonito','katsuobushi','dried fish','fish','feather','shell','leather','wool','fur','bone','horn','egg','jerky','meat','pork','beef','chicken','ham','sausage','dairy','milk','butter'],
 wood:['kokeshi','chopstick','bamboo','straw','wooden','wood','ema','plaque','tansu','cypress','hinoki','cedar','rattan','wicker','basket','cork'],
 soil:['soil','sand','stone from','pebble','mud']
};
export const DECLARE_LABEL=id=>DECLARE.find(d=>d.id===id)?.title||'Have a look';
// The category a name falls under, or null for a thing the words cannot place.
export function classify(title){
 const t=String(title||'').toLowerCase();
 if(!t)return null;
 for(const [id,words] of Object.entries(WORDS))if(words.some(w=>t.includes(w)))return id;
 return null;
}
// Things that were bought, wherever they were written down: the shopping list once ticked, the
// shortlist once marked bought, and the boys' purses once the till took the money.
export function boughtItems(state){
 const out=[];
 for(const s of state?.shopping||[])if(s.boughtAt)out.push({id:`shop-${s.id}`,title:s.title,qty:s.quantity||1,yen:s.budget||null,who:s.person||'Family',source:'shopping',taxFree:!!s.taxFree});
 for(const s of state?.shortlist||[])if(s.status==='bought')out.push({id:`short-${s.id}`,title:s.title,qty:1,yen:Number.isFinite(s.price)?s.price:null,who:s.person||'Family',source:'shortlist',taxFree:!!s.taxFree});
 for(const i of (state?.spending?.items)||[])if(i.boughtAt)out.push({id:`purse-${i.id}`,title:i.title,qty:1,yen:Number.isFinite(i.spent)?i.spent:(i.estimate||null),who:i.person,source:'purse',taxFree:false});
 return out.map(i=>({...i,declare:classify(i.title),kg:weightOf(i.title)*(i.qty||1)}));
}
// What to tick yes to, with our things under each, and the ones the words cannot place.
export function declareGroups(state){
 const items=boughtItems(state),groups=DECLARE.map(d=>({...d,items:items.filter(i=>i.declare===d.id)})).filter(g=>g.items.length);
 return {groups,unsure:items.filter(i=>!i.declare),any:items.some(i=>i.declare)};
}
// Duty-free: everything bought overseas counts, tax-free purchases included, against A$900 an
// adult and A$450 a child, which a family travelling together may pool.
export const ADULT_AUD=900,CHILD_AUD=450;
export function dutyFree(state){
 const rate=yenPerAud(state),items=boughtItems(state).filter(i=>Number.isFinite(i.yen));
 const yen=items.reduce((s,i)=>s+i.yen*(i.qty||1),0),aud=yenToAud(yen,rate);
 const members=state?.members||[];
 const allowance=members.reduce((s,n)=>{const a=ageOf(state,n);return s+(a!==null&&a<18?CHILD_AUD:ADULT_AUD);},0);
 return {yen,aud,rate,allowance,over:Math.max(0,Math.round((aud-allowance)*100)/100),counted:items.length,unpriced:boughtItems(state).length-items.length};
}
// Rough weights, by words in the name, for a case that has to come in under the allowance.
const KG=[[1.4,['sake','whisky','whiskey','wine','bottle','shochu','umeshu']],[1.2,['lego','ceramic','pottery','bowl','plate','teapot','cast iron','tetsubin','knife set']],
 [0.8,['jacket','coat','shoes','sneaker','boots','book','manga set','figure','model','kokeshi']],[0.5,['plush','toy','t-shirt','shirt','hoodie','yukata','tenugui','bag','cap','hat','umbrella','stationery']],
 [0.25,['kitkat','kit kat','snack','sweet','chocolate','tea','matcha','cracker','senbei','pocky','mochi','candy','gum','keyring','key ring','sticker','badge','pin','charm','omamori','postcard','washi','pen','socks']]];
export const DEFAULT_KG=0.4;
export function weightOf(title){
 const t=String(title||'').toLowerCase();
 for(const [kg,words] of KG)if(words.some(w=>t.includes(w)))return kg;
 return DEFAULT_KG;
}
// The airline's checked allowance per person, to set against what the cases weighed on the
// way over; the fare on the ticket is the last word, which is why the room left is typed in.
export const ALLOWANCE_KG=30;
export function weightBudget(state,roomLeftKg){
 const items=boughtItems(state),added=Math.round(items.reduce((s,i)=>s+i.kg,0)*10)/10;
 const room=Number.isFinite(roomLeftKg)?roomLeftKg:null;
 const over=room===null?null:Math.max(0,Math.round((added-room)*10)/10);
 // If it does not fit: the heaviest things first, until what is left fits.
 const post=[];if(over){let need=over;for(const i of [...items].sort((a,b)=>b.kg-a.kg)){if(need<=0)break;post.push(i);need-=i.kg;}}
 return {items,added,room,over,post,people:(state?.members||[]).length,allowanceEach:ALLOWANCE_KG};
}
