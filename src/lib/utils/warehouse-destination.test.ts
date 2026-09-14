import {expect,it} from "vitest";
import {matchesWarehouseDestination} from "./warehouse-destination";
const warehouse={id:"w",name:"México",city:"Valle de Juárez, Jalisco",state:"Jalisco",active:true,arrivalMessage:"Recepción"};
it("matches municipality and state regardless of display formatting",()=>{
 expect(matchesWarehouseDestination(warehouse," valle de juarez ","Jalisco")).toBe(true);
 expect(matchesWarehouseDestination(warehouse,"Valle de Juárez, Jalisco")).toBe(true);
 expect(matchesWarehouseDestination(warehouse,"Guadalajara","Jalisco")).toBe(false);
 expect(matchesWarehouseDestination(warehouse,"Valle de Juárez","Michoacán")).toBe(false);
});
