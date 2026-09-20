// Deployment operator only. Uses the configured Neon connection; no public bootstrap endpoint.
import {mkdir,writeFile} from 'node:fs/promises';
import {database,hash,token} from '../server/store.mjs';
const origin=process.env.APP_ORIGIN;
if(!origin||!origin.startsWith('https://'))throw new Error('Set the production HTTPS APP_ORIGIN first.');
const db=await database(),raw=token();
const [owner]=await db`INSERT INTO japan_grants(id,token_hash,name,role) VALUES ('owner',${hash(raw)},'Damien','parent') ON CONFLICT(id) DO NOTHING RETURNING id`;
if(!owner)throw new Error('An owner link already exists. This command does not replace existing access.');
await mkdir(new URL('../.private/',import.meta.url),{recursive:true,mode:0o700});
await writeFile(new URL('../.private/owner-link.txt',import.meta.url),`${origin}/#join=${raw}\n`,{mode:0o600});
console.log('Private parent link saved to .private/owner-link.txt. Deliver it privately; do not commit it.');
