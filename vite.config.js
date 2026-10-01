import {defineConfig} from 'vite';
import handler from './server/handler.mjs';
import {themeCss} from './scripts/dark-theme.mjs';
import {cornersCss} from './scripts/corners.mjs';
export default defineConfig({plugins:[{name:'dark-theme',enforce:'pre',transform(code,id){if(/\/src\/[^/]+\.css$/.test(id.split('?')[0]))return {code:themeCss(cornersCss(code)),map:null};}},{name:'local-family-preview',configureServer(server){process.env.LOCAL_DEMO='1';server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/api/'))handler(req,res);else next();});}}],define:{__BUILD__:JSON.stringify(`${new Date().toISOString().slice(0,16).replace('T',' ')} UTC${process.env.VERCEL_GIT_COMMIT_SHA?' · '+process.env.VERCEL_GIT_COMMIT_SHA.slice(0,7):''}`)},build:{target:'es2022'}});
