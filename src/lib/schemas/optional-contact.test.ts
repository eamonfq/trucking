import {describe,it,expect} from "vitest";
import {quickCustomerSchema,administrativeAddressSchema,administrativeRecipientSchema} from "./customer";
import {registrationSchema} from "./registration";
describe("Optional operational contact",()=>{
 const contact={firstName:"Cliente",paternalLastName:"Prueba",phone:"+15551234567"};
 it("defaults absent fields and accepts multiple blank emails",()=>{
  expect(quickCustomerSchema.parse(contact)).toMatchObject({email:"",street:"",neighborhood:"",state:""});
  expect(quickCustomerSchema.parse({...contact,email:"   "}).email).toBe("");
 });
 it("validates only supplied email/postal code and keeps names/phone required",()=>{
  expect(quickCustomerSchema.safeParse({...contact,email:"invalid"}).success).toBe(false);
  expect(quickCustomerSchema.safeParse({...contact,postalCode:"a"}).success).toBe(false);
  expect(quickCustomerSchema.safeParse({...contact,phone:""}).success).toBe(false);
  expect(quickCustomerSchema.safeParse({...contact,state:"Jalisco"}).success).toBe(true);
 });
 it("allows recipient before an address, and partial administrative addresses",()=>{
  expect(administrativeRecipientSchema.safeParse({name:"Persona destino",phone:contact.phone,addressId:""}).success).toBe(true);
  expect(administrativeAddressSchema.parse({label:"Principal",state:"Jalisco"}).street).toBe("");
 });
 it("does not permit public self-registration without an email",()=>{
  expect(registrationSchema.safeParse({...contact,password:"TestPassword123!",confirmPassword:"TestPassword123!",acceptedTerms:true}).success).toBe(false);
 });
});
