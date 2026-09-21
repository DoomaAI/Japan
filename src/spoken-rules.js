// What the phone says when Nate presses the speaker. He is five and cannot read the page, so
// none of this is the page read back at him: the writing on screen is for whoever can read it,
// and this is the same thing said out loud to a five-year-old.
//
// Which means short sentences, ordinary words, and what to do rather than what it is. No
// brackets, no dashes, no Japanese script — a phone reading 福笑い in an Australian voice says
// nothing useful, so anything Japanese is spelt the way it sounds. Every page has one and every
// game has one, and a test keeps it that way, because the one Nate presses is always the one
// nobody remembered to write.
export const GAME_RULES={
 match:'Match the letters. Tap a Japanese letter, and then tap the sound it makes. If they go together they stay turned over. If they do not, they flip back, so try to remember where they were. Find all of them.',
 decode:'Read the sign. A Japanese word comes up, and you sound it out. Then tap which English word you think it is. Get it right and your run goes up by one. Get it wrong and you start your run again.',
 karuta:'Karuta. All the cards are face up. The reader says one of them out loud, and you find that card and tap it as fast as you can. If you tap the wrong one it costs you points, so look before you tap. Take all the cards to finish.',
 shogi:'Animal shogi. You are the animals at the bottom. Tap one of your animals, and green dots show you where it can go. Tap a dot to move there. If you land on one of his animals you take it, and then it is yours, and you can put it back on the board anywhere empty. You win if you take his lion, or if you walk your lion all the way to the top row and nothing can take it there.',
 fukuwarai:'Fukuwarai. Have a good look at the face first. Then press blindfold on, and the face disappears. Somebody hands you an eyebrow, an eye, a nose and a mouth, one at a time, and you tap where you think each one goes. You cannot see them and you cannot go back. When all six are on, take the blindfold off and see what you made. It is meant to be funny.',
 daruma:'Daruma says he fell over. He is facing the wall, and he is counting. While he counts, hold the big green button down and you creep towards him. But when he turns round, let go. If you are still holding it when he turns, he sees you, and you go back to the start. You have three goes. Get all the way to him and you win.',
 shiritori:'Shiritori. This is a word chain. Look at the last letter of the word that was just said, and pick a word that starts with that same letter. The letter you need is shown in big writing. But be careful. If you pick a word that ends in the letter n, you lose straight away, because no Japanese word starts with it. He gives up when he runs out of words, and then you have won.',
 kingyo:'Goldfish scooping. You have a paper scoop and a bowl. Put your finger on the tank and hold it there, and the scoop goes under the water. Slide it along until it is underneath a fish, then lift your finger up and you have got it. Go slowly, because the paper tears if you drag it about, and never wait for two fish at once. The paper always tears in the end. That is how the game works.',
 picross:'Picross. The numbers on the side and along the top tell you how many squares in that line get filled in, and in what order. Three then one means three squares together, then a gap, then one more. Work out which squares they are and tap them. If you know a square is empty, cross it off so you do not fill it by mistake. When you get them all right, a picture appears, and that is when you find out what you were drawing.',
 gomoku:'Five in a row. You are the dark stones and you go first. Tap anywhere on the board to put a stone down. You win if you get five of your stones in a line, going across, or going down, or going corner to corner. He is trying to do the same thing, so watch what he is building as well as what you are building. If he gets four in a row, block the end of it.',
 kendama: 'Kendama. It is a ball on a string and a wooden handle with cups on it. Swipe your finger up the picture to pull the ball into the air. How far you swipe is how hard you pull, so a little swipe is a little throw. Then watch the ball come back down, and tap the big catch button at exactly the right moment. If you catch it, you have done the trick, and you move on to a harder one with a new Japanese name.',
 beigoma: 'Spinning tops. Two little iron tops go into a ring and battle until one of them stops or gets knocked out. First pick which top is yours. The heavy one spins for ages but cannot push anybody. The light one is quick and will knock somebody out, but it gets tired fast. Then flick your finger across the ring to throw yours in. Which way you flick is where it comes in from, and a long flick is a hard throw. After that you just watch, because that is all you can do once you have let go.',
 merge:'Onigiri to Fuji. Swipe the squares up, down, left or right. When two of the same thing bump into each other they turn into the next thing up, starting at a rice ball and going all the way to Mount Fuji. Keep going until there is no room left.',
 remember:'What we did. The cards are things we actually did on this trip. Turn one over, then turn over the day we did it. If they go together they stay. It gets bigger the more of the trip we do.',
 sights:'Japan pairs. Every card has a twin. Turn two over. If they are the same they stay turned over, and if they are not, they flip back. Try to remember where things were, and find all the pairs.',
 kitchen:'Make it. You start with eight things. Drag one on top of another, or tap one and then another, and see if they make something new. Rice and water make cooked rice. Keep trying pairs until you have found all of them.',
 snake:'Sushi snake. Swipe to steer, or use the arrows. Eat the sushi and you get longer, and a little bit faster every time. Do not run into the wall, and do not run into yourself.',
 stable:'Sumo stable. Drag one wrestler on top of another one of exactly the same size, and they turn into a bigger one. Build one big enough, then press fight to send him out. Winning gets you points. Losing makes your best wrestler smaller.',
 sumo:'Sumo. First there are three things to do before the fight. Stamp your feet on the beat. Throw the salt so it lands on the band. Then crouch, wait, and charge the moment he shouts, but not before. Then the fight. Pushing uses up your legs, so do not just tap and tap. When he leans in, press brace. And when he leaves himself open, look at what he is doing and pick the right move for it.',
 origami:'Origami. Get a square piece of paper. The picture shows you one fold at a time, with a dotted line where the fold goes and an arrow showing which way the paper moves. Do that fold, then press next. Take your time.',
 draw:'Draw it. Pick something to draw. The phone shows you one line at a time, and the line draws itself so you can see which way it goes. Copy that line, then press next. You can draw on real paper and take a photo of it when you are done, or draw on the phone underneath the steps.',
 spot:'Spot the difference. There are two pictures of the same photo, and one of them has been changed in a few places. When you see something different, tap it, in either picture. Tapping a thing you already found does not cost you anything, so do not worry.',
 janken:'Janken. This is rock, paper, scissors, and you need somebody else holding their phone. Pick who you are playing, then tap rock, paper or scissors. Nobody sees your hand until you have both picked. Rock beats scissors, scissors beats paper, and paper beats rock.'
};
// The pages, in the words of somebody telling a five-year-old what this screen is for. Some of
// these are a parent's page and he will never open them, but he should still be told plainly
// what he has landed on rather than be read a heading he cannot read.
export const PAGE_RULES={
 today:'Today. This is what we are doing right now, and what is next. Swipe sideways to see the rest of the day. When we have finished something, press done.',
 days:'Days. Every day of the whole trip, in order. Tap a day to see everything we are doing on it.',
 tickets:'Tickets. All our booking tickets and codes are kept here, so we can show somebody at a gate even if there is no internet.',
 inbox:'Forwarded email. Booking emails that have been sent in to the app, waiting for Mum or Dad to file them where they belong.',
 food:'Food. All the Japanese food we want to try, with how to say it. When you have eaten something, tick it, and give it stars for how much you liked it.',
 money:'Yen. Type in a Japanese price and this tells you what it is in our money, so you know if something is a lot or not.',
 challenges:'Missions. These are your jobs for today. Each one has a picture, and a read to me button if you want to hear it. When you have done one, tick it off.',
 games:'Games. All the games are in here. Press the name of the one you want at the top. Some of them are real Japanese games and they have a little dot next to them.',
 photos:'Photos. All the photos everyone has taken. You can add yours, and at the end of the day everybody votes for the best one.',
 facts:'Fun facts. A new fact every day about somewhere we are going or something we are about to see. Press the speaker to hear it. All the ones you have already had are kept in here too.',
 diary:'Diary. Everything we have already done, with the photos and the notes from those days. This is the trip so far.',
 places:'Places and our map. Every place we are going, and a button that opens the map and takes you there.',
 meeting:'Meeting card. If you ever get lost, show this to a grown up who works there. It has our hotel and Mum and Dad on it, in Japanese.',
 phrases:'Phrases. Japanese to say out loud. Each one shows you how to say it, and there is a button to hear it. Try one on somebody today.',
 help:'Help and useful apps. Other apps and phone numbers for when something goes wrong. This one is for Mum and Dad.',
 options:'Options and ideas. Places we might go if we have time, saved for later.',
 planning:'Planning board. Everybody puts up ideas for things to do, and then we all vote on them. You can add one too.',
 todo:'To do list. Jobs and things to buy, put on the day we are going to do them.',
 spending:'Spending money. How much money you have left, what you have spent it on, and how much is still there. You can ask for something, and Mum or Dad says yes or no.',
 weather:'Weather. What the weather is doing, so we know whether to take an umbrella or a jumper.',
 parks:'Theme park rides. A list of every ride, and whether you are tall enough for it. Tick the ones you have been on.',
 shopping:'Shopping list. Presents and souvenirs we want to buy. Tick something when we have got it.',
 guide:'Original travel guide. The whole guide book, all seventy two pages, that we made before the trip.',
 updates:'Family updates. Anything that has changed about the plan, and who has seen it.',
 search:'Search everything. Type anything at all and it looks through the whole app for it.',
 mascot:'Our characters. Make your own Japanese character. Pick what it is, then its colours, its eyes, its mouth and what it holds, and give it a name.',
 thanks:'Notes for Lauren. This one is Dad writing notes for Mum, so there is nothing in here for you.'
};
export const gameRule=id=>GAME_RULES[id]||'';
export const pageRule=id=>PAGE_RULES[id]||'';
