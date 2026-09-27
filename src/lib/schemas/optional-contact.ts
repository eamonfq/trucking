import {z} from "zod";
export const optionalEmailSchema=z.string().trim().toLowerCase().max(254).refine(v=>v===""||z.email().safeParse(v).success,"Escribe un correo válido o deja el campo vacío.").default("");
const optionalText=z.string().trim().max(180).default("");
export const optionalAddressSchema=z.object({
 street:optionalText,exteriorNumber:optionalText,interiorNumber:optionalText,
 neighborhood:optionalText,postalCode:z.string().trim().refine(v=>!v||/^\d{5}$/.test(v),"El código postal debe tener 5 dígitos o quedar vacío.").default(""),
 municipality:optionalText,state:optionalText,references:z.string().trim().max(300).default(""),
});
export function hasAddressData(address:Record<string,unknown>){return ["street","exteriorNumber","interiorNumber","neighborhood","postalCode","municipality","state","references"].some(key=>typeof address[key]==="string"&&address[key].trim());}
