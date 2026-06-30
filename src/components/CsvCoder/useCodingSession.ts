import { useReducer } from "preact/hooks";
import type { CsvRow } from "./types";
import { codingOptions } from "../../data/codingOptions";
import { parseLabelValue } from "./utils";

export interface SessionState {
  fileName: string;
  fields: string[];
  rows: CsvRow[];
  currentIndex: number;
  exportedAt: string | null;
  isOverview: boolean;
}

export type SessionAction =
  | { type: "load_csv"; rows: CsvRow[]; fields: string[]; fileName: string }
  | {
      type: "load_session";
      rows: CsvRow[];
      fields: string[];
      fileName: string;
      currentIndex: number;
      exportedAt: string | null;
    }
  | { type: "toggle_code"; code: string }
  | { type: "update_notes"; value: string }
  | { type: "toggle_flag" }
  | { type: "go_next" }
  | { type: "go_previous" }
  | { type: "open_row"; index: number }
  | { type: "toggle_overview" }
  | { type: "set_overview"; value: boolean }
  | { type: "set_exported"; timestamp: string }
  | { type: "clear" };

export const initialSessionState: SessionState = {
  fileName: "",
  fields: [],
  rows: [],
  currentIndex: 0,
  exportedAt: null,
  isOverview: false,
};

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "load_csv": {
      return {
        fileName: action.fileName,
        fields: action.fields,
        rows: action.rows,
        currentIndex: 0,
        exportedAt: null,
        isOverview: false,
      };
    }
    case "load_session": {
      return {
        fileName: action.fileName,
        fields: action.fields,
        rows: action.rows,
        currentIndex: action.currentIndex,
        exportedAt: action.exportedAt,
        isOverview: false,
      };
    }
    case "toggle_code": {
      if (!state.rows.length) return state;
      const currentRow = state.rows[state.currentIndex];
      const selectedCodes = parseLabelValue(currentRow["Label"]);
      const code = action.code;
      const nextCodes = selectedCodes.includes(code)
        ? selectedCodes.filter((selectedCode) => selectedCode !== code)
        : [...selectedCodes, code];
      const sortedCodes = codingOptions
        .map((option) => option.code)
        .filter((optionCode) => nextCodes.includes(optionCode));

      const newLabelValue = sortedCodes.length ? sortedCodes.join(";") : "NA";
      const nextRows = state.rows.map((row, idx) =>
        idx === state.currentIndex ? { ...row, Label: newLabelValue } : row,
      );
      return { ...state, rows: nextRows, exportedAt: null };
    }
    case "update_notes": {
      if (!state.rows.length) return state;
      const nextRows = state.rows.map((row, idx) =>
        idx === state.currentIndex ? { ...row, Notes: action.value } : row,
      );
      return { ...state, rows: nextRows, exportedAt: null };
    }
    case "toggle_flag": {
      if (!state.rows.length) return state;
      const nextRows = state.rows.map((row, idx) => {
        if (idx !== state.currentIndex) return row;
        const isFlagged = String(row["Flag"] ?? "").trim().toUpperCase() === "TRUE";
        return { ...row, Flag: isFlagged ? "NA" : "TRUE" };
      });
      return { ...state, rows: nextRows, exportedAt: null };
    }
    case "go_next": {
      if (!state.rows.length) return state;
      if (state.currentIndex >= state.rows.length - 1) {
        return {
          ...state,
          isOverview: true,
        };
      }
      return {
        ...state,
        currentIndex: state.currentIndex + 1,
      };
    }
    case "go_previous": {
      if (!state.rows.length) return state;
      if (state.isOverview) {
        return {
          ...state,
          isOverview: false,
          currentIndex: state.rows.length - 1,
        };
      }
      return {
        ...state,
        currentIndex: Math.max(state.currentIndex - 1, 0),
      };
    }
    case "open_row": {
      return {
        ...state,
        isOverview: false,
        currentIndex: Math.min(Math.max(action.index, 0), state.rows.length - 1),
      };
    }
    case "toggle_overview": {
      if (!state.rows.length) return state;
      return {
        ...state,
        isOverview: !state.isOverview,
      };
    }
    case "set_overview": {
      if (!state.rows.length) return state;
      return {
        ...state,
        isOverview: action.value,
      };
    }
    case "set_exported": {
      return {
        ...state,
        exportedAt: action.timestamp,
      };
    }
    case "clear": {
      return initialSessionState;
    }
    default:
      return state;
  }
}

export function useCodingSession() {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  return [state, dispatch] as const;
}
