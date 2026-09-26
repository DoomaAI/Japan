// Every train and transfer on the rest of the trip, leg by leg: the line and which way, every
// station between boarding and getting off with its number, and the exit for what comes next.
// Coordinates are station centres, close enough to say which station a phone is nearest while
// riding. Station numbers are left out where a line does not post them or they are not certain.
export const LINES={
 karasuma:{name:'Karasuma Line',ja:'烏丸線',operator:'Kyoto Municipal Subway',status:'https://www.city.kyoto.lg.jp/kotsu/',stations:[
  ['Gojo','五条','K10',34.9960,135.7596],['Kyoto','京都','K11',34.9858,135.7588]]},
 sagano:{name:'JR Sagano Line',ja:'嵯峨野線',operator:'JR West',status:'https://trafficinfo.westjr.co.jp/kinki.html',stations:[
  ['Kyoto','京都','JR-E01',34.9858,135.7588],['Umekoji-Kyotonishi','梅小路京都西','JR-E02',34.9873,135.7421],['Tambaguchi','丹波口','JR-E03',34.9960,135.7424],['Nijo','二条','JR-E04',35.0107,135.7418],['Emmachi','円町','JR-E05',35.0196,135.7328],['Hanazono','花園','JR-E06',35.0175,135.7215],['Uzumasa','太秦','JR-E07',35.0170,135.7079],['Saga-Arashiyama','嵯峨嵐山','JR-E08',35.0182,135.6813]]},
 // The Express's main stops. Some Expresses also call at Toji and Kodo; station numbers are
 // given for the ends, where they are certain.
 kintetsu:{name:'Kintetsu Kyoto & Nara Lines, Express',ja:'近鉄 急行',operator:'Kintetsu',status:'https://www.kintetsu.jp/unkou/unkou.html',stations:[
  ['Kyoto','京都','B01',34.9844,135.7577],['Takeda','竹田','',34.9530,135.7560],['Kintetsu-Tambabashi','近鉄丹波橋','',34.9360,135.7678],['Momoyamagoryo-mae','桃山御陵前','',34.9322,135.7721],['Mukaijima','向島','',34.9126,135.7699],['Okubo','大久保','',34.8781,135.7820],['Shin-Tanabe','新田辺','',34.8196,135.7696],['Shin-Hosono','新祝園','',34.7610,135.7960],['Takanohara','高の原','',34.7196,135.7863],['Yamato-Saidaiji','大和西大寺','A26',34.6938,135.7825],['Shin-Omiya','新大宮','A27',34.6849,135.8127],['Kintetsu-Nara','近鉄奈良','A28',34.6844,135.8279]]},
 naraBus:{name:'Nara Kotsu bus 2, 77, 97 or 163',ja:'奈良交通バス',operator:'Nara Kotsu',status:'https://www.narakotsu.co.jp/',stations:[
  ['Kintetsu-Nara Station (stop 1)','近鉄奈良駅','',34.6848,135.8285],['Kencho-mae','県庁前','',34.6853,135.8331],['Himurojinja / National Museum','氷室神社・国立博物館','',34.6853,135.8372],['Todaiji Daibutsuden / Kasugataisha-mae','東大寺大仏殿・春日大社前','',34.6848,135.8418]]},
 // A Special Rapid's stops; some also stop at Nagaokakyo (JR-A33).
 jrKyoto:{name:'JR Kyoto Line, Special Rapid',ja:'JR京都線 新快速',operator:'JR West',status:'https://trafficinfo.westjr.co.jp/kinki.html',stations:[
  ['Kyoto','京都','JR-A31',34.9858,135.7588],['Takatsuki','高槻','JR-A38',34.8513,135.6177],['Shin-Osaka','新大阪','JR-A46',34.7335,135.5003],['Osaka','大阪','JR-A47',34.7025,135.4959]]},
 midosuji:{name:'Midosuji Line',ja:'御堂筋線',operator:'Osaka Metro',status:'https://subway.osakametro.co.jp/guide/traffic_information.php',stations:[
  ['Umeda','梅田','M16',34.7033,135.4985],['Yodoyabashi','淀屋橋','M17',34.6928,135.5013],['Hommachi','本町','M18',34.6822,135.5003],['Shinsaibashi','心斎橋','M19',34.6751,135.5009],['Namba','なんば','M20',34.6660,135.5011]]},
 nozomi:{name:'Tokaido Shinkansen, Nozomi 250',ja:'東海道新幹線 のぞみ',operator:'JR Central',status:'https://traininfo.jr-central.co.jp/shinkansen/sp/en/',stations:[
  ['Kyoto','京都','',34.9858,135.7588],['Nagoya','名古屋','',35.1709,136.8815],['Shin-Yokohama','新横浜','',35.5074,139.6175],['Shinagawa','品川','',35.6285,139.7388],['Tokyo','東京','',35.6812,139.7671]]},
 keiyo:{name:'JR Keiyo Line',ja:'京葉線',operator:'JR East',status:'https://traininfo.jreast.co.jp/train_info/e/kanto.aspx',stations:[
  ['Tokyo','東京','JE01',35.6778,139.7670],['Hatchobori','八丁堀','JE02',35.6749,139.7777],['Etchujima','越中島','JE03',35.6680,139.7924],['Shiomi','潮見','JE04',35.6593,139.8173],['Shin-Kiba','新木場','JE05',35.6458,139.8270],['Kasai-Rinkai-Koen','葛西臨海公園','JE06',35.6436,139.8612],['Maihama','舞浜','JE07',35.6365,139.8836]]},
 // A one-way loop; the order here is the order it runs.
 resort:{name:'Disney Resort Line',ja:'ディズニーリゾートライン',operator:'Maihama Resort Line',status:'https://www.tokyodisneyresort.jp/en/tdr/resortline/',loop:true,stations:[
  ['Resort Gateway','リゾートゲートウェイ','',35.6355,139.8808],['Tokyo Disneyland Station','東京ディズニーランド・ステーション','',35.6313,139.8801],['Bayside','ベイサイド','',35.6258,139.8853],['Tokyo DisneySea Station','東京ディズニーシー・ステーション','',35.6281,139.8819]]},
 marunouchi:{name:'Marunouchi Line',ja:'丸ノ内線',operator:'Tokyo Metro',status:'https://www.tokyometro.jp/lang_en/index.html',stations:[
  ['Nishi-shinjuku','西新宿','M07',35.6945,139.6927],['Shinjuku','新宿','M08',35.6922,139.7002],['Shinjuku-sanchome','新宿三丁目','M09',35.6906,139.7050],['Shinjuku-gyoemmae','新宿御苑前','M10',35.6884,139.7108],['Yotsuya-sanchome','四谷三丁目','M11',35.6882,139.7200],['Yotsuya','四ツ谷','M12',35.6860,139.7302],['Akasaka-mitsuke','赤坂見附','M13',35.6770,139.7370],['Kokkai-gijidomae','国会議事堂前','M14',35.6740,139.7453],['Kasumigaseki','霞ケ関','M15',35.6733,139.7507],['Ginza','銀座','M16',35.6717,139.7650],['Tokyo','東京','M17',35.6812,139.7654],['Otemachi','大手町','M18',35.6860,139.7640],['Awajicho','淡路町','M19',35.6955,139.7677],['Ochanomizu','御茶ノ水','M20',35.7005,139.7646],['Hongo-sanchome','本郷三丁目','M21',35.7066,139.7597],['Korakuen','後楽園','M22',35.7078,139.7520]]},
 oedo:{name:'Toei Oedo Line',ja:'都営大江戸線',operator:'Toei',status:'https://www.kotsu.metro.tokyo.jp/eng/',stations:[
  ['Tochomae','都庁前','E28',35.6907,139.6926],['Shinjuku','新宿','E27',35.6880,139.6990],['Yoyogi','代々木','E26',35.6831,139.7020],['Kokuritsu-kyogijo','国立競技場','E25',35.6800,139.7148],['Aoyama-itchome','青山一丁目','E24',35.6727,139.7240],['Roppongi','六本木','E23',35.6641,139.7321],['Azabu-juban','麻布十番','E22',35.6547,139.7372],['Akabanebashi','赤羽橋','E21',35.6552,139.7437],['Daimon','大門','E20',35.6563,139.7560],['Shiodome','汐留','E19',35.6639,139.7600],['Tsukijishijo','築地市場','E18',35.6652,139.7666]]},
 hibiya:{name:'Hibiya Line',ja:'日比谷線',operator:'Tokyo Metro',status:'https://www.tokyometro.jp/lang_en/index.html',stations:[
  ['Tsukiji','築地','H11',35.6680,139.7719],['Hatchobori','八丁堀','H12',35.6749,139.7777],['Kayabacho','茅場町','H13',35.6799,139.7797],['Ningyocho','人形町','H14',35.6862,139.7825],['Kodemmacho','小伝馬町','H15',35.6912,139.7784],['Akihabara','秋葉原','H16',35.6983,139.7745]]},
 chuoSobu:{name:'JR Chuo-Sobu Line (Local)',ja:'中央・総武線 各駅停車',operator:'JR East',status:'https://traininfo.jreast.co.jp/train_info/e/kanto.aspx',stations:[
  ['Akihabara','秋葉原','JB19',35.6984,139.7731],['Ochanomizu','御茶ノ水','JB18',35.6993,139.7651],['Suidobashi','水道橋','JB17',35.7021,139.7535],['Iidabashi','飯田橋','JB16',35.7020,139.7450],['Ichigaya','市ケ谷','JB15',35.6912,139.7355],['Yotsuya','四ツ谷','JB14',35.6860,139.7302],['Shinanomachi','信濃町','JB13',35.6801,139.7202],['Sendagaya','千駄ケ谷','JB12',35.6812,139.7113],['Yoyogi','代々木','JB11',35.6830,139.7020],['Shinjuku','新宿','JB10',35.6896,139.7006]]},
 yamanote:{name:'JR Yamanote Line',ja:'山手線',operator:'JR East',status:'https://traininfo.jreast.co.jp/train_info/e/kanto.aspx',stations:[
  ['Shinjuku','新宿','JY17',35.6896,139.7006],['Yoyogi','代々木','JY18',35.6830,139.7020],['Harajuku','原宿','JY19',35.6702,139.7027],['Shibuya','渋谷','JY20',35.6580,139.7016]]},
 odakyu:{name:'Odakyu Line',ja:'小田急線',operator:'Odakyu',status:'https://www.odakyu.jp/english/',stations:[
  ['Shinjuku','新宿','OH01',35.6910,139.6993],['Minami-Shinjuku','南新宿','OH02',35.6835,139.6985],['Sangubashi','参宮橋','OH03',35.6783,139.6920],['Yoyogi-Hachiman','代々木八幡','OH04',35.6696,139.6860],['Yoyogi-Uehara','代々木上原','OH05',35.6690,139.6800],['Higashi-Kitazawa','東北沢','OH06',35.6660,139.6720],['Shimokitazawa','下北沢','OH07',35.6615,139.6680],['Setagaya-Daita','世田谷代田','OH08',35.6580,139.6605],['Umegaoka','梅ヶ丘','OH09',35.6560,139.6530],['Gotokuji','豪徳寺','OH10',35.6534,139.6468]]},
};
const ride=(line,from,to,extra={})=>({mode:'ride',line,from,to,...extra});
const walk=(text,minutes)=>({mode:'walk',text,minutes});
// Keyed by stop id. `towards` is what the platform sign says; `exit` is for the stop after.
export const ROUTES={
 '2026-09-26-01':[walk('Hotel Kanra to Gojo Station, Exit 8.',1),
  ride('karasuma','Gojo','Kyoto',{towards:'Takeda (竹田)',minutes:2,exit:'Follow the JR signs to the Sagano Line, platforms 31–33 at the west end.'}),
  ride('sagano','Kyoto','Saga-Arashiyama',{towards:'Sonobe / Kameoka',minutes:16,exit:'South Exit (南口), then about 10 min on foot to the bamboo grove.'})],
 '2026-09-26-07':[walk('% Arabica north up Nagatsuji-dori to JR Saga-Arashiyama.',15),
  ride('sagano','Saga-Arashiyama','Kyoto',{towards:'Kyoto (京都方面); every train ends there',minutes:16,exit:'Central Gate (中央口), then follow signs for JR Kyoto Isetan; the food hall is on B1.'})],
 '2026-09-26-09':[walk('Isetan to the Karasuma Line gates, under the station.',5),
  ride('karasuma','Kyoto','Gojo',{towards:'Kokusaikaikan (国際会館)',minutes:2,exit:'Exit 8. Hotel Kanra is about 1 minute from it.'})],
 '2026-09-27-03':[walk('Hotel Kanra to Kintetsu Kyoto, on the south (Hachijo) side of Kyoto Station.',15),
  ride('kintetsu','Kyoto','Kintetsu-Nara',{towards:'Nara (奈良). A train for Kashihara-jingu-mae means changing at Yamato-Saidaiji to a Nara train, 2 stops.',minutes:45,exit:'Exit 1 or 2, then Bus Stop No. 1 at street level.'})],
 '2026-09-27-04':[walk('Kintetsu-Nara gates to Bus Stop No. 1 (eastbound).',5),
  ride('naraBus','Kintetsu-Nara Station (stop 1)','Todaiji Daibutsuden / Kasugataisha-mae',{towards:'Nara Park / Todai-ji',minutes:5,exit:'Deer and the Todai-ji approach are right there.'})],
 '2026-09-27-08':[walk('Nakatanidou to Kintetsu-Nara along Sanjo-dori.',5),
  ride('kintetsu','Kintetsu-Nara','Kyoto',{towards:'Kyoto (京都). Otherwise change at Yamato-Saidaiji to a Kyoto train.',minutes:45,exit:'Out through the Kintetsu gates, then the Karasuma Line one stop to Gojo, or 12–15 min on foot north up Karasuma-dori.'})],
 '2026-09-28-02-2':[walk('Hotel Kanra to Kyoto Station, JR gates.',15),
  ride('jrKyoto','Kyoto','Osaka',{towards:'Osaka / Kobe / Himeji',minutes:29,exit:'Follow signs for the Midosuji Line (御堂筋線), Umeda, about 5–10 min.'}),
  ride('midosuji','Umeda','Shinsaibashi',{towards:'Namba / Tennoji',minutes:6,exit:'A north-end exit on the east side, towards Shinsaibashi-suji (心斎橋筋) and CHADO in Minamisenba.'})],
 '2026-09-28-14':[walk('Dotonbori to Namba Station, Midosuji Line.',5),
  ride('midosuji','Namba','Umeda',{towards:'Umeda / Shin-Osaka / Senri-Chuo',minutes:8,exit:'Follow signs for JR Osaka Station, about 5–10 min.'}),
  ride('jrKyoto','Osaka','Kyoto',{towards:'Kyoto / Yasu / Maibara',minutes:29,exit:'Central Gate (中央口), then 12–15 min north up Karasuma-dori, or a taxi.'})],
 '2026-09-29-06':[ride('nozomi','Kyoto','Tokyo',{towards:'Tokyo (東京). Green Car 8.',minutes:135,exit:'Follow the red-and-white signs for the Keiyo Line (京葉線); the transfer is next.'})],
 '2026-09-29-07':[walk('Shinkansen platforms to the Keiyo Line: follow 京葉線 signs south through the long underground walkway with moving walkways.',20)],
 '2026-09-29-08':[ride('keiyo','Tokyo','Maihama',{towards:'Soga / Kaihin-Makuhari. Commuter Rapids (通勤快速) skip Maihama.',minutes:15,exit:'South Exit, then about 5 min to Resort Gateway.'})],
 '2026-09-29-09':[walk('JR Maihama South Exit to Resort Gateway Station.',5),
  ride('resort','Resort Gateway','Bayside',{towards:'any train; the loop runs one way',minutes:10,exit:'Follow signs for Fantasy Springs Hotel.'})],
 '2026-09-29-11':[walk('Fantasy Springs Hotel to Bayside Station.',10),
  ride('resort','Bayside','Resort Gateway',{towards:'any train; the loop runs one way',minutes:8,exit:'Down to Ikspiari; the Disney Ambassador Hotel is beside it.'})],
 '2026-09-30-02':[walk('Fantasy Springs Hotel to Bayside Station.',10),
  ride('resort','Bayside','Tokyo Disneyland Station',{towards:'any train; the loop runs one way',minutes:13,exit:'Straight ahead to the Tokyo Disneyland gates.'})],
 '2026-09-30-19':[walk('Tokyo Disneyland gates to Tokyo Disneyland Station.',5),
  ride('resort','Tokyo Disneyland Station','Bayside',{towards:'any train; the loop runs one way',minutes:4,exit:'Follow signs for Fantasy Springs Hotel.'})],
 '2026-10-01-14':[walk('DisneySea main gate to Tokyo DisneySea Station.',5),
  ride('resort','Tokyo DisneySea Station','Resort Gateway',{towards:'any train; the loop runs one way',minutes:4,exit:'Across to JR Maihama.'}),
  ride('keiyo','Maihama','Tokyo',{towards:'Tokyo (東京)',minutes:15,exit:'Follow signs for the Marunouchi Line (丸ノ内線), a long walk north through the station, 15–20 min.'}),
  ride('marunouchi','Tokyo','Nishi-shinjuku',{towards:'Ogikubo (荻窪)',minutes:20,exit:'Follow signs for Hilton Tokyo through the underground Hiltopia passage.'})],
 '2026-10-02-02':[walk('Hilton Tokyo to Tochomae Station.',8),
  ride('oedo','Tochomae','Tsukijishijo',{towards:'Roppongi / Daimon (六本木・大門方面)',minutes:21,exit:'Exit A1, then about 3 min to the outer market.'})],
 '2026-10-02-04':[walk('Tsukiji Outer Market to Tsukiji Station (Hibiya Line).',5),
  ride('hibiya','Tsukiji','Akihabara',{towards:'Kita-senju (北千住)',minutes:11,exit:'Follow signs for Electric Town (電気街) and Chuo-dori.'})],
 '2026-10-02-09':[walk('Into JR Akihabara Station, Chuo-Sobu Line (yellow) platform.',10),
  ride('chuoSobu','Akihabara','Shinjuku',{towards:'Mitaka / Shinjuku (westbound, yellow line)',minutes:20,exit:'West Exit (西口) for the Hilton shuttle, or the Marunouchi Line one stop to Nishi-shinjuku.'})],
 '2026-10-03-02':[walk('Hilton shuttle to Shinjuku Station West Exit (free).',10),
  ride('yamanote','Shinjuku','Harajuku',{towards:'Shibuya / Shinagawa (outer loop, 外回り)',minutes:4,exit:'Takeshita Exit (竹下口); Takeshita Street is straight across the road.'})],
 '2026-10-03-12':[walk('THE MATCHA TOKYO to JR Harajuku.',10),
  ride('yamanote','Harajuku','Shinjuku',{towards:'Shinjuku / Ikebukuro (inner loop, 内回り)',minutes:4,exit:'West Exit (西口) for the Hilton shuttle, or 15 min on foot.'})],
 '2026-10-03-14':[walk('Hilton Tokyo through the Hiltopia passage to Nishi-shinjuku.',5),
  ride('marunouchi','Nishi-shinjuku','Korakuen',{towards:'Ikebukuro (池袋)',minutes:25,exit:'Exit 2 to Tokyo Dome City.'})],
 '2026-10-03-18':[walk('Tokyo Dome to Korakuen Station; expect crowds.',10),
  ride('marunouchi','Korakuen','Nishi-shinjuku',{towards:'Ogikubo (荻窪)',minutes:25,exit:'Follow signs for Hilton Tokyo through the Hiltopia passage.'})],
 '2026-10-04-02':[walk('Hilton Tokyo through the Hiltopia passage to Nishi-shinjuku.',5),
  ride('marunouchi','Nishi-shinjuku','Ginza',{towards:'Ikebukuro (池袋)',minutes:20,exit:'Follow signs for GINZA SIX (Exit A3 side).'})],
 '2026-10-04-06':[walk('Chuo-dori north to Tokyo Station, Marunouchi side. Or one stop on the Marunouchi Line from Ginza (M16) to Tokyo (M17), towards Ikebukuro.',20)],
 '2026-10-04-11':[walk('Tokyo Station to the Marunouchi Line gates.',5),
  ride('marunouchi','Tokyo','Shinjuku',{towards:'Ogikubo (荻窪)',minutes:17,exit:'Follow signs for the Odakyu Line (小田急線), about 5 min.'}),
  ride('odakyu','Shinjuku','Shimokitazawa',{towards:'Odawara / Fujisawa. An Express skips the small stations.',minutes:8,exit:'Follow Maps to Beyblade Bar, a few minutes away.'})],
 '2026-10-04-13':[walk('Beyblade Bar to Shimokitazawa Station, Odakyu Line.',5),
  ride('odakyu','Shimokitazawa','Shinjuku',{towards:'Shinjuku (新宿); every train ends there',minutes:8,exit:'Follow Maps to dinner, about 10 min.'})],
 '2026-10-04-15':[walk('Shinjuku West Exit (西口): the Hilton shuttle, or about 15 min on foot through the underground passage to Hilton Tokyo. A taxi is about 5 min.',15)],
 '2026-10-05-10':[walk('Shibuya to JR Shibuya Station, Yamanote Line.',8),
  ride('yamanote','Shibuya','Shinjuku',{towards:'Shinjuku / Ikebukuro (inner loop, 内回り)',minutes:7,exit:'West Exit (西口) for the Hilton shuttle, or 15 min on foot.'})],
 '2026-10-06-03':[walk('Hilton shuttle or on foot to Odakyu Shinjuku.',15),
  ride('odakyu','Shinjuku','Gotokuji',{towards:'A Local (各駅停車) — the only trains that stop at Gotokuji',minutes:15,exit:'Out of the station, then about 10 min on foot to the temple.'})],
 '2026-10-06-05':[walk('Gotokuji Temple to Gotokuji Station.',10),
  ride('odakyu','Gotokuji','Shinjuku',{towards:'Shinjuku (新宿)',minutes:15,exit:'West Exit (西口) for the Hilton shuttle, or 15 min on foot.'})],
};
const station=([name,ja,code,lat,lng])=>({name,ja,code,lat,lng});
// The stations a leg passes, boarding and getting off included, in the order the train reaches
// them. A loop line wraps round.
export function legStops(leg){
 const line=LINES[leg.line],all=line.stations,i=all.findIndex(s=>s[0]===leg.from),j=all.findIndex(s=>s[0]===leg.to);
 if(i<0||j<0)throw new Error(`${leg.line}: ${leg.from} → ${leg.to}`);
 if(line.loop){const out=[];for(let k=i;;k=(k+1)%all.length){out.push(station(all[k]));if(k===j)break;}return out;}
 return (i<=j?all.slice(i,j+1):all.slice(j,i+1).reverse()).map(station);
}
export const routeFor=step=>ROUTES[step?.id]||null;
export const stationLabel=s=>s.code?`${s.name} (${s.code})`:s.name;
// Metres between two points; plenty accurate over a city.
export function distance(a,b){
 const r=Math.PI/180,x=(b.lng-a.lng)*r*Math.cos((a.lat+b.lat)*r/2),y=(b.lat-a.lat)*r;
 return Math.round(Math.sqrt(x*x+y*y)*6371000);
}
// Where a phone is along a leg: the nearest station, how many stops are left, and whether to get
// ready. Too far from every station means we are not on this ride yet.
export function trackLeg(stops,at,near=2500){
 const d=stops.map(s=>distance(at,s)),i=d.indexOf(Math.min(...d)),last=stops.length-1;
 if(d[i]>near)return {on:false,metres:d[i],nearest:stops[i]};
 const left=last-i;
 return {on:true,index:i,nearest:stops[i],metres:d[i],left,ready:left<=1,arrived:left===0&&d[i]<400};
}
// Which ride the phone is on: the nearest station across every ride, and at a change (the same
// station ending one ride and starting the next) the ride that is still to come.
export function whereOnRoute(rides,at){
 const seen=rides.map((stops,i)=>({i,...trackLeg(stops,at)})).filter(t=>t.on);
 if(!seen.length)return null;
 return seen.sort((a,b)=>a.metres-b.metres||(a.left===0)-(b.left===0))[0];
}
export function liveTimes(leg){
 const stops=legStops(leg),from=stops[0],to=stops[stops.length-1];
 return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:`${from.lat},${from.lng}`,destination:`${to.lat},${to.lng}`,travelmode:'transit'});
}
