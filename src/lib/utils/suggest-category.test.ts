import { describe, expect, it } from "vitest";
import { suggestCategory } from "@/lib/utils/suggest-category";

describe("suggestCategory", () => {
  it("elige Small cuando medidas y peso están dentro del límite exacto", () => {
    expect(suggestCategory({ length: 10, width: 16, height: 12 }, 50).category?.id).toBe("small");
  });

  it("acepta la rotación física de una caja", () => {
    expect(suggestCategory({ length: 16, width: 12, height: 10 }, 40).category?.id).toBe("small");
  });

  it("sube por peso sin cobrar silenciosamente", () => {
    const result = suggestCategory({ length: 10, width: 12, height: 8 }, 55);
    expect(result.category?.id).toBe("medium");
    expect(result.upgradedByWeight).toBe(true);
    expect(result.reason).toBe("peso");
  });

  it("sube por dimensiones", () => {
    const result = suggestCategory({ length: 16, width: 20, height: 15 }, 45);
    expect(result.category?.id).toBe("medium");
    expect(result.upgradedByDimensions).toBe(true);
    expect(result.reason).toBe("medida");
  });

  it("devuelve null cuando excede el máximo por peso", () => {
    expect(suggestCategory({ length: 10, width: 10, height: 10 }, 131).category).toBeNull();
  });

  it("devuelve null cuando una dimensión excede el máximo", () => {
    expect(suggestCategory({ length: 30, width: 24, height: 24 }, 80).category).toBeNull();
  });

  it("usa el tarifario recibido en lugar de precios estáticos", () => {
    const rates = [{ id: "small" as const, name: "Small", dimensions: { length: 12, width: 12, height: 12 }, priceUsd: 95, maxWeightLb: 55 }];
    expect(suggestCategory({ length: 10, width: 10, height: 10 }, 50, rates).category?.priceUsd).toBe(95);
  });
});
