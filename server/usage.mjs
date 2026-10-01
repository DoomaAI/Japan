import {database,localDemo} from './store.mjs';
// The one model every call uses until routing by feature is decided. Changing it here changes it everywhere.
export const OPUS='claude-opus-5-5';
// What each call to the model used, by feature, so the cost of a trip is measured rather than
// estimated from max_tokens. One row per call; nothing about the question or the answer is kept.
let ready;
async function usageTable(){
 const db=await database();
 ready??=db`CREATE TABLE IF NOT EXISTS japan_usage (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now(), route text NOT NULL, model text NOT NULL, input integer NOT NULL DEFAULT 0, output integer NOT NULL DEFAULT 0, cache_read integer NOT NULL DEFAULT 0, cache_write integer NOT NULL DEFAULT 0, searches integer NOT NULL DEFAULT 0)`.catch(e=>{ready=undefined;throw e;});
 await ready;return db;
}
export const usageOf=message=>{const u=message?.usage||{};return {input:u.input_tokens??0,output:u.output_tokens??0,cacheRead:u.cache_read_input_tokens??0,cacheWrite:u.cache_creation_input_tokens??0,searches:u.server_tool_use?.web_search_requests??0};};
export async function recordUsage(route,model,message){
 if(!process.env.DATABASE_URL||localDemo())return;
 const u=usageOf(message);
 // A row that cannot be written must never cost the person their answer.
 try{const db=await usageTable();await db`INSERT INTO japan_usage(route,model,input,output,cache_read,cache_write,searches) VALUES (${route},${message?.model||model},${u.input},${u.output},${u.cacheRead},${u.cacheWrite},${u.searches})`;}catch{}
}
// The Anthropic client, with every messages.create recorded under the feature that made it.
export async function claude(route){
 const {default:Anthropic}=await import('@anthropic-ai/sdk');
 const client=new Anthropic();
 return {messages:{create:async params=>{const message=await client.messages.create(params);await recordUsage(route,params.model,message);return message;}}};
}
// Per feature and model over the last so many days, for a parent to see what the trip is costing.
export async function usageSummary(days=30){
 if(!process.env.DATABASE_URL||localDemo())return [];
 const db=await usageTable();
 return db`SELECT route,model,count(*)::int AS calls,sum(input)::bigint AS input,sum(output)::bigint AS output,sum(cache_read)::bigint AS cache_read,sum(cache_write)::bigint AS cache_write,sum(searches)::int AS searches FROM japan_usage WHERE at>now()-make_interval(days=>${days}) GROUP BY route,model ORDER BY route,model`;
}
