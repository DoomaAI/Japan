import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {googleFrameView,photosToGoogle,recordGoogleSent} from '../src/google-frame-data.js';
import {visibleTrip} from '../server/visibility.mjs';
process.env.GOOGLE_CLIENT_ID='cid';process.env.GOOGLE_CLIENT_SECRET='secret-for-tests';
const G=await import('../server/google-photos.mjs');
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const src=f=>readFile(new URL(`../${f}`,import.meta.url),'utf8');
const days=[{date:'2026-11-01',city:'Tokyo',title:'A'},{date:'2026-11-02',city:'Tokyo',title:'B'}];
const trip=()=>({...structuredClone(seed),days,members:['Mum'],photos:[{id:'p1',day:'2026-11-01',pathname:'x',by:'Mum',frame:true,type:'image/jpeg'},{id:'p2',day:'2026-11-02',pathname:'y',by:'Mum',frame:true,type:'image/jpeg'}]});
test('Nest Hub: only the album scope is asked for, offline, and the token is sealed to its frame',()=>{
 const u=new URL(G.authUrl('https://app.test','c'.repeat(64)));
 assert.equal(u.searchParams.get('scope'),'https://www.googleapis.com/auth/photoslibrary.appendonly');
 assert.equal(u.searchParams.get('access_type'),'offline');assert.equal(u.searchParams.get('redirect_uri'),'https://app.test/api/google-callback');
 const sealed=G.sealToken('refresh-123','g1');assert.ok(!sealed.includes('refresh'));
 assert.equal(G.openToken(sealed,'g1'),'refresh-123');assert.throws(()=>G.openToken(sealed,'g2'));
});
test('Nest Hub: no phone gets the token or the link secret; the boys get no frames at all',()=>{
 const state={...trip(),members:['Mum','Boston'],googleFrames:[{id:'g1',label:'Nest',status:'connected',token:'SEALED',nonce:'HASH',albumId:'A1',sent:{p1:'t'}}]};
 const mum=visibleTrip(state,{name:'Mum',role:'parent'});
 assert.deepEqual(mum.googleFrames,[googleFrameView(state.googleFrames[0])]);
 assert.ok(!JSON.stringify(mum).includes('SEALED')&&!JSON.stringify(mum).includes('HASH'));
 assert.equal(mum.googleFrames[0].sent,1);assert.deepEqual(visibleTrip(state,{name:'Boston',role:'child'}).googleFrames,[]);
});
test('Nest Hub: new photos are uploaded and added to the album once, and only what Google confirms is recorded',async()=>{
 const state={...trip(),googleFrames:[{id:'g1',label:'Nest',status:'connected',token:G.sealToken('r1','g1'),albumId:'ALB',sent:{}},{id:'g2',label:'Waiting',status:'waiting'}]};
 assert.deepEqual(photosToGoogle(state,state.googleFrames[0],'2026-11-02').map(p=>p.id),['p1','p2']);
 const calls=[];let n=0;
 const fetcher=async(url,opt)=>{calls.push(url);
  if(url.includes('oauth2'))return {ok:true,json:async()=>({access_token:'AT'})};
  if(url.endsWith('/uploads')){assert.equal(opt.headers.Authorization,'Bearer AT');return {ok:true,text:async()=>`UT${++n}`};}
  if(url.endsWith('mediaItems:batchCreate')){const b=JSON.parse(opt.body);assert.equal(b.albumId,'ALB');
   return {ok:true,json:async()=>({newMediaItemResults:[{uploadToken:'UT1',mediaItem:{id:'m1'}},{uploadToken:'UT2',status:{code:3,message:'bad'}}]})};}
  throw new Error(url);};
 const sent=await G.sendGoogleFrames(state,'2026-11-02',{fetcher,load:async()=>({bytes:Buffer.from('jpg'),type:'image/jpeg',name:'a.jpg'})});
 assert.deepEqual(sent,[{id:'g1',photo:'p1'}]);
 const next=recordGoogleSent(state,sent,'now');assert.deepEqual(next.googleFrames[0].sent,{p1:'now'});
 assert.deepEqual(photosToGoogle(next,next.googleFrames[0],'2026-11-02').map(p=>p.id),['p2']);
});
test('Nest Hub: the grandparents’ link needs no session, is kept as a hash, and runs out; the nightly run sends',async()=>{
 const h=await src('server/handler.mjs');
 const connect=h.indexOf("route==='google-connect'"),callback=h.indexOf("route==='google-callback'"),session=h.indexOf('const user=await session(req);');
 assert.ok(connect>0&&callback>0&&connect<session&&callback<session,'reached without a session');
 assert.match(h,/x\.nonce===hash\(c\)&&Date\.parse\(x\.nonceUntil\)>Date\.now\(\)/);
 assert.match(h,/nonce:null,nonceUntil:null/,'used once');
 assert.match(h,/route==='google-frame'&&post\)\{\n\s*parent\(user\)/);
 assert.match(h,/const googled=await sendGoogleFrames/);
});
