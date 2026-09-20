// The app's own fixed Japanese, in one place so every screen shows it the same way: what it
// says, what it means, and how to say it out loud.
//
// `say` is an English sound-it-out, hyphenated into the even chunks Japanese actually uses —
// not a stress pattern. It keeps the endings a learner would otherwise get wrong: です is
// "dess" not "deh-soo", ました is "mash-ta" not "ma-shee-ta", because the u and i go silent.
export const PHRASES={
 thisOne:{ja:'これをください。',en:'This one, please.',romaji:'kore o kudasai',say:'ko-reh oh koo-da-sigh'},
 goHere:{ja:'ここへ行きたいです。',en:'I’d like to go here.',romaji:'koko e ikitai desu',say:'ko-ko eh ee-kee-tigh dess'},
 lost:{ja:'道に迷いました。',en:'I’m lost.',romaji:'michi ni mayoimashita',say:'mee-chee nee ma-yo-ee-mash-ta'},
 separated:{ja:'家族とはぐれてしまいました。親に連絡するのを手伝ってください。',
  en:'I am separated from my family. Please help me contact my parents.',
  romaji:'kazoku to hagurete shimaimashita. oya ni renraku suru no o tetsudatte kudasai.',
  say:'ka-zo-koo to ha-goo-reh-teh shee-mye-mash-ta · oh-ya nee ren-ra-koo soo-roo no oh tet-soo-dat-teh koo-da-sigh'},
 thankYou:{ja:'ありがとうございます。',en:'Thank you.',romaji:'arigatō gozaimasu',say:'a-ree-ga-toh go-zye-mass'},
 hello:{ja:'こんにちは。',en:'Hello.',romaji:'konnichiwa',say:'kon-nee-chee-wa'},
 excuseMe:{ja:'すみません。',en:'Excuse me / sorry.',romaji:'sumimasen',say:'soo-mee-ma-sen'}
};
