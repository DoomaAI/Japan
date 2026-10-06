import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ensureFeatures as upgraded,pendingProgress} from '../src/trip-features.js';
import {inOrder,listOrder,placeBefore} from '../src/drag-list.js';
import {mergeVisible} from '../src/wobble.js';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
test('any list dragged into order is saved for the family, and anyone may do it',async()=>{
 const {applyOperation}=await import('../server/model.mjs');
 const {visibleTrip}=await import('../server/visibility.mjs');
 const nate={name:'Nate',role:'child'};
 let state=upgraded(seed);
 assert.deepEqual(state.listOrders,{});
 state=applyOperation(state,{type:'listOrder',list:'todos',ids:['b','a']},nate);
 assert.deepEqual(state.listOrders.todos,['b','a']);
 state=applyOperation(state,{type:'listOrder',list:'spending:Nate',ids:['x']},nate);
 assert.deepEqual(listOrder(state,'spending:Nate'),['x']);
 assert.deepEqual(visibleTrip(state,nate).listOrders?.todos,['b','a'],'everyone sees the order');
 for(const bad of [{list:'',ids:[]},{list:'todos',ids:'a'},{list:'todos',ids:['a','a']},{list:'todos',ids:[7]},{list:'<x>',ids:[]}])
  assert.throws(()=>applyOperation(state,{type:'listOrder',...bad},nate));
});
test('a saved order is shown at once with no signal',()=>{
 const state=upgraded(seed);
 const next=pendingProgress(state,[{operation:{type:'listOrder',list:'packing',ids:['p2','p1'],operationId:'o1',at:new Date().toISOString()},live:false}]);
 assert.deepEqual(listOrder(next,'packing'),['p2','p1']);
});
test('a list in order: saved rows first, anything added since after them in its usual place',()=>{
 const items=['a','b','c','d'].map(id=>({id}));
 assert.deepEqual(inOrder(items,null).map(i=>i.id),['a','b','c','d']);
 assert.deepEqual(inOrder(items,['c','gone','a']).map(i=>i.id),['c','a','b','d']);
});
test('a filtered list moves only the rows on show; the hidden ones keep their places',()=>{
 const full=['a','b','c','d','e'],shown=['b','d','e'];
 assert.deepEqual(mergeVisible(full,placeBefore(shown,'e','b')),['a','e','c','b','d']);
});
