import { BOX_CATEGORIES, type BoxCategory } from "@/lib/config/box-categories";
import { DEFAULT_FLOW_CONFIG, type FlowConfig } from "@/lib/config/flow";
import { clone, simulateLatency } from "@/lib/services/delay";

let flowConfig: FlowConfig = { ...DEFAULT_FLOW_CONFIG };
let rateTable: BoxCategory[] = BOX_CATEGORIES.map((category) => ({ ...category, dimensions: { ...category.dimensions } }));

export const configService = {
  async getFlowConfig() {
    await simulateLatency();
    return clone(flowConfig);
  },
  async updateFlowConfig(input: Partial<FlowConfig>) {
    await simulateLatency();
    flowConfig = { ...flowConfig, ...input };
    return clone(flowConfig);
  },
  async getRateTable() {
    await simulateLatency();
    return clone(rateTable);
  },
  async updateRateTable(input: BoxCategory[]) {
    await simulateLatency();
    rateTable = clone(input);
    return clone(rateTable);
  },
};
