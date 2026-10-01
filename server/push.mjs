// Web push: the phones that asked to be told, and the telling. A subscription is kept against
// the person who made it, with their choice of which kinds they want; the tick sends whatever
// fell due since it last ran; a change to the plan is sent the moment it is saved. Nothing is
// sent twice: every notification has a key, and a key is written down before it goes out.
import webpush from 'web-push';
import {database,localDemo} from './store.mjs';
import {AppError} from './model.mjs';
import {duePushes,wants,PUSH_KIND_IDS} from '../src/push-data.js';
export const pushReady=()=>!!(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY);
export const pushPublicKey=()=>process.env.VAPID_PUBLIC_KEY||null;
let tables,demoSubs=new Map(),demoSent=new Set(),demoLast=0;
async function db(){
 const sql=await database();
 tables??=(async()=>{
  await sql`CREATE TABLE IF NOT EXISTS japan_push (endpoint text PRIMARY KEY, name text NOT NULL, subscription jsonb NOT NULL, prefs jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS japan_push_sent (key text PRIMARY KEY, sent_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS japan_push_tick (id text PRIMARY KEY, last_at timestamptz NOT NULL)`;
 })().catch(e=>{tables=undefined;throw e;});
 await tables;return sql;
}
const cleanPrefs=p=>Object.fromEntries(PUSH_KIND_IDS.map(id=>[id,p?.[id]!==false]));
export function checkSubscription(s){
 const ok=s&&typeof s==='object'&&typeof s.endpoint==='string'&&/^https:\/\//.test(s.endpoint)&&s.endpoint.length<=1000
  &&typeof s.keys?.p256dh==='string'&&typeof s.keys?.auth==='string'&&s.keys.p256dh.length<=200&&s.keys.auth.length<=100;
 if(!ok)throw new AppError('That notification subscription could not be read.');
 return {endpoint:s.endpoint,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}};
}
export async function subscribe(user,subscription,prefs){
 const sub=checkSubscription(subscription),p=cleanPrefs(prefs);
 if(localDemo()){demoSubs.set(sub.endpoint,{endpoint:sub.endpoint,name:user.name,subscription:sub,prefs:p});return p;}
 const sql=await db();
 await sql`INSERT INTO japan_push(endpoint,name,subscription,prefs) VALUES (${sub.endpoint},${user.name},${JSON.stringify(sub)}::jsonb,${JSON.stringify(p)}::jsonb)
  ON CONFLICT(endpoint) DO UPDATE SET name=${user.name},subscription=${JSON.stringify(sub)}::jsonb,prefs=${JSON.stringify(p)}::jsonb`;
 return p;
}
// Only the person a phone belongs to, or a parent, takes a phone off the list.
export async function unsubscribe(user,endpoint){
 if(typeof endpoint!=='string')throw new AppError('Invalid subscription.');
 if(localDemo()){const s=demoSubs.get(endpoint);if(s&&(s.name===user.name||user.role==='parent'))demoSubs.delete(endpoint);return;}
 const sql=await db();await sql`DELETE FROM japan_push WHERE endpoint=${endpoint} AND (name=${user.name} OR ${user.role==='parent'})`;
}
export async function subscriptions(){
 if(localDemo())return [...demoSubs.values()];
 const sql=await db();return await sql`SELECT endpoint,name,subscription,prefs FROM japan_push`;
}
async function claim(key){
 if(localDemo()){if(demoSent.has(key))return false;demoSent.add(key);return true;}
 const sql=await db();const r=await sql`INSERT INTO japan_push_sent(key) VALUES (${key}) ON CONFLICT DO NOTHING RETURNING key`;return r.length>0;
}
// Send one notification to every phone that wants it. A phone the push service says is gone
// is taken off the list, so a phone that was wiped does not cost a request every tick.
export async function deliver(moment,subs,send=sendOne){
 let sent=0;
 for(const s of subs.filter(s=>wants(s,moment))){
  try{await send(s.subscription,{title:moment.title,body:moment.body,url:moment.url||'/',tag:moment.key});sent++;}
  catch(e){if(e?.statusCode===404||e?.statusCode===410){if(localDemo())demoSubs.delete(s.endpoint);else{const sql=await db();await sql`DELETE FROM japan_push WHERE endpoint=${s.endpoint}`;}}}
 }
 return sent;
}
function sendOne(subscription,payload){
 webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:family@example.com',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
 return webpush.sendNotification(subscription,JSON.stringify(payload),{TTL:3600,urgency:'high'});
}
async function lastTick(now){
 if(localDemo()){const l=demoLast||now-5*60000;demoLast=now;return l;}
 const sql=await db();
 const [r]=await sql`SELECT last_at FROM japan_push_tick WHERE id='family'`;
 await sql`INSERT INTO japan_push_tick(id,last_at) VALUES ('family',${new Date(now).toISOString()}) ON CONFLICT(id) DO UPDATE SET last_at=${new Date(now).toISOString()}`;
 return r?Date.parse(r.last_at):now-5*60000;
}
// The tick: everything that fell due since the last one, each claimed before it is sent.
export async function tick(state,now=Date.now(),send=sendOne){
 const since=await lastTick(now),subs=await subscriptions(),out=[];
 for(const m of duePushes(state,since,now)){if(await claim(m.key))out.push({key:m.key,sent:await deliver(m,subs,send)});}
 return out;
}
// A change to the plan, told to everyone but the person who made it.
export async function tellChange(alert,by,send=sendOne){
 if(!pushReady()&&send===sendOne)return 0;
 if(!(await claim(`change|${alert.id}`)))return 0;
 const subs=(await subscriptions()).filter(s=>s.name!==by);
 return deliver({key:`change|${alert.id}`,kind:'changes',title:`${by} changed the plan`,body:alert.summary,url:alert.stepId?`/?step=${alert.stepId}`:'/?tab=updates',to:null},subs,send);
}
// Tomorrow's check, told to the parents when it found something to do before morning. Once a
// day at most: the key is the day checked, so a second run of the check is not a second buzz.
export async function tellTomorrow(check,parents,send=sendOne){
 if(!pushReady()&&send===sendOne)return 0;
 const act=(check?.notes||[]).filter(n=>n.act&&n.status==='open');
 if(!act.length||!(await claim(`tomorrow|${check.day}`)))return 0;
 return deliver({key:`tomorrow|${check.day}`,kind:'tomorrow',title:`Tomorrow: ${act[0].title}`,
  body:act.length>1?`And ${act.length-1} more thing${act.length>2?'s':''} to look at before morning.`:act[0].detail||check.summary,url:`/?tab=glance&day=${check.day}`,to:parents},await subscriptions(),send);
}
export const resetDemoPush=()=>{demoSubs=new Map();demoSent=new Set();demoLast=0;};
