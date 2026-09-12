export type EditField = {key:string;label:string;value:string|number|boolean;type:"text"|"number"|"date"|"select"|"checkbox";options?:{value:string;label:string}[]};
export type EditableRecord = {kind:"box"|"shipment"|"invoice"|"truck"|"driver"|"support"|"payment";id:string;label:string;expected:string;fields:EditField[];locked:boolean};
