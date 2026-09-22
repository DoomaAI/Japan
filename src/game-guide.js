// The written rules for every game, in four parts: what you are trying to do, what to set up
// before you start, how it goes, and how it ends. spoken-rules.js is the same thing said out
// loud to a five-year-old in one breath; this is the version you read, and it is the one you
// come back to when somebody says "but can he take it back?" halfway through.
//
// Two rules about the words, and both are tested:
//
// 1. No Japanese script anywhere in here. A boy who cannot read kana is exactly the person
//    reading these, and so is a grandparent who has never seen any. Where a Japanese word is
//    worth knowing — karuta, shiritori, tachiai — it is written the way it sounds and what it
//    means comes straight after it, so nothing on this page is a word you have to already know.
// 2. Short sentences, ordinary words, and what to DO rather than what it is. Everything here
//    is meant to be read aloud to a five-year-old by whoever is holding the phone.
export const GAME_GUIDES={
 match:{
  objective:'Turn over every pair of cards. One card of a pair is a Japanese letter. The other is the sound it makes, written in our letters.',
  setup:[
   'Pick the letters you want at the top. Hiragana is the everyday Japanese writing. Katakana is the one you see on signs and menus.',
   'Pick how many pairs, from four up to ten. Four is the quick one.'
  ],
  rules:[
   'Tap a card to turn it over, then tap another one.',
   'When you turn over a Japanese letter, the phone says it out loud for you.',
   'If the two cards go together, they stay turned over.',
   'If they do not go together, they both flip back. Remember where they were.',
   'Every tap counts, so a card you turn over twice costs you.'
  ],
  win:'You have finished when every pair is turned over. Your score is what is left of a perfect round, so fewer taps is better.'
 },
 decode:{
  objective:'Read a Japanese word out loud, then pick the English word it means.',
  setup:['Nothing to set up. A word is on the screen as soon as you open it.'],
  rules:[
   'The big word is katakana. Japanese writes every word it borrowed from another language this way, so most of them are words you already know.',
   'Sound it out slowly, one letter at a time.',
   'Tap the English word you think it is. There are four to choose from.',
   'Get it right and your run goes up by one. The phone says the word and tells you where you will see it.',
   'Get it wrong and it shows you the right one, and your run goes back to nothing.',
   'Press "Next word" for another one, or to skip a hard one.'
  ],
  win:'This one never ends. You are trying to beat your longest run of right answers in a row.'
 },
 karuta:{
  objective:'Karuta is a card race. All the cards lie face up. Somebody reads one out, and you have to find it and tap it before the clock beats you.',
  setup:[
   'Pick the deck. Hiragana and Katakana are the two kinds of Japanese letter. Proverbs are short Japanese sayings, each one with a picture.',
   'Pick how many cards are on the floor: six, ten or sixteen.',
   'Press "Read the first one". The clock starts then, not before.'
  ],
  rules:[
   'The reader says the card out loud. It is never pointed to, so you have to know it.',
   'On a letter deck, the reader says a sound and you take the letter that makes it.',
   'On the proverb deck, the reader reads the saying and you take the picture that goes with it. The card is found by the letter the saying starts with.',
   'If you did not catch it, press the button to hear it again.',
   'Tap the wrong card and it costs you points, so look before you tap.'
  ],
  win:'You finish when every card has been taken. Quick, with no wrong taps, is worth the most.'
 },
 shogi:{
  objective:'A small board game, three squares across and four down, played with animals. Take the other side’s lion, or walk your own lion all the way to the top row.',
  setup:[
   'Pick who you are playing. Chick only looks at the square in front of him. Giraffe thinks a move or two ahead. Lion sees the whole thing coming.',
   'Your animals are the ones at the bottom of the board. His are at the top.'
  ],
  rules:[
   'Tap one of your animals and green dots show every square it is allowed to go to. Tap a dot to move there.',
   'Every animal moves differently. The lion goes one square in any direction. The giraffe goes one square straight but never corner to corner. The elephant goes one square corner to corner but never straight. The chick goes one square forward, and only forward.',
   'If you land on one of his animals you take it, and then it is yours. Instead of moving, you can put an animal you took back on the board on any empty square.',
   'A chick that reaches the far row turns into a hen, which can go almost anywhere.',
   'You take one turn each. Nothing can be taken back.'
  ],
  win:'You win if you take his lion. You also win if you walk your own lion to the top row and nothing can take it there. If he takes your lion first, he has won.'
 },
 fukuwarai:{
  objective:'Build a face while you cannot see it. Fukuwarai means "lucky laugh", and it is played at New Year. The face is supposed to come out wrong. That is the whole game.',
  setup:[
   'Pick a face. Otafuku is the round, cheerful lady whose name means "much good fortune". Hyottoko is the funny one with his mouth pulled round to one side, because he is blowing on a fire.',
   'Look at the face carefully first and remember where everything sits.',
   'Press "Blindfold on". The face disappears, and that is your blindfold.'
  ],
  rules:[
   'You are handed six pieces, one at a time: two eyebrows, two eyes, a nose and a mouth.',
   'Tap where you think each one goes.',
   'You cannot see the face while you do it, and you cannot move a piece once it is down.',
   'Left and right mean the face’s left and right, which is the opposite side of the screen from yours, exactly like a real person standing in front of you.'
  ],
  win:'Nobody really wins. Take the blindfold off and look at what you made. The phone gives points for how close each piece landed, but the funniest face is the one everybody remembers.'
 },
 daruma:{
  objective:'Creep all the way up to the boy facing the wall without ever being seen moving. This is the Japanese game of red light, green light. The chant means "the daruma doll fell over".',
  setup:[
   'Pick how hard he is. Gentle chants slowly and takes his time turning round. Ordinary is a real playground game. Demon is very fast and is meant to be out of reach.',
   'You get three goes. Nothing starts until you press the button.'
  ],
  rules:[
   'He faces the wall and chants. While he is chanting, hold the big green button down and you creep forward.',
   'Let go of the button before he turns round. When the chant stops, he is about to spin.',
   'If you are still holding it when he turns, he has seen you. You go back to the start and lose one of your three goes.',
   'He can chant fast or slow whenever he likes, so listen rather than count.',
   'It takes five or six chants to cross, so one dash will never do it.'
  ],
  win:'You win by reaching him before your three goes run out. If he catches you three times, he has won.'
 },
 shiritori:{
  objective:'A word chain. Your word has to start with the last letter of the word before it. Shiritori means "taking the bottom", because you take the end of their word.',
  setup:[
   'Pick how you want to play. Pictures gives you four words to choose from, every one with a picture, and no traps. Words gives you eight, with no pictures, and there are traps in it.',
   'The first word is already on the board.'
  ],
  rules:[
   'The letter you need is shown in big writing. Pick a word that starts with that letter.',
   'A word can only be used once.',
   'Never pick a word that ends in the sound "n". No Japanese word starts with that sound, so the chain stops dead and you have lost, however long it was.',
   'He takes a turn after you, and his word has to follow yours the same way.',
   'A longer chain is worth more points, and the Words level pays more than Pictures.'
  ],
  win:'You win when he runs out of words. You lose the moment you pick a word ending in "n".'
 },
 kingyo:{
  objective:'Scoop up as many goldfish as you can with a paper scoop before the paper tears. This is a real stall at Japanese summer festivals, and the paper always tears in the end.',
  setup:[
   'Pick your paper. Thick paper forgives a lot. Ordinary paper is what they really hand you. Thin paper tears quickly and is worth the most.',
   'Press "Take a scoop" to start.'
  ],
  rules:[
   'Hold your finger on the tank and the scoop goes under the water.',
   'Slide it along until it is underneath a fish, then lift your finger and the scoop comes up with it.',
   'Go slowly. Dragging the scoop about tears the paper faster than anything else.',
   'Never sit and wait for two fish at once. Take the one you have.',
   'The slow black fish and the fat red one are worth more than the ordinary orange goldfish, which is why everyone goes for them.'
  ],
  win:'There is no winning, only how many. The game ends when the paper tears, and your score is the fish already in your bowl.'
 },
 picross:{
  objective:'Work out which squares in the grid get filled in. When you get them all right, a hidden picture appears.',
  setup:[
   'Pick the size. Five by five is small. Ten by ten takes a while.',
   'Pick which picture to work on. You are not told what it is until you finish it.'
  ],
  rules:[
   'The numbers beside a row, and above a column, say how many squares in that line get filled in and in what order.',
   'So "3 1" means three filled squares together, then at least one gap, then one more on its own.',
   'Tap a square to fill it in.',
   'Switch to "Cross off" and tap a square you are sure is empty, so you do not fill it by mistake later.',
   'Work it out rather than guess. A wrong square is counted as a mistake.'
  ],
  win:'You finish when every square the numbers asked for is filled in, and the picture shows you what you were drawing. Fast, with few mistakes, scores best.'
 },
 gomoku:{
  objective:'Get five of your stones in a straight line before he gets five of his.',
  setup:[
   'Pick the board: eleven by eleven, or thirteen by thirteen.',
   'Pick who you are playing. Child walks past about half your chances. Grown up blocks nearly everything. Master never misses.',
   'You are the dark stones, and dark always goes first.'
  ],
  rules:[
   'Tap any empty spot to put a stone there. A stone stays where it is put.',
   'A line counts if it goes across, or down, or corner to corner.',
   'You take one turn each.',
   'Watch what he is building as well as what you are building.',
   'If he gets four in a row, block the open end of it before you do anything else.'
  ],
  win:'The first one to get five in a row has won.'
 },
 kendama:{
  objective:'Pull the ball into the air and catch it on the cup. A kendama is a wooden handle with three cups and a spike, and a ball on a string. Land one trick and you move on to a harder one.',
  setup:[
   'Pick Tricks, which walks up through them one at a time, or moshikame, which is the same two catches over and over for as long as you can keep going.',
   'The trick you are on is written above the picture, with its Japanese name, what that means, and where the ball has to land.'
  ],
  rules:[
   'Swipe your finger up the picture to pull the ball up. How far you swipe is how hard you pull, so a small swipe is a small throw.',
   'Then watch it come back down.',
   'Tap Catch at the moment it lands on the cup. The pull and the catch both have to be right.',
   'Pull too hard, too softly, or tap too early, and you miss. The phone tells you which it was.',
   'A trick you land is ticked off, and the next one is harder than the last.'
  ],
  win:'In Tricks you finish by landing every one of them. In moshikame there is no finish, only how many you can do in a row.'
 },
 beigoma:{
  objective:'Throw your little iron top into the ring and be the last one still spinning. Children in Japan have played this since the Edo period.',
  setup:[
   'Pick your top. Heavy spins the longest and is very hard to shift, but it cannot knock anybody out. Plain is the one out of the packet. Light is quick and can flip the other one out, if it lasts long enough to.',
   'The ring is a barrel with a cloth stretched over it. The cloth sags in the middle, which is what makes the two tops find each other.'
  ],
  rules:[
   'Flick your finger across the ring to throw your top in.',
   'Which way you flick is where it comes in from, and how far you flick is how hard it was wound.',
   'Then you watch. Once it has left your hand there is nothing else you can do, and that is the game.',
   'The tops slide down the sag in the cloth and bump into each other.',
   'A top that stops spinning is out, and so is a top knocked outside the ring.'
  ],
  win:'You win if his top stops first or goes out of the ring. Beating a better top than yours is worth more.'
 },
 hanafuda:{
  objective:'Hanafuda means flower cards. Collect cards that go together in sets, and stop while you are worth more than he is. The game here is koi koi, the one for two people.',
  setup:[
   'Forty-eight cards: twelve months, four cards for each month, and every card has that month\u2019s flower on it.',
   'Some cards are dealt face up on the table, and you are given a hand of your own.',
   'The month is the only thing that matters for matching. Nothing else on the card does.'
  ],
  rules:[
   'Pick a card from your hand. If a card of the same month is on the table, you take them both.',
   'Then the top card of the deck is turned over and does the same thing.',
   'If there is nothing of that month on the table, the card stays there for later.',
   'Certain sets of cards are worth points, and the phone names the set when you make one.',
   'The moment you score you have a choice. Stop, and the points are yours. Or say koi koi and keep playing, which doubles what the round is worth.',
   'He plays the same way, so saying koi koi once too often can leave you with nothing at all.'
  ],
  win:'Stop while you are ahead and you keep the points. Carry on too long and he stops first and takes the round.'
 },
 merge:{
  objective:'Join two of the same thing together, over and over, until you get all the way up to Mount Fuji. It starts at an onigiri, which is a rice ball.',
  setup:['Nothing to set up. Two tiles are already on the board when you open it.'],
  rules:[
   'Swipe the board up, down, left or right, or press the arrow buttons. Everything on the board slides that way at once.',
   'When two of the same thing slide into each other, they join and become the next thing up.',
   'Every time something moves, a new tile appears somewhere.',
   'If nothing on the board can move that way, that swipe does nothing. Try another direction.',
   'Open "What turns into what" underneath to see the whole ladder.'
  ],
  win:'There is no finish, only a score. The game ends when the board is full and nothing can join. Reaching Mount Fuji is the real win.'
 },
 remember:{
  objective:'Match a thing we did on this trip to the day we did it.',
  setup:[
   'This one builds itself out of our own trip, so a few things have to be ticked off as done before there is a board.',
   'Nothing else to set up.'
  ],
  rules:[
   'All the cards start face down. Turn one over, then turn over another.',
   'One card of a pair is something we did. The other is the day and the city we did it in.',
   'If they go together they stay turned over. If not, they both flip back.',
   'Remember where things were. Every tap counts.'
  ],
  win:'You finish when every pair is turned over. The board gets bigger the further into the trip we get.'
 },
 sights:{
  objective:'Find every matching pair of pictures. Every one is something we will really see in Japan.',
  setup:[
   'The board is a wall of sake barrels, like the ones stacked up outside a shrine. Each one has a picture painted on the back of it.',
   'Pick how many pairs you want: four, six, eight, twelve or eighteen. Four is the quick one.'
  ],
  rules:[
   'Tap a barrel and it spins round to show you the picture on the other side. Then tap another one.',
   'If they are the same thing the two barrels stay turned, and you are shown what it is called in English and in Japanese.',
   'If they are not the same, both barrels spin back the way they came.',
   'Try to remember where things were, because every tap counts.'
  ],
  win:'You finish when all the pairs are found. Fewer taps is a better score.'
 },
 kitchen:{
  objective:'Start with eight simple things and keep putting two together to discover Japanese food you did not have before.',
  setup:['Nothing to set up. The eight things you start with are already on the shelf.'],
  rules:[
   'Drag one thing on top of another, or tap one and then tap another.',
   'If those two make something, it appears and joins your shelf. Rice and water make cooked rice.',
   'If they do not make anything, nothing is lost. Try a different pair.',
   'Anything new can be used to make something else, so keep going with what you just made.',
   'The line underneath says how many there are and how many you still have to find.'
  ],
  win:'You have finished when you have found all of them. There is no way to lose and nothing to rush.'
 },
 snake:{
  objective:'Eat as many pieces of sushi as you can without crashing into anything.',
  setup:['Press Start. The snake begins at the left and is already moving, so be ready.'],
  rules:[
   'Swipe on the board, or press the arrows, to steer. The snake never stops and never slows down on its own.',
   'Eat a piece of sushi and the snake gets one longer and a little bit faster.',
   'Run into the wall and the game is over.',
   'Run into your own tail and the game is over, and the longer you get the easier that is to do.',
   'You cannot turn straight back on yourself.'
  ],
  win:'There is no finish line. Your score is how many pieces you ate, so you are playing against your own best.'
 },
 stable:{
  objective:'Build one big sumo wrestler out of a lot of small ones, then send him out to fight.',
  setup:[
   'Nothing to set up. There are already some wrestlers in your stable.',
   'Press "New recruit" whenever you want another small one.'
  ],
  rules:[
   'Drag one wrestler on top of another of exactly the same rank, and the two become one wrestler of the next rank up.',
   'Two different ranks will not join. They have to match.',
   'When you like the look of your best one, press Fight. The phone tells you his chance of winning before you do.',
   'Win the bout and you get points, and he may be promoted.',
   'Lose and he drops a rank, so a fight you are likely to lose costs you the wrestler you built.',
   'If the stable is full and nothing can join, you cannot recruit any more.'
  ],
  win:'You are playing for points rather than an ending. The ranks are the real sumo ones, and "The ranks" underneath shows them in order, with yokozuna at the top.'
 },
 sumo:{
  objective:'Push the other wrestler out of the ring, or put him on the floor. Before that comes the ceremony, and none of the ceremony is for show: each part of it makes you stronger in the fight.',
  setup:[
   'Pick what you want to do. "One bout" is a single fight for points. "Training" is any piece of it practised on its own, with nothing written down. "The climb" fights up through the ranks. "The tournament" is seven days, one bout a day, and only opens once you have climbed to juryo, where a wrestler starts being paid.',
   'For one bout, pick who you are up against, from Beginner up to Yokozuna, which is the top rank in real sumo.'
  ],
  rules:[
   'First the stamps, called shiko. Tap the button on the drum beat, four times. A beat you miss is counted as missed.',
   'Then the salt. A marker sweeps across the ring and you throw when it is on the light band. Real wrestlers throw salt to clean the ring.',
   'Then the charge, called the tachiai. Hold the crouch button down and wait. The referee calls when he feels like it, and you go the moment he calls. Going before the call is a false start, which is called a matta.',
   'Then the fight. Pushing uses up your legs, so do not just tap and tap. Let them come back.',
   'When he drives in on you, press Brace.',
   'When he leaves himself open, read what he is doing and pick the move that answers it. The list of moves and their tells is on the first screen.'
  ],
  win:'You win the bout by putting him out of the ring or on the ground. A faster opponent is worth more points, and a tidy ceremony adds up to half as much again on top.'
 },
 origami:{
  objective:'Fold a square of paper into something real, one fold at a time. Origami just means paper folding.',
  setup:[
   'Get a square of paper. Any square will do. A serviette works, and a sheet of newspaper makes a helmet that fits a boy. The hat is the one that wants a rectangle.',
   'Pick what you want to fold. It shows you the finished thing first, so you know where you are going.',
   'No scissors and no glue are needed for any of them.'
  ],
  rules:[
   'You are shown one fold at a time. The dotted line is where the fold goes, and the arrow shows which way the paper moves.',
   'Do that fold on your real paper, then press Next, or swipe the picture along.',
   'Press Back to see the fold before, as many times as you like.',
   'Press each fold flat with your thumb before you go on. It is easier to be neat early than to fix it later.'
  ],
  win:'You have finished when the last fold is done and you are holding the thing. Press the button to say you made it.'
 },
 draw:{
  objective:'Learn to draw something by copying one line at a time.',
  setup:[
   'Pick something to draw from the list.',
   'Decide where you are drawing: on real paper, or on the phone underneath the steps.',
   'If you are drawing on the phone, pick a pen colour and how thick you want it.'
  ],
  rules:[
   'The phone shows you one line at a time, and draws it for you so you can see which way it goes.',
   'Copy that line, then press Next for the next one.',
   'Press Back if you want to watch a line again.',
   'There is no wrong way for it to come out. It is your drawing.'
  ],
  win:'You have finished when the last line is copied. If you drew it on paper you can take a photo of it, and either way you can send it to the family, which is the one part that needs signal.'
 },
 spot:{
  objective:'Two pictures of the same photo are side by side, and one of them has been quietly changed in a few places. Find every change.',
  setup:[
   'Pick which of our own photos you want to play on.',
   'Pick how hard it is. That decides how many changes are hidden.',
   'This one needs signal once, to fetch the photo. After that the puzzle is made on the phone.'
  ],
  rules:[
   'When you see something different, tap it. You can tap it in either picture.',
   'A change you find is circled in both pictures, so you can see what it was.',
   'Tapping something you already found does not cost you anything.',
   'A wrong tap does cost you, so look properly first.',
   'Stuck? Hint shows you roughly where one is, and takes some points off.',
   '"Show me" reveals all of them, and then the round is not scored at all, which is the point of it.'
  ],
  win:'You finish when every change is found. Quick, with few wrong taps and no hints, scores best. The same photo makes the same puzzle on everybody’s phone, so a race between two of you is fair.'
 },
 janken:{
  objective:'Beat the other person’s hand at rock, paper, scissors. Japan calls it janken and settles nearly everything with it.',
  setup:[
   'Both phones have to be online for this one. Nothing else in Games needs signal.',
   'Pick who you are playing from the list.',
   'Say it out loud as you throw, the way it is said in Japan: "saisho wa guu, jan ken pon".'
  ],
  rules:[
   'Tap rock, paper or scissors.',
   'Nobody sees either hand until you have both picked, so there is no peeking.',
   'Rock beats scissors. Scissors beats paper. Paper beats rock.',
   'If you both pick the same thing it is a draw, and you throw again. In Japan you say "aiko desho" and go straight into the next one.',
   'The score for everybody playing is kept underneath.'
  ],
  win:'You win a round by beating their hand. There is no end to it, the score just keeps going.'
 }
};
export const gameGuide=id=>GAME_GUIDES[id]||null;
