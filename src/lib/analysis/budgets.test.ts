import { describe, expect, it } from "vitest";
import { BUDGET_CEILINGS, planBudget } from "./budgets";

describe("planBudget", () => {
  it("scales the file budget with the eligible tree", () => {
    expect(planBudget(10).tier).toBe("small");
    expect(planBudget(10).maxFiles).toBe(48);
    expect(planBudget(500).tier).toBe("medium");
    expect(planBudget(500).maxFiles).toBe(72);
    expect(planBudget(2_000).tier).toBe("large");
    expect(planBudget(2_000).maxFiles).toBe(96);
    expect(planBudget(50_000).tier).toBe("huge");
    expect(planBudget(50_000).maxFiles).toBe(128);
  });

  it("clamps operator overrides to absolute ceilings", () => {
    const budget = planBudget(10, { maxFiles: 99_999, concurrency: 500, deadlineMs: 900_000 });
    expect(budget.maxFiles).toBe(BUDGET_CEILINGS.maxFiles);
    expect(budget.concurrency).toBe(BUDGET_CEILINGS.concurrency);
    expect(budget.deadlineMs).toBe(BUDGET_CEILINGS.deadlineMs);
  });

  it("never returns a zero-sized budget", () => {
    const budget = planBudget(0, { maxFiles: 0, maxTotalBytes: 0, concurrency: 0 });
    expect(budget.maxFiles).toBeGreaterThanOrEqual(1);
    expect(budget.maxTotalBytes).toBeGreaterThan(0);
    expect(budget.concurrency).toBeGreaterThanOrEqual(1);
  });
});
