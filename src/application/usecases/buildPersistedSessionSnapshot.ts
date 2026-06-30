import { Calculator, CalculatorSnapshot } from "../../domain/calculator/Calculator";

export function buildPersistedSessionSnapshot(
  snapshot: CalculatorSnapshot
): CalculatorSnapshot {
  const freshSnapshot = new Calculator().getSnapshot();

  return {
    version: snapshot.version,
    state: {
      ...freshSnapshot.state,
      independentMemory: snapshot.state.independentMemory,
      conversionRate: snapshot.state.conversionRate,
      taxRate: snapshot.state.taxRate,
    },
  };
}
