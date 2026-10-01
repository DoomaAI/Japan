// A small seeded random number generator (xorshift32), so a game dealt from a seed deals the same
// way on every phone and in the tests. Returns a function giving numbers in [0, 1).
export const rng=seed=>{let n=seed>>>0||1;return()=>{n^=n<<13;n>>>=0;n^=n>>17;n^=n<<5;n>>>=0;return n/4294967296;};};
