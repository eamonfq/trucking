// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import {GET as invoicePdf} from '@/app/api/facturas/[id]/pdf/route';
import {GET as receptionPdf} from '@/app/api/recepciones/[id]/recibo/route';
const mocks=vi.hoisted(()=>({session:vi.fn(),invoices:vi.fn(),boxes:vi.fn(),thermal:vi.fn(()=>null)}));
vi.mock('@/lib/auth/actions',()=>({getSession:mocks.session}));
vi.mock('@/lib/services/logistics',()=>({logisticsService:{getInvoices:mocks.invoices,getBoxes:mocks.boxes}}));
vi.mock('@/lib/pdf/thermal-document',()=>({ThermalDocument:mocks.thermal}));
vi.mock('@/lib/pdf/invoice-document',()=>({InvoiceDocument:vi.fn(()=>null)}));
vi.mock('@react-pdf/renderer',()=>({renderToBuffer:vi.fn(async()=>Buffer.from('%PDF-test'))}));
beforeEach(()=>vi.clearAllMocks());
it('denies financial vouchers to warehouse operators and anonymous users',async()=>{
 for(const session of [null,{role:'operador'}]){
  mocks.session.mockResolvedValue(session);
  for(const route of [invoicePdf,receptionPdf])expect((await route(new Request('http://localhost/'),{params:Promise.resolve({id:'x'})})).status).toBe(401);
 }
 expect(mocks.invoices).not.toHaveBeenCalled();
});
it('serves an inline 80 mm invoice and rejects invoices outside the scoped data',async()=>{
 mocks.session.mockResolvedValue({role:'cliente',userId:'u'});mocks.invoices.mockResolvedValue([{id:'i',number:'AL-1'}]);
 const response=await invoicePdf(new Request('http://localhost/?formato=termico'),{params:Promise.resolve({id:'i'})});
 expect(response.headers.get('Content-Disposition')).toContain('inline');expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(mocks.thermal).toHaveBeenCalled();
 expect((await invoicePdf(new Request('http://localhost/'),{params:Promise.resolve({id:'foreign'})})).status).toBe(404);
});
it('prints all pieces of one reception without unrelated invoices or customers',async()=>{
 mocks.session.mockResolvedValue({role:'admin'});
 const boxes=[{id:'b1',userId:'u',code:'BX-1-01',receivedAt:'2026-09-17',receptionGroup:{id:'g',code:'BX-1',index:1}},{id:'b2',userId:'u',receivedAt:'2026-09-17',receptionGroup:{id:'g',index:2}},{id:'other',userId:'x',receptionGroup:{id:'g'}}];mocks.boxes.mockResolvedValue(boxes);
 mocks.invoices.mockResolvedValue([{id:'i',userId:'u',boxIds:['b1','b2']},{id:'mixed',userId:'u',boxIds:['b1','another']}]);
 const response=await receptionPdf(new Request('http://localhost/'),{params:Promise.resolve({id:'b1'})});expect(response.status).toBe(200);
 expect(mocks.thermal).toHaveBeenCalledWith(expect.objectContaining({reference:'BX-1',receipt:true,boxes:boxes.slice(0,2),invoices:[{id:'i',userId:'u',boxIds:['b1','b2']}]}));
});
