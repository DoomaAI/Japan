import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {matchaPlaces,matchaInReach,matchaWords,matchaUrl,walkMinutes,readRadius,writeRadius,readSeen,markSeen,isMatchaLocation,DEFAULT_RADIUS} from '../src/matcha-nearby.js';
import {readSettings,DEFAULTS} from '../src/settings.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};
// Ippodo in Kyoto, a hotel a few hundred metres off, and a find pinned in Uji.
const state={
 locations:[
  {id:'ippodo',name:'Ippodo Tea Kyoto',category:'Matcha / Cafe / Tea Shop',notes:'MATCHA BUYING',referenceOnly:false},
  {id:'gone',name:'Closed Tea Bar',category:'Matcha / Cafe',notes:'REFERENCE ONLY',referenceOnly:true},
  {id:'nomap',name:'Unplaced Matcha',category:'Cafe',notes:'MATCHA STOP',referenceOnly:false},
  {id:'hotel',name:'Hotel',category:'Hotel',notes:'',referenceOnly:false}],
 placeCoords:{places:{ippodo:{lat:35.0137,lng:135.7672},gone:{lat:35.0,lng:135.7},hotel:{lat:35.01,lng:135.76}}},
 steps:[],
 hunts:{entries:[
  {id:'h1',hunt:'matcha',title:'Iced matcha latte',locationId:'ippodo',status:'want'},
  {id:'h2',hunt:'matcha',title:'Uji parfait',place:'Nakamura Tokichi',pin:{lat:34.8893,lng:135.8077},status:'tried'},
  {id:'h3',hunt:'ramen',title:'Ramen',pin:{lat:35.0137,lng:135.7672}},
  {id:'h4',hunt:'matcha',title:'Somewhere',status:'want'}]}
};
test('our matcha places: map rows marked matcha with a position, and matcha finds that say where', ()=>{
 const {places,unplaced}=matchaPlaces(state);
 assert.deepEqual(places.map(p=>p.key).sort(),['hunt:h2','loc:ippodo']);
 assert.equal(unplaced,1,'a matcha row the map has not placed is counted, not guessed');
 const ippodo=places.find(p=>p.key==='loc:ippodo');
 assert.equal(ippodo.name,'Ippodo Tea Kyoto');assert.equal(ippodo.want,true,'a want-to-try find on a map place marks the place');
 assert.equal(places.find(p=>p.key==='hunt:h2').name,'Nakamura Tokichi');
 assert.ok(!isMatchaLocation(state.locations[1]),'a reference-only row is not watched for');
});
test('within reach: nearest first, not twice a day, not on a rough fix', ()=>{
 const {places}=matchaPlaces(state),near={lat:35.0150,lng:135.7672};
 const hits=matchaInReach(places,near,0.5,{},'2026-10-03');
 assert.deepEqual(hits.map(h=>h.key),['loc:ippodo']);
 assert.ok(hits[0].km>0.1&&hits[0].km<0.2);
 assert.deepEqual(matchaInReach(places,near,0.1,{},'2026-10-03'),[],'outside the chosen distance');
 assert.deepEqual(matchaInReach(places,near,0.5,{'loc:ippodo':'2026-10-03'},'2026-10-03'),[],'told already today');
 assert.equal(matchaInReach(places,near,0.5,{'loc:ippodo':'2026-10-02'},'2026-10-03').length,1,'told yesterday is told again today');
 assert.deepEqual(matchaInReach(places,{...near,accuracy:500},0.5,{},'2026-10-03'),[],'a fix a street either way is not judged');
});
test('the words and where the tap goes', ()=>{
 const hit={key:'loc:ippodo',name:'Ippodo Tea Kyoto',km:0.15,want:true,locationId:'ippodo',others:1};
 const w=matchaWords(hit,0.5);
 assert.equal(w.title,'🍵 You are within 500 m of Ippodo Tea Kyoto');
 assert.match(w.text,/150 m away, about 3 min on foot, and it is on our want-to-try list \(and 1 more matcha place close by\)/);
 assert.equal(matchaUrl(hit),'/?tab=places&item=ippodo');
 assert.equal(matchaUrl({key:'hunt:h2'}),'/?tab=hunts');
 assert.equal(walkMinutes(0.01),1);
});
test('the distance and what was told are kept on the phone, per person', ()=>{
 const store=memory();
 assert.equal(readRadius('Nate',store),DEFAULT_RADIUS);
 assert.equal(writeRadius('Nate',1,store),1);assert.equal(readRadius('Nate',store),1);
 assert.equal(writeRadius('Nate',7,store),1,'only the offered distances');
 assert.equal(readRadius('Lauren',store),DEFAULT_RADIUS);
 markSeen('Nate',['loc:a'],'2026-10-02',store);
 assert.deepEqual(markSeen('Nate',['loc:b'],'2026-10-03',store),{'loc:b':'2026-10-03'},'yesterday is let go');
 assert.deepEqual(readSeen('Lauren',store),{});
});
test('the switch starts off, and the app watches only when it is on', async ()=>{
 assert.equal(DEFAULTS.matchaNearby,false);
 assert.equal(readSettings('Nate',memory()).matchaNearby,false);
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/useMatchaNearby\(\{on:!!\(user&&visibleState&&settingOn\(settings,'matchaNearby'\)\)/);
 const hook=await readFile(new URL('../src/useMatchaNearby.js',import.meta.url),'utf8');
 assert.match(hook,/clearWatch/);assert.match(hook,/showNotification/);
});
