import type {Address,Box,Recipient} from '@/lib/types';
import {formatDeliveryAddress} from './address-display';

/** Preserve the receipt's delivery snapshot; resolve only missing legacy addresses. */
export function packageLabelRecipient(box:Box,people:readonly Recipient[],addresses:readonly Address[]){
 const snapshot=box.recipientSnapshot;
 if(snapshot&&formatDeliveryAddress(snapshot.address))return snapshot;
 const person=people.find(p=>p.id===box.recipientId&&p.userId===box.userId);
 const recorded=addresses.find(a=>a.id===snapshot?.address?.id&&a.userId===box.userId&&!!formatDeliveryAddress(a));
 const linked=person?addresses.find(a=>a.id===person.addressId&&a.userId===box.userId&&!!formatDeliveryAddress(a)):undefined;
 if(snapshot)return {...snapshot,address:recorded??linked??snapshot.address};
 if(person)return {name:person.name,phone:person.phone,address:linked};
 return undefined;
}
