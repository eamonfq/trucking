import {expect,it} from 'vitest';
import type {Address,Box,Recipient} from '@/lib/types';
import {packageLabelRecipient} from './package-label-recipient';
import {formatDeliveryAddress} from './address-display';
const empty:Address={id:'a',userId:'u',label:'Principal',street:'',exteriorNumber:'',neighborhood:'',postalCode:'',municipality:'',state:''};
const address:Address={...empty,references:'Bodega Valle de Juárez'};
const person:Recipient={id:'r',userId:'u',name:'Destinatario Ejemplo',phone:'15550000000',addressId:'a'};
const box:Box={id:'b',userId:'u',code:'BX-QA',recipientId:'r',recipientSnapshot:{name:person.name,phone:person.phone,address:empty},categoryId:'small',status:'en-bodega',weightLb:20,dimensions:{length:10,width:16,height:12},timeline:[]};
it('resolves a reference added after reception only when the stored address is empty',()=>{
 const printed=packageLabelRecipient(box,[person],[address]);
 expect(formatDeliveryAddress(printed?.address)).toBe('Bodega Valle de Juárez');
 expect(box.recipientSnapshot?.address).toEqual(empty);
});
it('resolves legacy contacts without a snapshot and sentinel addresses without a link',()=>{
 expect(packageLabelRecipient({...box,recipientSnapshot:undefined},[person],[address])?.address).toEqual(address);
 expect(packageLabelRecipient({...box,recipientSnapshot:{...box.recipientSnapshot!,address:{...empty,id:'',label:'Sin dirección'}}},[person],[address])?.address).toEqual(address);
});
it('preserves a previously recorded address even if the directory is edited',()=>{
 const recorded={...address,references:'Bodega original'};
 expect(packageLabelRecipient({...box,recipientSnapshot:{...box.recipientSnapshot!,address:recorded}},[person],[address])?.address).toEqual(recorded);
});
it('never falls back to another customer or an unrelated primary address',()=>{
 expect(formatDeliveryAddress(packageLabelRecipient(box,[{...person,userId:'other'}],[{...address,userId:'other'}])?.address)).toBe('');
 expect(formatDeliveryAddress(packageLabelRecipient({...box,recipientId:undefined},[],[{...address,id:'unrelated'}])?.address)).toBe('');
});
it('does not hide real fields or references behind a legacy missing-address label',()=>{
 expect(formatDeliveryAddress({...address,label:'Sin dirección'})).toBe('Bodega Valle de Juárez');
 expect(formatDeliveryAddress({...empty,label:'Sin dirección',street:'Calle Principal',exteriorNumber:'42'})).toBe('Calle Principal 42');
 expect(formatDeliveryAddress({...empty,label:'Sin dirección'})).toBe('');
});
