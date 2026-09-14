import type {Warehouse} from "@/lib/types";
const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/\s+/g," ").toLowerCase();
export function matchesWarehouseDestination(warehouse:Warehouse,city:string,state?:string){
 const [warehouseCity,storedState]=warehouse.city.split(",");
 const [destinationCity,destinationState]=city.split(",");
 if(!normalize(warehouseCity)||normalize(warehouseCity)!==normalize(destinationCity))return false;
 const actualState=warehouse.state||storedState,expectedState=state||destinationState;
 return !actualState||!expectedState||normalize(actualState)===normalize(expectedState);
}
