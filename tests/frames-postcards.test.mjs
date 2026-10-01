import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {keyAccess,frameKeyView,photosToMail,validFrameEmail,frameService,cleanLabel} from '../src/frame-mail-data.js';
import {recordSent,mailFrames} from '../server/frame-mail.mjs';
import {POSTCARD_PROVIDERS,addressProblem,postcardJob} from '../src/postcard-providers.js';
import {visibleTrip} from '../server/visibility.mjs';
const seed=JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url)));
const hash=s=>createHash('sha256').update(s).digest('hex');
const src=f=>readFile(new URL(`../${f}`,import.meta.url),'utf8');
const K=c=>c.repeat(64);
test('#288 a frame has a key of its own: it opens the view, and taking it off touches nothing else',()=>{
 const state={followKey:K('a'),frameKeys:[{id:'f1',label:'Nana’s iPad',key:K('b')},{id:'f2',label:'TV',key:K('c')}]};
 assert.deepEqual(keyAccess(state,K('a'),hash),{kind:'follow'});
 assert.deepEqual(keyAccess(state,K('b'),hash),{kind:'frame',id:'f1',label:'Nana’s iPad'});
 assert.equal(keyAccess(state,K('d'),hash),null);assert.equal(keyAccess(state,'short',hash),null);
 const off={...state,frameKeys:state.frameKeys.filter(f=>f.id!=='f1')};
 assert.equal(keyAccess(off,K('b'),hash),null);assert.deepEqual(keyAccess(off,K('c'),hash).id,'f2');assert.deepEqual(keyAccess(off,K('a'),hash),{kind:'follow'});
 // The follow link withdrawn: the frames keep working.
 assert.equal(keyAccess({...state,followKey:null},K('c'),hash).kind,'frame');
});
test('#288 no phone is sent a frame key, and the boys are not sent the frames’ addresses',()=>{
 const state={...structuredClone(seed),members:['Mum','Boston'],frameKeys:[{id:'f1',label:'iPad',key:K('b'),createdAt:'x'}],frameEmails:[{id:'m1',address:'nana@frame.test'}]};
 const mum=visibleTrip(state,{name:'Mum',role:'parent'}),boy=visibleTrip(state,{name:'Boston',role:'child'});
 assert.deepEqual(mum.frameKeys,[frameKeyView(state.frameKeys[0])]);assert.equal(JSON.stringify(mum).includes(K('b')),false);
 assert.equal(mum.frameEmails.length,1);assert.deepEqual(boy.frameKeys,[]);assert.deepEqual(boy.frameEmails,[]);
});
test('#288 a mailed frame gets the curated set once each, oldest first, a few at a time',()=>{
 const days=[{date:'2026-11-01',city:'Tokyo',title:'A'},{date:'2026-11-02',city:'Tokyo',title:'B'}];
 const photos=[{id:'p1',day:'2026-11-01',pathname:'x',by:'Mum',frame:true},{id:'p2',day:'2026-11-02',pathname:'y',by:'Dad',frame:true},{id:'p3',day:'2026-11-02',pathname:'z',by:'Dad'}];
 const state={...structuredClone(seed),days,photos,members:['Mum','Dad']};
 assert.deepEqual(photosToMail(state,{sent:{}},'2026-11-02').map(p=>p.id),['p1','p2']);
 assert.deepEqual(photosToMail(state,{sent:{p1:'t'}},'2026-11-02').map(p=>p.id),['p2']);
 assert.deepEqual(photosToMail(state,{sent:{}},'2026-11-02',1).map(p=>p.id),['p1']);
 const next=recordSent({frameEmails:[{id:'m1',sent:{p1:'t'}},{id:'m2'}]},[{id:'m1',photo:'p2'}],'now');
 assert.deepEqual(next.frameEmails[0].sent,{p1:'t',p2:'now'});assert.equal(next.frameEmails[0].lastSentAt,'now');assert.equal(next.frameEmails[1].sent,undefined);
 assert.equal(recordSent({},[]),null);
});
test('#288 frame addresses and names are checked; nothing is sent without the email service',async()=>{
 assert.ok(validFrameEmail('grandpa-123@aura.example.com'));assert.ok(!validFrameEmail('nope'));assert.ok(!validFrameEmail('a b@c.com'));
 assert.equal(frameService('nixplay').label,'Nixplay');assert.equal(frameService('zzz').id,'other');
 assert.equal(cleanLabel('  Nana’s   iPad '),'Nana’s iPad');
 delete process.env.RESEND_API_KEY;
 assert.deepEqual(await mailFrames({frameEmails:[{id:'m1',address:'a@b.co'}]},'2026-11-02',{fetcher:()=>{throw new Error('should not send');}}),[]);
 const handler=await src('server/handler.mjs');
 assert.match(handler,/route==='frame-link'&&post\)\{\n\s*parent\(user\)/);assert.match(handler,/route==='frame-email'&&post\)\{\n\s*parent\(user\)/);
 assert.match(handler,/const framed=await mailFrames/,'the nightly run mails the frames');
});
test('#287 the postcard seam: providers suggested, the address checked, and no send until one is connected',async()=>{
 assert.ok(POSTCARD_PROVIDERS.length>=4);for(const p of POSTCARD_PROVIDERS){assert.match(p.url,/^https:\/\//);assert.ok(['api','app'].includes(p.kind));assert.ok(p.fit);}
 const nana={name:'Nana',line1:'1 Main St',city:'Bowral',state:'nsw',postcode:'2576'};
 assert.equal(addressProblem(nana),'');assert.match(addressProblem({...nana,postcode:'25'}),/four digits/);assert.match(addressProblem({...nana,state:'XX'}),/state/);
 assert.equal(addressProblem({...nana,country:'NZ',state:'',postcode:'6011'}),'');
 const {job}=postcardJob({text:'Dear Nana'},{id:'p1'},nana);assert.equal(job.to.state,'NSW');assert.equal(job.to.country,'AU');
 assert.match(postcardJob({text:''},{id:'p1'},nana).error,/no words/);
 const {sendPostcard,postcardReady}=await import('../server/postcard.mjs');
 assert.equal(postcardReady(),false);
 await assert.rejects(()=>sendPostcard(job,{}),e=>e.status===501&&/Share/.test(e.message));
 assert.match(await src('src/shop-data.js'),/POSTCARD_PROVIDERS/);
});
