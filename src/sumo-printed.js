// The Day 11 card as it was handed to us at the door of the Kokugikan, typed up off the printed
// programme. It is here for when the official site cannot be read: a parent loads it in one tap
// and it becomes the day's card like any other, with no signal and no API key. Each side carries
// its banzuke rank and heya from the ranking sheet and its record going into the day, because the
// record is what everybody argues about when they are tipping. Times are not on the sheet — only
// the divisions' start times are — so each bout's is spaced out from those and is approximate.
import {SUMO_DAY,sumoSiteUrl} from './trip-features.js';
const RANK={
 Onosato:['Yokozuna','Nishonoseki'],Hoshoryu:['Yokozuna','Tatsunami'],Kirishima:['Ozeki','Otowayama'],Kotozakura:['Ozeki','Sadogatake'],
 Aonishiki:['Ozeki','Ajigawa'],Atamifuji:['Sekiwake','Isegahama'],Fujinokawa:['Sekiwake','Isenoumi'],Hakunofuji:['Komusubi','Isegahama'],
 Daieisho:['Komusubi','Oitekaze'],Kotoshoho:['Maegashira 1','Sadogatake'],Kotoeiho:['Maegashira 1','Sadogatake'],
 Takayasu:['Maegashira 2','Tagonoura'],Yoshinofuji:['Maegashira 2','Isegahama'],Gonoyama:['Maegashira 3','Takekuma'],
 Churanoumi:['Maegashira 3','Kise'],Takanosho:['Maegashira 4','Minatogawa'],Fujiryoga:['Maegashira 4','Fujishima'],
 Roga:['Maegashira 5','Futagoyama'],Oshoma:['Maegashira 5','Naruto'],Asanoyama:['Maegashira 6','Takasago'],
 Ichiyamamoto:['Maegashira 6','Hanaregoma'],Fujiseiun:['Maegashira 7','Fujishima'],Nishikifuji:['Maegashira 7','Isegahama'],
 Takerufuji:['Maegashira 8','Isegahama'],Hiradoumi:['Maegashira 8','Sakaigawa'],Ura:['Maegashira 9','Kise'],Shishi:['Maegashira 9','Ikazuchi'],
 Oho:['Maegashira 10','Otake'],Kinbozan:['Maegashira 10','Kise'],Wakamotoharu:['Maegashira 11','Arashio'],Shodai:['Maegashira 11','Tokitsukaze'],
 Wakatakakage:['Maegashira 12','Arashio'],Asahakuryu:['Maegashira 12','Takasago'],Asakoryu:['Maegashira 13','Takasago'],
 Abi:['Maegashira 13','Shikoroyama'],Tobizaru:['Maegashira 14','Oitekaze'],Chiyoshoma:['Maegashira 14','Kokonoe'],
 Asasuiryu:['Maegashira 15','Takasago'],Tokihayate:['Maegashira 15','Tokitsukaze'],Wakanosho:['Maegashira 16','Minatogawa'],
 Toshinofuji:['Maegashira 16','Isegahama'],Shonannoumi:['Maegashira 17','Takadagawa'],
 Dewanoryu:['Juryo 1','Dewanoumi'],Kyokukaiyu:['Juryo 1','Oshima'],Daiseizan:['Juryo 2','Arashio'],Kazuma:['Juryo 2','Kise'],
 Tamawashi:['Juryo 3','Kataonami'],Onokatsu:['Juryo 3','Onomatsu'],Kazekeno:['Juryo 4','Oshiogawa'],Mitakeumi:['Juryo 4','Dewanoumi'],
 Sadanoumi:['Juryo 5','Sakaigawa'],Arashifuji:['Juryo 5','Isegahama'],Kitanowaka:['Juryo 6','Hakkaku'],Shirokuma:['Juryo 6','Nishonoseki'],
 Midorifuji:['Juryo 7','Isegahama'],Tomokaze:['Juryo 7','Nakamura'],Ryuden:['Juryo 8','Takadagawa'],Hatsuyama:['Juryo 8','Tamanoi'],
 Enho:['Juryo 9','Isegahama'],Tohakuryu:['Juryo 9','Tamanoi'],Nabatame:['Juryo 10','Futagoyama'],Tanji:['Juryo 10','Arashio'],
 Kagayaki:['Juryo 11','Takadagawa'],Hitoshi:['Juryo 11','Oitekaze'],Tamashoho:['Juryo 12','Kataonami'],Kayo:['Juryo 12','Nakamura'],
 Meisei:['Juryo 13','Tatsunami'],Tokifudo:['Juryo 13','Tokitsukaze'],Tochitaikai:['Juryo 14','Kasugano'],Nishikigi:['Juryo 14','Isenoumi'],
 // Up from makushita for the day: not on the ranking sheet, and only seven bouts to his record.
 Asahifuji:['Makushita','Isegahama'],
};
// [east record, east, west, west record], in running order.
const JURYO=[['4-6','Meisei','Asahifuji','4-1'],['5-5','Tamashoho','Kayo','8-2'],['10-0','Kagayaki','Hitoshi','7-3'],
 ['4-6','Nishikigi','Tanji','7-3'],['4-6','Enho','Tokifudo','5-5'],['3-7','Tochitaikai','Hatsuyama','2-8'],['7-3','Ryuden','Nabatame','5-5'],
 ['4-6','Tohakuryu','Tomokaze','4-6'],['5-5','Kazekeno','Shirokuma','4-6'],['2-8','Sadanoumi','Onokatsu','5-5'],
 ['6-4','Tamawashi','Mitakeumi','3-7'],['4-6','Midorifuji','Kazuma','4-6'],['8-2','Daiseizan','Arashifuji','5-5'],['7-3','Kitanowaka','Kyokukaiyu','4-6']];
const MAKUUCHI=[['6-4','Dewanoryu','Chiyoshoma','4-6'],['6-4','Wakamotoharu','Tobizaru','4-6'],['3-7','Oho','Asahakuryu','5-5'],
 ['3-7','Shonannoumi','Shishi','4-6'],['7-3','Ura','Toshinofuji','6-4'],['2-8','Shodai','Hiradoumi','6-4'],['6-4','Takerufuji','Abi','6-4'],
 ['4-6','Asasuiryu','Nishikifuji','4-6'],['6-4','Fujiseiun','Tokihayate','7-3'],['5-5','Asakoryu','Ichiyamamoto','2-8'],
 ['7-3','Asanoyama','Kinbozan','8-2'],['6-4','Oshoma','Fujiryoga','4-6'],['3-7','Gonoyama','Yoshinofuji','4-6'],
 ['5-5','Kotoshoho','Churanoumi','7-3'],['2-8','Kotoeiho','Daieisho','3-7'],['3-7','Hakunofuji','Takayasu','3-7'],
 ['5-5','Kirishima','Atamifuji','8-2'],['7-3','Aonishiki','Takanosho','4-6'],['5-5','Roga','Kotozakura','6-4'],['9-1','Onosato','Fujinokawa','8-2']];
const side=(name,record)=>{const [rank,stable]=RANK[name]||['',''];return {name,rank:[rank,record].filter(Boolean).join(' · '),stable};};
const clock=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const bouts=(division,rows,start,gap,from)=>rows.map(([er,e,w,wr],i)=>({id:`${division}-${i+1}`,division,order:from+i,
 time:clock(start+Math.round(i*gap)),east:side(e,er),west:side(w,wr)}));
export const PRINTED_CARD={basho:'Aki Basho 2026 · September Grand Sumo Tournament',dayNumber:11,venue:'Ryogoku Kokugikan',
 date:SUMO_DAY,doorsOpen:'08:45',
 notes:'From the printed programme handed out at the door. Preliminary bouts from about 9:20; Juryo ring entrance about 14:15 and bouts from 14:35; Makuuchi ring entrance about 15:40, the yokozuna ring entrance about 15:50 and top-division bouts from about 16:05, with the top-ranked men from about 17:30; the bow-twirling ceremony about 18:00. Each bout time is spaced out from those and is approximate. The record beside each rank is going into today.',
 bouts:[...bouts('juryo',JURYO,14*60+35,4,1),...bouts('makuuchi',MAKUUCHI,16*60+5,5,101)],
 sources:[{title:'Official Day 11 top-division bouts',url:sumoSiteUrl(11,'makuuchi')},{title:'Official Day 11 Juryo bouts',url:sumoSiteUrl(11,'juryo')}]};
