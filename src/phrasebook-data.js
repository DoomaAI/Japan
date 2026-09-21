// A travel phrasebook: greetings, getting about, and the things you actually need to say.
// Every entry carries `say` — an English sound-it-out in even chunks, with the devoiced
// endings written as they are really said (です → "dess", ます → "mass", ました → "mash-ta").
export const PHRASEBOOK=[
 {id:'greetings',title:'Greetings and manners',note:'The ones worth knowing before you land.',phrases:[
  {id:'morning',en:'Good morning',ja:'おはようございます',romaji:'ohayō gozaimasu',say:'oh-ha-yoh go-zye-mass'},
  {id:'hello',en:'Hello / good afternoon',ja:'こんにちは',romaji:'konnichiwa',say:'kon-nee-chee-wa'},
  {id:'evening',en:'Good evening',ja:'こんばんは',romaji:'konbanwa',say:'kon-ban-wa'},
  {id:'thanks',en:'Thank you',ja:'ありがとうございます',romaji:'arigatō gozaimasu',say:'a-ree-ga-toh go-zye-mass'},
  {id:'excuse',en:'Excuse me / sorry',ja:'すみません',romaji:'sumimasen',say:'soo-mee-ma-sen',note:'The most useful word in Japan. Use it to get attention, to apologise, and to say thank you.'},
  {id:'sorry',en:'I am sorry',ja:'ごめんなさい',romaji:'gomen nasai',say:'go-men na-sigh'},
  {id:'please',en:'Please',ja:'お願いします',romaji:'onegai shimasu',say:'oh-neh-guy shee-mass'},
  {id:'yes',en:'Yes',ja:'はい',romaji:'hai',say:'hye'},
  {id:'no',en:'No',ja:'いいえ',romaji:'iie',say:'ee-eh'},
  {id:'fine',en:'It is fine / no thank you',ja:'大丈夫です',romaji:'daijōbu desu',say:'dye-joh-boo dess',note:'Does the work of "I am OK", "no thanks" and "no problem".'},
  {id:'nicetomeet',en:'Nice to meet you',ja:'よろしくお願いします',romaji:'yoroshiku onegai shimasu',say:'yo-ro-shee-koo oh-neh-guy shee-mass'},
  {id:'bye',en:'Goodbye',ja:'さようなら',romaji:'sayōnara',say:'sa-yoh-na-ra'},
  {id:'itadakimasu',en:'Said before eating',ja:'いただきます',romaji:'itadakimasu',say:'ee-ta-da-kee-mass'},
  {id:'gochisou',en:'Said after eating — thank you for the meal',ja:'ごちそうさまでした',romaji:'gochisōsama deshita',say:'go-chee-soh-sa-ma desh-ta'}]},
 {id:'basics',title:'When you are stuck',note:'For the moment the conversation runs ahead of you.',phrases:[
  {id:'english',en:'Do you speak English?',ja:'英語を話せますか？',romaji:'eigo o hanasemasu ka?',say:'ay-go oh ha-na-seh-mass ka'},
  {id:'nojapanese',en:'I do not speak Japanese',ja:'日本語が話せません',romaji:'nihongo ga hanasemasen',say:'nee-hon-go ga ha-na-seh-ma-sen'},
  {id:'understand',en:'I do not understand',ja:'わかりません',romaji:'wakarimasen',say:'wa-ka-ree-ma-sen'},
  {id:'again',en:'Once more, please',ja:'もう一度お願いします',romaji:'mō ichido onegai shimasu',say:'moh ee-chee-do oh-neh-guy shee-mass'},
  {id:'slowly',en:'Please speak slowly',ja:'ゆっくり話してください',romaji:'yukkuri hanashite kudasai',say:'yook-koo-ree ha-na-shee-teh koo-da-sigh'},
  {id:'whatisthis',en:'What is this?',ja:'これは何ですか？',romaji:'kore wa nan desu ka?',say:'ko-reh wa nan dess ka'},
  {id:'howmuch',en:'How much is it?',ja:'いくらですか？',romaji:'ikura desu ka?',say:'ee-koo-ra dess ka'},
  {id:'writeit',en:'Could you write it down?',ja:'書いてもらえますか？',romaji:'kaite moraemasu ka?',say:'kigh-teh mo-ra-eh-mass ka'}]},
 {id:'around',title:'Finding our way',note:'Point at the app, then say the phrase.',phrases:[
  {id:'wheretoilet',en:'Where is the toilet?',ja:'トイレはどこですか？',romaji:'toire wa doko desu ka?',say:'toy-reh wa do-ko dess ka'},
  {id:'wherestation',en:'Where is the station?',ja:'駅はどこですか？',romaji:'eki wa doko desu ka?',say:'eh-kee wa do-ko dess ka'},
  {id:'gohere',en:'I would like to go here',ja:'ここへ行きたいです',romaji:'koko e ikitai desu',say:'ko-ko eh ee-kee-tigh dess',note:'Say it while showing the map or the address.'},
  {id:'lost',en:'I am lost',ja:'道に迷いました',romaji:'michi ni mayoimashita',say:'mee-chee nee ma-yo-ee-mash-ta'},
  {id:'near',en:'Is it near?',ja:'近いですか？',romaji:'chikai desu ka?',say:'chee-kigh dess ka'},
  {id:'walk',en:'Can I walk there?',ja:'歩いて行けますか？',romaji:'aruite ikemasu ka?',say:'a-roo-ee-teh ee-keh-mass ka'},
  {id:'entrance',en:'Where is the entrance?',ja:'入口はどこですか？',romaji:'iriguchi wa doko desu ka?',say:'ee-ree-goo-chee wa do-ko dess ka'},
  {id:'lift',en:'Is there a lift?',ja:'エレベーターはありますか？',romaji:'erebētā wa arimasu ka?',say:'eh-reh-beh-tah wa a-ree-mass ka',note:'Worth knowing with a pram or tired legs.'}]},
 {id:'trains',title:'Trains and getting about',note:'',phrases:[
  {id:'ticket',en:'Where do I buy a ticket?',ja:'切符はどこで買えますか？',romaji:'kippu wa doko de kaemasu ka?',say:'keep-poo wa do-ko deh ka-eh-mass ka'},
  {id:'doesitgo',en:'Does this train go to …?',ja:'この電車は〜に行きますか？',romaji:'kono densha wa … ni ikimasu ka?',say:'ko-no den-sha wa … nee ee-kee-mass ka'},
  {id:'platform',en:'Which platform?',ja:'何番線ですか？',romaji:'nanbansen desu ka?',say:'nan-ban-sen dess ka'},
  {id:'nexttrain',en:'What time is the next one?',ja:'次は何時ですか？',romaji:'tsugi wa nanji desu ka?',say:'tsoo-gee wa nan-jee dess ka'},
  {id:'iccard',en:'Can I use an IC card?',ja:'ICカードを使えますか？',romaji:'IC kādo o tsukaemasu ka?',say:'eye-see kah-do oh tsoo-ka-eh-mass ka'},
  {id:'taxi',en:'Please take us to this address',ja:'この住所までお願いします',romaji:'kono jūsho made onegai shimasu',say:'ko-no joo-sho ma-deh oh-neh-guy shee-mass',note:'Show the driver the address on the screen as you say it.'}]},
 {id:'shops',title:'Shops and paying',note:'',phrases:[
  {id:'thisone',en:'This one, please',ja:'これをください',romaji:'kore o kudasai',say:'ko-reh oh koo-da-sigh'},
  {id:'justlooking',en:'Just looking, thank you',ja:'見ているだけです',romaji:'mite iru dake desu',say:'mee-teh ee-roo da-keh dess'},
  {id:'card',en:'Can I pay by card?',ja:'カードで払えますか？',romaji:'kādo de haraemasu ka?',say:'kah-do deh ha-ra-eh-mass ka'},
  {id:'bag',en:'A bag, please',ja:'袋をください',romaji:'fukuro o kudasai',say:'foo-koo-ro oh koo-da-sigh'},
  {id:'taxfree',en:'Can I buy this tax free?',ja:'免税できますか？',romaji:'menzei dekimasu ka?',say:'men-zay deh-kee-mass ka',note:'Bring your passport; there is usually a minimum spend.'},
  {id:'tryon',en:'May I try it on?',ja:'試着してもいいですか？',romaji:'shichaku shite mo ii desu ka?',say:'shee-cha-koo shee-teh mo ee dess ka'}]},
 {id:'children',title:'With the boys',note:'',phrases:[
  {id:'highchair',en:'Do you have a high chair?',ja:'子供用の椅子はありますか？',romaji:'kodomo-yō no isu wa arimasu ka?',say:'ko-do-mo-yoh no ee-soo wa a-ree-mass ka'},
  {id:'childfree',en:'Are children free?',ja:'子供は無料ですか？',romaji:'kodomo wa muryō desu ka?',say:'ko-do-mo wa moo-ryoh dess ka'},
  {id:'nappy',en:'Is there a nappy change table?',ja:'おむつ替え台はありますか？',romaji:'omutsu-kae dai wa arimasu ka?',say:'oh-moo-tsoo-ka-eh dye wa a-ree-mass ka'},
  {id:'maigo',en:'This child is lost',ja:'迷子です',romaji:'maigo desu',say:'mye-go dess',note:'Station and park staff act on this one immediately.'},
  {id:'twoadults',en:'Two adults and two children',ja:'大人2人、子供2人です',romaji:'otona futari, kodomo futari desu',say:'oh-to-na foo-ta-ree, ko-do-mo foo-ta-ree dess'}]},
 {id:'trouble',title:'If something goes wrong',note:'Worth having found once before you need it.',phrases:[
  {id:'help',en:'Please help me',ja:'助けてください',romaji:'tasukete kudasai',say:'ta-soo-keh-teh koo-da-sigh'},
  {id:'hospital',en:'Where is a hospital?',ja:'病院はどこですか？',romaji:'byōin wa doko desu ka?',say:'byoh-een wa do-ko dess ka'},
  {id:'ambulance',en:'Please call an ambulance',ja:'救急車を呼んでください',romaji:'kyūkyūsha o yonde kudasai',say:'kyoo-kyoo-sha oh yon-deh koo-da-sigh',note:'The emergency number for fire and ambulance is 119. Police is 110.'},
  {id:'police',en:'Please call the police',ja:'警察を呼んでください',romaji:'keisatsu o yonde kudasai',say:'kay-sat-soo oh yon-deh koo-da-sigh'},
  {id:'allergy',en:'I have an allergy',ja:'アレルギーがあります',romaji:'arerugī ga arimasu',say:'a-reh-roo-gee ga a-ree-mass'},
  {id:'lostitem',en:'I have lost my bag',ja:'鞄をなくしました',romaji:'kaban o nakushimashita',say:'ka-ban oh na-koo-shee-mash-ta'}]}
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
