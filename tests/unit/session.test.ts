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
    const rows = [{ Question: "What?", Label: "NA", Notes: "NA" }];
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

  it("clears exportedAt when label, notes, or flag changes", () => {
    const initialState = {
      fileName: "test.csv",
      fields: ["Question", "Label", "Notes", "Flag"],
      rows: [{ Question: "Q1", Label: "NA", Notes: "", Flag: "NA" }],
      currentIndex: 0,
      exportedAt: "2026-01-01T00:00:00.000Z",
      isOverview: false,
    };

    const afterLabel = sessionReducer(initialState, { type: "toggle_code", code: "2b" });
    expect(afterLabel.exportedAt).toBeNull();

    const afterNotes = sessionReducer(initialState, { type: "update_notes", value: "new note" });
    expect(afterNotes.exportedAt).toBeNull();

    const afterFlag = sessionReducer(initialState, { type: "toggle_flag" });
    expect(afterFlag.exportedAt).toBeNull();
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
      rows: [{ Question: "Q1", Label: "NA", Notes: "NA", Flag: "NA" }],
      currentIndex: 0,
      isOverview: false,
    };

    writeSavedSession(session);
    const retrieved = readSavedSession();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.firstName).toBe("Alice");
    expect(retrieved?.fileName).toBe("survey.csv");
  });

  it("normalizes rows against fields on read, dropping extra keys and filling missing ones", () => {
    const raw = {
      firstName: "Bob",
      fileName: "test.csv",
      fields: ["Question", "Label", "Notes"],
      rows: [{ Question: "Q1", Label: "2b", Notes: "some note", ExtraKey: "should be stripped" }],
      currentIndex: 0,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(raw));
    const retrieved = readSavedSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.rows[0]).toEqual({ Question: "Q1", Label: "2b", Notes: "some note" });
    expect("ExtraKey" in (retrieved?.rows[0] ?? {})).toBe(false);
  });

  it("recovers gracefully from invalid saved sessions", () => {
    // Malformed JSON
    window.localStorage.setItem(STORAGE_KEY_V1, "{invalid-json");
    expect(readSavedSession()).toBeNull();

    // Missing key fields
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify({ firstName: "Charlie" }));
    expect(readSavedSession()).toBeNull();
  });

  it("rejects sessions missing Label column", () => {
    const session = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", "Notes", "Flag"], // no Label
      rows: [{ Question: "Q1", Notes: "NA", Flag: "NA" }],
      currentIndex: 0,
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session));
    expect(readSavedSession()).toBeNull();
  });

  it("rejects sessions missing Notes column", () => {
    const session = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", "Label", "Flag"], // no Notes
      rows: [{ Question: "Q1", Label: "NA", Flag: "NA" }],
      currentIndex: 0,
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session));
    expect(readSavedSession()).toBeNull();
  });

  it("rejects invalid fields", () => {
    const session = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", 123, "Notes"], // non-string field
      rows: [{ Question: "Q1", Label: "NA", Notes: "NA", Flag: "NA" }],
      currentIndex: 0,
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session));
    expect(readSavedSession()).toBeNull();

    const session2 = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: "not-an-array",
      rows: [{ Question: "Q1", Label: "NA", Notes: "NA", Flag: "NA" }],
      currentIndex: 0,
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session2));
    expect(readSavedSession()).toBeNull();
  });

  it("rejects invalid rows and non-string row values", () => {
    const session1 = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", "Label", "Notes", "Flag"],
      rows: "not-an-array",
      currentIndex: 0,
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session1));
    expect(readSavedSession()).toBeNull();

    const session2 = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", "Label", "Notes", "Flag"],
      rows: [{ Question: "Q1", Label: 123, Notes: "NA", Flag: "NA" }], // non-string value
      currentIndex: 0,
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session2));
    expect(readSavedSession()).toBeNull();

    const session3 = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", "Label", "Notes", "Flag"],
      rows: [["not-an-object"]],
      currentIndex: 0,
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session3));
    expect(readSavedSession()).toBeNull();
  });

  it("clamps and validates currentIndex", () => {
    const session1 = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", "Label", "Notes", "Flag"],
      rows: [{ Question: "Q1", Label: "NA", Notes: "NA", Flag: "NA" }],
      currentIndex: 5, // out of bounds
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session1));
    const retrieved1 = readSavedSession();
    expect(retrieved1).not.toBeNull();
    expect(retrieved1?.currentIndex).toBe(0); // clamped to max index 0

    const session2 = {
      firstName: "Alice",
      fileName: "survey.csv",
      fields: ["Question", "Label", "Notes", "Flag"],
      rows: [{ Question: "Q1", Label: "NA", Notes: "NA", Flag: "NA" }],
      currentIndex: "not-a-number",
    };
    window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(session2));
    expect(readSavedSession()).toBeNull();
  });
});
