import {createContext} from 'react';
// The slot at the end of a Home card's heading bar. A card that pages through several (the phrase,
// fact and tip of the day) puts its count and arrows there, on the heading's own line, rather than
// on a row of their own under it. Null outside Home, where a card draws them itself.
export const HomeBarSlot=createContext(null);
