import {expect,it} from "vitest";
import {truckLoad} from "./truck-load";
it("marks volume as partial when weight-priced packages have no measurements",()=>{
 expect(truckLoad([{weightLb:50,dimensions:{length:0,width:0,height:0}},{weightLb:20,dimensions:{length:12,width:12,height:12}}])).toMatchObject({weightLb:70,volumeFt3:1,missingDimensions:1});
});
it("totals physical weight and cubic volume independently of billing",()=>{
 const boxes=[{weightLb:10.5,dimensions:{length:12,width:12,height:12}},{weightLb:20,dimensions:{length:24,width:12,height:12}}];
 expect(truckLoad(boxes)).toMatchObject({count:2,weightLb:30.5,volumeFt3:3,volumeIn3:5184});
 expect(truckLoad(boxes).volumeM3).toBeCloseTo(0.08495054);
 expect(truckLoad([])).toMatchObject({count:0,weightLb:0,volumeFt3:0});
});
