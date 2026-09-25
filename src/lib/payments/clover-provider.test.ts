// @vitest-environment node
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {cloverConfig,cloverRequest,isCapturedCharge,cloverConfigurationIssues} from './clover-provider';
beforeEach(()=>{vi.stubEnv('CLOVER_ENABLED','true');vi.stubEnv('CLOVER_ENVIRONMENT','sandbox');vi.stubEnv('CLOVER_PUBLIC_KEY','public-test');vi.stubEnv('CLOVER_PRIVATE_KEY','private-test');vi.stubEnv('CLOVER_MERCHANT_ID','merchant-test');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it('reports specific missing settings without exposing credential values',()=>{
 vi.stubEnv('CLOVER_ENABLED','false');vi.stubEnv('CLOVER_MERCHANT_ID','');
 const issues=cloverConfigurationIssues().join(' ');expect(issues).toContain('CLOVER_ENABLED=true');expect(issues).toContain('CLOVER_MERCHANT_ID');expect(issues).not.toContain('private-test');expect(issues).not.toContain('public-test');
 vi.stubEnv('CLOVER_ENABLED','true');vi.stubEnv('CLOVER_MERCHANT_ID','merchant-test');expect(cloverConfigurationIssues()).toEqual([]);
});
it('fails closed without configuration and requires HTTPS and trusted proxy in production',()=>{
 vi.stubEnv('CLOVER_ENABLED','false');expect(()=>cloverConfig()).toThrow();vi.stubEnv('CLOVER_ENABLED','true');vi.stubEnv('CLOVER_ENVIRONMENT','production');vi.stubEnv('NEXT_PUBLIC_SITE_URL','http://localhost:3100');expect(()=>cloverConfig()).toThrow();vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://example.invalid');vi.stubEnv('TRUST_PROXY','false');expect(()=>cloverConfig()).toThrow();vi.stubEnv('TRUST_PROXY','true');expect(cloverConfig().apiUrl).toBe('https://scl.clover.com');
});
it('sends integer cents with a stable idempotency key, immediate capture, and correct environment',async()=>{
 const fetch=vi.fn(async()=>new Response(JSON.stringify({id:'charge-1'}),{status:200}));vi.stubGlobal('fetch',fetch);
 await cloverRequest('',{id:'attempt-id',amount:11856,source:'clv_testtoken',ip:'127.0.0.1',ecomind:'moto'});
 const [url,request]=fetch.mock.calls[0] as unknown as [string,RequestInit];expect(url).toBe('https://scl-sandbox.dev.clover.com/v1/charges');expect(request.headers).toMatchObject({'Idempotency-Key':'attempt-id','x-forwarded-for':'127.0.0.1'});expect(JSON.parse(request.body as string)).toMatchObject({amount:11856,currency:'usd',capture:true,partial_redemption:false,source:'clv_testtoken',ecomind:'moto'});
});
it('only recognizes a fully captured exact USD payment',()=>{
 const charge={id:'charge1',amount:11856,currency:'usd',status:'succeeded',paid:true,captured:true};expect(isCapturedCharge(charge,11856)).toBe(true);
 for(const update of [{captured:false},{paid:false},{amount:1},{currency:'mxn'},{status:'pending'},{amount_refunded:1}])expect(isCapturedCharge({...charge,...update},11856)).toBe(false);
});
