import { describe, expect, it } from "vitest";
import { mexicanPhoneSchema } from "./address";
import { accountRegistrationSchema } from "./auth";
describe("International contact numbers",()=>{
 it.each([["+502 5555-1234","+50255551234"],["+1 (305) 555-1234","+13055551234"],["5512345678","5512345678"],["+34 612 345 678","+34612345678"]])("preserves %s without forcing a country",(input,expected)=>expect(mexicanPhoneSchema.parse(input)).toBe(expected));
 it.each(["123","+1234567890123456","call me","12+34567890"])("rejects malformed %s",input=>expect(mexicanPhoneSchema.safeParse(input).success).toBe(false));
 it("uses the same international rule in registration",()=>expect(accountRegistrationSchema.shape.phone.parse("+502 5555 1234")).toBe("+50255551234"));
});
