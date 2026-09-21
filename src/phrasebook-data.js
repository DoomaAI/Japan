// A travel phrasebook: greetings, getting about, and the things you actually need to say.
// Every entry carries `say` — an English sound-it-out in even chunks, with the devoiced
// endings written as they are really said (です → "dess", ます → "mass", ました → "mash-ta").
export const PHRASEBOOK=[
 {id:'greetings',title:'Greetings and manners',note:'The ones worth knowing before you land.',phrases:[
  {id:'morning',en:'Good morning',ja:'おはようございます',romaji:'ohayō gozaimasu',say:'oh-ha-yoh go-zye-mass',hold:'yoh',note:'Until about ten or eleven in the morning. Drop the ございます only with each other — it is the difference between “morning” and “good morning”.',icon:'🌅'},
  {id:'hello',en:'Hello / good afternoon',ja:'こんにちは',romaji:'konnichiwa',say:'kon-nee-chee-wa',note:'The daytime one, roughly eleven until dark. It greets people you are not already with, so you would not say it to each other at breakfast.',icon:'☀️'},
  {id:'evening',en:'Good evening',ja:'こんばんは',romaji:'konbanwa',say:'kon-ban-wa',note:'Once it is dark. There is no version of this for leaving — おやすみなさい (oh-ya-soo-mee na-sigh) is only for going to bed.',icon:'🌙'},
  {id:'thanks',en:'Thank you',ja:'ありがとうございます',romaji:'arigatō gozaimasu',say:'a-ree-ga-toh go-zye-mass',hold:'toh',note:'Put どうも (doh-mo) in front to warm it up. Past tense — ありがとうございました — is for something already finished, which is what you say on the way out of a restaurant.',icon:'🙏'},
  {id:'excuse',en:'Excuse me / sorry',ja:'すみません',romaji:'sumimasen',say:'soo-mee-ma-sen',note:'The most useful word in Japan. Use it to get attention, to apologise, and to say thank you.',icon:'🙋'},
  {id:'sorry',en:'I am sorry',ja:'ごめんなさい',romaji:'gomen nasai',say:'go-men na-sigh',note:'A real apology, for something you did. すみません is the everyday one; this is the one for knocking something over.',icon:'😔'},
  {id:'please',en:'Please',ja:'お願いします',romaji:'onegai shimasu',say:'oh-neh-guy shee-mass',note:'The “please” for asking someone to do something. When you are pointing at a thing you want instead, ください (koo-da-sigh) is the one.',icon:'🤲'},
  {id:'yes',en:'Yes',ja:'はい',romaji:'hai',say:'hye',note:'Closer to “I am listening” than to “I agree”. Staff say it constantly while you talk, and it does not mean they have agreed to anything.',icon:'⭕'},
  {id:'no',en:'No',ja:'いいえ',romaji:'iie',say:'ee-eh',note:'Rarely said straight out. 大丈夫です, or just ちょっと… (chot-to), does the job more gently — and is what you will hear back.',icon:'❌'},
  {id:'fine',en:'It is fine / no thank you',ja:'大丈夫です',romaji:'daijōbu desu',say:'dye-joh-boo dess',hold:'joh',note:'Does the work of \u201cI am OK\u201d, \u201cno thanks\u201d and \u201cno problem\u201d \u2014 and is the polite way to decline anything.',icon:'👌'},
  {id:'nicetomeet',en:'Nice to meet you',ja:'よろしくお願いします',romaji:'yoroshiku onegai shimasu',say:'yo-ro-shee-koo oh-neh-guy shee-mass',note:'Everywhere, and untranslatable. Roughly “please treat me well”, and it closes an introduction, a request, or the start of anything you are doing together.',icon:'🤝'},
  {id:'bye',en:'Goodbye',ja:'さようなら',romaji:'sayōnara',say:'sa-yoh-na-ra',hold:'yoh',note:'More final than it looks — nearer “farewell” than “bye”. Leaving a shop or a restaurant, ありがとうございました does the job better.',icon:'👋'},
  {id:'itadakimasu',en:'Said before eating',ja:'いただきます',romaji:'itadakimasu',say:'ee-ta-da-kee-mass',note:'Said by everyone at the table, hands together, before the first bite. The boys will like it and the staff will notice.',icon:'🍚'},
  {id:'gochisou',en:'Said after eating — thank you for the meal',ja:'ごちそうさまでした',romaji:'gochisōsama deshita',say:'go-chee-soh-sa-ma desh-ta',hold:'soh',note:'At the end of the meal, and again to the staff on the way out. It thanks whoever fed you rather than the food.',icon:'🥢'}]},
 {id:'basics',title:'When you are stuck',note:'For the moment the conversation runs ahead of you.',phrases:[
  {id:'english',en:'Do you speak English?',ja:'英語を話せますか？',romaji:'eigo o hanasemasu ka?',say:'ay-go oh ha-na-seh-mass ka',note:'Ask it after すみません, not instead of it. Plenty of people will say “a little” and then manage far more than that.',icon:'🇬🇧'},
  {id:'nojapanese',en:'I do not speak Japanese',ja:'日本語が話せません',romaji:'nihongo ga hanasemasen',say:'nee-hon-go ga ha-na-seh-ma-sen',note:'Worth saying early, before somebody commits to a long explanation. It is not rude — it saves you both.',icon:'🤐'},
  {id:'understand',en:'I do not understand',ja:'わかりません',romaji:'wakarimasen',say:'wa-ka-ree-ma-sen',note:'The most useful thing you can admit. Silence gets read as understanding, and then the conversation carries on without you.',icon:'🤔'},
  {id:'again',en:'Once more, please',ja:'もう一度お願いします',romaji:'mō ichido onegai shimasu',say:'moh ee-chee-do oh-neh-guy shee-mass',hold:'moh',note:'Better than nodding. Nobody minds being asked twice, and the second time is usually slower by itself.',icon:'🔁'},
  {id:'slowly',en:'Please speak slowly',ja:'ゆっくり話してください',romaji:'yukkuri hanashite kudasai',say:'yook-koo-ree ha-na-shee-teh koo-da-sigh',hold:'yook',note:'Works better than asking for English. Most people can slow down; not everyone can change language.',icon:'🐢'},
  {id:'whatisthis',en:'What is this?',ja:'これは何ですか？',romaji:'kore wa nan desu ka?',say:'ko-reh wa nan dess ka',note:'For a dish, a sign, a machine. Point as you say it — これ means “this one, here”.',icon:'❓'},
  {id:'howmuch',en:'How much is it?',ja:'いくらですか？',romaji:'ikura desu ka?',say:'ee-koo-ra dess ka',note:'The answer usually appears on the till display as well, so watch the screen rather than trying to catch the number.',icon:'💴'},
  {id:'writeit',en:'Could you write it down?',ja:'書いてもらえますか？',romaji:'kaite moraemasu ka?',say:'kigh-teh mo-ra-eh-mass ka',note:'For a number, a platform or a time. A written 3 is a written 3 in any language.',icon:'✍️'}]},
 {id:'around',title:'Finding our way',note:'Point at the app, then say the phrase.',phrases:[
  {id:'wheretoilet',en:'Where is the toilet?',ja:'トイレはどこですか？',romaji:'toire wa doko desu ka?',say:'toy-reh wa do-ko dess ka',note:'Stations, department stores and most convenience stores have one, free and clean. Asking inside a shop is quicker than hunting for a public one.',icon:'🚻'},
  {id:'wherestation',en:'Where is the station?',ja:'駅はどこですか？',romaji:'eki wa doko desu ka?',say:'eh-kee wa do-ko dess ka',note:'Say the station\'s name first and it works far better — “Shibuya eki wa doko desu ka”.',icon:'🚉'},
  {id:'gohere',en:'I would like to go here',ja:'ここへ行きたいです',romaji:'koko e ikitai desu',say:'ko-ko eh ee-kee-tigh dess',note:'Say it while showing the map or the address.',icon:'📍'},
  {id:'lost',en:'I am lost',ja:'道に迷いました',romaji:'michi ni mayoimashita',say:'mee-chee nee ma-yo-ee-mash-ta',note:'Ask a shopkeeper or station staff rather than somebody walking past, and have the hotel\'s address on screen before you start.',icon:'🧭'},
  {id:'near',en:'Is it near?',ja:'近いですか？',romaji:'chikai desu ka?',say:'chee-kigh dess ka',note:'Ask before you set off. “Near” in Tokyo can still be fifteen minutes of underground corridor.',icon:'📏'},
  {id:'walk',en:'Can I walk there?',ja:'歩いて行けますか？',romaji:'aruite ikemasu ka?',say:'a-roo-ee-teh ee-keh-mass ka',note:'The answer is usually yes. Follow it with 何分ですか (nan-poon dess ka) — how many minutes.',icon:'🚶'},
  {id:'entrance',en:'Where is the entrance?',ja:'入口はどこですか？',romaji:'iriguchi wa doko desu ka?',say:'ee-ree-goo-chee wa do-ko dess ka',note:'Worth having at a shrine, a castle or a department store, where the way in is often not the way you arrived.',icon:'🚪'},
  {id:'lift',en:'Is there a lift?',ja:'エレベーターはありますか？',romaji:'erebētā wa arimasu ka?',say:'eh-reh-beh-tah wa a-ree-mass ka',hold:['beh','tah'],note:'Worth knowing with a pram or tired legs.',icon:'🛗'}]},
 {id:'trains',title:'Trains and getting about',note:'The IC card does most of it. These are for the moments it does not.',phrases:[
  {id:'ticket',en:'Where do I buy a ticket?',ja:'切符はどこで買えますか？',romaji:'kippu wa doko de kaemasu ka?',say:'keep-poo wa do-ko deh ka-eh-mass ka',hold:'keep',note:'Mostly you will not need this — the IC card does it. Keep it for reserved Shinkansen seats and limited expresses.',icon:'🎫'},
  {id:'doesitgo',en:'Does this train go to …?',ja:'この電車は〜に行きますか？',romaji:'kono densha wa … ni ikimasu ka?',say:'ko-no den-sha wa … nee ee-kee-mass ka',note:'Say the place name in the gap. The risk here is not the wrong line, it is the right line running express straight past your stop.',icon:'🚃'},
  {id:'platform',en:'Which platform?',ja:'何番線ですか？',romaji:'nanbansen desu ka?',say:'nan-ban-sen dess ka',note:'The answer is a number, and it is written up on the signs — hold fingers up back at them if you miss it.',icon:'🔢'},
  {id:'nexttrain',en:'What time is the next one?',ja:'次は何時ですか？',romaji:'tsugi wa nanji desu ka?',say:'tsoo-gee wa nan-jee dess ka',note:'Trains here run to the minute, so the answer is exact and can be trusted.',icon:'⏰'},
  {id:'iccard',en:'Can I use an IC card?',ja:'ICカードを使えますか？',romaji:'IC kādo o tsukaemasu ka?',say:'eye-see kah-do oh tsoo-ka-eh-mass ka',hold:'kah',note:'Suica and Pasmo work on nearly every train, bus, convenience store and vending machine in the country. Ask before you queue at a machine.',icon:'🪪'},
  {id:'taxi',en:'Please take us to this address',ja:'この住所までお願いします',romaji:'kono jūsho made onegai shimasu',say:'ko-no joo-sho ma-deh oh-neh-guy shee-mass',hold:'joo',note:'Show the driver the address on the screen as you say it.',icon:'🚕'}]},
 {id:'shops',title:'Shops and paying',note:'Cash is still king in the small places. Ask before you order.',phrases:[
  {id:'thisone',en:'This one, please',ja:'これをください',romaji:'kore o kudasai',say:'ko-reh oh koo-da-sigh',note:'Point and say it. This is the phrase that orders the food, buys the ticket and gets the thing down off the high shelf.',icon:'👉'},
  {id:'justlooking',en:'Just looking, thank you',ja:'見ているだけです',romaji:'mite iru dake desu',say:'mee-teh ee-roo da-keh dess',note:'Staff greet you with いらっしゃいませ the moment you walk in and you are not expected to answer. This is for when somebody comes over.',icon:'👀'},
  {id:'card',en:'Can I pay by card?',ja:'カードで払えますか？',romaji:'kādo de haraemasu ka?',say:'kah-do deh ha-ra-eh-mass ka',hold:'kah',note:'Ask first. Small restaurants, shrines, markets and plenty of ramen places are still cash only, and nobody is embarrassed about it.',icon:'💳'},
  {id:'bag',en:'A bag, please',ja:'袋をください',romaji:'fukuro o kudasai',say:'foo-koo-ro oh koo-da-sigh',note:'Bags are no longer free — expect a few yen, and a question at the till you can answer with はい.',icon:'🛍️'},
  {id:'taxfree',en:'Can I buy this tax free?',ja:'免税できますか？',romaji:'menzei dekimasu ka?',say:'men-zay deh-kee-mass ka',note:'Bring your passport; there is usually a minimum spend.',icon:'🛂'},
  {id:'tryon',en:'May I try it on?',ja:'試着してもいいですか？',romaji:'shichaku shite mo ii desu ka?',say:'shee-cha-koo shee-teh mo ee dess ka',note:'You may be asked to take your shoes off, and to put a cover over your face so make-up does not mark the clothes.',icon:'👕'}]},
 {id:'children',title:'With the boys',note:'The ones that make a day with a five-year-old and an eight-year-old easier.',phrases:[
  {id:'highchair',en:'Do you have a high chair?',ja:'子供用の椅子はありますか？',romaji:'kodomo-yō no isu wa arimasu ka?',say:'ko-do-mo-yoh no ee-soo wa a-ree-mass ka',hold:'yoh',note:'Family restaurants and department store floors nearly always have one. Small places usually have not got the room.',icon:'🪑'},
  {id:'childfree',en:'Are children free?',ja:'子供は無料ですか？',romaji:'kodomo wa muryō desu ka?',say:'ko-do-mo wa moo-ryoh dess ka',hold:'ryoh',note:'On the trains, under six travels free and six to eleven is half price. Everywhere else it varies, so it is worth asking at every gate.',icon:'🆓'},
  {id:'nappy',en:'Is there a nappy change table?',ja:'おむつ替え台はありますか？',romaji:'omutsu-kae dai wa arimasu ka?',say:'oh-moo-tsoo-ka-eh dye wa a-ree-mass ka',note:'Every department store and most big stations have a whole baby room, usually on the same floor as the toilets.',icon:'🍼'},
  {id:'maigo',en:'This child is lost',ja:'迷子です',romaji:'maigo desu',say:'mye-go dess',note:'Station and park staff act on this one immediately.',icon:'🧒'},
  {id:'twoadults',en:'Two adults and two children',ja:'大人2人、子供2人です',romaji:'otona futari, kodomo futari desu',say:'oh-to-na foo-ta-ree, ko-do-mo foo-ta-ree dess',note:'For a ticket window, a restaurant door or a bus. Hold the numbers up on your fingers as you say it and you cannot be misheard.',icon:'👪'}]},
 {id:'trouble',title:'If something goes wrong',note:'Worth having found once before you need it.',phrases:[
  {id:'help',en:'Please help me',ja:'助けてください',romaji:'tasukete kudasai',say:'ta-soo-keh-teh koo-da-sigh',note:'For real trouble. For “I am stuck, can you give me a hand”, すみません and pointing is the right size.',icon:'🆘'},
  {id:'hospital',en:'Where is a hospital?',ja:'病院はどこですか？',romaji:'byōin wa doko desu ka?',say:'byoh-een wa do-ko dess ka',hold:'byoh',note:'For anything that is not an emergency, a pharmacy — 薬局, yak-kyo-koo — is often the faster first stop.',icon:'🏥'},
  {id:'ambulance',en:'Please call an ambulance',ja:'救急車を呼んでください',romaji:'kyūkyūsha o yonde kudasai',say:'kyoo-kyoo-sha oh yon-deh koo-da-sigh',hold:'kyoo',note:'The emergency number for fire and ambulance is 119. Police is 110.',icon:'🚑'},
  {id:'police',en:'Please call the police',ja:'警察を呼んでください',romaji:'keisatsu o yonde kudasai',say:'kay-sat-soo oh yon-deh koo-da-sigh',note:'A kōban (交番) is the small police box on the street corner, and is where lost property and lost people both end up.',icon:'👮'},
  {id:'allergy',en:'I have an allergy',ja:'アレルギーがあります',romaji:'arerugī ga arimasu',say:'a-reh-roo-gee ga a-ree-mass',hold:'gee',note:'Say what it is straight afterwards, and carry it written in Japanese. Never trust a translation on its own for an allergy — have the staff confirm it.',icon:'⚠️'},
  {id:'lostitem',en:'I have lost my bag',ja:'鞄をなくしました',romaji:'kaban o nakushimashita',say:'ka-ban oh na-koo-shee-mash-ta',note:'Japan is extraordinary at this. Report it at the nearest station office or kōban; things genuinely do come back.',icon:'🎒'}]}
];
// One phrase a day, in the order you would actually want them: greetings first, then the
// things you need once you are out and about.
export const DAILY_ORDER=['hello','thanks','excuse','please','morning','howmuch','wheretoilet','english',
 'thisone','fine','gochisou','platform','understand','card','maigo','bye',
 'evening','sorry','yes','no','slowly','near','walk','help'];
export const ALL_PHRASES=()=>PHRASEBOOK.flatMap(s=>s.phrases.map(p=>({...p,section:s.id,sectionTitle:s.title})));
export const findPhrase=id=>ALL_PHRASES().find(p=>p.id===id)||null;
// Day one gets the first phrase, day two the second, and so on down the list.
export function phraseForDay(days,day){
 const index=days.findIndex(d=>d.date===day);
 if(index<0)return null;
 return findPhrase(DAILY_ORDER[index%DAILY_ORDER.length]);
}
// The rota first, because those are the ones chosen as most worth knowing, then the rest of
// the book in the order it is written. This is the order "one more" works through.
export const ORDERED_PHRASES=()=>{
 const all=ALL_PHRASES(),rota=DAILY_ORDER.map(id=>all.find(p=>p.id===id)).filter(Boolean);
 return [...rota,...all.filter(p=>!DAILY_ORDER.includes(p.id))];
};
