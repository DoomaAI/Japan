// Handing a parent's phone to one of the boys. In a queue, at a table, on a train, the phone
// that gets handed over is a parent's, and until now it stayed a parent's phone in the boy's
// hands: the ledger, the vault, the leave-by clock, every page. Handing it over makes it his
// phone for a while — his dials, his pages, his missions — until a parent takes it back with the
// code. The server never hears about it: everything the phone sends still comes from the
// parent's own link, which may already act for a boy, so nothing here is a way round anything.
//
// The code is a convenience lock, not a secret: four digits kept on this phone so a five-year-old
// does not hand it back to himself. It is not a passcode for the app and protects nothing else.
export const CODE_LENGTH=4;
export const validCode=code=>typeof code==='string'&&new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
export const HANDED_KEY='japan.handed';
// What the phone believes about who is holding it. A parent's link handed to a boy who is on
// the trip reads as that boy, in the child role, and says so; anything else is the real user.
export function handedUser(real,handed,members){
 if(!real||!handed||real.role!=='parent')return real;
 if(!validCode(handed.code)||!(members||[]).includes(handed.name))return real;
 return {...real,name:handed.name,role:'child',handed:true,heldBy:real.name};
}
export const readHanded=()=>{try{const h=JSON.parse(localStorage.getItem(HANDED_KEY));return h&&validCode(h.code)&&typeof h.name==='string'?h:null;}catch{return null;}};
export const writeHanded=h=>{try{if(h)localStorage.setItem(HANDED_KEY,JSON.stringify(h));else localStorage.removeItem(HANDED_KEY);}catch{}};
// Taking it back: the code has to match, and a wrong one says so rather than doing nothing.
export const codeMatches=(handed,code)=>!!handed&&validCode(code)&&handed.code===code;
