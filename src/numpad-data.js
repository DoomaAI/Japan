// The yen converter as a number pad, the way a payment app takes an amount: digits pressed one at
// a time into a big display, a key to take the last one back, and one tap to flip the direction,
// which carries the answer across as the new amount. Yen are whole; dollars keep two decimals.
export const MAX_DIGITS=9;
export function press(amount,key,currency){
 const s=String(amount||'');
 if(key==='back')return s.slice(0,-1);
 if(key==='clear')return '';
 if(key==='.'){if(currency==='JPY'||s.includes('.'))return s;return (s||'0')+'.';}
 if(!/^\d{1,2}$/.test(key))return s;
 if(currency==='AUD'&&s.includes('.')&&s.split('.')[1].length+key.length>2)return s;
 const next=(s==='0'?'':s)+key;
 if(next.replace('.','').length>MAX_DIGITS)return s;
 return next.replace(/^0+(?=\d)/,'');
}
export const KEYS=currency=>['1','2','3','4','5','6','7','8','9',currency==='JPY'?'00':'.','0','back'];
// The amount as the display shows it: grouped, with the currency's sign.
export function shown(amount,currency){
 const s=String(amount||'');if(!s)return currency==='JPY'?'¥0':'$0';
 const [whole,frac]=s.split('.');
 const grouped=Number(whole||0).toLocaleString('en-AU');
 return `${currency==='JPY'?'¥':'$'}${grouped}${frac!==undefined?`.${frac}`:''}`;
}
