// Travel documents: what a passport, a visa or a policy is kept as, and what the screen says about
// it. The records themselves never enter the trip; see server/vault.mjs for where they live.
export const VAULT_KINDS=['passport','visa','licence','insurance','other'];
export const VAULT_KIND_LABELS={passport:'Passport',visa:'Visa or entry permit',licence:'Driving licence or IDP',insurance:'Travel insurance',other:'Other document'};
// What the number is called on each kind, so the form asks for the thing printed on the page.
export const VAULT_NUMBER_LABELS={passport:'Passport number',visa:'Visa or grant number',licence:'Licence number',insurance:'Policy number',other:'Number'};
export const VAULT_FIELDS={label:80,nameOnDoc:120,number:40,country:60,dateOfBirth:10,issued:10,expires:10,authority:120,notes:1000};
export const VAULT_FILE_TYPES=['image/jpeg','image/png','image/webp','application/pdf'];
// Sent through the server, which seals it before it is stored, so it has to fit in one request.
export const VAULT_FILE_MAX=4*1024*1024;
export const VAULT_FILES_PER_DOC=6,VAULT_LIMIT=40;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
class VaultError extends Error{constructor(message){super(message);this.status=400;}}
// Only the known fields, each trimmed and cut to length; anything else sent along is dropped.
export function cleanVaultRecord(input,members=[]){
 if(!input||typeof input!=='object')throw new VaultError('Fill in the document.');
 const kind=VAULT_KINDS.includes(input.kind)?input.kind:null;
 if(!kind)throw new VaultError('Choose what kind of document it is.');
 const person=String(input.person||'');
 if(![...members,'Family'].includes(person))throw new VaultError('Choose whose document it is.');
 const out={kind,person};
 for(const [field,max] of Object.entries(VAULT_FIELDS)){
  const value=String(input[field]??'').trim();
  if(value.length>max)throw new VaultError(`Keep the ${field==='nameOnDoc'?'name':field} shorter.`);
  if(['dateOfBirth','issued','expires'].includes(field)&&value&&(!DATE.test(value)||Number.isNaN(Date.parse(value))))throw new VaultError('Use a real date.');
  out[field]=value;
 }
 if(!out.label)out.label=VAULT_KIND_LABELS[kind];
 if(out.issued&&out.expires&&out.expires<out.issued)throw new VaultError('The expiry date is before the issue date.');
 return out;
}
// Only the end of a number is shown until someone asks to see it: enough to tell two passports
// apart across a hotel desk, not enough to read over a shoulder.
export function maskNumber(value){
 const s=String(value||'');
 if(s.length<=3)return s?'•••':'';
 return '•'.repeat(Math.min(6,s.length-3))+s.slice(-3);
}
const monthsBetween=(from,to)=>(Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/(86400000*30.44);
// Whether a document will see the family home. Japan only asks that a passport lasts the stay,
// but an airline or a stopover country can refuse one inside six months of running out, so a
// passport within six months of the flight home is flagged too. The trip's last day is the day home.
export function expiryStatus(record,today,homeDay){
 const e=record?.expires;
 if(!e||!DATE.test(e))return null;
 if(today&&e<today)return {level:'expired',text:'Expired'};
 if(homeDay&&e<homeDay)return {level:'expired',text:'Runs out before we fly home'};
 if(record.kind==='passport'&&homeDay&&monthsBetween(homeDay,e)<6)return {level:'soon',text:'Less than six months left after we fly home'};
 const months=today?Math.floor(monthsBetween(today,e)):null;
 const days=today?Math.round((Date.parse(`${e}T00:00:00Z`)-Date.parse(`${today}T00:00:00Z`))/86400000):null;
 return {level:'ok',text:months==null?'':months>=24?`Valid for ${Math.floor(months/12)} more years`:months>=1?`Valid for ${months} more month${months===1?'':'s'}`:`Valid for ${days} more day${days===1?'':'s'}`};
}
// Each person's documents together, in the family's own order, with anything for everyone last.
export function vaultByPerson(records,members){
 const order=[...members,'Family'];
 return order.map(person=>[person,records.filter(r=>r.person===person)]).filter(([,list])=>list.length);
}
// Who is travelling without a passport in the vault yet, so the gap is noticed at home.
export const missingPassports=(records,members)=>members.filter(m=>!records.some(r=>r.person===m&&r.kind==='passport'));
export const vaultFileUrl=(record,file)=>`/api/vault-file?id=${encodeURIComponent(record.id)}&file=${encodeURIComponent(file.id)}`;
