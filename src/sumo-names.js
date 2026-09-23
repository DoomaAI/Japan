// The ring names as they are written in the arena and called by the announcer: kanji, and the
// kana they are read with. Kanji alone is no help — 大の里 could as easily be read Dainosato —
// so the kana is what the sound-it-out line and the phone's voice are built from.
import {sayName,romajiName} from './sumo-say.js';
export const SUMO_NAMES={
 // Makuuchi
 Onosato:['大の里','おおのさと'],Hoshoryu:['豊昇龍','ほうしょうりゅう'],Kirishima:['霧島','きりしま'],Kotozakura:['琴櫻','ことざくら'],
 Aonishiki:['安青錦','あおにしき'],Atamifuji:['熱海富士','あたみふじ'],Fujinokawa:['藤ノ川','ふじのかわ'],Hakunofuji:['伯乃富士','はくのふじ'],
 Daieisho:['大栄翔','だいえいしょう'],Kotoshoho:['琴勝峰','ことしょうほう'],Kotoeiho:['琴栄峰','ことえいほう'],Takayasu:['高安','たかやす'],
 Yoshinofuji:['義ノ富士','よしのふじ'],Gonoyama:['豪ノ山','ごうのやま'],Churanoumi:['美ノ海','ちゅらの・うみ'],Takanosho:['隆の勝','たかのしょう'],
 Roga:['狼雅','ろうが'],Oshoma:['欧勝馬','おうしょうま'],Asanoyama:['朝乃山','あさのやま'],Ichiyamamoto:['一山本','いちやまもと'],
 Fujiseiun:['藤青雲','ふじせいうん'],Nishikifuji:['錦富士','にしきふじ'],Takerufuji:['尊富士','たけるふじ'],Hiradoumi:['平戸海','ひらど・うみ'],
 Ura:['宇良','うら'],Shishi:['獅司','しし'],Oho:['王鵬','おうほう'],Kinbozan:['金峰山','きんぼうざん'],Wakamotoharu:['若元春','わかもとはる'],
 Shodai:['正代','しょうだい'],Wakatakakage:['若隆景','わかたかかげ'],Asahakuryu:['朝白龍','あさはくりゅう'],Asakoryu:['朝紅龍','あさこうりゅう'],
 Abi:['阿炎','あび'],Tobizaru:['翔猿','とびざる'],Chiyoshoma:['千代翔馬','ちよしょうま'],Tokihayate:['時疾風','ときはやて'],
 Shonannoumi:['湘南乃海','しょうなんの・うみ'],Fujiryoga:['藤凌駕','ふじりょうが'],Asasuiryu:['朝翠龍','あさすいりゅう'],
 Wakanosho:['若ノ勝','わかのしょう'],
 // 寿之富士 was 聖白鵬 until January 2026; older pages have him under that.
 Toshinofuji:['寿之富士','としのふじ'],
 // Juryo
 Kyokukaiyu:['旭海雄','きょくかいゆう'],Daiseizan:['大青山','だいせいざん'],Tamawashi:['玉鷲','たまわし'],Mitakeumi:['御嶽海','みたけ・うみ'],
 Sadanoumi:['佐田の海','さだの・うみ'],Kitanowaka:['北の若','きたのわか'],Shirokuma:['白熊','しろくま'],Midorifuji:['翠富士','みどりふじ'],
 Tomokaze:['友風','ともかぜ'],Ryuden:['竜電','りゅうでん'],Enho:['炎鵬','えんほう'],Tohakuryu:['東白龍','とうはくりゅう'],
 Kagayaki:['輝','かがやき'],Hitoshi:['日翔志','ひとし'],Tamashoho:['玉正鳳','たましょうほう'],Kayo:['嘉陽','かよう'],Meisei:['明生','めいせい'],
 Tochitaikai:['栃大海','とちたいかい'],Nishikigi:['錦木','にしきぎ'],Dewanoryu:['出羽ノ龍','でわのりゅう'],
 // 一意 is read Kazuma, which nobody would guess from the kanji.
 Kazuma:['一意','かずま'],Onokatsu:['阿武剋','おうのかつ'],Kazekeno:['風賢央','かぜけんおう'],Arashifuji:['嵐富士','あらしふじ'],
 Hatsuyama:['羽出山','はつやま'],Nabatame:['生田目','なばため'],Tanji:['丹治','たんじ'],Tokifudo:['時不動','ときふどう'],
 // Up from makushita for the day. Not the old yokozuna of the same name.
 Asahifuji:['旭富士','あさひふじ'],
};
const cache={};
export function sumoName(name){
 const key=String(name||'').trim();
 if(!SUMO_NAMES[key])return null;
 if(!cache[key]){const [kanji,kana]=SUMO_NAMES[key],{say,hold}=sayName(kana),romaji=romajiName(kana),reading=kana.replace(/・/g,'');
  cache[key]={kanji,kana:reading,romaji,say,hold,phrase:{ja:reading,romaji,say,hold}};}
 return cache[key];
}
