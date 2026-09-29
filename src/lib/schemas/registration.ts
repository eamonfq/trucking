import { z } from "zod";
import { accountRegistrationSchema } from "@/lib/schemas/auth";
import { rfcSchema } from "@/lib/schemas/address";
import { optionalAddressSchema } from "@/lib/schemas/optional-contact";

export const registrationSchema = accountRegistrationSchema.and(optionalAddressSchema.extend({ rfc: rfcSchema }));
export type RegistrationInput = z.input<typeof registrationSchema>;
