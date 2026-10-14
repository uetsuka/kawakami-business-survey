import {build} from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const origin='https://kawakami-business-survey.chiekouetsuka.chatgpt.site';
await build({configFile:false,root,base:'./',publicDir:false,resolve:{alias:{'@':path.resolve(root,'..')}},plugins:[{name:'pages-endpoints',enforce:'pre',transform(code,id){if(id.includes('/app/')&&id.endsWith('.tsx'))return code.replaceAll("'/assets/'",JSON.stringify(origin+'/assets/')).replaceAll("'/api/responses'",JSON.stringify(origin+'/api/responses'));if(id.endsWith('/globals.css'))return code.replaceAll("url('/assets/",`url('${origin}/assets/`);}},react()],build:{outDir:path.join(root,'dist'),emptyOutDir:true,cssCodeSplit:false,minify:false,assetsInlineLimit:0}});
let html=await fs.readFile(path.join(root,'dist/index.html'),'utf8');
for(const match of [...html.matchAll(/<script type="module"[^>]*src="([^\"]+)"[^>]*><\/script>/g)]){const js=await fs.readFile(path.join(root,'dist',match[1]),'utf8');html=html.replace(match[0],()=>'<script type="module">'+js.replaceAll('</script','<\\/script')+'</script>');}
for(const match of [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^\"]+)"[^>]*>/g)]){if(match[1].startsWith('http'))continue;const css=await fs.readFile(path.join(root,'dist',match[1]),'utf8');html=html.replace(match[0],()=>'<style>'+css+'</style>');}
await fs.writeFile(path.join(root,'dist/index.html'),html);
console.log('GitHub Pages index ready:',Buffer.byteLength(html),'bytes');
