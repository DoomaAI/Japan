// Writes the trip as it stands into a folder ready to become a Claude Project: paste
// 00-project-instructions.md into the Project's instructions and upload the rest as knowledge.
// Reads the live trip (DATABASE_URL), or the seed with LOCAL_DEMO=1.
import {mkdir,writeFile} from 'node:fs/promises';
import {readTrip} from '../server/store.mjs';
import {projectPack} from '../src/claude-project.js';
const {state}=await readTrip();
const pack=projectPack(state);
const dir=new URL(`../.private/claude-project/${pack.slug}/`,import.meta.url);
await mkdir(dir,{recursive:true});
for(const [name,content] of Object.entries(pack.files))await writeFile(new URL(name,dir),content);
console.log(`${pack.name}: ${Object.keys(pack.files).length} files written to ${dir.pathname}`);
