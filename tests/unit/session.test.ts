import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  sessionReducer,
  initialSessionState,
} from "../../src/components/CsvCoder/useCodingSession";
import {
  readSavedSession,
  writeSavedSession,
  STORAGE_KEY_V1,
} from "../../src/components/CsvCoder/SessionStorage";


// Mock localStorage for Node environment
const store: Record<string, string> = {};
beforeAll(() => {
  global.window = {
    localStorage: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k of Object.keys(store)) {
          delete store[k];
        }
      },
      length: 0,
      key: () => null,
    },
  } as any;
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("Coding Session Reducer", () => {
  it("handles load_csv action", () => {
    const rows = [{ Question: "What?", Label: "NA", Notes: "NA", __originalIndex: "0" }];
    const fields = ["Question", "Label", "Notes"];
    const action = { type: "load_csv" as const, rows, fields, fileName: "test.csv" };
    const nextState = sessionReducer(initialSessionState, action);

    expect(nextState.fileName).toBe("test.csv");
    expect(nextState.fields).toEqual(fields);
    expect(nextState.rows).toEqual(rows);
    expect(nextState.currentIndex).toBe(0);
    expect(nextState.isOverview).toBe(false);
  });

  it("handles toggle_code action", () => {
    const initialState = {
      fileName: "test.csv",
      fields: ["Question", "Label", "Notes"],
      rows: [
        { Question: "Q1", Label: "NA", Notes: "" },
        { Question: "Q2", Label: "2b", Notes: "" },
      ],
      currentIndex: 1,
      exportedAt: null,
      isOverview: false,
    };

    // Toggle 2b off
    const nextState1 = sessionReducer(initialState, { type: "toggle_code", code: "2b" });
    expect(nextState1.rows[1].Label).toBe("NA");

    // Toggle 2c on
    const nextState2 = sessionReducer(initialState, { type: "toggle_code", code: "2c" });
    expect(nextState2.rows[1].Label).toBe("2b;2c");
  });

  it("handles update_notes action", () => {
    const initialState = {
      fileName: "test.csv",
      fields: ["Question", "Label", "Notes"],
      rows: [{ Question: "Q1", Label: "NA", Notes: "Initial notes" }],
      currentIndex: 0,
      exportedAt: null,
      isOverview: false,
    };

    const nextState = sessionReducer(initialState, { type: "update_notes", value: "Updated notes" });
    expect(nextState.rows[0].Notes).toBe("Updated notes");
  });

  it("handles toggle_flag action", () => {
    const initialState = {
      fileName: "test.csv",
      fields: ["Question", "Label", "Notes", "Flag"],
      rows: [{ Question: "Q1", Label: "NA", Notes: "", Flag: "NA" }],
      currentIndex: 0,
      exportedAt: null,
      isOverview: false,
    };

    const nextState = sessionReducer(initialState, { type: "toggle_flag" });
    expect(nextState.rows[0].Flag).toBe("TRUE");

    const unflaggedState = sessionReducer(nextState, { type: "toggle_flag" });
    expect(unflaggedState.rows[0].Flag).toBe("NA");
  });

  it("handles navigation (go_next, go_previous, open_row)", () => {
    const initialState = {
      fileName: "test.csv",
      fields: ["Question"],
      rows: [{ Question: "Q1" }, { Question: "Q2" }, { Question: "Q3" }],
      currentIndex: 1,
      exportedAt: null,
      isOverview: false,
    };

    let state = sessionReducer(initialState, { type: "go_next" });
    expect(state.currentIndex).toBe(2);

    state = sessionReducer(state, { type: "go_previous" });
    expect(state.currentIndex).toBe(1);

    state = sessionReducer(state, { type: "open_row", index: 0 });
    expect(state.currentIndex).toBe(0);
  });

  it("handles overview navigation transition atomically", () => {
    const initialState = {
      fileName: "test.csv",
      fields: ["Question"],
      rows: [{ Question: "Q1" }, { Question: "Q2" }],
      currentIndex: 1,
      exportedAt: null,
      isOverview: false,
    };

    // go_next at the last question should open overview
    let state = sessionReducer(initialState, { type: "go_next" });
    expect(state.isOverview).toBe(true);
    expect(state.currentIndex).toBe(1);

    // go_previous from overview should return to the last question
    state = sessionReducer(state, { type: "go_previous" });
    expect(state.isOverview).toBe(false);
    expect(state.currentIndex).toBe(1);
  });
});

describe("Session Storage", () => {
  it("correctly saves and reads a session", () => {
    const session = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", "Label", "Notes", "Flag"],
      rows: [{ Question: "Q1", Label: "NA", Notes: "NA", Flag: "NA", __originalIndex: "0" }],
      currentIndex: 0,
      isOverview: false,
    };

    writeSavedSession(session);
    const retrieved = readSavedSession();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.firstName).toBe("Alice");
    expect(retrieved?.fileName).toBe("survey.csv");
    expect(retrieved?.rows[0].__originalIndex).toBe("0");
  });

  it("recovers gracefully from invalid saved sessions", () => {
    // Malformed JSON
    window.localStorage.setItem(STORAGE_KEY_V1, "{invalid-json");
    expect(readSavedSession()).toBeNull();

    // Missing key fields
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify({ firstName: "Charlie" }));
    expect(readSavedSession()).toBeNull();
  });
});
