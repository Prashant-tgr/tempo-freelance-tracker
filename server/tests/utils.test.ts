import {describe,it,expect} from 'vitest';
import {elapsedSeconds,weekBoundsUTC,invoiceLineAmount,isInvoiceEligible} from '../src/utils.js';
describe('time and billing rules',()=>{
 it('calculates server elapsed seconds',()=>expect(elapsedSeconds(new Date('2026-01-01T00:00:00Z'),new Date('2026-01-01T00:01:30Z'))).toBe(90));
 it('rejects negative durations',()=>expect(elapsedSeconds(new Date('2026-01-01T01:00:00Z'),new Date('2026-01-01T00:00:00Z'))).toBeLessThan(0));
 it('uses Monday for a Wednesday week start',()=>expect(weekBoundsUTC('2026-10-28').start.toISOString()).toBe('2026-10-26T00:00:00.000Z'));
 it('handles Sunday boundary to next Monday',()=>expect(weekBoundsUTC('2026-11-01').end.toISOString()).toBe('2026-11-02T00:00:00.000Z'));
 it('includes a start date at the lower boundary',()=>expect(isInvoiceEligible({userId:'u',projectUserId:'u',projectClientId:'c',billable:true,invoiceLine:null,startTime:new Date('2026-01-01T00:00:00Z')},'u','c',new Date('2026-01-01Z'),new Date('2026-02-01Z'))).toBe(true));
 it('excludes a non-billable entry',()=>expect(isInvoiceEligible({userId:'u',projectUserId:'u',projectClientId:'c',billable:false,invoiceLine:null,startTime:new Date('2026-01-10Z')},'u','c',new Date('2026-01-01Z'),new Date('2026-02-01Z'))).toBe(false));
 it('excludes an entry already assigned to an invoice',()=>expect(isInvoiceEligible({userId:'u',projectUserId:'u',projectClientId:'c',billable:true,invoiceLine:{id:'line'},startTime:new Date('2026-01-10Z')},'u','c',new Date('2026-01-01Z'),new Date('2026-02-01Z'))).toBe(false));
 it('excludes an entry outside selected client ownership',()=>expect(isInvoiceEligible({userId:'u',projectUserId:'u',projectClientId:'other',billable:true,invoiceLine:null,startTime:new Date('2026-01-10Z')},'u','c',new Date('2026-01-01Z'),new Date('2026-02-01Z'))).toBe(false));
 it('rounds invoice line values to cents',()=>expect(invoiceLineAmount(85,3600)).toBe(85));
 it('rounds fractional invoice line values safely',()=>expect(invoiceLineAmount(85,1800)).toBe(42.5));
});
