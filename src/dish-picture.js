// A picture of the dish, for the moment at the counter when neither the Japanese on the menu
// nor the English name the model gave it tells you what is going to arrive. Wikipedia is the
// source rather than an image search: it needs no key, it costs nothing to call, and what
// comes back is one photograph chosen by people for an article about that dish rather than
// the first thing a search engine indexed. Japanese first — ja.wikipedia has an article on
// far more dishes than en.wikipedia does, and the pictures are of the dish as it is served
// here rather than as a restaurant abroad makes it.
const WIKIS={ja:'https://ja.wikipedia.org',en:'https://en.wikipedia.org'};
// The one host Wikimedia serves its photographs from. A thumbnail pointing anywhere else is
// not something this app puts on a family's screen.
const IMAGE_HOST='upload.wikimedia.org';
export function pictureSearchUrl(language,query){
 const params=new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',
  generator:'search',gsrsearch:query,gsrlimit:'3',gsrnamespace:'0',
  prop:'pageimages|info',piprop:'thumbnail',pithumbsize:'640',pilimit:'3',inprop:'url'});
 return `${WIKIS[language]}/w/api.php?${params}`;
}
// The best-ranked result that actually carries a photograph. A search for a dish often turns
// up an article with no picture at all before the one with it, and an article without a
// picture is no use to somebody deciding what to order.
export function pickPicture(payload,language){
 const pages=payload?.query?.pages;
 if(!Array.isArray(pages))return null;
 for(const page of [...pages].sort((a,b)=>(a?.index??99)-(b?.index??99))){
  const source=page?.thumbnail?.source;
  if(!source||!page.title)continue;
  let url;try{url=new URL(source);}catch{continue;}
  if(url.protocol!=='https:'||url.hostname!==IMAGE_HOST)continue;
  return {src:url.href,title:page.title,language,
   page:page.fullurl||`${WIKIS[language]}/wiki/${encodeURIComponent(page.title)}`};
 }
 return null;
}
// What to search for, best first: the plain name of the dish the model stripped out of the
// menu's wording, then the menu's own line, then the English name. 名物!若鶏の唐揚げ定食 has
// no article; 唐揚げ has one with a photograph on it.
export function pictureQueries({dish,ja,en}={}){
 const wanted=[['ja',dish],['ja',ja],['en',en]].map(([l,q])=>[l,(q||'').trim()]).filter(([,q])=>q);
 return wanted.filter(([l,q],i)=>wanted.findIndex(([ol,oq])=>ol===l&&oq===q)===i);
}
export const imageSearchUrl=query=>`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
// Looked up once per dish and kept for the meal: the boys will ask for the same picture twice.
const cache=new Map();
export async function findDishPicture(item,fetcher=fetch){
 const queries=pictureQueries(item);
 if(!queries.length)return null;
 const key=queries.map(q=>q.join(':')).join('|');
 if(cache.has(key))return cache.get(key);
 let reached=false;
 for(const [language,query] of queries){
  let payload;
  try{
   const response=await fetcher(pictureSearchUrl(language,query),{headers:{Accept:'application/json'}});
   if(!response.ok)continue;
   payload=await response.json();
  }catch{continue;}
  reached=true;
  const found=pickPicture(payload,language);
  // A dish with no picture anywhere and a Wikipedia nobody could reach are different answers,
  // and the screen says different things about them.
  if(found){cache.set(key,found);return found;}
 }
 if(!reached)throw new Error('Wikipedia could not be reached for a picture. Try again in a moment.');
 cache.set(key,null);
 return null;
}
