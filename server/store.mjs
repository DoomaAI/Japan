import {ensureFeatures} from '../src/trip-features.js';
import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
import { randomBytes,createHash } from 'node:crypto';
import { AppError } from './model.mjs';
export const localDemo=()=>process.env.LOCAL_DEMO==='1'&&!process.env.VERCEL&&process.env.NODE_ENV!=='production';
export const hash=s=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export const readSeed=async()=>JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url),'utf8'));
let sql,ready,demo,locationData,placeJapanese;
async function withLocations(state){
 locationData??=JSON.parse(await readFile(new URL('../data/map-locations.json',import.meta.url),'utf8'));
 // Stations, broad areas and venues inside a bigger complex stay out of the catalogue, but a taxi driver still needs them in Japanese.
 placeJapanese??=JSON.parse(await readFile(new URL('../data/place-japanese.json',import.meta.url),'utf8'));
 return {...ensureFeatures(state),locations:locationData.locations,locationSource:locationData.source,placeJapanese};
}
export async function database(){
 if(!process.env.DATABASE_URL)throw new AppError('Connect Neon to enable the shared family trip.',503);
 sql??=neon(process.env.DATABASE_URL);
 if(!ready)ready=(async()=>{
  await sql`CREATE TABLE IF NOT EXISTS japan_trip (id text PRIMARY KEY, state jsonb NOT NULL, revision integer NOT NULL DEFAULT 1)`;
  await sql`CREATE TABLE IF NOT EXISTS japan_grants (id text PRIMARY KEY, token_hash text UNIQUE NOT NULL, name text NOT NULL, role text NOT NULL, revoked boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL DEFAULT now()+interval '6 months', created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS japan_sessions (token_hash text PRIMARY KEY, grant_id text REFERENCES japan_grants(id), expires_at timestamptz NOT NULL DEFAULT now()+interval '6 months')`;
  const state=await readSeed();await sql`INSERT INTO japan_trip(id,state) VALUES ('family',${JSON.stringify(state)}::jsonb) ON CONFLICT(id) DO NOTHING`;
 })().catch(e=>{ready=undefined;throw e;});
 await ready;return sql;
}
export async function readTrip(){
 if(localDemo()){demo??={state:await readSeed(),revision:1};return {...structuredClone(demo),state:await withLocations(structuredClone(demo.state))};}
 const db=await database();const [r]=await db`SELECT state,revision FROM japan_trip WHERE id='family'`;return {...r,state:await withLocations(r.state)};
}
export async function writeTrip(state,revision){
 if(localDemo()){if(demo.revision!==revision)throw new AppError('The family updated the trip. Review your change against the latest plan.',409);demo={state,revision:revision+1};return {...structuredClone(demo),state:await withLocations(structuredClone(demo.state))};}
 const db=await database();const [r]=await db`UPDATE japan_trip SET state=${JSON.stringify(state)}::jsonb, revision=revision+1 WHERE id='family' AND revision=${revision} RETURNING state,revision`;
 if(!r)throw new AppError('The family updated the trip. Review your change against the latest plan.',409);return r;
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
export const LINK_LIFE='6 months',LINK_SECONDS=182*86400,RENEW_WITHIN=150*86400000;
export const cookieOf=req=>{const c=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('japan_session='))?.slice(14);return c&&/^[a-f0-9]{64}$/.test(c)?c:null;};
export async function session(req){
 if(localDemo())return {id:'preview',name:'Damien',role:'parent',demo:true};
 const cookie=cookieOf(req);
 if(!cookie)throw new AppError('Open your private family invite link to join.',401);
 // The sooner of the two expiries goes back with the user, so the app can say when this phone
 // will stop being let in, days ahead of it happening in the middle of the trip.
 const db=await database();const [u]=await db`SELECT g.id,g.name,g.role,LEAST(s.expires_at,g.expires_at) AS expires_at FROM japan_sessions s JOIN japan_grants g ON g.id=s.grant_id WHERE s.token_hash=${hash(cookie)} AND s.expires_at>now() AND g.expires_at>now() AND g.revoked=false`;
 if(!u)throw new AppError('This family link has expired or been revoked.',401);
 const {expires_at,...user}=u;return {...user,expiresAt:expires_at instanceof Date?expires_at.toISOString():expires_at?String(expires_at):null};
}
export function setCookie(res,value){res.setHeader('Set-Cookie',`japan_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${value?LINK_SECONDS:0}${process.env.VERCEL||process.env.APP_ORIGIN?.startsWith('https:')?'; Secure':''}`);}
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
 await db`UPDATE japan_grants SET expires_at=now()+interval '6 months' WHERE revoked=false`;
 const [r]=await db`UPDATE japan_sessions SET expires_at=now()+interval '6 months' RETURNING expires_at`;
 return new Date(r?.expires_at||Date.now()+LINK_SECONDS*1000).toISOString();
}
