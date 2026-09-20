export {default} from '../server/handler.mjs';
// Reading a menu photo is the slowest call the app makes.
export const config = { maxDuration: 60 };
