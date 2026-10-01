// Every train and transfer on the rest of the trip, leg by leg: the line and which way, every
// station between boarding and getting off with its number, and the exit for what comes next.
// Coordinates are station centres, close enough to say which station a phone is nearest while
// riding. Station numbers are left out where a line does not post them or they are not certain.
// `kind` says whose line it is (JR, subway, private railway, bus, monorail), `colour` is the colour
// its signs use, and `look` is what to watch for on the way to the platform and on the train.
export const LINES={
 karasuma:{name:'Karasuma Line',ja:'烏丸線',operator:'Kyoto Municipal Subway',status:'https://www.city.kyoto.lg.jp/kotsu/',kind:'Subway',colour:'#1E9B4B',look:'Green signs with a K in a circle (烏丸線). The gates are underground, separate from JR. Trains have a green stripe.',stations:[
  ['Gojo','五条','K10',34.9960,135.7596],['Kyoto','京都','K11',34.9858,135.7588]]},
 sagano:{name:'JR Sagano Line',ja:'嵯峨野線',operator:'JR West',status:'https://trafficinfo.westjr.co.jp/kinki.html',kind:'JR',colour:'#8B4F9E',look:'Purple signs marked E (嵯峨野線), from the west end of the JR station. Not the Sagano Romantic Train (トロッコ), a separate tourist train.',stations:[
  ['Kyoto','京都','JR-E01',34.9858,135.7588],['Umekoji-Kyotonishi','梅小路京都西','JR-E02',34.9873,135.7421],['Tambaguchi','丹波口','JR-E03',34.9960,135.7424],['Nijo','二条','JR-E04',35.0107,135.7418],['Emmachi','円町','JR-E05',35.0196,135.7328],['Hanazono','花園','JR-E06',35.0175,135.7215],['Uzumasa','太秦','JR-E07',35.0170,135.7079],['Saga-Arashiyama','嵯峨嵐山','JR-E08',35.0182,135.6813]]},
 // Stops of a Nara-bound Express (急行). Yamato-Saidaiji is B26 on the Kyoto Line and A26 on the
 // Nara Line.
 kintetsu:{name:'Kintetsu Kyoto & Nara Lines, Express',symbolColours:{B:'#E7A61A',A:'#C22047'},allStop:'Express',fast:[{name:'Limited Express',tag:'Ltd Exp',at:['Kyoto','Kintetsu-Tambabashi','Yamato-Saidaiji','Kintetsu-Nara'],some:['Takanohara']}],ja:'近鉄 急行',operator:'Kintetsu',status:'https://www.kintetsu.jp/unkou/unkou.html',kind:'Private railway',colour:'#B5122E',look:'Kintetsu (近鉄) signs and its own gates, on the south side of Kyoto Station, apart from JR. Trains are maroon-red and white. Board one shown as 急行 (Express); a 特急 (Limited Express) is quicker but needs a seat ticket; see the options above.',stations:[
  ['Kyoto','京都','B01',34.9844,135.7577],['Toji','東寺','B02',34.9807,135.7497],['Takeda','竹田','B05',34.9530,135.7560],['Kintetsu-Tambabashi','近鉄丹波橋','B07',34.9360,135.7678],['Momoyamagoryo-mae','桃山御陵前','B08',34.9322,135.7721],['Okubo','大久保','B12',34.8781,135.7820],['Shin-Tanabe','新田辺','B16',34.8196,135.7696],['Shin-Hosono','新祝園','B21',34.7610,135.7960],['Takanohara','高の原','B24',34.7196,135.7863],['Yamato-Saidaiji','大和西大寺','A26',34.6938,135.7825],['Shin-Omiya','新大宮','A27',34.6849,135.8127],['Kintetsu-Nara','近鉄奈良','A28',34.6844,135.8279]]},
 naraBus:{name:'Nara Kotsu bus 2, 77, 97 or 163',ja:'奈良交通バス',operator:'Nara Kotsu',status:'https://www.narakotsu.co.jp/',kind:'Bus',colour:'#3C7D3E',look:'Green-and-beige Nara Kotsu buses; the yellow Loop buses go past too. Check the number and 東大寺大仏殿 (Todai-ji Daibutsuden) on the front. Get on by the middle door and pay by IC card at the front as you get off.',stations:[
  ['Kintetsu-Nara Station (stop 1)','近鉄奈良駅','',34.6848,135.8285],['Kencho-mae','県庁前','',34.6852,135.8318],['Kencho-higashi','県庁東','',34.6856,135.8350],['Himurojinja / National Museum','氷室神社・国立博物館','',34.6852,135.8378],['Todaiji Daibutsuden / Kasugataisha-mae','東大寺大仏殿・春日大社前','',34.6848,135.8418]]},
 // A daytime Special Rapid's stops. Nagaokakyo (JR-A35) is a Rapid stop that daytime Special
 // Rapids pass.
 jrKyoto:{name:'JR Kyoto Line, Special Rapid',ja:'JR京都線 新快速',operator:'JR West',status:'https://trafficinfo.westjr.co.jp/kinki.html',kind:'JR',colour:'#0072BC',look:'Blue signs marked A (JR京都線). Take a 新快速 (Special Rapid) on the departure board; trains are silver-white with blue and brown stripes. Car 9 on some trains is A-Seat, a reserved seat for an extra fee; see the options above.',stations:[
  ['Kyoto','京都','JR-A31',34.9858,135.7588],['Takatsuki','高槻','JR-A38',34.8513,135.6177],['Shin-Osaka','新大阪','JR-A46',34.7335,135.5003],['Osaka','大阪','JR-A47',34.7025,135.4959]]},
 midosuji:{name:'Midosuji Line',ja:'御堂筋線',operator:'Osaka Metro',status:'https://subway.osakametro.co.jp/guide/traffic_information.php',kind:'Subway',colour:'#E5171F',look:'Red signs marked M (御堂筋線, Osaka Metro). Trains have a red stripe. Umeda is its own station, apart from JR Osaka.',stations:[
  ['Umeda','梅田','M16',34.7033,135.4985],['Yodoyabashi','淀屋橋','M17',34.6928,135.5013],['Hommachi','本町','M18',34.6822,135.5003],['Shinsaibashi','心斎橋','M19',34.6751,135.5009],['Namba','なんば','M20',34.6660,135.5011]]},
 nozomi:{name:'Tokaido Shinkansen, Nozomi 250',ja:'東海道新幹線 のぞみ',operator:'JR Central',status:'https://traininfo.jr-central.co.jp/shinkansen/sp/en/',kind:'JR Shinkansen',colour:'#1B4EA3',look:'Shinkansen (新幹線) signs to the separate Shinkansen gates; put both tickets through together. White trains with a blue stripe. The car number is marked on the platform where each door stops.',stations:[
  ['Kyoto','京都','',34.9858,135.7588],['Nagoya','名古屋','',35.1709,136.8815],['Shin-Yokohama','新横浜','',35.5074,139.6175],['Shinagawa','品川','',35.6285,139.7388],['Tokyo','東京','',35.6812,139.7671]]},
 keiyo:{name:'JR Keiyo Line',ja:'京葉線',operator:'JR East',status:'https://traininfo.jreast.co.jp/train_info/e/kanto.aspx',kind:'JR',colour:'#C9242F',look:'Red signs marked JE (京葉線). Trains are silver with a red stripe. The platforms are deep underground at the south end of Tokyo Station.',stations:[
  ['Tokyo','東京','JE01',35.6778,139.7670],['Hatchobori','八丁堀','JE02',35.6749,139.7777],['Etchujima','越中島','JE03',35.6680,139.7924],['Shiomi','潮見','JE04',35.6593,139.8173],['Shin-Kiba','新木場','JE05',35.6458,139.8270],['Kasai-Rinkai-Koen','葛西臨海公園','JE06',35.6436,139.8612],['Maihama','舞浜','JE07',35.6365,139.8836]]},
 // A one-way loop; the order here is the order it runs.
 resort:{name:'Disney Resort Line',ja:'ディズニーリゾートライン',operator:'Maihama Resort Line',status:'https://www.tokyodisneyresort.jp/en/tdr/resortline/',kind:'Monorail',colour:'#35A8C8',look:'Disney Resort Line monorail with Mickey-shaped windows and straps. Its own gates and fare, not JR; Suica or PASMO works, or a Resort Line ticket.',loop:true,stations:[
  ['Resort Gateway','リゾートゲートウェイ','',35.6355,139.8808],['Tokyo Disneyland Station','東京ディズニーランド・ステーション','',35.6313,139.8801],['Bayside','ベイサイド','',35.6258,139.8853],['Tokyo DisneySea Station','東京ディズニーシー・ステーション','',35.6281,139.8819]]},
 marunouchi:{name:'Marunouchi Line',ja:'丸ノ内線',operator:'Tokyo Metro',status:'https://www.tokyometro.jp/lang_en/index.html',kind:'Subway',colour:'#F62E36',look:'Red signs with a white wavy line, marked M (丸ノ内線, Tokyo Metro). Trains are bright red.',stations:[
  ['Nishi-shinjuku','西新宿','M07',35.6945,139.6927],['Shinjuku','新宿','M08',35.6922,139.7002],['Shinjuku-sanchome','新宿三丁目','M09',35.6906,139.7050],['Shinjuku-gyoemmae','新宿御苑前','M10',35.6884,139.7108],['Yotsuya-sanchome','四谷三丁目','M11',35.6882,139.7200],['Yotsuya','四ツ谷','M12',35.6860,139.7302],['Akasaka-mitsuke','赤坂見附','M13',35.6770,139.7370],['Kokkai-gijidomae','国会議事堂前','M14',35.6740,139.7453],['Kasumigaseki','霞ケ関','M15',35.6733,139.7507],['Ginza','銀座','M16',35.6717,139.7650],['Tokyo','東京','M17',35.6812,139.7654],['Otemachi','大手町','M18',35.6860,139.7640],['Awajicho','淡路町','M19',35.6955,139.7677],['Ochanomizu','御茶ノ水','M20',35.7005,139.7646],['Hongo-sanchome','本郷三丁目','M21',35.7066,139.7597],['Korakuen','後楽園','M22',35.7078,139.7520]]},
 oedo:{name:'Toei Oedo Line',ja:'都営大江戸線',operator:'Toei',status:'https://www.kotsu.metro.tokyo.jp/eng/',kind:'Subway',colour:'#B6007A',look:'Magenta signs marked E (大江戸線, Toei). Trains have a magenta stripe; platforms are deep underground.',stations:[
  ['Tochomae','都庁前','E28',35.6907,139.6926],['Shinjuku','新宿','E27',35.6880,139.6990],['Yoyogi','代々木','E26',35.6831,139.7020],['Kokuritsu-kyogijo','国立競技場','E25',35.6800,139.7148],['Aoyama-itchome','青山一丁目','E24',35.6727,139.7240],['Roppongi','六本木','E23',35.6641,139.7321],['Azabu-juban','麻布十番','E22',35.6547,139.7372],['Akabanebashi','赤羽橋','E21',35.6552,139.7437],['Daimon','大門','E20',35.6563,139.7560],['Shiodome','汐留','E19',35.6639,139.7600],['Tsukijishijo','築地市場','E18',35.6652,139.7666]]},
 hibiya:{name:'Hibiya Line',ja:'日比谷線',operator:'Tokyo Metro',status:'https://www.tokyometro.jp/lang_en/index.html',kind:'Subway',colour:'#B5B5AC',look:'Silver-grey signs marked H (日比谷線, Tokyo Metro). Trains are silver with a grey stripe.',stations:[
  ['Ginza','銀座','H09',35.6717,139.7640],['Higashi-ginza','東銀座','H10',35.6694,139.7671],['Tsukiji','築地','H11',35.6680,139.7719],['Hatchobori','八丁堀','H12',35.6749,139.7777],['Kayabacho','茅場町','H13',35.6799,139.7797],['Ningyocho','人形町','H14',35.6862,139.7825],['Kodemmacho','小伝馬町','H15',35.6912,139.7784],['Akihabara','秋葉原','H16',35.6983,139.7745]]},
 chuoSobu:{name:'JR Chuo-Sobu Line (Local)',ja:'中央・総武線 各駅停車',operator:'JR East',status:'https://traininfo.jreast.co.jp/train_info/e/kanto.aspx',kind:'JR',colour:'#FFD400',look:'Yellow signs marked JB (総武線 各駅停車). Trains are silver with a yellow stripe. The orange Chuo Rapid (JC) is a different line.',stations:[
  ['Akihabara','秋葉原','JB19',35.6984,139.7731],['Ochanomizu','御茶ノ水','JB18',35.6993,139.7651],['Suidobashi','水道橋','JB17',35.7021,139.7535],['Iidabashi','飯田橋','JB16',35.7020,139.7450],['Ichigaya','市ケ谷','JB15',35.6912,139.7355],['Yotsuya','四ツ谷','JB14',35.6860,139.7302],['Shinanomachi','信濃町','JB13',35.6801,139.7202],['Sendagaya','千駄ケ谷','JB12',35.6812,139.7113],['Yoyogi','代々木','JB11',35.6830,139.7020],['Shinjuku','新宿','JB10',35.6896,139.7006]]},
 yamanote:{name:'JR Yamanote Line',ja:'山手線',operator:'JR East',status:'https://traininfo.jreast.co.jp/train_info/e/kanto.aspx',kind:'JR',colour:'#80C241',look:'Light-green signs marked JY (山手線). Trains are silver with a light-green stripe. Check 内回り (inner) or 外回り (outer) for the direction.',stations:[
  ['Shinjuku','新宿','JY17',35.6896,139.7006],['Yoyogi','代々木','JY18',35.6830,139.7020],['Harajuku','原宿','JY19',35.6702,139.7027],['Shibuya','渋谷','JY20',35.6580,139.7016]]},
 odakyu:{name:'Odakyu Line',allStop:'Local',fast:[{name:'Express',tag:'Express',at:['Shinjuku','Yoyogi-Uehara','Shimokitazawa']}],ja:'小田急線',operator:'Odakyu',status:'https://www.odakyu.jp/english/',kind:'Private railway',colour:'#2288CC',childIc:'A child on a child IC card pays a flat ¥50 on Odakyu.',look:'Blue signs marked OH (小田急線); its own gates, apart from JR. Trains are silver with a blue stripe. A Romancecar needs its own reserved ticket.',stations:[
  ['Shinjuku','新宿','OH01',35.6910,139.6993],['Minami-Shinjuku','南新宿','OH02',35.6835,139.6985],['Sangubashi','参宮橋','OH03',35.6783,139.6920],['Yoyogi-Hachiman','代々木八幡','OH04',35.6696,139.6860],['Yoyogi-Uehara','代々木上原','OH05',35.6690,139.6800],['Higashi-Kitazawa','東北沢','OH06',35.6660,139.6720],['Shimokitazawa','下北沢','OH07',35.6615,139.6680],['Setagaya-Daita','世田谷代田','OH08',35.6580,139.6605],['Umegaoka','梅ヶ丘','OH09',35.6560,139.6530],['Gotokuji','豪徳寺','OH10',35.6534,139.6468]]},
};
const ride=(line,from,to,extra={})=>({mode:'ride',line,from,to,...extra});
const walk=(text,minutes)=>({mode:'walk',text,minutes});
// A stop made on the way rather than a stop of its own: collecting bags, a shop, a toilet break.
// It is a leg like a walk or a ride, ticked as it is done, so the journey stays one card.
const pause=(text,minutes,place)=>({mode:'stop',text,minutes,...(place?{place}:{})});
// Choices on the same ride, with time, fare and how to pay, so the family can pick on the day.
const KINTETSU_OPTIONS=[
 {name:'Express',ja:'急行',minutes:45,yen:[760,380],fare:'adult ¥760 · child ¥380',how:'Tap an IC card (ICOCA, Suica, PASMO) at the Kintetsu gates, or buy a paper ticket from the fare machines. No seat reservation; sit anywhere free.'},
 {name:'Limited Express',ja:'特急',minutes:35,fare:'adult ¥1,280 · child ¥640 (fare plus ¥520 / ¥260 for the seat)',how:'Tap in with an IC card as usual, then buy a Limited Express ticket for each person at the Limited Express machine inside the gates (or the ticket counter): choose the train, pay by cash, card or IC card. It gives a car and seat number. Show it if the conductor asks.'},
];
const JR_KYOTO_OPTIONS=[
 {name:'Special Rapid',ja:'新快速',minutes:29,yen:[580,290],fare:'adult ¥580 · child ¥290',how:'Tap an IC card at the JR gates. Unreserved; stand by the door marks on the platform.'},
 {name:'A-Seat on the same train',ja:'Aシート',minutes:29,fare:'the fare plus ¥600 a seat booked ahead, or ¥840 on the day',how:'Car 9 on some Special Rapids only; check for Aシート on the departure board. Book on JR West\'s e5489 site (free WESTER sign-up) for ¥600, or buy at a ticket machine or ticket office for ¥840. Tap an IC card at the gates for the fare as usual.'},
];
// A ride's `yen` is [adult, child] per person by IC card; with options, the first option's is the usual fare.
// `through` means the next ride is a change inside the same company's gates, on this one ticket
// (that ride is `sameTicket`, no fare of its own). `booked` is a ride whose tickets are already bought.
// Keyed by stop id. `towards` is what the platform sign says; `exit` is for the stop after.
export const ROUTES={
 '2026-09-26-01':[walk('Hotel Kanra to Gojo Station, Exit 8.',1),
  ride('karasuma','Gojo','Kyoto',{yen:[220,110],towards:'Takeda / Kintetsu (竹田・近鉄方面); any train',minutes:2,exit:'Follow the JR signs to the Sagano Line, platforms 31–33 at the west end.'}),
  ride('sagano','Kyoto','Saga-Arashiyama',{yen:[240,120],towards:'Sonobe / Kameoka',minutes:16,exit:'South Exit (南口), then about 10 min on foot to the bamboo grove.'})],
 '2026-09-26-07':[walk('% Arabica north up Nagatsuji-dori to JR Saga-Arashiyama.',15),
  ride('sagano','Saga-Arashiyama','Kyoto',{yen:[240,120],towards:'Kyoto (京都方面); every train ends there',minutes:16,exit:'Central Gate (中央口), then follow signs for JR Kyoto Isetan; the food hall is on B1.'})],
 '2026-09-26-09':[walk('Isetan to the Karasuma Line gates, under the station.',5),
  ride('karasuma','Kyoto','Gojo',{yen:[220,110],towards:'Kokusaikaikan (国際会館)',minutes:2,exit:'Exit 8. Hotel Kanra is about 1 minute from it.'})],
 '2026-09-27-03':[walk('Hotel Kanra to Kintetsu Kyoto, on the south (Hachijo) side of Kyoto Station.',15),
  ride('kintetsu','Kyoto','Kintetsu-Nara',{towards:'Nara (奈良). A train for Kashihara-jingu-mae means changing at Yamato-Saidaiji to a Nara train, 2 stops.',minutes:45,options:KINTETSU_OPTIONS,exit:'East Gate (東改札) and Exit 1, as the guide says, or West Gate (西改札) and Exit 5. Bus Stop No. 1 (eastbound, Nara Park side) is at street level.'})],
 '2026-09-27-04':[walk('Kintetsu-Nara: East Gate, Exit 1 (or West Gate, Exit 5) up to Bus Stop No. 1, the eastbound stop on the Nara Park side. Any bus showing 東大寺大仏殿・春日大社前 (Todai-ji Daibutsuden / Kasuga Taisha-mae) or 市内循環外回り (City Loop, outer) goes there.',5),
  ride('naraBus','Kintetsu-Nara Station (stop 1)','Todaiji Daibutsuden / Kasugataisha-mae',{yen:[250,130],towards:'Nara Park / Todai-ji',minutes:5,exit:'Deer and the Todai-ji approach are right there.'})],
 '2026-09-27-08':[walk('Nakatanidou to Kintetsu-Nara along Sanjo-dori.',5),
  ride('kintetsu','Kintetsu-Nara','Kyoto',{towards:'Kyoto (京都). Otherwise change at Yamato-Saidaiji to a Kyoto train.',minutes:45,options:KINTETSU_OPTIONS,exit:'Out through the Kintetsu gates, then the Karasuma Line one stop to Gojo, or 12–15 min on foot north up Karasuma-dori.'})],
 '2026-09-28-02-2':[walk('Hotel Kanra to Kyoto Station, JR gates.',15),
  ride('jrKyoto','Kyoto','Osaka',{towards:'Osaka / Kobe / Himeji',minutes:29,options:JR_KYOTO_OPTIONS,exit:'Follow signs for the Midosuji Line (御堂筋線), Umeda, about 5–10 min.'}),
  ride('midosuji','Umeda','Shinsaibashi',{towards:'Namba / Tennoji / Nakamozu',minutes:7,yen:[240,120],exit:'North gate (北改札), then Exit 1 or 2 on the west side of Midosuji, into Minamisenba 4-chome for CHADO. Follow Maps for the last few minutes.'})],
 '2026-09-28-14':[walk('Dotonbori / Ebisubashi to Namba Station, Midosuji Line.',8),
  ride('midosuji','Namba','Umeda',{towards:'Umeda / Shin-Osaka / Esaka / Senri-Chuo / Minoh-Kayano',minutes:9,yen:[240,120],exit:'Follow signs for JR Osaka Station, about 8–10 min.'}),
  ride('jrKyoto','Osaka','Kyoto',{towards:'Kyoto / Yasu / Maibara',minutes:29,options:JR_KYOTO_OPTIONS,exit:'Central Gate (中央口), then 12–15 min north up Karasuma-dori, or a taxi.'})],
 '2026-09-29-06':[ride('nozomi','Kyoto','Tokyo',{booked:'Booked: tickets for all four are already bought, Green Car 8, seats 6-C, 6-D, 7-C and 7-D. Put each ticket through the Shinkansen gates at Kyoto and again at Tokyo; the gate keeps them at the end.',towards:'Tokyo (東京). Green Car 8.',minutes:135,exit:'Follow the red-and-white signs for the Keiyo Line (京葉線); the transfer is next.'})],
 '2026-09-29-07':[walk('Shinkansen platforms to the Keiyo Line: follow 京葉線 (Keiyo Line) signs south through the long underground walkway with moving walkways.',20)],
 '2026-09-29-08':[ride('keiyo','Tokyo','Maihama',{yen:[260,130],towards:'Any train; every Keiyo train stops at Maihama (Soga / Kaihin-Makuhari / Nishi-Funabashi / Fuchuhommachi)',minutes:15,exit:'South Exit, then about 5 min to Resort Gateway.'})],
 '2026-09-29-09':[walk('JR Maihama South Exit to Resort Gateway Station.',5),
  ride('resort','Resort Gateway','Bayside',{yen:[300,150],towards:'any train; the loop runs one way',minutes:10,exit:'Follow signs for Fantasy Springs Hotel.'})],
 '2026-09-29-11':[walk('Fantasy Springs Hotel to Bayside Station.',5),
  ride('resort','Bayside','Resort Gateway',{yen:[300,150],towards:'any train; the loop runs one way',minutes:8,exit:'Walk through Ikspiari to the Disney Ambassador Hotel, about 10–15 min.'})],
 '2026-09-30-02':[walk('Fantasy Springs Hotel to Bayside Station.',5),
  ride('resort','Bayside','Tokyo Disneyland Station',{yen:[300,150],towards:'any train; the loop runs one way',minutes:13,exit:'Straight ahead to the Tokyo Disneyland gates.'})],
 '2026-09-30-19':[walk('Tokyo Disneyland gates to Tokyo Disneyland Station.',5),
  ride('resort','Tokyo Disneyland Station','Bayside',{yen:[300,150],towards:'any train; the loop runs one way',minutes:4,exit:'Follow signs for Fantasy Springs Hotel.'})],
 '2026-10-01-14':[walk('Leave through the Fantasy Springs Entrance (open to every guest leaving since 15 September 2026; be inside Fantasy Springs before 9 pm), straight across to the Fantasy Springs Hotel. If that exit is shut, leave by the main gate and follow signs for the hotel, about 15 min.',5),
  pause('Pick up the bags left at the Fantasy Springs Hotel after check-out this morning: the bell desk (luggage storage) in the lobby. Have the claim tags ready.',15,'Tokyo DisneySea Fantasy Springs Hotel'),
  walk('Fantasy Springs Hotel to Bayside Station.',5),
  ride('resort','Bayside','Resort Gateway',{yen:[300,150],towards:'any train; the loop runs one way',minutes:8,exit:'Across to JR Maihama.'}),
  ride('keiyo','Maihama','Tokyo',{yen:[260,130],towards:'Tokyo (東京)',minutes:15,exit:'Follow signs for the Marunouchi Line (丸ノ内線), a long walk north through the station, 15–20 min.'}),
  ride('marunouchi','Tokyo','Nishi-shinjuku',{yen:[210,110],towards:'Ogikubo (荻窪)',minutes:20,exit:'Exit C8, then up into the Hiltopia arcade under Hilton Tokyo, about 2 min.'})],
 '2026-10-02-02':[walk('Hilton Tokyo through Hiltopia to Nishi-shinjuku, Exit C8.',5),
  ride('marunouchi','Nishi-shinjuku','Ginza',{yen:[210,110],through:true,towards:'Ikebukuro (池袋)',minutes:20,exit:'Follow the grey H signs to the Hibiya Line, about 3–4 min.'}),
  ride('hibiya','Ginza','Tsukiji',{sameTicket:true,towards:'Kita-senju (北千住)',minutes:3,exit:'Exit 1 (or 2), then about 1 min to the outer market. No-change alternative: Oedo Line from Tochomae (E28) to Tsukijishijo (E18), Exit A1, about the same time but ¥280.'})],
 '2026-10-02-04':[walk('Tsukiji Outer Market to Tsukiji Station (Hibiya Line).',5),
  ride('hibiya','Tsukiji','Akihabara',{yen:[180,90],towards:'Kita-senju (北千住)',minutes:11,exit:'Exit 3 to Chuo-dori and Electric Town (電気街).'})],
 '2026-10-02-09':[walk('Into JR Akihabara Station, Chuo-Sobu Line (yellow) platform.',10),
  ride('chuoSobu','Akihabara','Shinjuku',{yen:[210,100],towards:'Mitaka / Shinjuku (westbound, yellow line)',minutes:20,exit:'West Exit (西口) for the Hilton shuttle (bus stop 28 on Chuo-dori, by underground Exit 9; about every 20 min, last bus 20:40), or the Marunouchi Line one stop to Nishi-shinjuku.'})],
 '2026-10-03-02':[walk('Hilton shuttle to Shinjuku West Exit, under 10 min (free, about every 20 min; check the timetable at the desk), or about 15 min on foot.',10),
  ride('yamanote','Shinjuku','Harajuku',{yen:[160,80],towards:'Shibuya / Shinagawa (inner loop, 内回り), platform 14',minutes:4,exit:'Takeshita Exit (竹下口); Takeshita Street is straight across the road.'})],
 '2026-10-03-12':[walk('THE MATCHA TOKYO to JR Harajuku.',10),
  ride('yamanote','Harajuku','Shinjuku',{yen:[160,80],towards:'Shinjuku / Ikebukuro (outer loop, 外回り)',minutes:4,exit:'West Exit (西口) for the Hilton shuttle (bus stop 28 on Chuo-dori, by underground Exit 9; about every 20 min, last bus 20:40), or 15 min on foot.'})],
 '2026-10-03-14':[walk('Hilton Tokyo through Hiltopia to Nishi-shinjuku, Exit C8.',5),
  ride('marunouchi','Nishi-shinjuku','Korakuen',{yen:[260,130],towards:'Ikebukuro (池袋)',minutes:25,exit:'Exit 2 to Tokyo Dome City.'})],
 '2026-10-03-18':[walk('Tokyo Dome to Korakuen Station; expect crowds.',10),
  ride('marunouchi','Korakuen','Nishi-shinjuku',{yen:[260,130],towards:'Ogikubo (荻窪)',minutes:25,exit:'Exit C8, then up into the Hiltopia arcade under Hilton Tokyo, about 2 min.'})],
 '2026-10-04-02':[walk('Hilton Tokyo through Hiltopia to Nishi-shinjuku, Exit C8.',5),
  ride('marunouchi','Nishi-shinjuku','Ginza',{yen:[210,110],towards:'Ikebukuro (池袋)',minutes:20,exit:'Follow signs for GINZA SIX (Exit A3 side).'})],
 '2026-10-04-06':[walk('Chuo-dori north to Tokyo Station, Marunouchi side. Or one stop on the Marunouchi Line from Ginza (M16) to Tokyo (M17), towards Ikebukuro.',20)],
 '2026-10-04-11':[walk('Tokyo Station to the Marunouchi Line gates.',5),
  ride('marunouchi','Tokyo','Shinjuku',{yen:[210,110],towards:'Ogikubo (荻窪)',minutes:17,exit:'Follow signs for the Odakyu Line (小田急線), about 5 min.'}),
  ride('odakyu','Shinjuku','Shimokitazawa',{yen:[170,90],towards:'Odawara / Fujisawa. An Express skips the small stations.',minutes:8,exit:'Follow Maps to Beyblade Bar, a few minutes away. Door to door is 35–40 min, not the guide\'s 15; JR Chuo Rapid from Tokyo to Shinjuku is a few minutes quicker than the Marunouchi Line.'})],
 '2026-10-04-13':[walk('Beyblade Bar to Shimokitazawa Station, Odakyu Line.',5),
  ride('odakyu','Shimokitazawa','Shinjuku',{yen:[170,90],towards:'Shinjuku (新宿); every train ends there',minutes:8,exit:'Follow Maps to dinner, about 10 min.'})],
 '2026-10-04-15':[walk('Shinjuku West Exit (西口): the Hilton shuttle, or about 15 min on foot through the underground passage to Hilton Tokyo. A taxi is about 5 min.',15)],
 '2026-10-05-01':[walk('Hilton shuttle to Shinjuku West Exit, under 10 min, or about 15 min on foot.',10),
  ride('yamanote','Shinjuku','Shibuya',{yen:[200,100],towards:'Shibuya / Shinagawa (inner loop, 内回り), platform 14',minutes:7,exit:'Hachiko Exit (ハチ公口), then about 7 min on foot to FLIPPER\'S, 1-15-5 Jinnan.'})],
 '2026-10-05-10':[walk('Shibuya to JR Shibuya Station, Yamanote Line.',8),
  ride('yamanote','Shibuya','Shinjuku',{yen:[200,100],towards:'Shinjuku / Ikebukuro (outer loop, 外回り), platform 1',minutes:7,exit:'West Exit (西口) for the Hilton shuttle (bus stop 28 on Chuo-dori, by underground Exit 9; about every 20 min, last bus 20:40), or 15 min on foot.'})],
 '2026-10-06-03':[walk('Hilton shuttle or on foot to Odakyu Shinjuku.',15),
  ride('odakyu','Shinjuku','Gotokuji',{yen:[200,100],towards:'A Local (各駅停車) — the only trains that stop at Gotokuji',minutes:15,exit:'Out of the station, then about 10 min on foot to the temple.'})],
 '2026-10-06-05':[walk('Gotokuji Temple to Gotokuji Station.',10),
  ride('odakyu','Gotokuji','Shinjuku',{yen:[200,100],towards:'Shinjuku (新宿)',minutes:15,exit:'West Exit (西口) for the Hilton shuttle (bus stop 28 on Chuo-dori, by underground Exit 9; about every 20 min, last bus 20:40), or 15 min on foot.'})],
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
// The family can add a stop on the way to any route (a bag pickup, a shop, a toilet break). It is
// kept on the step as a waypoint, `after` legs into the guide's route, and shows as a leg of its
// own. Every leg carries a `key` that survives one being added or taken away (`r2` for the
// route's third leg, `w:<id>` for a waypoint), so the legs already ticked stay ticked.
export const MAX_WAYPOINTS=6;
export function routeFor(step){
 const base=ROUTES[step?.id];
 if(!base)return null;
 const added=step.waypoints||[];
 if(!added.length)return base;
 const legs=[];
 base.forEach((leg,k)=>{for(const w of added)if(w.after===k)legs.push(waypointLeg(w));legs.push({...leg,key:`r${k}`});});
 for(const w of added)if(w.after>=base.length)legs.push(waypointLeg(w));
 return legs;
}
const waypointLeg=w=>({mode:'stop',text:w.text,minutes:w.minutes||null,key:`w:${w.id}`,added:{id:w.id,by:w.by||null}});
const legKeys=step=>(routeFor(step)||[]).map((l,k)=>l.key||`r${k}`);
// Moves the legs already ticked onto their new places after a waypoint is added or removed.
// A removed waypoint takes its tick with it; a stop that was done stays done.
export function rekeyLegs(before,after){
 if(!before.legsDone)return;
 const from=legKeys(before),to=legKeys(after),ticked={};
 for(const [k,at] of Object.entries(before.legsDone)){const i=to.indexOf(from[k]);if(i>=0)ticked[i]=at;}
 after.legsDone=ticked;
}
// A stop reached by more than one leg (a walk, a train, a change, another train) is ticked off
// leg by leg as each is done, and the stop ticks itself off with the last one. A single-leg
// route is just the stop, so it has no legs of its own to tick.
export const legCount=step=>{const legs=routeFor(step);return legs&&legs.length>1?legs.length:0;};
export const legDone=(step,k)=>step?.status==='done'||!!step?.legsDone?.[k];
export const legsTicked=step=>step?.status==='done'?legCount(step):Object.keys(step?.legsDone||{}).length;
// The card shows a route of several legs one leg at a time, and opens on the one the family is
// up to: the first leg not yet ticked, or the last when every leg is behind them. Each leg's
// standing on the strip along the top is done, now (the first still to do) or to come.
export const legToDo=(step,count)=>{for(let k=0;k<count;k++)if(!legDone(step,k))return k;return Math.max(0,count-1);};
export function legStrip(legs,step,showing){
 const now=legToDo(step,legs.length);
 return legs.map((leg,k)=>{
  const done=legDone(step,k),line=leg.mode==='ride'?LINES[leg.line]:null;
  return {k,mode:leg.mode,label:line?line.name:leg.mode==='stop'?'Stop on the way':'Walk',colour:line?.colour||null,done,showing:k===showing,status:done?'done':k===now?'now':'to come'};
 });
}
// Applies one leg's tick to the stop, in place, and says what that did to the stop as a whole:
// 'done' when it was the last leg, 'undone' when it took a finished stop back off the list, else
// null. Unticking one leg of a finished stop leaves the others ticked: only that leg is undone.
export function tickLeg(step,leg,done,at){
 const total=legCount(step),ticked={...(step.legsDone||{})};
 if(step.status==='done')for(let k=0;k<total;k++)ticked[k]=ticked[k]||step.completedAt||at;
 if(done)ticked[leg]=ticked[leg]||at;else delete ticked[leg];
 step.legsDone=ticked;
 const count=Object.keys(ticked).length;
 if(count>=total){if(step.status==='done')return null;step.status='done';step.completedAt=at;return 'done';}
 if(step.status==='done'){delete step.completedAt;step.status=count?'started':'todo';if(!count)delete step.startedAt;return 'undone';}
 if(done&&step.status!=='started'){step.status='started';step.startedAt=step.startedAt||at;}
 return null;
}
// What each ride costs, and the total when the route crosses companies: each company is its own
// ticket, and an IC card pays each part as it taps out and in again at the change.
const fareOf=l=>l.yen||l.options?.[0]?.yen;
export function routeFares(legs){
 const rides=legs.filter(l=>l.mode==='ride'&&fareOf(l)).map(l=>({operator:LINES[l.line].operator,yen:fareOf(l)}));
 if(rides.length<2)return null;
 return {rides,adult:rides.reduce((t,r)=>t+r.yen[0],0),child:rides.reduce((t,r)=>t+r.yen[1],0)};
}
// The line symbols a ride passes, as the platform signs show them: the letter of its station
// codes in the line's colour. A ride across two lines (Kintetsu Kyoto into Nara) shows both.
export const lineSymbols=stops=>[...new Set(stops.map(s=>s.code?.replace(/^JR-/,'').replace(/\d+$/,'')).filter(Boolean))];
// How each operator draws its line symbol, from the operators' own descriptions where they could be
// found. Tokyo Metro and Toei: a white circle inside a thick ring of the line colour, dark letters
// (Tokyo Metro, confirmed). JR East: a rounded square framed in the line colour, the code in white on
// a black tab (JR East press release, confirmed). Osaka Metro since 2018: the whole frame coloured, the
// letter white or black by how dark the colour is (confirmed; the rounded-square shape is not). Odakyu:
// a shape between a square and a circle (confirmed; the blue frame on white is not). JR West: a square
// filled with the line colour and a white letter; Kyoto subway and Kintetsu: filled (none confirmed).
const SYMBOL_STYLE={'Tokyo Metro':'ring circle',Toei:'ring circle','JR East':'jre','Osaka Metro':'fill square','Odakyu':'ring squircle','JR West':'fill square','Kyoto Municipal Subway':'fill circle',Kintetsu:'fill square'};
export const symbolStyle=line=>SYMBOL_STYLE[line.operator]||'fill square';
// A symbol's own colour where one ride crosses two lines: Kintetsu's Kyoto Line is orange, its Nara Line red.
export const symbolColour=(line,code)=>line.symbolColours?.[code]||line.colour;
// Dark text on a light line colour (the yellow Chuo-Sobu), white on the rest.
export const inkOn=hex=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return r*.299+g*.587+b*.114>170?'#1f1f1f':'#fff';};
export const yen=n=>`¥${n.toLocaleString('en')}`;
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
 const left=last-i,still=d[i]<250;
 // The next stop: the one after this station when standing at it, otherwise whichever side of the
 // nearest station the phone is on (closer to the one after means it is already past).
 const next=still||i===0?Math.min(i+1,last):i===last?last:d[i+1]<d[i-1]?i+1:i;
 return {on:true,index:i,nearest:stops[i],metres:d[i],left,ready:left<=1,arrived:left===0&&d[i]<400,at:still,next,upcoming:stops[next],togo:last-next+1};
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
