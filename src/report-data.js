// A report: the fastest thing one phone can say to the others while the family is in two
// groups — the queue is forty minutes, the toilets here are clean, the thing sold out, there
// is cover from the rain here. One tap on the stop, no typing. Borrowed from the way Waze lets a
// driver say "police ahead" with one thumb. A report is a thing we noticed with a kind on it, so
// it lives on the Noticed page and in the diary like anything else said on the day, and the
// only new thing is how long the others are shown it: two hours, then it is just a memory.
export const REPORT_HOURS=2;
export const REPORT_KINDS=[
 {id:'queue',label:'Queue',icon:'⏳',minutes:true,text:m=>`Queue about ${m} min`},
 {id:'toilets',label:'Toilets',icon:'🚻',text:()=>'Clean toilets here, no wait'},
 {id:'soldout',label:'Sold out',icon:'🚫',text:()=>'Sold out, don’t bother'},
 {id:'rain',label:'Rain cover',icon:'☔',text:()=>'Cover from the rain here'},
 {id:'tip',label:'Worth it',icon:'👍',text:()=>'Worth it, come this way'}
];
export const QUEUE_MINUTES=[10,20,30,45,60,90,120];
export const findReportKind=id=>REPORT_KINDS.find(k=>k.id===id)||null;
export const reportText=(kind,minutes)=>{const k=findReportKind(kind);return k?k.text(minutes):'';};
// The report as the server keeps it, or null when the fields are not a report at all.
export function reportFields(r){
 if(!r||typeof r!=='object')return null;
 const k=findReportKind(r.kind);if(!k)return null;
 const minutes=k.minutes&&Number.isInteger(r.minutes)&&r.minutes>0&&r.minutes<=600?r.minutes:null;
 return {kind:k.id,minutes};
}
// Reports still worth showing: from the last two hours, newest first, on the day being looked at.
export function freshReports(state,{day=null,now=new Date()}={}){
 const at=+now,since=at-REPORT_HOURS*3600000,dayOf=n=>(n.stepId?(state.steps||[]).find(s=>s.id===n.stepId)?.day:null)||n.day||null;
 return (state.noticed||[]).filter(n=>n.report&&Date.parse(n.at)>=since&&Date.parse(n.at)<=at+60000&&(!day||dayOf(n)===day))
  .sort((a,b)=>String(b.at).localeCompare(String(a.at)));
}
export const minutesAgo=(n,now=new Date())=>Math.max(0,Math.round((now-Date.parse(n.at))/60000));
export const agoText=m=>m<1?'just now':m===1?'1 min ago':m<60?`${m} min ago`:`${Math.round(m/60)} hr ago`;
