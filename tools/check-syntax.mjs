import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function walk(dir){const files=[];for(const item of await readdir(dir,{withFileTypes:true})){if(['.git','node_modules','public'].includes(item.name))continue;const p=path.join(dir,item.name);if(item.isDirectory())files.push(...await walk(p));else if(/\.(mjs|js)$/.test(p))files.push(p);}return files;}
const files=await walk(root);
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(result.status!==0){console.error(result.stderr);process.exit(1);}}
console.log(`SYNTAX PASS — ${files.length} JavaScript source/config/test files.`);
