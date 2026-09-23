// What the handout on the day says about each man: age, where he is from, height and weight, and
// the things worth knowing when you are deciding who to back — past top-division titles, who is
// whose brother, who is new to the top division or back in it. With the photo from the same sheet
// ("Makuuchi Division", Katsuhito Niwa, September 2026, Tokyo); the photos are in sumo-photo.js.
// [age, from, cm, kg, notes]
const SHEET={
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
