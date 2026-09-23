import {afterEach,expect,it,vi} from 'vitest';
import {compressPhoto} from './compress-photo';
afterEach(()=>vi.restoreAllMocks());
function mockBrowser(){
 vi.stubGlobal('Image',class{naturalWidth=4000;naturalHeight=3000;src='';decode=async()=>{};});
 URL.createObjectURL=vi.fn(()=> 'blob:photo');URL.revokeObjectURL=vi.fn();
 const drawImage=vi.fn(),canvas=document.createElement('canvas');
 vi.spyOn(document,'createElement').mockReturnValue(canvas);
 vi.spyOn(canvas,'getContext').mockReturnValue({fillRect:vi.fn(),drawImage} as never);
 vi.spyOn(canvas,'toBlob').mockImplementation(callback=>callback(new Blob(['jpeg'],{type:'image/jpeg'})));
 return {canvas,drawImage};
}
it('resizes before upload and exports JPEG without uploading the original',async()=>{
 const {canvas,drawImage}=mockBrowser();
 const photo=await compressPhoto(new File(['original'],'tablet.png',{type:'image/png'}));
 expect(photo.type).toBe('image/jpeg');expect(photo.name).toBe('tablet.jpg');
 expect(canvas.width).toBe(1920);expect(canvas.height).toBe(1440);expect(drawImage).toHaveBeenCalled();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});
it('rejects unsupported and empty files',async()=>{
 await expect(compressPhoto(new File(['svg'],'x.svg',{type:'image/svg+xml'}))).rejects.toThrow('fotografía');
 await expect(compressPhoto(new File([],'empty.jpg',{type:'image/jpeg'}))).rejects.toThrow('30 MB');
});
it('fails visibly when the tablet cannot decode HEIC and releases the temporary URL',async()=>{
 mockBrowser();vi.stubGlobal('Image',class{src='';decode=async()=>{throw new Error('HEIC');};});
 await expect(compressPhoto(new File(['heic'],'tablet.heic',{type:'image/heic'}))).rejects.toThrow('Más compatible');
 expect(URL.revokeObjectURL).toHaveBeenCalled();
});
