// Coming home through Australian customs and biosecurity. The rules are the Australian Border
// Force's and the Department of Agriculture's, as they stood when this was written — the
// figures are worth a glance at the two official pages before landing, which is why both are
// linked rather than the numbers being treated as the last word.
export const BORDER_LINKS=[
 ['What you can bring in — Australian Border Force','https://www.abf.gov.au/entering-and-leaving-australia/can-you-bring-it-in'],
 ['Travelling to Australia — biosecurity','https://www.agriculture.gov.au/biosecurity-trade/travelling']
];
// Duty-free allowances, per person. Everything bought overseas counts, gifts and airport
// duty-free included, and goods bought tax-free in Japan are still bought overseas.
export const DUTY_FREE=[
 {id:'goods',title:'General goods',text:'A$900 each for Damien and Lauren, A$450 each for the boys. Souvenirs, gifts, clothes, electronics and anything from the airport duty-free shop all count. A family travelling together can add their allowances together.'},
 {id:'alcohol',title:'Alcohol',text:'2.25 litres per adult, and none for the boys. A 720 ml bottle of sake and a 700 ml whisky together are already 1.42 litres.'},
 {id:'over',title:'Over the allowance',text:'Declare it. Duty and GST are charged on the whole item, not just the part over the limit.'},
 {id:'cash',title:'Cash',text:'A$10,000 or more in any currency, yen included, has to be declared.'}
];
// What to tick "yes" to on the Incoming Passenger Card, with the things from this trip that
// fall under each. Declaring costs nothing; most things are looked at and handed back.
export const DECLARE=[
 {id:'food',title:'Any food at all',text:'Snacks, sweets, KitKats, tea and matcha, rice crackers, instant noodles. Sachets with meat, egg or dairy, such as pork-flavoured ramen soup, can be taken off you.'},
 {id:'plants',title:'Plants and seeds',text:'Seeds, nuts, rice, dried mushrooms, flowers, and anything filled with beans or grain.'},
 {id:'animal',title:'Animal products',text:'Bonito flakes, dried fish, feathers, shells, bone, leather and wool crafts.'},
 {id:'wood',title:'Wood, bamboo and straw',text:'Kokeshi dolls, chopsticks, bamboo and straw crafts, wooden toys and prayer plaques.'},
 {id:'soil',title:'Dirty shoes and gear',text:'Mud on shoes from Nara park, the Fushimi Inari trail or anywhere else. Clean them before packing.'}
];
export const DECLARE_RULE='If in doubt, declare it. Declaring costs nothing and most things are handed back after a look. Not declaring can mean an on-the-spot fine.';
// The last two days of the trip, when the cases are packed for home.
export function goingHomeSoon(state,day){
 const days=state?.days||[];
 if(days.length<2)return false;
 return days.slice(-2).some(d=>d.date===day);
}
