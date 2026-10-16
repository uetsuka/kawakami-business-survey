import './github-pages/build.mjs';
import fs from 'node:fs/promises';
const file=new URL('./github-pages/dist/index.html',import.meta.url);
let html=await fs.readFile(file,'utf8');
html=html.replaceAll('https://kawakami-business-survey.chiekouetsuka.chatgpt.site/api/','/api/');
await fs.writeFile(file,html);
