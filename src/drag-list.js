// The order a dragged list ends up in (drag-order.jsx), apart from the screen so it can be tested.
// A row is dropped on the line in front of another row, or on the line after the last (END).
export const END=':end';
// Where a drop lands in a list: in front of the row it was dropped above, or at the end.
export function placeBefore(list,id,before){
 if(!list.includes(id)||before===id)return [...list];
 const rest=list.filter(x=>x!==id),at=before===END?rest.length:rest.indexOf(before);
 if(at<0)return [...list];
 rest.splice(at,0,id);
 return rest;
}
// One row up or down by keyboard, as the line a drag would have used.
export const stepBefore=(list,id,by)=>{const at=list.indexOf(id);if(at<0||at+by<0||at+by>=list.length)return null;return by<0?list[at-1]:list[at+2]??END;};
// A list of things in the order the family dragged them into: the saved order first, then
// anything added since, in the order the list would otherwise show it.
export function inOrder(items,order,idOf=i=>i.id){
 if(!order?.length)return items;
 const at=new Map(order.map((id,i)=>[id,i]));
 return items.map((item,i)=>[item,at.get(idOf(item))??Infinity,i]).sort((a,b)=>a[1]-b[1]||a[2]-b[2]).map(x=>x[0]);
}
export const listOrder=(state,key)=>state?.listOrders?.[key]||null;
