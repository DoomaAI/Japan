// Where each of us last said we were. Kept out of the trip itself on purpose: the trip is the
// permanent record, with a history and a revision every phone checks, and a position is neither
// permanent nor worth bumping everybody's revision for. One row a person, overwritten by the
// next share, and gone three hours after it was made — deleted, not hidden.
import {database,localDemo} from './store.mjs';
import {AppError} from './model.mjs';
import {CHECKIN_PLACES,CHECKIN_HOURS,roundedPosition,validPosition,canSeeCheckin} from '../src/memory-map.js';
const PARENTS=['Damien','Lauren'];
let demo=new Map(),ready;
async function db(){
 const sql=await database();
 ready??=sql`CREATE TABLE IF NOT EXISTS japan_checkins (name text PRIMARY KEY, lat double precision NOT NULL, lng double precision NOT NULL, at timestamptz NOT NULL DEFAULT now())`.catch(e=>{ready=undefined;throw e;});
 await ready;
 await sql`DELETE FROM japan_checkins WHERE at < now() - make_interval(hours => ${CHECKIN_HOURS})`;
 return sql;
}
export function checkPosition(body){
 const p={lat:Number(body?.lat),lng:Number(body?.lng)};
 if(!validPosition(p))throw new AppError('That position could not be read.');
 return roundedPosition(p.lat,p.lng,CHECKIN_PLACES);
}
export async function shareCheckin(user,body,now=new Date()){
 const at=now.toISOString();
 if(body?.stop===true){
  if(localDemo())demo.delete(user.name);else{const sql=await db();await sql`DELETE FROM japan_checkins WHERE name=${user.name}`;}
  return;
 }
 const p=checkPosition(body);
 if(localDemo()){demo.set(user.name,{name:user.name,...p,at});return;}
 const sql=await db();
 await sql`INSERT INTO japan_checkins(name,lat,lng,at) VALUES (${user.name},${p.lat},${p.lng},${at}) ON CONFLICT(name) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,at=excluded.at`;
}
export async function listCheckins(user,now=new Date()){
 let rows;
 if(localDemo()){
  for(const [k,c] of demo)if(now-new Date(c.at)>=CHECKIN_HOURS*3600000)demo.delete(k);
  rows=[...demo.values()];
 }else{
  const sql=await db();
  rows=(await sql`SELECT name,lat,lng,at FROM japan_checkins`).map(r=>({name:r.name,lat:r.lat,lng:r.lng,at:new Date(r.at).toISOString()}));
 }
 return rows.filter(c=>canSeeCheckin(user,c,PARENTS));
}
export const resetDemoCheckins=()=>{demo=new Map();};
