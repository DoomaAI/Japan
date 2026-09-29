// What each of us cannot eat, said the way a Japanese menu or a member of staff says it. These
// are the allergens Japan labels: the eight that must be declared on packaged food and the
// twenty it recommends, plus a few ways of saying a whole group at once. The word in the third
// place is the one printed on the allergen chart every chain restaurant keeps under the counter,
// so pointing at it works even where nobody speaks English.
export const ALLERGENS=[
 ['egg','Egg','卵'],['milk','Milk and dairy','乳'],['wheat','Wheat','小麦'],['buckwheat','Buckwheat (soba)','そば'],
 ['peanut','Peanut','落花生'],['shrimp','Shrimp and prawn','えび'],['crab','Crab','かに'],['walnut','Walnut','くるみ'],
 ['almond','Almond','アーモンド'],['abalone','Abalone','あわび'],['squid','Squid','いか'],['salmonroe','Salmon roe','いくら'],
 ['orange','Orange','オレンジ'],['cashew','Cashew','カシューナッツ'],['kiwi','Kiwi fruit','キウイ'],['beef','Beef','牛肉'],
 ['sesame','Sesame','ごま'],['salmon','Salmon','さけ'],['mackerel','Mackerel','さば'],['soy','Soy','大豆'],
 ['chicken','Chicken','鶏肉'],['banana','Banana','バナナ'],['pork','Pork','豚肉'],['macadamia','Macadamia','マカダミアナッツ'],
 ['peach','Peach','もも'],['yam','Yam','やまいも'],['apple','Apple','りんご'],['gelatin','Gelatin','ゼラチン'],
 ['treenuts','All tree nuts','ナッツ類'],['shellfish','All shellfish','甲殻類'],['gluten','Gluten','グルテン'],
 ['vegetarian','No meat or fish','肉・魚'],['vegan','No animal products at all','動物性食品']
];
// The ones that mean a whole class of food is off, said as "does not eat" rather than "allergic".
const DIETS=new Set(['vegetarian','vegan']);
export const allergenById=id=>ALLERGENS.find(a=>a[0]===id)||null;
export const KANA_NAMES={Damien:'ダミアン',Lauren:'ローレン',Nate:'ネイト',Boston:'ボストン'};
export const emptyAllergy=()=>({allergens:[],severe:false,note:''});
export const allergyOf=(state,name)=>({...emptyAllergy(),...((state.allergies||{})[name]||{})});
// Everyone with something on their card, in family order, so the page opens on somebody who
// has one rather than on the first name in the family.
export const allergyPeople=state=>(state.members||[]).filter(n=>{const a=allergyOf(state,n);return a.allergens.length||a.note;});
// The card itself: what to hand across the counter. Japanese first and large, English under it
// so whoever is holding the phone knows what it says. A note is shown as typed: it is for the
// things a list cannot say, like "cooked egg is fine".
export function allergyCard(state,name){
 const a=allergyOf(state,name),list=a.allergens.map(allergenById).filter(Boolean);
 const allergic=list.filter(x=>!DIETS.has(x[0])),diet=list.filter(x=>DIETS.has(x[0]));
 const kana=KANA_NAMES[name]||name,ja=[],en=[];
 if(allergic.length){
  ja.push(`${kana}は${allergic.map(x=>x[2]).join('・')}のアレルギーがあります。`);
  en.push(`${name} is allergic to ${allergic.map(x=>x[1].toLowerCase()).join(', ')}.`);
  if(a.severe){ja.push('重いアレルギーです。少しでも食べると危険です。');en.push('It is a serious allergy. Even a small amount is dangerous.');}
  ja.push(`この料理に${allergic.length===1?allergic[0][2]:'これら'}は入っていますか？`);
  en.push(`Does this dish contain ${allergic.length===1?'it':'any of these'}?`);
 }
 if(diet.length){
  ja.push(`${kana}は${diet.map(x=>x[2]).join('・')}を食べません。`);
  en.push(`${name} does not eat ${diet.map(x=>x[1].toLowerCase().replace(/^no /,'')).join(' or ')}.`);
 }
 if(ja.length){ja.push('ご確認をお願いします。');en.push('Please check for us. Thank you.');}
 return {name,kana,list,severe:!!a.severe&&allergic.length>0,note:a.note||'',ja,en};
}
