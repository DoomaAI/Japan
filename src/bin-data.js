// Recently deleted: nothing taken off a list is gone for thirty days. Every removal the app
// knows how to reverse is listed here with where the thing lived and how to put it back, so the
// server can keep a copy on the way out and return it, ticks and ratings intact, on the way in.
// Voice notes are the exception: their recording is deleted from storage with them, so a copy of
// the row alone would be a promise the app cannot keep.
export const BIN_DAYS=30;
export const BIN_KINDS={
 todoRemove:{kind:'todo',label:'To-do',list:s=>s.todos||[],put:(s,item)=>{s.todos=[...(s.todos||[]),item];}},
 packRemove:{kind:'pack',label:'Packing list',list:s=>s.packing?.items||[],put:(s,item)=>{s.packing.items=[...s.packing.items,item];}},
 shoppingRemove:{kind:'shopping',label:'Shopping list',list:s=>s.shopping||[],put:(s,item)=>{s.shopping=[...(s.shopping||[]),item];}},
 giftPersonRemove:{kind:'giftPerson',label:'People to buy for',list:s=>s.giftPeople||[],put:(s,item)=>{s.giftPeople=[...(s.giftPeople||[]),item];}},
 shortlistRemove:{kind:'shortlist',label:'Purchase shortlist',list:s=>s.shortlist||[],put:(s,item)=>{s.shortlist=[...(s.shortlist||[]),item];}},
 huntRemove:{kind:'hunt',label:'Hunts & lists',list:s=>s.hunts?.entries||[],put:(s,item)=>{s.hunts.entries=[...s.hunts.entries,item];}},
 payMethodRemove:{kind:'payMethod',label:'Which card?',list:s=>s.payMethods||[],put:(s,item)=>{s.payMethods=[...(s.payMethods||[]),item];},parentOnly:true},
 expenseRemove:{kind:'expense',label:'Family spending',list:s=>s.expenses||[],put:(s,item)=>{s.expenses=[...(s.expenses||[]),item];},parentOnly:true},
 spendRemove:{kind:'spend',label:'Spending money',list:s=>s.spending?.items||[],put:(s,item)=>{s.spending.items=[...s.spending.items,item];}},
 trackerRemove:{kind:'tracker',label:'Tracker tags',list:s=>s.trackers||[],put:(s,item)=>{s.trackers=[...(s.trackers||[]),item];}},
 remove:{kind:'step',label:'Stop on the plan',list:s=>s.steps||[],put:(s,item)=>{s.steps=[...s.steps,item];}}
};
export const binTitle=item=>item?.title||item?.label||item?.name||'Untitled';
// What is still inside its thirty days. Older entries are dropped the next time anything at all
// is saved, which on a family trip is never more than a few minutes away.
export const binEntries=(state,now=Date.now())=>(state.bin||[]).filter(e=>now-Date.parse(e.at)<BIN_DAYS*86400000);
// What this person may see: a child is not shown the family's payments or cards, here or anywhere.
export const binVisible=(state,user)=>binEntries(state).filter(e=>user?.role==='parent'||!BIN_KINDS[e.op]?.parentOnly);
export const canRestore=(entry,user)=>user?.role==='parent'||entry.by===user?.name;
export const binDaysLeft=(entry,now=Date.now())=>Math.max(0,Math.ceil((Date.parse(entry.at)+BIN_DAYS*86400000-now)/86400000));
