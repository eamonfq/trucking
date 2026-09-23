// @vitest-environment node
import {expect,it} from 'vitest';
import sharp from 'sharp';
import {normalizePhoto} from './normalize-photo';
it('bounds dimensions, converts to JPEG and removes EXIF',async()=>{
 const original=await sharp({create:{width:3000,height:2000,channels:3,background:'red'}}).withMetadata({orientation:6}).jpeg().toBuffer();
 const result=await normalizePhoto(original),metadata=await sharp(result).metadata();
 expect(Math.max(metadata.width!,metadata.height!)).toBe(1920);expect(metadata.format).toBe('jpeg');expect(metadata.exif).toBeUndefined();expect(metadata.orientation).toBeUndefined();
 expect(result.length).toBeLessThan(original.length);
});
it('rejects fake JPEG magic bytes instead of trusting the extension',async()=>{
 await expect(normalizePhoto(Buffer.from([255,216,255,224,255,217]))).rejects.toThrow();
});
