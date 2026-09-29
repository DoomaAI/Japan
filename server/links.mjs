// A web address from a model is only as good as the page it came from. The suggestion and
// near-here calls search the web on Anthropic's side, and the search results come back in the
// same answer, so a link is kept only when it is HTTPS and its site is one the search actually
// returned. Anything else — a plausible address the model assembled from a name — is dropped,
// and the card falls back to a search the app builds itself.
const https=v=>{try{const u=new URL(String(v||'').trim());return u.protocol==='https:'&&!u.username&&!u.password?u:null;}catch{return null;}};
const bare=host=>String(host||'').toLowerCase().replace(/^www\./,'');
// Every site the searches in this answer returned, and every page cited from them.
export function seenHosts(contents){
 const hosts=new Set();
 const note=url=>{const u=https(url);if(u)hosts.add(bare(u.hostname));};
 for(const content of contents)for(const block of Array.isArray(content)?content:[]){
  if(block?.type==='web_search_tool_result'&&Array.isArray(block.content))for(const r of block.content)note(r?.url);
  for(const c of Array.isArray(block?.citations)?block.citations:[])note(c?.url);
 }
 return hosts;
}
// The link as given when its site was seen — the same host, or a page on a subdomain of it, so
// www.example.jp and tickets.example.jp both count for example.jp — and nothing otherwise.
export function checkedLink(url,hosts){
 const u=https(url);if(!u||!hosts?.size)return '';
 const host=bare(u.hostname);
 for(const seen of hosts)if(host===seen||host.endsWith(`.${seen}`))return u.href.slice(0,500);
 return '';
}
