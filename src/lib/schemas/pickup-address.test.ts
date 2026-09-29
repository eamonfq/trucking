import {expect,it} from 'vitest';
import {customerAddressSchema} from './customer';
import {mexicanAddressSchema} from './address';
import {formatDeliveryAddress} from '@/lib/utils/address-display';
import {registrationSchema} from './registration';

it('saves a warehouse name alone but still requires a full address for home delivery',()=>{
 const pickup=customerAddressSchema.parse({label:'Bodega Valle de Juárez'});
 expect(pickup).toMatchObject({label:'Bodega Valle de Juárez',street:'',postalCode:'',municipality:''});
 expect(formatDeliveryAddress(pickup)).toBe('Bodega Valle de Juárez');
 expect(mexicanAddressSchema.safeParse(pickup).success).toBe(false);
});
it('accepts a reference only and rejects malformed postal codes when supplied',()=>{
 const pickup=customerAddressSchema.parse({label:'Retiro',references:'Valle de Juárez'});
 expect(formatDeliveryAddress(pickup)).toBe('Retiro · Valle de Juárez');
 expect(customerAddressSchema.safeParse({label:'Retiro',postalCode:'123'}).success).toBe(false);
});
it('accepts account registration with just a pickup reference',()=>{
 const registered=registrationSchema.parse({firstName:'María',paternalLastName:'Flores',email:'maria@example.com',phone:'5512345678',password:'Secure123!',confirmPassword:'Secure123!',acceptedTerms:true,references:'Bodega Valle de Juárez'});
 expect(registered).toMatchObject({street:'',postalCode:'',references:'Bodega Valle de Juárez'});
});
it('does not print a generic primary-address label as a delivery reference',()=>{
 const address=customerAddressSchema.parse({label:'Principal'});
 expect(formatDeliveryAddress(address)).toBe('');
});
it('retains the warehouse reference beside an incomplete location',()=>{
 const pickup=customerAddressSchema.parse({label:'Bodega Valle de Juárez',state:'Jalisco'});
 expect(formatDeliveryAddress(pickup)).toBe('Bodega Valle de Juárez, Jalisco');
});
