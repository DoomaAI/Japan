import test from 'node:test';
import assert from 'node:assert/strict';
import {TIP_KEY,readTips,writeTips,cleanTips,showsFacts,showsWords} from '../src/opening-tips.js';

const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};

test('the opening tips default to facts and words, and keep a choice on this phone',()=>{
 const store=memory();
 assert.equal(readTips(store),'both');
 assert.equal(writeTips('words',store),'words');
 assert.equal(store.getItem(TIP_KEY),'words');
 assert.equal(readTips(store),'words');
 // Anything unknown falls back rather than leaving the screen with no choice made.
 assert.equal(cleanTips('sometimes'),'both');
 assert.equal(readTips({getItem:()=>{throw new Error('blocked');}}),'both');
});

test('each choice shows only its own kind of card',()=>{
 assert.deepEqual(['both','facts','words','off'].map(t=>[showsFacts(t),showsWords(t)]),
  [[true,true],[true,false],[false,true],[false,false]]);
});
