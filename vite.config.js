import {defineConfig} from 'vite';
import handler from './server/handler.mjs';
export default defineConfig({plugins:[{name:'local-family-preview',configureServer(server){process.env.LOCAL_DEMO='1';server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/api/'))handler(req,res);else next();});}}],build:{target:'es2022'}});
