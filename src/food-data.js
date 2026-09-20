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
 {id:'tonkatsu',en:'Tonkatsu — crumbed pork cutlet',ja:'とんかつ',romaji:'tonkatsu',say:'ton-kat-soo',variants:[{en:'Pork loin katsu',ja:'ロースかつ',romaji:'rōsu katsu',say:'roh-soo kat-soo'},{en:'Pork fillet katsu',ja:'ヒレかつ',romaji:'hire katsu',say:'hee-reh kat-soo'},{en:'Chicken katsu',ja:'チキンカツ',romaji:'chikin katsu',say:'chee-keen kat-soo'},{en:'Prawn katsu',ja:'エビフライ',romaji:'ebi furai',say:'eh-bee foo-rye'}],kind:'meal',note:'Maisen on day two is one of the famous ones. Comes with shredded cabbage and rice.'},
 {id:'katsucurry',en:'Katsu curry',ja:'カツカレー',romaji:'katsu karē',say:'kat-soo ka-reh',variants:[{en:'Chicken curry',ja:'チキンカレー',romaji:'chikin karē',say:'chee-keen ka-reh'},{en:'Pork curry',ja:'ポークカレー',romaji:'pōku karē',say:'poh-koo ka-reh'},{en:'Beef curry',ja:'ビーフカレー',romaji:'bīfu karē',say:'bee-foo ka-reh'},{en:'Vegetable curry',ja:'野菜カレー',romaji:'yasai karē',say:'ya-sigh ka-reh'}],kind:'meal',note:'Mild, thick and brown — not a spicy curry. A reliable one for the boys.'},
 {id:'ramen',en:'Ramen',ja:'ラーメン',romaji:'rāmen',say:'rah-men',variants:[{en:'Soy sauce ramen',ja:'醤油ラーメン',romaji:'shōyu rāmen',say:'shoh-yoo rah-men'},{en:'Miso ramen',ja:'味噌ラーメン',romaji:'miso rāmen',say:'mee-so rah-men'},{en:'Salt ramen — the mildest',ja:'塩ラーメン',romaji:'shio rāmen',say:'shee-oh rah-men'},{en:'Vegetable ramen',ja:'野菜ラーメン',romaji:'yasai rāmen',say:'ya-sigh rah-men'}],kind:'meal',note:'Ask for it without the spicy oil if you are unsure.'},
 {id:'tonkotsu',en:'Tonkotsu ramen — pork bone broth',ja:'とんこつラーメン',romaji:'tonkotsu rāmen',say:'ton-kot-soo rah-men',kind:'meal',note:'Rich, creamy and pale. The Kyushu style.'},
 {id:'udon',en:'Udon — thick wheat noodles',ja:'うどん',romaji:'udon',say:'oo-don',variants:[{en:'Plain hot udon',ja:'かけうどん',romaji:'kake udon',say:'ka-keh oo-don'},{en:'Beef udon',ja:'肉うどん',romaji:'niku udon',say:'nee-koo oo-don'},{en:'Prawn tempura udon',ja:'天ぷらうどん',romaji:'tenpura udon',say:'ten-poo-ra oo-don'}],kind:'meal',note:'Soft and mild. Usually the gentlest noodle on a menu.'},
 {id:'soba',en:'Soba — buckwheat noodles',ja:'そば',romaji:'soba',say:'so-ba',kind:'meal',note:'Hot in broth, or cold on a tray to dip.'},
 {id:'zarusoba',en:'Zaru soba — cold soba to dip',ja:'ざるそば',romaji:'zaru soba',say:'za-roo so-ba',kind:'meal',note:'Served cold on a bamboo tray with a dipping cup.'},
 {id:'sushi',en:'Sushi',ja:'寿司',romaji:'sushi',say:'soo-shee',kind:'meal',note:'Conveyor-belt places are the easy version with children.'},
 {id:'tempura',en:'Tempura — light battered prawns and vegetables',ja:'天ぷら',romaji:'tenpura',say:'ten-poo-ra',variants:[{en:'Prawn tempura',ja:'エビ天ぷら',romaji:'ebi tenpura',say:'eh-bee ten-poo-ra'},{en:'Vegetable tempura',ja:'野菜天ぷら',romaji:'yasai tenpura',say:'ya-sigh ten-poo-ra'}],kind:'meal',note:'Crisp, not greasy. Dip it in the sauce or the salt.'},
 {id:'oyakodon',en:'Oyakodon — chicken and egg on rice',ja:'親子丼',romaji:'oyakodon',say:'oh-ya-ko-don',variants:[{en:'Beef on rice',ja:'牛丼',romaji:'gyūdon',say:'gyoo-don'},{en:'Pork cutlet on rice',ja:'カツ丼',romaji:'katsudon',say:'kat-soo-don'},{en:'Tempura on rice',ja:'天丼',romaji:'tendon',say:'ten-don'}],kind:'meal',note:'Soft, savoury and easy. A very good child order.'},
 {id:'gyudon',en:'Gyudon — beef on rice',ja:'牛丼',romaji:'gyūdon',say:'gyoo-don',kind:'meal',note:'Fast, cheap and everywhere.'},
 {id:'omurice',en:'Omurice — omelette over fried rice',ja:'オムライス',romaji:'omuraisu',say:'oh-moo-rye-soo',kind:'meal',note:'On the plan for our last Shibuya evening.'},
 {id:'okonomiyaki',en:'Okonomiyaki — savoury pancake',ja:'お好み焼き',romaji:'okonomiyaki',say:'oh-ko-no-mee-ya-kee',variants:[{en:'Pork',ja:'豚玉',romaji:'butatama',say:'boo-ta-ta-ma'},{en:'Seafood',ja:'海鮮',romaji:'kaisen',say:'kigh-sen'},{en:'Cheese',ja:'チーズ',romaji:'chīzu',say:'chee-zoo'}],kind:'meal',note:'An Osaka thing. Often cooked on the table.'},
 {id:'yakisoba',en:'Yakisoba — fried noodles',ja:'焼きそば',romaji:'yakisoba',say:'ya-kee-so-ba',kind:'meal',note:'Sweet-savoury sauce. A festival and street favourite.'},
 {id:'katsusando',en:'Katsu sando — cutlet sandwich',ja:'カツサンド',romaji:'katsu sando',say:'kat-soo san-doh',kind:'meal',note:'Sold in every convenience store. Good for a train.'},
 {id:'yakitori',en:'Yakitori — grilled chicken skewers',ja:'焼き鳥',romaji:'yakitori',say:'ya-kee-to-ree',variants:[{en:'Chicken thigh',ja:'もも',romaji:'momo',say:'mo-mo'},{en:'Chicken breast',ja:'むね',romaji:'mune',say:'moo-neh'},{en:'Chicken meatball',ja:'つくね',romaji:'tsukune',say:'tsoo-koo-neh'},{en:'Chicken and spring onion',ja:'ねぎま',romaji:'negima',say:'neh-gee-ma'}],kind:'side',note:'Ask for shio (salt) or tare (sweet sauce).'},
 {id:'karaage',en:'Karaage — Japanese fried chicken',ja:'唐揚げ',romaji:'karaage',say:'ka-rah-a-geh',kind:'side',note:'Crisp, juicy and reliably popular.'},
 {id:'gyoza',en:'Gyoza — pan-fried dumplings',ja:'餃子',romaji:'gyōza',say:'gyoh-za',variants:[{en:'Pork dumplings',ja:'豚餃子',romaji:'buta gyōza',say:'boo-ta gyoh-za'},{en:'Prawn dumplings',ja:'エビ餃子',romaji:'ebi gyōza',say:'eh-bee gyoh-za'},{en:'Vegetable dumplings',ja:'野菜餃子',romaji:'yasai gyōza',say:'ya-sigh gyoh-za'}],kind:'side',note:'Crisp on the bottom, soft on top.'},
 {id:'tamagoyaki',en:'Tamagoyaki — rolled sweet omelette',ja:'卵焼き',romaji:'tamagoyaki',say:'ta-ma-go-ya-kee',kind:'side',note:'Slightly sweet. Common at Tsukiji on a stick.'},
 {id:'edamame',en:'Edamame — salted soy beans',ja:'枝豆',romaji:'edamame',say:'eh-da-ma-meh',kind:'side',note:'Squeeze them straight out of the pod.'},
 {id:'misoshiru',en:'Miso soup',ja:'味噌汁',romaji:'miso shiru',say:'mee-so shee-roo',kind:'side',note:'Drink it straight from the bowl. That is the normal way.'},
 {id:'onigiri',en:'Onigiri — rice ball',ja:'おにぎり',romaji:'onigiri',say:'oh-nee-gee-ree',variants:[{en:'Tuna and mayonnaise',ja:'ツナマヨ',romaji:'tsuna mayo',say:'tsoo-na ma-yo'},{en:'Grilled salmon',ja:'鮭',romaji:'shake',say:'sha-keh'},{en:'Pickled plum',ja:'梅',romaji:'ume',say:'oo-meh'},{en:'Just salt — the plainest',ja:'塩むすび',romaji:'shio musubi',say:'shee-oh moo-soo-bee'}],kind:'snack',note:'Convenience-store ones have a clever wrapper that keeps the seaweed crisp.'},
 {id:'takoyaki',en:'Takoyaki — octopus balls',ja:'たこ焼き',romaji:'takoyaki',say:'ta-ko-ya-kee',kind:'snack',note:'Osaka, day eight. Very hot inside — wait longer than you think.'},
 {id:'melonpan',en:'Melon pan — crisp-topped sweet bun',ja:'メロンパン',romaji:'meron pan',say:'meh-ron pan',kind:'snack',note:'No melon in it. Named for the crackled top.'},
 {id:'taiyaki',en:'Taiyaki — fish-shaped filled cake',ja:'たい焼き',romaji:'taiyaki',say:'tie-ya-kee',kind:'snack',note:'Usually red bean; custard and chocolate are common too.'},
 {id:'butterbeer',en:'Butterbeer',ja:'バタービール',romaji:'batā bīru',say:'ba-tah bee-roo',kind:'snack',note:'Hogsmeade at Universal, day five. Not alcoholic.'},
 {id:'corndog',en:'Cheese corn dog',ja:'チーズドッグ',romaji:'chīzu doggu',say:'chee-zoo dog-goo',kind:'snack',note:'Street food in Harajuku and Osaka.'},
 {id:'mochi',en:'Mochi — pounded rice cake',ja:'餅',romaji:'mochi',say:'mo-chee',kind:'sweet',note:'Nakatanidou in Nara pound it at speed. Chew carefully.'},
 {id:'ichigodaifuku',en:'Ichigo daifuku — strawberry in mochi',ja:'いちご大福',romaji:'ichigo daifuku',say:'ee-chee-go dye-foo-koo',kind:'sweet',note:'A whole strawberry wrapped in bean paste and mochi.'},
 {id:'dango',en:'Dango — sweet rice dumplings on a stick',ja:'団子',romaji:'dango',say:'dan-go',kind:'sweet',note:'The Little Green Dumplings at DisneySea are these.'},
 {id:'dorayaki',en:'Dorayaki — pancake sandwich with bean paste',ja:'どら焼き',romaji:'dorayaki',say:'do-ra-ya-kee',kind:'sweet',note:'Doraemon’s favourite, which the boys may appreciate.'},
 {id:'kakigori',en:'Kakigori — shaved ice',ja:'かき氷',romaji:'kakigōri',say:'ka-kee-goh-ree',kind:'sweet',note:'Far softer than a snow cone. Matcha and strawberry are everywhere.'},
 {id:'crepe',en:'Harajuku crepe',ja:'クレープ',romaji:'kurēpu',say:'koo-reh-poo',kind:'sweet',note:'Takeshita Street, day thirteen. Choose from the plastic models outside.'},
 {id:'pancake',en:'Soufflé pancakes',ja:'パンケーキ',romaji:'pankēki',say:'pan-keh-kee',kind:'sweet',note:'FLIPPER’S on our last Shibuya morning. They wobble.'},
 {id:'purin',en:'Purin — firm caramel custard',ja:'プリン',romaji:'purin',say:'poo-reen',kind:'sweet',note:'Sold in every convenience store. Better than it has any right to be.'},
 {id:'castella',en:'Castella — honey sponge cake',ja:'カステラ',romaji:'kasutera',say:'ka-soo-teh-ra',kind:'sweet',note:'Plain, dense and not too sweet.'},
 {id:'matcha',en:'Matcha',ja:'抹茶',romaji:'matcha',say:'mat-cha',kind:'drink',note:'On the plan almost daily. Bitter, grassy and green.'},
 {id:'matchalatte',en:'Matcha latte',ja:'抹茶ラテ',romaji:'matcha rate',say:'mat-cha lah-teh',kind:'drink',note:'The gentler way in for the boys.'},
 {id:'hojicha',en:'Hojicha — roasted green tea',ja:'ほうじ茶',romaji:'hōjicha',say:'hoh-jee-cha',kind:'drink',note:'Toasty, brown and barely bitter. Low in caffeine.'},
 {id:'ramune',en:'Ramune — marble-bottle soda',ja:'ラムネ',romaji:'ramune',say:'ra-moo-neh',kind:'drink',note:'You push the marble in to open it. Half the fun is the bottle.'},
 {id:'calpis',en:'Calpis — milky soft drink',ja:'カルピス',romaji:'karupisu',say:'ka-roo-pee-soo',kind:'drink',note:'Sweet and slightly yoghurty. Sold as Calpico in some places.'},
 {id:'melonsoda',en:'Melon soda with ice cream',ja:'クリームソーダ',romaji:'kurīmu sōda',say:'koo-ree-moo soh-da',kind:'drink',note:'Bright green, in an old-fashioned café glass.'},
 {id:'cornpotage',en:'Hot corn soup from a machine',ja:'コーンポタージュ',romaji:'kōn potāju',say:'kohn po-tah-joo',kind:'drink',note:'From a vending machine, warm in the can. Strangely good.'},
 {id:'gohan',en:'Plain white rice',ja:'白ごはん',romaji:'shiro gohan',say:'shee-ro go-han',kind:'safe',note:'Always available. The dependable fallback.'},
 {id:'poteto',en:'Chips / fries',ja:'フライドポテト',romaji:'furaido poteto',say:'foo-rye-do po-teh-to',kind:'safe',note:'Ask for these when nothing else is going to work.'},
 {id:'teriyaki',en:'Teriyaki chicken',ja:'照り焼きチキン',romaji:'teriyaki chikin',say:'teh-ree-ya-kee chee-keen',kind:'safe',note:'Sweet, mild and never spicy.'},
 {id:'panda',en:'Plain bread roll',ja:'食パン',romaji:'shokupan',say:'sho-koo-pan',kind:'safe',note:'Thick, soft white bread. Every bakery and konbini has it.'}
];
// Japanese gives every chunk the same length and weight — the commonest mistake is stressing
// one the way English does. The `say` strings are hyphenated into those even chunks, and keep
// the devoiced endings a learner would otherwise get wrong (desu → "dess", -mashita → "mash-ta").
export const SAY_TIP='Say each chunk evenly — Japanese does not stress one part the way English does.';
// Said or shown at the counter. The app already shows Japanese large on the Show someone card.
export const ORDERING=[
 {id:'four',en:'Four people, please',ja:'4人です',romaji:'yonin desu',say:'yo-neen dess'},
 {id:'children',en:'Two adults and two children',ja:'大人2人、子供2人です',romaji:'otona futari, kodomo futari desu',say:'oh-to-na foo-ta-ree, ko-do-mo foo-ta-ree dess'},
 {id:'spicy',en:'Is this spicy?',ja:'これは辛いですか？',romaji:'kore wa karai desu ka?',say:'ko-reh wa ka-rye dess ka'},
 {id:'notspicy',en:'Not spicy, please',ja:'辛くしないでください',romaji:'karaku shinaide kudasai',say:'ka-ra-koo shee-nigh-deh koo-da-sigh'},
 {id:'nowasabi',en:'No wasabi, please',ja:'わさび抜きでお願いします',romaji:'wasabi nuki de onegai shimasu',say:'wa-sa-bee noo-kee deh oh-neh-guy shee-mass'},
 {id:'this',en:'This one, please',ja:'これをください',romaji:'kore o kudasai',say:'ko-reh oh koo-da-sigh'},
 {id:'allergy',en:'Does this contain nuts, egg or dairy?',ja:'これにナッツ・卵・乳製品は入っていますか？',romaji:'kore ni nattsu, tamago, nyūseihin wa haitte imasu ka?',say:'ko-reh nee nat-tsoo, ta-ma-go, nyoo-say-heen wa ha-eet-teh ee-mass ka'},
 {id:'nopork',en:'Is there anything without pork?',ja:'豚肉が入っていないものはありますか？',romaji:'butaniku ga haitte inai mono wa arimasu ka?',say:'boo-ta-nee-koo ga ha-eet-teh ee-nigh mo-no wa a-ree-mass ka'},
 {id:'highchair',en:'Do you have a high chair?',ja:'子供用の椅子はありますか？',romaji:'kodomo-yō no isu wa arimasu ka?',say:'ko-do-mo-yoh no ee-soo wa a-ree-mass ka'},
 {id:'share',en:'May we share this between us?',ja:'取り分けてもいいですか？',romaji:'toriwakete mo ii desu ka?',say:'to-ree-wa-keh-teh mo ee dess ka'},
 {id:'takeaway',en:'Can we take this away?',ja:'持ち帰りできますか？',romaji:'mochikaeri dekimasu ka?',say:'mo-chee-ka-eh-ree deh-kee-mass ka'},
 {id:'bill',en:'The bill, please',ja:'お会計お願いします',romaji:'okaikei onegai shimasu',say:'oh-kigh-kay oh-neh-guy shee-mass'},
 {id:'chickenplease',en:'The chicken one, please',ja:'チキンをください',romaji:'chikin o kudasai',say:'chee-keen oh koo-da-sigh'},
 {id:'nomeat',en:'I do not eat meat',ja:'肉を食べません',romaji:'niku o tabemasen',say:'nee-koo oh ta-beh-ma-sen'},
 {id:'meatinthis',en:'Is there meat in this?',ja:'これに肉は入っていますか？',romaji:'kore ni niku wa haitte imasu ka?',say:'ko-reh nee nee-koo wa ha-eet-teh ee-mass ka'},
 {id:'vegetarian',en:'Do you have a vegetarian dish?',ja:'ベジタリアンの料理はありますか？',romaji:'bejitarian no ryōri wa arimasu ka?',say:'beh-jee-ta-ree-an no ryoh-ree wa a-ree-mass ka'},
 {id:'delicious',en:'It was delicious — thank you',ja:'ごちそうさまでした',romaji:'gochisōsama deshita',say:'go-chee-soh-sa-ma desh-ta'}
];
// The handful of words that tell you what is in something. Worth recognising on a menu.
export const MENU_WORDS=[
 {id:'chicken',en:'Chicken',ja:'鶏 / チキン',romaji:'tori / chikin',say:'to-ree / chee-keen'},
 {id:'pork',en:'Pork',ja:'豚 / ポーク',romaji:'buta / pōku',say:'boo-ta / poh-koo'},
 {id:'beef',en:'Beef',ja:'牛 / ビーフ',romaji:'gyū / bīfu',say:'gyoo / bee-foo'},
 {id:'prawn',en:'Prawn',ja:'エビ',romaji:'ebi',say:'eh-bee'},
 {id:'fish',en:'Fish',ja:'魚',romaji:'sakana',say:'sa-ka-na'},
 {id:'vegetable',en:'Vegetable',ja:'野菜',romaji:'yasai',say:'ya-sigh'},
 {id:'egg',en:'Egg',ja:'卵',romaji:'tamago',say:'ta-ma-go'},
 {id:'meat',en:'Meat',ja:'肉',romaji:'niku',say:'nee-koo'},
 {id:'noodles',en:'Noodles',ja:'麺',romaji:'men',say:'men'},
 {id:'rice',en:'Rice',ja:'ご飯',romaji:'gohan',say:'go-han'},
 {id:'spicy',en:'Spicy',ja:'辛い',romaji:'karai',say:'ka-rye'},
 {id:'raw',en:'Raw',ja:'生',romaji:'nama',say:'na-ma'}
];
export const FOOD_KIND_LABEL=id=>FOOD_KINDS.find(([k])=>k===id)?.[1]||'Other';
