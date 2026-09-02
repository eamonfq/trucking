import { z } from "zod";
import { accountRegistrationSchema } from "@/lib/schemas/auth";
import { mexicanAddressSchema, rfcSchema } from "@/lib/schemas/address";

export const registrationSchema = accountRegistrationSchema.and(mexicanAddressSchema.extend({ rfc: rfcSchema }));
export type RegistrationInput = z.infer<typeof registrationSchema>;
