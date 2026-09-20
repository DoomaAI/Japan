// Food we want to try, in Japanese and English, so a menu can be read and a dish pointed at.
//
// The Japanese is written the way it usually appears on a menu or a shop sign. Romaji is a
// pronunciation aid, not a spelling anyone in Japan uses. Treat all of it as a helper: menus
// vary, shops write things their own way, and staff are the authority on what is in a dish.
// Anything allergy-related must be confirmed with the restaurant, not with this list.
export const FOOD_KINDS=[
 ['meal','Proper meals'],['side','Sides and small plates'],['snack','Street food and snacks'],
 ['sweet','Sweet things'],['drink','Drinks'],['safe','Plain and dependable']
];
export const FOOD=[
 {id:'tonkatsu',en:'Tonkatsu — crumbed pork cutlet',ja:'とんかつ',romaji:'tonkatsu',kind:'meal',note:'Maisen on day two is one of the famous ones. Comes with shredded cabbage and rice.'},
 {id:'katsucurry',en:'Katsu curry',ja:'カツカレー',romaji:'katsu karē',kind:'meal',note:'Mild, thick and brown — not a spicy curry. A reliable one for the boys.'},
 {id:'ramen',en:'Ramen',ja:'ラーメン',romaji:'rāmen',kind:'meal',note:'Ask for it without the spicy oil if you are unsure.'},
 {id:'tonkotsu',en:'Tonkotsu ramen — pork bone broth',ja:'とんこつラーメン',romaji:'tonkotsu rāmen',kind:'meal',note:'Rich, creamy and pale. The Kyushu style.'},
 {id:'udon',en:'Udon — thick wheat noodles',ja:'うどん',romaji:'udon',kind:'meal',note:'Soft and mild. Usually the gentlest noodle on a menu.'},
 {id:'soba',en:'Soba — buckwheat noodles',ja:'そば',romaji:'soba',kind:'meal',note:'Hot in broth, or cold on a tray to dip.'},
 {id:'zarusoba',en:'Zaru soba — cold soba to dip',ja:'ざるそば',romaji:'zaru soba',kind:'meal',note:'Served cold on a bamboo tray with a dipping cup.'},
 {id:'sushi',en:'Sushi',ja:'寿司',romaji:'sushi',kind:'meal',note:'Conveyor-belt places are the easy version with children.'},
 {id:'tempura',en:'Tempura — light battered prawns and vegetables',ja:'天ぷら',romaji:'tenpura',kind:'meal',note:'Crisp, not greasy. Dip it in the sauce or the salt.'},
 {id:'oyakodon',en:'Oyakodon — chicken and egg on rice',ja:'親子丼',romaji:'oyakodon',kind:'meal',note:'Soft, savoury and easy. A very good child order.'},
 {id:'gyudon',en:'Gyudon — beef on rice',ja:'牛丼',romaji:'gyūdon',kind:'meal',note:'Fast, cheap and everywhere.'},
 {id:'omurice',en:'Omurice — omelette over fried rice',ja:'オムライス',romaji:'omuraisu',kind:'meal',note:'On the plan for our last Shibuya evening.'},
 {id:'okonomiyaki',en:'Okonomiyaki — savoury pancake',ja:'お好み焼き',romaji:'okonomiyaki',kind:'meal',note:'An Osaka thing. Often cooked on the table.'},
 {id:'yakisoba',en:'Yakisoba — fried noodles',ja:'焼きそば',romaji:'yakisoba',kind:'meal',note:'Sweet-savoury sauce. A festival and street favourite.'},
 {id:'katsusando',en:'Katsu sando — cutlet sandwich',ja:'カツサンド',romaji:'katsu sando',kind:'meal',note:'Sold in every convenience store. Good for a train.'},
 {id:'yakitori',en:'Yakitori — grilled chicken skewers',ja:'焼き鳥',romaji:'yakitori',kind:'side',note:'Ask for shio (salt) or tare (sweet sauce).'},
 {id:'karaage',en:'Karaage — Japanese fried chicken',ja:'唐揚げ',romaji:'karaage',kind:'side',note:'Crisp, juicy and reliably popular.'},
 {id:'gyoza',en:'Gyoza — pan-fried dumplings',ja:'餃子',romaji:'gyōza',kind:'side',note:'Crisp on the bottom, soft on top.'},
 {id:'tamagoyaki',en:'Tamagoyaki — rolled sweet omelette',ja:'卵焼き',romaji:'tamagoyaki',kind:'side',note:'Slightly sweet. Common at Tsukiji on a stick.'},
 {id:'edamame',en:'Edamame — salted soy beans',ja:'枝豆',romaji:'edamame',kind:'side',note:'Squeeze them straight out of the pod.'},
 {id:'misoshiru',en:'Miso soup',ja:'味噌汁',romaji:'miso shiru',kind:'side',note:'Drink it straight from the bowl. That is the normal way.'},
 {id:'onigiri',en:'Onigiri — rice ball',ja:'おにぎり',romaji:'onigiri',kind:'snack',note:'Convenience-store ones have a clever wrapper that keeps the seaweed crisp.'},
 {id:'takoyaki',en:'Takoyaki — octopus balls',ja:'たこ焼き',romaji:'takoyaki',kind:'snack',note:'Osaka, day eight. Very hot inside — wait longer than you think.'},
 {id:'melonpan',en:'Melon pan — crisp-topped sweet bun',ja:'メロンパン',romaji:'meron pan',kind:'snack',note:'No melon in it. Named for the crackled top.'},
 {id:'taiyaki',en:'Taiyaki — fish-shaped filled cake',ja:'たい焼き',romaji:'taiyaki',kind:'snack',note:'Usually red bean; custard and chocolate are common too.'},
 {id:'butterbeer',en:'Butterbeer',ja:'バタービール',romaji:'batā bīru',kind:'snack',note:'Hogsmeade at Universal, day five. Not alcoholic.'},
 {id:'corndog',en:'Cheese corn dog',ja:'チーズドッグ',romaji:'chīzu doggu',kind:'snack',note:'Street food in Harajuku and Osaka.'},
 {id:'mochi',en:'Mochi — pounded rice cake',ja:'餅',romaji:'mochi',kind:'sweet',note:'Nakatanidou in Nara pound it at speed. Chew carefully.'},
 {id:'ichigodaifuku',en:'Ichigo daifuku — strawberry in mochi',ja:'いちご大福',romaji:'ichigo daifuku',kind:'sweet',note:'A whole strawberry wrapped in bean paste and mochi.'},
 {id:'dango',en:'Dango — sweet rice dumplings on a stick',ja:'団子',romaji:'dango',kind:'sweet',note:'The Little Green Dumplings at DisneySea are these.'},
 {id:'dorayaki',en:'Dorayaki — pancake sandwich with bean paste',ja:'どら焼き',romaji:'dorayaki',kind:'sweet',note:'Doraemon’s favourite, which the boys may appreciate.'},
 {id:'kakigori',en:'Kakigori — shaved ice',ja:'かき氷',romaji:'kakigōri',kind:'sweet',note:'Far softer than a snow cone. Matcha and strawberry are everywhere.'},
 {id:'crepe',en:'Harajuku crepe',ja:'クレープ',romaji:'kurēpu',kind:'sweet',note:'Takeshita Street, day thirteen. Choose from the plastic models outside.'},
 {id:'pancake',en:'Soufflé pancakes',ja:'パンケーキ',romaji:'pankēki',kind:'sweet',note:'FLIPPER’S on our last Shibuya morning. They wobble.'},
 {id:'purin',en:'Purin — firm caramel custard',ja:'プリン',romaji:'purin',kind:'sweet',note:'Sold in every convenience store. Better than it has any right to be.'},
 {id:'castella',en:'Castella — honey sponge cake',ja:'カステラ',romaji:'kasutera',kind:'sweet',note:'Plain, dense and not too sweet.'},
 {id:'matcha',en:'Matcha',ja:'抹茶',romaji:'matcha',kind:'drink',note:'On the plan almost daily. Bitter, grassy and green.'},
 {id:'matchalatte',en:'Matcha latte',ja:'抹茶ラテ',romaji:'matcha rate',kind:'drink',note:'The gentler way in for the boys.'},
 {id:'hojicha',en:'Hojicha — roasted green tea',ja:'ほうじ茶',romaji:'hōjicha',kind:'drink',note:'Toasty, brown and barely bitter. Low in caffeine.'},
 {id:'ramune',en:'Ramune — marble-bottle soda',ja:'ラムネ',romaji:'ramune',kind:'drink',note:'You push the marble in to open it. Half the fun is the bottle.'},
 {id:'calpis',en:'Calpis — milky soft drink',ja:'カルピス',romaji:'karupisu',kind:'drink',note:'Sweet and slightly yoghurty. Sold as Calpico in some places.'},
 {id:'melonsoda',en:'Melon soda with ice cream',ja:'クリームソーダ',romaji:'kurīmu sōda',kind:'drink',note:'Bright green, in an old-fashioned café glass.'},
 {id:'cornpotage',en:'Hot corn soup from a machine',ja:'コーンポタージュ',romaji:'kōn potāju',kind:'drink',note:'From a vending machine, warm in the can. Strangely good.'},
 {id:'gohan',en:'Plain white rice',ja:'白ごはん',romaji:'shiro gohan',kind:'safe',note:'Always available. The dependable fallback.'},
 {id:'poteto',en:'Chips / fries',ja:'フライドポテト',romaji:'furaido poteto',kind:'safe',note:'Ask for these when nothing else is going to work.'},
 {id:'teriyaki',en:'Teriyaki chicken',ja:'照り焼きチキン',romaji:'teriyaki chikin',kind:'safe',note:'Sweet, mild and never spicy.'},
 {id:'panda',en:'Plain bread roll',ja:'食パン',romaji:'shokupan',kind:'safe',note:'Thick, soft white bread. Every bakery and konbini has it.'}
];
// Said or shown at the counter. The app already shows Japanese large on the Show someone card.
export const ORDERING=[
 {id:'four',en:'Four people, please',ja:'4人です',romaji:'yonin desu'},
 {id:'children',en:'Two adults and two children',ja:'大人2人、子供2人です',romaji:'otona futari, kodomo futari desu'},
 {id:'spicy',en:'Is this spicy?',ja:'これは辛いですか？',romaji:'kore wa karai desu ka?'},
 {id:'notspicy',en:'Not spicy, please',ja:'辛くしないでください',romaji:'karaku shinaide kudasai'},
 {id:'nowasabi',en:'No wasabi, please',ja:'わさび抜きでお願いします',romaji:'wasabi nuki de onegai shimasu'},
 {id:'this',en:'This one, please',ja:'これをください',romaji:'kore o kudasai'},
 {id:'allergy',en:'Does this contain nuts, egg or dairy?',ja:'これにナッツ・卵・乳製品は入っていますか？',romaji:'kore ni nattsu, tamago, nyūseihin wa haitte imasu ka?'},
 {id:'nopork',en:'Is there anything without pork?',ja:'豚肉が入っていないものはありますか？',romaji:'butaniku ga haitte inai mono wa arimasu ka?'},
 {id:'highchair',en:'Do you have a high chair?',ja:'子供用の椅子はありますか？',romaji:'kodomo-yō no isu wa arimasu ka?'},
 {id:'share',en:'May we share this between us?',ja:'取り分けてもいいですか？',romaji:'toriwakete mo ii desu ka?'},
 {id:'takeaway',en:'Can we take this away?',ja:'持ち帰りできますか？',romaji:'mochikaeri dekimasu ka?'},
 {id:'bill',en:'The bill, please',ja:'お会計お願いします',romaji:'okaikei onegai shimasu'},
 {id:'delicious',en:'It was delicious — thank you',ja:'ごちそうさまでした',romaji:'gochisōsama deshita'}
];
export const FOOD_KIND_LABEL=id=>FOOD_KINDS.find(([k])=>k===id)?.[1]||'Other';
