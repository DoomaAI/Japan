import React,{useState} from 'react';
import {Coins,Banknote,Volume2,Square,Sparkles,Check,Eye,Wallet,Trophy} from 'lucide-react';
import {useReadAloud,SILENT_HINT} from './AdventurePages.jsx';
import {CoinFace,NoteFace} from './MoneyArt.jsx';
import {COINS,NOTES,OLD_NOTES,MONEY,MONEY_ALOUD,moneyAloud,kindOf} from './money-data.js';
import {yenToAud,moneyFind,moneyTally} from './trip-features.js';
import {japanDate} from './timing.js';
import {dayLabel} from './AdventurePages.jsx';
import {YOUNG_RATE} from './speech.js';
const yen=n=>`¥${Math.round(n||0).toLocaleString('en-AU')}`;
const dollars=(n,rate)=>`$${yenToAud(n,rate).toFixed(2)}`;
// One press, one thing said, and the same button wherever it turns up. It is deliberately not
// ReadAloudButton: that one reads a mission, and this one has a picture beside it that the
// words are about, so it says "Tell me about this one" rather than "Read to me".
function HearIt({id,text,reading,read,rate,young,label='Tell me about this one'}){
 const going=reading===id;
 return <button type="button" className={`read-aloud money-hear${young?' young':''}`}
  aria-label={going?'Stop reading':`${label}, read aloud`} onClick={()=>read(id,text,'en-AU',rate)}>
  {going?<><Square size={15}/>Stop</>:<><Volume2 size={16}/>{label}</>}</button>;
}
// Ticking one off. Two buttons rather than one tick, because getting a coin in your change and
// only ever being shown one are different things to a boy filling a set — and a ¥10,000 note is
// never going in his purse, so a single tick would either lie or stay empty forever. Pressing
// the one that is already on takes it back off, which is how a five-year-old undoes a mis-tap.
function FoundButtons({item,found,person,mine,busy,mutate}){
 if(!mine)return found?<p className="money-found"><Check size={15}/>
  {found.had?`${person} has had one of these`:`${person} has seen one`}</p>:null;
 const on=want=>!!found&&found.had===(want==='had');
 const set=want=>mutate({type:'moneyFound',id:item.id,person,state:on(want)?'no':want});
 return <div className="money-tick">
  <button type="button" className={`money-got${found?.had?' on':''}`} disabled={busy}
   aria-pressed={on('had')} onClick={()=>set('had')}>
   {on('had')?<Check size={16}/>:<Wallet size={16}/>}I got one</button>
  <button type="button" className={`money-seen${on('saw')?' on':''}`} disabled={busy}
   aria-pressed={on('saw')} onClick={()=>set('saw')}>
   {on('saw')?<Check size={16}/>:<Eye size={16}/>}I only saw one</button>
 </div>;
}
// One piece of money, both sides, with what is on each side spelled out. The picture comes
// before the words on purpose: a five-year-old matches the drawing to the coin in his hand and
// never reads a line of this, which is what the speaker button is for.
function MoneyCard({item,rate,aloud,found,person,mine,busy,mutate}){
 const coin=kindOf(item)==='coin';
 return <article className={`money-card ${coin?'coin':'note'}${found?found.had?' got':' seen':''}`}>
  <div className="money-head">
   <div>
    <strong>{item.name}</strong>
    <small lang="ja">{item.ja}</small>
    <small className="money-say">say it: {item.say}</small>
   </div>
   <div className="money-worth">
    <strong>{yen(item.yen)}</strong>
    <small>{dollars(item.yen,rate)}</small>
   </div>
  </div>
  {found&&<p className="money-stamp"><Check size={14}/>
   {found.had?'In your hand':'Seen it'}{found.at?` · ${dayLabel(japanDate(new Date(found.at)))}`:''}
   {found.pending?' · waiting to sync':''}</p>}
  <div className="money-sides">
   {['front','back'].map(side=><figure key={side}>
    {coin?<CoinFace coin={item} side={side}/>:<NoteFace note={item} side={side}/>}
    <figcaption>
     <span className="money-side">{coin
      ?side==='front'?'The picture side':'The number side'
      :side==='front'?'The front':'The back'}</span>
     <strong>{item[side].shows}</strong>
     <span>{item[side].why}</span>
    </figcaption>
   </figure>)}
  </div>
  <p className="money-spot"><Sparkles size={15}/><span><strong>How to tell it apart.</strong> {item.spot}</span></p>
  <p className="money-buys">{item.worth}</p>
  {aloud&&<HearIt id={`money-${item.id}`} text={moneyAloud(item,rate)} reading={aloud.reading}
   read={aloud.read} rate={aloud.rate} young={aloud.young}/>}
  <FoundButtons item={item} found={found} person={person} mine={mine} busy={busy} mutate={mutate}/>
 </article>;
}
// Every coin and note, drawn on both sides, with what each one is worth in yen and in dollars
// at the family's own rate. It sits under the purse because it answers the question the purse
// raises: the number on the screen says ¥1,850, and this is what ¥1,850 looks like in a hand.
export default function MoneyPictures({state,user,rate,person,mine,busy,mutate}){
 const {supported:canRead,reading,read,problem}=useReadAloud();
 const young=user?.name==='Nate';
 const [group,setGroup]=useState('coins');
 // Nate is why the button exists, so he gets it slower. Anyone else gets talking pace, which
 // is what a parent reading it out to him over his shoulder would want.
 const aloud=canRead?{reading,read,rate:young?YOUNG_RATE:undefined,young}:null;
 const list=group==='coins'?COINS:group==='notes'?NOTES:OLD_NOTES;
 const whole=moneyTally(state,person),here=moneyTally(state,person,list);
 const full=whole.found===whole.total;
 return <section className="money-pictures">
  <div className="section-heading"><div>
   <p className="eyebrow">WHAT THE MONEY ACTUALLY LOOKS LIKE</p>
   <h2>Every coin and note, both sides</h2>
  </div></div>
  <p>{young
   ?'These are the coins and notes you will be handed. Every one is drawn twice, because both sides look different. Press the speaker on any of them and it will tell you what it is and how much it is worth.'
   :'Both sides of everything, what is painted on each one, and what it is worth in yen and in dollars. Japanese coins put the picture on one side and the number on the other, so the way to read a coin you do not know is to turn it over.'}</p>
  {mine&&<p>{young
   ?'When you get one, press the purse under it. When you only get to look at one, press the eye. Try to find all of them before we come home.'
   :`Tick each one off as it turns up: the purse for one ${person} actually got, the eye for one he only got to look at. A ¥10,000 note is worth seeing and is never going in a pocket, so the two are counted apart.`}</p>}
  {/* The set, and how far through it he is. Having one in your hand counts as having seen it,
      so the bar fills once and the darker part of it is the money that actually turned up. */}
  <div className={`money-progress${full?' full':''}`}>
   <strong>{full?<><Trophy size={18}/>{person} has found every one</>
    :`${person} has found ${whole.found} of ${whole.total}`}</strong>
   <div className="money-meter" role="img"
    aria-label={`${whole.had} had and ${whole.saw} seen, out of ${whole.total}`}>
    <span className="money-had" style={{width:`${(whole.had/whole.total)*100}%`}}/>
    <span className="money-saw" style={{width:`${(whole.saw/whole.total)*100}%`}}/>
   </div>
   <small>{whole.had} in {person===user.name?'your':`${person}’s`} own hand · {whole.saw} seen but never kept
    {here.total!==whole.total?` · ${here.found} of the ${here.total} on this tab`:''}</small>
  </div>
  {aloud&&<><HearIt id="money-all" text={MONEY_ALOUD} reading={reading} read={read}
    rate={aloud.rate} young={young} label="Tell me about Japanese money"/>
   <p><small>{SILENT_HINT}</small></p></>}
  {problem&&<p className="callout">{problem}</p>}
  <div className="segmented money-groups">
   <button className={group==='coins'?'selected':''} onClick={()=>setGroup('coins')}><Coins size={16}/>Coins</button>
   <button className={group==='notes'?'selected':''} onClick={()=>setGroup('notes')}><Banknote size={16}/>Notes</button>
   <button className={group==='older'?'selected':''} onClick={()=>setGroup('older')}>Older notes</button>
  </div>
  {group==='coins'&&<p className="money-lead">Six coins, smallest to biggest. Two of them have a hole through the middle — the gold one with a hole is five yen, the silver one with a hole is fifty. There are no coins worth more than five hundred and no notes worth less than a thousand, so everything between is metal.</p>}
  {group==='notes'&&<p className="money-lead">These came out in 2024. The bigger the number, the longer the note — hold two together and the longer one is worth more. Tip one in the light and the face on it turns to look the other way, which is a hologram and is how you know it is real.</p>}
  {group==='older'&&<p className="money-lead">The set before the 2024 one, still in wallets and cash machines everywhere and worth exactly the same. Same colours, same sizes, different faces — being handed one is not being handed a fake.</p>}
  <div className="money-grid">{list.map(item=>
   <MoneyCard key={item.id} item={item} rate={rate} aloud={aloud} person={person} mine={mine}
    busy={busy} mutate={mutate} found={moneyFind(state,item.id,person)}/>)}</div>
  <p className="money-foot"><small>Drawn inside the app rather than photographed, so it works with no signal and nothing is a copy of real money. Dollars are worked out at the family’s own rate, the same one the rest of this page uses.</small></p>
 </section>;
}
