import {
  getStateRules,
  getTribunalName,
  getRegulatorName,
  STATE_RULES,
  type AustralianState,
} from "@/lib/state-rules";

describe("State Rules Engine", () => {
  const states: AustralianState[] = [
    "VIC",
    "NSW",
    "QLD",
    "WA",
    "SA",
    "TAS",
    "ACT",
    "NT",
  ];

  test("all states have rules defined", () => {
    states.forEach((state) => {
      expect(STATE_RULES[state]).toBeDefined();
      expect(STATE_RULES[state].state).toBe(state);
    });
  });

  test("getStateRules returns correct rules for each state", () => {
    states.forEach((state) => {
      const rules = getStateRules(state);
      expect(rules.state).toBe(state);
      expect(rules.tribunalName).toBeDefined();
      expect(rules.regulatorName).toBeDefined();
      expect(rules.noticePeriods.rentIncrease).toBeGreaterThan(0);
      expect(rules.noticePeriods.breachRemedy).toBeGreaterThan(0);
      expect(rules.formNames.breachNotice).toBeDefined();
      expect(rules.formNames.rentIncrease).toBeDefined();
    });
  });

  test("getTribunalName returns correct tribunal for each state", () => {
    expect(getTribunalName("VIC")).toBe("VCAT");
    expect(getTribunalName("NSW")).toBe("NCAT");
    expect(getTribunalName("QLD")).toBe("QCAT");
    expect(getTribunalName("WA")).toBe("SAT");
    expect(getTribunalName("SA")).toBe("SACAT");
    expect(getTribunalName("TAS")).toBe("RTT");
    expect(getTribunalName("ACT")).toBe("ACAT");
    expect(getTribunalName("NT")).toBe("NTCAT");
  });

  test("getRegulatorName returns correct regulator for each state", () => {
    states.forEach((state) => {
      const regulator = getRegulatorName(state);
      expect(regulator).toBeDefined();
      expect(regulator.length).toBeGreaterThan(0);
    });
  });

  test("notice periods are positive integers", () => {
    states.forEach((state) => {
      const rules = getStateRules(state);
      expect(Number.isInteger(rules.noticePeriods.rentIncrease)).toBe(true);
      expect(Number.isInteger(rules.noticePeriods.breachRemedy)).toBe(true);
      expect(rules.noticePeriods.rentIncrease).toBeGreaterThan(0);
      expect(rules.noticePeriods.breachRemedy).toBeGreaterThan(0);
    });
  });
});

