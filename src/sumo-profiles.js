// What the handout on the day says about each man: age, where he is from, height and weight, and
// the things worth knowing when you are deciding who to back — past top-division titles, who is
// whose brother, who is new to the top division or back in it. With the photo from the same sheet
// ("Makuuchi Division", Katsuhito Niwa, September 2026, Tokyo), both pages; the photos are in
// sumo-photo.js. Two slips on the sheet are put right here: Okinawa, and Takayasu's 188cm.
// [age, from, cm, kg, notes]
const SHEET={
 // Yokozuna to Maegashira 8
 Onosato:[26,'Ishikawa, Japan',192,188,{titles:5}],Hoshoryu:[27,'Mongolia',188,148,{titles:2,absent:true}],
 Kirishima:[30,'Mongolia',186,150,{titles:3}],Kotozakura:[28,'Chiba, Japan',189,177,{titles:1}],
 Aonishiki:[22,'Ukraine',182,142,{titles:3,status:'Back at ozeki'}],
 Atamifuji:[23,'Shizuoka, Japan',185,198,{note:'Three tournaments in a row at sekiwake'}],
 Fujinokawa:[21,'Kyoto, Japan',177,125,{status:'New sekiwake',note:'10th-fastest rise to sekiwake — 22 tournaments from his debut'}],
 Hakunofuji:[23,'Tottori, Japan',181,162,{status:'New komusubi'}],Daieisho:[32,'Saitama, Japan',183,163,{titles:1,status:'Back at komusubi'}],
 Kotoshoho:[27,'Chiba, Japan',189,170,{titles:1,brother:'Kotoeiho'}],
 Kotoeiho:[23,'Chiba, Japan',184,140,{brother:'Kotoshoho',note:'Watch for his unique shiko — the leg-stomp before the bout'}],
 Takayasu:[36,'Ibaraki, Japan',188,173],Yoshinofuji:[25,'Kumamoto, Japan',185,162],
 Gonoyama:[28,'Osaka, Japan',178,163],Churanoumi:[33,'Okinawa, Japan',176,157],
 Takanosho:[31,'Chiba, Japan',184,176],Fujiryoga:[23,'Aichi, Japan',180,184],
 Roga:[27,'Russia',185,159],Oshoma:[29,'Mongolia',190,162],
 Asanoyama:[32,'Toyama, Japan',188,172,{titles:1}],Ichiyamamoto:[32,'Hokkaido, Japan',190,160],
 Fujiseiun:[28,'Kumamoto, Japan',185,149],Nishikifuji:[30,'Aomori, Japan',184,155],
 Takerufuji:[27,'Aomori, Japan',186,149,{titles:1}],Hiradoumi:[26,'Nagasaki, Japan',178,142],
 // Maegashira 9 to 17
 Ura:[34,'Osaka, Japan',173,138,{agile:true}],Shishi:[29,'Ukraine',193,182],
 Oho:[26,'Tokyo, Japan',192,185],Kinbozan:[29,'Kazakhstan',194,181],
 Wakamotoharu:[32,'Fukushima, Japan',186,149,{brother:'Wakatakakage'}],Shodai:[34,'Kumamoto, Japan',184,168,{titles:1}],
 Wakatakakage:[31,'Fukushima, Japan',183,138,{titles:2,brother:'Wakamotoharu',absent:true}],Asahakuryu:[27,'Mongolia',185,157],
 Asakoryu:[27,'Osaka, Japan',178,122,{brother:'Asasuiryu'}],Abi:[32,'Saitama, Japan',186,167,{titles:1}],
 Tobizaru:[34,'Tokyo, Japan',173,135,{agile:true}],Chiyoshoma:[35,'Mongolia',184,144],
 Asasuiryu:[26,'Osaka, Japan',175,120,{status:'New to the top division',brother:'Asakoryu'}],
 Tokihayate:[30,'Miyagi, Japan',179,135,{status:'Back in the top division'}],
 Wakanosho:[23,'Tochigi, Japan',178,143,{absent:true}],
 Toshinofuji:[26,'Mongolia',195,156,{status:'New to the top division',note:'The 33rd wrestler from Mongolia'}],
 Shonannoumi:[28,'Kanagawa, Japan',193,180,{status:'Back in the top division'}],
};
// The short lines under a name: each is something a person might tip on.
function notes({agile,titles,brother,status,note,absent}={}){
 return [absent&&'Absent this tournament',status,titles&&`Top-division champion ×${titles}`,
  agile&&'Small but agile',brother&&`Brother of ${brother}`,note].filter(Boolean);
}
const cache={};
export function sumoProfile(name){
 const key=String(name||'').trim();
 if(!SHEET[key])return null;
 if(!cache[key]){const [age,from,heightCm,weightKg,extra]=SHEET[key];
  cache[key]={age,from,heightCm,weightKg,notes:notes(extra),titles:extra?.titles||0,absent:!!extra?.absent,brother:extra?.brother||null};}
 return cache[key];
}
export const SUMO_PROFILE_NAMES=Object.keys(SHEET);
