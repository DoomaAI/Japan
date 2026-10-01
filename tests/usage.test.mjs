import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {OPUS,usageOf,recordUsage,usageSummary} from '../server/usage.mjs';

// A stand-in for the API that keeps every request body and answers with the tool the route asked for.
async function upstream(answer){
 const seen=[];
 const server=createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{const r=JSON.parse(body);seen.push(r);
  res.setHeader('Content-Type','application/json');
  res.end(JSON.stringify({id:'m',type:'message',role:'assistant',model:r.model,stop_reason:'tool_use',usage:{input_tokens:10,output_tokens:5},content:[answer(r)]}));});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const prev=[process.env.ANTHROPIC_API_KEY,process.env.ANTHROPIC_BASE_URL];
 process.env.ANTHROPIC_API_KEY='k';process.env.ANTHROPIC_BASE_URL=`http://127.0.0.1:${server.address().port}`;
 return {seen,close(){server.close();
  if(prev[0]===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=prev[0];
  if(prev[1]===undefined)delete process.env.ANTHROPIC_BASE_URL;else process.env.ANTHROPIC_BASE_URL=prev[1];}};
}

test('every model call goes through the shared client on Opus 5.5, with no model named anywhere else',async()=>{
 assert.equal(OPUS,'claude-opus-5-5');
 for(const f of (await readdir(new URL('../server/',import.meta.url))).filter(f=>f.endsWith('.mjs')&&f!=='usage.mjs')){
  const src=await readFile(new URL(`../server/${f}`,import.meta.url),'utf8');
  assert.doesNotMatch(src,/claude-(opus|sonnet|haiku)-/,`${f} names a model`);
  assert.doesNotMatch(src,/new Anthropic\(/,`${f} makes its own client`);
  // Opus 5.5 answers a forced tool with a 400.
  assert.doesNotMatch(src,/tool_choice:\{type:'(tool|any)'/,`${f} forces a tool`);
 }
});

test('reading a recommendation no longer forces its tool, and still reads what comes back',async()=>{
 const api=await upstream(()=>({type:'tool_use',id:'t',name:'record_recommendations',input:{items:[{title:'Nara',place:'',category:'place',said:'Go early',within:'',accessibleFrom:'',travel:''}]}}));
 try{
  const {readRecommendations}=await import('../server/recommend.mjs');
  const {items}=await readRecommendations({text:'Go to Nara early',from:'Sue'},{days:[]});
  assert.equal(items[0].title,'Nara');
  assert.equal(api.seen[0].model,'claude-opus-5-5');
  assert.equal(api.seen[0].tool_choice,undefined);
  assert.equal(api.seen[0].output_config.effort,'low');
 }finally{api.close();}
});

test('usage is read from the response, and nothing is written without a database',async()=>{
 assert.deepEqual(usageOf({usage:{input_tokens:100,output_tokens:20,cache_read_input_tokens:50,cache_creation_input_tokens:5,server_tool_use:{web_search_requests:3}}}),
  {input:100,output:20,cacheRead:50,cacheWrite:5,searches:3});
 assert.deepEqual(usageOf({}),{input:0,output:0,cacheRead:0,cacheWrite:0,searches:0});
 const url=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
 try{
  await recordUsage('ask',OPUS,{usage:{input_tokens:1,output_tokens:1}});
  assert.deepEqual(await usageSummary(),[]);
 }finally{if(url!==undefined)process.env.DATABASE_URL=url;}
 const handler=await readFile(new URL('../server/handler.mjs',import.meta.url),'utf8');
 assert.match(handler,/route==='usage'&&req\.method==='GET'\)\{\n   parent\(user\);/);
});
