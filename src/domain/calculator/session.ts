import { CalculatorState } from "./types";

type StateKey = keyof CalculatorState;

const entryKeys = [
  "displayValue", "error", "lastPercentInput", "waitingForNewEntry",
  "accumulatorContext", "continuationSource",
] as const satisfies readonly StateKey[];

const workingExpressionKeys = [
  "totalMemory", "pendingOperation", "firstOperand", "lastOperand", "lastOperator",
  "expressionTokens",
] as const satisfies readonly StateKey[];

const accountingKeys = [
  "grandTotal", "operationCount", "subtotalCount", "referenceNumber",
] as const satisfies readonly StateKey[];

const tapeKeys = [
  "paperTape", "needsTapeBlockHeader", "tapeOperationSequence", "tapeSubtotalSequence",
  "suppressNextAccumulatorBasePrint",
] as const satisfies readonly StateKey[];

const configurationKeys = [
  "decimalMode", "independentMemory", "conversionRate", "taxRate", "pendingBusiness",
  "businessBase", "businessCost", "businessSell", "businessMargin",
] as const satisfies readonly StateKey[];

type SessionPart<K extends readonly StateKey[]> = Pick<CalculatorState, K[number]>;

export interface CalculatorSession {
  entry: SessionPart<typeof entryKeys>;
  workingExpression: SessionPart<typeof workingExpressionKeys>;
  accounting: SessionPart<typeof accountingKeys>;
  tape: SessionPart<typeof tapeKeys>;
  configuration: SessionPart<typeof configurationKeys>;
}

const parts: Array<readonly StateKey[]> = [
  entryKeys,
  workingExpressionKeys,
  accountingKeys,
  tapeKeys,
  configurationKeys,
];

function pick<K extends readonly StateKey[]>(state: CalculatorState, keys: K): SessionPart<K> {
  const part: Record<string, unknown> = {};
  for (const key of keys) {
    part[key] = state[key];
  }
  return part as SessionPart<K>;
}

/** The session is the internal source of truth; the flat state remains an API adapter. */
export function createCalculatorSession(state: CalculatorState): CalculatorSession {
  return {
    entry: pick(state, entryKeys),
    workingExpression: pick(state, workingExpressionKeys),
    accounting: pick(state, accountingKeys),
    tape: pick(state, tapeKeys),
    configuration: pick(state, configurationKeys),
  };
}

function partForKey(session: CalculatorSession, key: StateKey): Record<StateKey, unknown> {
  for (const partKeys of parts) {
    if (partKeys.includes(key)) {
      if (entryKeys.includes(key as typeof entryKeys[number])) return session.entry as Record<StateKey, unknown>;
      if (workingExpressionKeys.includes(key as typeof workingExpressionKeys[number])) return session.workingExpression as Record<StateKey, unknown>;
      if (accountingKeys.includes(key as typeof accountingKeys[number])) return session.accounting as Record<StateKey, unknown>;
      if (tapeKeys.includes(key as typeof tapeKeys[number])) return session.tape as Record<StateKey, unknown>;
      return session.configuration as Record<StateKey, unknown>;
    }
  }
  throw new Error(`Unknown calculator state key: ${key}`);
}

/**
 * Existing callers and persisted snapshot v2 still use CalculatorState. This facade
 * keeps that contract while routing each field to its owning session partition.
 */
export function createCalculatorStateFacade(session: CalculatorSession): CalculatorState {
  const allKeys = parts.flat() as StateKey[];

  return new Proxy({} as CalculatorState, {
    get(_target, property) {
      if (typeof property !== "string") return undefined;
      return partForKey(session, property as StateKey)[property as StateKey];
    },
    set(_target, property, value) {
      if (typeof property !== "string") return false;
      partForKey(session, property as StateKey)[property as StateKey] = value;
      return true;
    },
    ownKeys() {
      return allKeys;
    },
    getOwnPropertyDescriptor(_target, property) {
      if (typeof property !== "string" || !allKeys.includes(property as StateKey)) {
        return undefined;
      }
      return { configurable: true, enumerable: true };
    },
  });
}
