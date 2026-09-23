import sharp from 'sharp';
/** Decode the image, correct orientation, strip metadata (including GPS), bound size. */
export async function normalizePhoto(content: Buffer) {
  return sharp(content,{limitInputPixels:60_000_000,failOn:'error'})
    .rotate().resize({width:1920,height:1920,fit:'inside',withoutEnlargement:true})
    .flatten({background:'#fff'}).jpeg({quality:80,mozjpeg:true}).toBuffer();
}
