import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
// Preserve the existing brand; generous safe area also supports masked icons.
await mkdir('public/pwa',{recursive:true});
for(const [name,size] of [['icon-192',192],['icon-512',512],['icon-maskable',512],['apple-touch-icon',180]]){
 const logo=await sharp('public/brand/logoayl.png').trim().resize(Math.round(size*.68),Math.round(size*.68),{fit:'inside'}).png().toBuffer();
 await sharp({create:{width:size,height:size,channels:4,background:'#ffffff'}}).composite([{input:logo,gravity:'centre'}]).png().toFile(`public/pwa/${name}.png`);
}
