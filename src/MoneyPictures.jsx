import React,{useState} from 'react';
import {Coins,Banknote,Volume2,Square,Sparkles} from 'lucide-react';
import {useReadAloud,SILENT_HINT} from './AdventurePages.jsx';
import {CoinFace,NoteFace} from './MoneyArt.jsx';
import {COINS,NOTES,OLD_NOTES,MONEY_ALOUD,moneyAloud,kindOf} from './money-data.js';
import {yenToAud} from './trip-features.js';
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
// One piece of money, both sides, with what is on each side spelled out. The picture comes
// before the words on purpose: a five-year-old matches the drawing to the coin in his hand and
// never reads a line of this, which is what the speaker button is for.
function MoneyCard({item,rate,aloud}){
 const coin=kindOf(item)==='coin';
 return <article className={`money-card ${coin?'coin':'note'}`}>
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
 </article>;
}
// Every coin and note, drawn on both sides, with what each one is worth in yen and in dollars
// at the family's own rate. It sits under the purse because it answers the question the purse
// raises: the number on the screen says ¥1,850, and this is what ¥1,850 looks like in a hand.
export default function MoneyPictures({user,rate}){
 const {supported:canRead,reading,read,problem}=useReadAloud();
 const young=user?.name==='Nate';
 const [group,setGroup]=useState('coins');
 // Nate is why the button exists, so he gets it slower. Anyone else gets talking pace, which
 // is what a parent reading it out to him over his shoulder would want.
 const aloud=canRead?{reading,read,rate:young?YOUNG_RATE:undefined,young}:null;
 const list=group==='coins'?COINS:group==='notes'?NOTES:OLD_NOTES;
 return <section className="money-pictures">
  <div className="section-heading"><div>
   <p className="eyebrow">WHAT THE MONEY ACTUALLY LOOKS LIKE</p>
   <h2>Every coin and note, both sides</h2>
  </div></div>
  <p>{young
   ?'These are the coins and notes you will be handed. Every one is drawn twice, because both sides look different. Press the speaker on any of them and it will tell you what it is and how much it is worth.'
   :'Both sides of everything, what is painted on each one, and what it is worth in yen and in dollars. Japanese coins put the picture on one side and the number on the other, so the way to read a coin you do not know is to turn it over.'}</p>
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
   <MoneyCard key={item.id} item={item} rate={rate} aloud={aloud}/>)}</div>
  <p className="money-foot"><small>Drawn inside the app rather than photographed, so it works with no signal and nothing is a copy of real money. Dollars are worked out at the family’s own rate, the same one the rest of this page uses.</small></p>
 </section>;
}
