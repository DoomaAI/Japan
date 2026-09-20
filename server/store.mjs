import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';
import { randomBytes,createHash } from 'node:crypto';
import { AppError } from './model.mjs';
export const localDemo=()=>process.env.LOCAL_DEMO==='1'&&!process.env.VERCEL&&process.env.NODE_ENV!=='production';
export const hash=s=>createHash('sha256').update(s).digest('hex');
export const token=()=>randomBytes(32).toString('hex');
export const readSeed=async()=>JSON.parse(await readFile(new URL('../data/seed.json',import.meta.url),'utf8'));
let sql,ready,demo;
export async function database(){
 if(!process.env.DATABASE_URL)throw new AppError('Connect Neon to enable the shared family trip.',503);
 sql??=neon(process.env.DATABASE_URL);
 if(!ready)ready=(async()=>{
  await sql`CREATE TABLE IF NOT EXISTS japan_trip (id text PRIMARY KEY, state jsonb NOT NULL, revision integer NOT NULL DEFAULT 1)`;
  await sql`CREATE TABLE IF NOT EXISTS japan_grants (id text PRIMARY KEY, token_hash text UNIQUE NOT NULL, name text NOT NULL, role text NOT NULL, revoked boolean NOT NULL DEFAULT false, expires_at timestamptz NOT NULL DEFAULT now()+interval '45 days', created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS japan_sessions (token_hash text PRIMARY KEY, grant_id text REFERENCES japan_grants(id), expires_at timestamptz NOT NULL DEFAULT now()+interval '45 days')`;
  const state=await readSeed();await sql`INSERT INTO japan_trip(id,state) VALUES ('family',${JSON.stringify(state)}::jsonb) ON CONFLICT(id) DO NOTHING`;
 })().catch(e=>{ready=undefined;throw e;});
 await ready;return sql;
}
export async function readTrip(){
 if(localDemo()){demo??={state:await readSeed(),revision:1};return structuredClone(demo);}
 const db=await database();const [r]=await db`SELECT state,revision FROM japan_trip WHERE id='family'`;return r;
}
export async function writeTrip(state,revision){
 if(localDemo()){if(demo.revision!==revision)throw new AppError('The family updated the trip. Review your change against the latest plan.',409);demo={state,revision:revision+1};return structuredClone(demo);}
 const db=await database();const [r]=await db`UPDATE japan_trip SET state=${JSON.stringify(state)}::jsonb, revision=revision+1 WHERE id='family' AND revision=${revision} RETURNING state,revision`;
 if(!r)throw new AppError('The family updated the trip. Review your change against the latest plan.',409);return r;
}
export async function session(req){
 if(localDemo())return {id:'preview',name:'Damien',role:'parent',demo:true};
 const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('japan_session='))?.slice(14);
 if(!cookie||!/^[a-f0-9]{64}$/.test(cookie))throw new AppError('Open your private family invite link to join.',401);
 const db=await database();const [u]=await db`SELECT g.id,g.name,g.role FROM japan_sessions s JOIN japan_grants g ON g.id=s.grant_id WHERE s.token_hash=${hash(cookie)} AND s.expires_at>now() AND g.expires_at>now() AND g.revoked=false`;
 if(!u)throw new AppError('This family link has expired or been revoked.',401);return u;
}
export function setCookie(res,value){res.setHeader('Set-Cookie',`japan_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${value?3888000:0}${process.env.VERCEL||process.env.APP_ORIGIN?.startsWith('https:')?'; Secure':''}`);}
