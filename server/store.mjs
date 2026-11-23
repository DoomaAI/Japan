import {ensureFeatures} from '../src/trip-features.js';
import {setPlanZone} from '../src/timing.js';
import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
import { randomBytes,createHash } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AppError } from './model.mjs';
export const localDemo=()=>process.env.LOCAL_DEMO==='1'&&!process.env.VERCEL&&process.env.NODE_ENV!=='production';
export const hash=s=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export const readSeed=async()=>JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url),'utf8'));
let sql,ready,demo=new Map(),locationData,placeJapanese;
// More than one plan in the one deployment: the family's Japan trip ('family', the plan every
// row and link made before there were others belongs to) and plans made from a starting state
// in data/ (PLAN_SEEDS). Which plan a request is about is decided once, from the link or the
// session behind it, and held for the rest of that request, so every read and write of the
// plan, every position and every phone to notify is that plan's and no other's. A request with
// no session (a webhook, the calendar, the follow-along view, the scheduler) is the family's.
export const FAMILY_PLAN='family';
export const PLAN_SEEDS={family:'seed.json',ski:'ski-seed.json'};
export const PLAN_IDS=Object.keys(PLAN_SEEDS);
const scope=new AsyncLocalStorage();
export const runInPlan=(plan,fn)=>scope.run({plan:PLAN_SEEDS[plan]?plan:FAMILY_PLAN},fn);
export const currentPlan=()=>scope.getStore()?.plan||FAMILY_PLAN;
export function enterPlan(plan){
 if(!PLAN_SEEDS[plan])throw new AppError('That plan does not exist.',404);
 const s=scope.getStore();if(s)s.plan=plan;
 return plan;
}
export const readPlanSeed=async plan=>JSON.parse(await readFile(new URL(`../data/${PLAN_SEEDS[plan]}`,import.meta.url),'utf8'));
async function withLocations(state){
 locationData??=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url),'utf8'));
 // Stations, broad areas and venues inside a bigger complex stay out of the catalogue, but a taxi driver still needs them in Japanese.
 placeJapanese??=JSON.parse(await readFile(new URL('../data/place-japanese.json',import.meta.url),'utf8'));
 // The plan's clock is set the moment the plan is read, so every date worked out for this
 // request is the plan's own. One plan per deployment for now; layer 2 threads it through.
 const next=ensureFeatures(state);setPlanZone(next.plan.timeZone);
 return {...next,locations:locationData.locations,locationSource:locationData.source,placeJapanese};
}
export async function database(){
 if(!process.env.DATABASE_URL)throw new AppError('Connect Neon to enable the shared family trip.',503);
 sql??=neon(process.env.DATABASE_URL);
 if(!ready)ready=(async()=>{
  await sql`CREATE TABLE IF NOT EXISTS japan_trip (id text PRIMARY KEY, state jsonb NOT NULL, revision integer NOT NULL DEFAULT 1)`;
  await sql`CREATE TABLE IF NOT EXISTS japan_grants (id text PRIMARY KEY, token_hash text UNIQUE NOT NULL, name text NOT NULL, role text NOT NULL, revoked boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL DEFAULT now()+interval '6 months', created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS japan_sessions (token_hash text PRIMARY KEY, grant_id text REFERENCES japan_grants(id), expires_at timestamptz NOT NULL DEFAULT now()+interval '6 months')`;
  // Links anyone can join with (src/people.js): a link's kind, the household it puts a joiner
  // in, how many may use it, how many have, and for a joiner's own link, which open link made it.
  await sql`ALTER TABLE japan_grants ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'personal'`;
  await sql`ALTER TABLE japan_grants ADD COLUMN IF NOT EXISTS household text NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE japan_grants ADD COLUMN IF NOT EXISTS max_uses integer`;
  await sql`ALTER TABLE japan_grants ADD COLUMN IF NOT EXISTS uses integer NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE japan_grants ADD COLUMN IF NOT EXISTS via text`;
  // Which plan a link lets its holder into. Every link made before there were other plans is the family's.
  await sql`ALTER TABLE japan_grants ADD COLUMN IF NOT EXISTS plan_id text NOT NULL DEFAULT 'family'`;
  const state=await readSeed();await sql`INSERT INTO japan_trip(id,state) VALUES ('family',${JSON.stringify(state)}::jsonb) ON CONFLICT(id) DO NOTHING`;
 })().catch(e=>{ready=undefined;throw e;});
 await ready;return sql;
}
async function demoPlan(plan){if(!demo.has(plan))demo.set(plan,{state:await readPlanSeed(plan),revision:1});return demo.get(plan);}
export async function readTrip(){
 const plan=currentPlan();
 if(localDemo()){const d=await demoPlan(plan);return {...structuredClone(d),state:await withLocations(structuredClone(d.state))};}
 const db=await database();const [r]=await db`SELECT state,revision FROM japan_trip WHERE id=${plan}`;
 if(!r)throw new AppError('This plan has not been set up yet.',404);
 return {...r,state:await withLocations(r.state)};
}
export async function writeTrip(state,revision){
 const plan=currentPlan();
 if(localDemo()){const d=await demoPlan(plan);if(d.revision!==revision)throw new AppError('The family updated the trip. Review your change against the latest plan.',409);demo.set(plan,{state,revision:revision+1});return {...structuredClone(demo.get(plan)),state:await withLocations(structuredClone(state))};}
 const db=await database();const [r]=await db`UPDATE japan_trip SET state=${JSON.stringify(state)}::jsonb, revision=revision+1 WHERE id=${plan} AND revision=${revision} RETURNING state,revision`;
 if(!r)throw new AppError('The family updated the trip. Review your change against the latest plan.',409);return r;
}
// Whether a plan has been made yet, and making it from its starting state with the person who
// made it as its first organiser. Making it twice leaves the first one as it was.
export async function planExists(plan){
 if(localDemo())return demo.has(plan)||plan===FAMILY_PLAN;
 const db=await database();const [r]=await db`SELECT 1 AS ok FROM japan_trip WHERE id=${plan}`;return !!r;
}
export async function createPlan(plan,organiser,days=null){
 if(!PLAN_SEEDS[plan]||plan===FAMILY_PLAN)throw new AppError('That plan cannot be made here.',400);
 const seed=await readPlanSeed(plan);
 if(days?.length)seed.days=days;
 if(organiser&&!seed.members.includes(organiser)){seed.members=[organiser,...seed.members];seed.people={...(seed.people||{}),[organiser]:{role:'parent',household:'',joinedAt:new Date().toISOString(),via:'created'}};}
 if(localDemo()){if(!demo.has(plan))demo.set(plan,{state:seed,revision:1});return;}
 const db=await database();await db`INSERT INTO japan_trip(id,state) VALUES (${plan},${JSON.stringify(seed)}::jsonb) ON CONFLICT(id) DO NOTHING`;
}
// Taking a plan away so it can start again: its state, every link into it, its positions, its
// phones and its documents. The family's plan is never removed here.
export async function removePlan(plan){
 if(!PLAN_SEEDS[plan]||plan===FAMILY_PLAN)throw new AppError('That plan cannot be removed.',400);
 if(localDemo()){demo.delete(plan);return;}
 const db=await database();
 await db`DELETE FROM japan_trip WHERE id=${plan}`;
 await db`UPDATE japan_grants SET revoked=true WHERE plan_id=${plan}`;
 for(const q of [db`DELETE FROM japan_positions WHERE plan=${plan}`,db`DELETE FROM japan_push WHERE plan=${plan}`,db`DELETE FROM japan_vault WHERE plan=${plan}`])await q.catch(()=>{});
}
// The plans there are, by id and title, for the switch between them.
export async function planTitles(){
 const out={};
 for(const id of PLAN_IDS){
  if(!(await planExists(id)))continue;
  const s=localDemo()?(await demoPlan(id)).state:(await (await database())`SELECT state->'plan'->>'title' AS title, state->>'tripName' AS trip FROM japan_trip WHERE id=${id}`)[0];
  out[id]=localDemo()?(s.plan?.title||s.tripName||id):(s?.title||s?.trip||id);
 }
 return out;
}
// A webhook has no revision to check against, so it reads, changes and writes, and tries
// again if the family moved the plan underneath it. The change itself is an addition, so
// replaying it on the newer plan is always right.
export async function updateTrip(change,attempts=4){
 let last;
 for(let i=0;i<attempts;i++){
  const current=await readTrip();
  const next=await change(current.state);
  if(!next)return current;
  try{return await writeTrip(next,current.revision);}
  catch(e){if(e.status!==409)throw e;last=e;}
 }
 throw last;
}
// How long a family link, a phone's session and the cookie that carries it all last: six months,
// which outlasts the trip and the looking-back after it. A link in use never runs out on its own,
// because every open of the app inside the last month of its life pushes it out another six; the
// only way to lose access is to be revoked or to stay away for half a year.
export const LINK_SECONDS=182*86400,RENEW_WITHIN=150*86400000;
export const cookieOf=req=>{const c=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('japan_session='))?.slice(14);return c&&/^[a-f0-9]{64}$/.test(c)?c:null;};
export async function session(req){
 // The local preview is the family's plan unless the preview cookie says otherwise (Settings → Plans).
 if(localDemo()){const p=(req.headers.cookie||'').match(/(?:^|;\s*)japan_preview_plan=([a-z-]+)/)?.[1];const plan=enterPlan(PLAN_SEEDS[p]?p:FAMILY_PLAN);return {id:'preview',name:'Damien',role:'parent',demo:true,plan};}
 const cookie=cookieOf(req);
 if(!cookie)throw new AppError('Open your private family invite link to join.',401);
 // The sooner of the two expiries goes back with the user, so the app can say when this phone
 // will stop being let in, days ahead of it happening in the middle of the trip.
 const db=await database();const [u]=await db`SELECT g.id,g.name,g.role,g.plan_id,LEAST(s.expires_at,g.expires_at) AS expires_at FROM japan_sessions s JOIN japan_grants g ON g.id=s.grant_id WHERE s.token_hash=${hash(cookie)} AND s.expires_at>now() AND g.expires_at>now() AND g.revoked=false AND g.kind='personal'`;
 if(!u)throw new AppError('This family link has expired or been revoked.',401);
 const {expires_at,plan_id,...user}=u;enterPlan(PLAN_SEEDS[plan_id]?plan_id:FAMILY_PLAN);
 return {...user,plan:currentPlan(),expiresAt:expires_at instanceof Date?expires_at.toISOString():expires_at?String(expires_at):null};
}
// A second cookie, japan_other, keeps the session of the plan a phone was in before it joined
// another, so the switch between plans needs no link opened again. Each Set-Cookie is added to
// whatever the response already carries.
const secure=()=>process.env.VERCEL||process.env.APP_ORIGIN?.startsWith('https:')?'; Secure':'';
export function addCookie(res,name,value){
 const line=`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${value?LINK_SECONDS:0}${secure()}`;
 const had=res.getHeader?.('Set-Cookie'),list=had?(Array.isArray(had)?had:[had]).filter(c=>!c.startsWith(`${name}=`)):[];
 res.setHeader('Set-Cookie',list.length?[...list,line]:line);
}
export const otherCookieOf=req=>{const c=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('japan_other='))?.slice(12);return c&&/^[a-f0-9]{64}$/.test(c)?c:null;};
// Which plan a session token is in, if it is still good. Used to keep, or to switch to, the other plan.
export async function sessionPlan(cookie){
 if(!cookie||localDemo())return null;
 const db=await database();const [r]=await db`SELECT g.plan_id FROM japan_sessions s JOIN japan_grants g ON g.id=s.grant_id WHERE s.token_hash=${hash(cookie)} AND s.expires_at>now() AND g.expires_at>now() AND g.revoked=false AND g.kind='personal'`;
 return r?.plan_id||null;
}
export const setCookie=(res,value)=>addCookie(res,'japan_session',value);
// This phone's session, and the link behind it, pushed out to a fresh six months. Called when the
// app opens with less than five months left, so the writes happen about once a month per phone.
export async function renewSession(req){
 const cookie=cookieOf(req);if(localDemo()||!cookie)return null;
 const db=await database();
 const [r]=await db`UPDATE japan_sessions SET expires_at=now()+interval '6 months' WHERE token_hash=${hash(cookie)} RETURNING grant_id,expires_at`;
 if(r)await db`UPDATE japan_grants SET expires_at=GREATEST(expires_at,now()+interval '6 months') WHERE id=${r.grant_id} AND revoked=false`;
 return r?new Date(r.expires_at).toISOString():null;
}
// Every unrevoked link and every session, pushed out to six months from now, on a parent's say-so.
// Another phone's cookie is renewed the next time that phone opens the app, so this is the half of
// the job the database can do; the other half happens by itself.
export async function renewAllLinks(){
 if(localDemo())return new Date(Date.now()+LINK_SECONDS*1000).toISOString();
 const db=await database();
 const plan=currentPlan();
 await db`UPDATE japan_grants SET expires_at=now()+interval '6 months' WHERE revoked=false AND plan_id=${plan}`;
 const [r]=await db`UPDATE japan_sessions SET expires_at=now()+interval '6 months' WHERE grant_id IN (SELECT id FROM japan_grants WHERE plan_id=${plan}) RETURNING expires_at`;
 return new Date(r?.expires_at||Date.now()+LINK_SECONDS*1000).toISOString();
}
