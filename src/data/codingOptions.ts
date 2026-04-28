export type CodingOption = {
  code: string;
  group: "0" | "1" | "2" | "3";
  label: string;
};

export const codingOptions: CodingOption[] = [
  {
    code: "0",
    group: "0",
    label: "No I wonder question",
  },
  {
    code: "1a",
    group: "1",
    label: "Course logistics, exams, grading, or structure",
  },
  {
    code: "1b",
    group: "1",
    label: "Life, personal, or pop culture",
  },
  {
    code: "1c",
    group: "1",
    label: "Own or others' understanding about statistics or technology",
  },
  {
    code: "1d",
    group: "1",
    label: "Performance, learning, anxiety, or succeeding in class",
  },
  {
    code: "1e",
    group: "1",
    label: "Connections about course components or pedagogy",
  },
  {
    code: "1f",
    group: "1",
    label: "Other unrelated curiosity",
  },
  {
    code: "2a",
    group: "2",
    label: "Clarification on current statistical material",
  },
  {
    code: "2b",
    group: "2",
    label: "Clarification on technology",
  },
  {
    code: "2c",
    group: "2",
    label: "Communication, terminology, or interpretation",
  },
  {
    code: "2d",
    group: "2",
    label: "Extension to current content",
  },
  {
    code: "2e",
    group: "2",
    label: "Application or use of methods outside class",
  },
  {
    code: "2f",
    group: "2",
    label: "Synthesis or broader statistical connections",
  },
  {
    code: "2g",
    group: "2",
    label: "History, background, or derivation",
  },
  {
    code: "2h",
    group: "2",
    label: "Broad course-content confusion",
  },
  {
    code: "2i",
    group: "2",
    label: "Outside-life reflection on something learned",
  },
  {
    code: "3a",
    group: "3",
    label: "Question about that day's example context",
  },
  {
    code: "3b",
    group: "3",
    label: "Curiosity about a context or new research question",
  },
  {
    code: "3c",
    group: "3",
    label: "Research process, study design, or skepticism",
  },
];

export const codingGroupLabels: Record<CodingOption["group"], string> = {
  "0": "No question",
  "1": "Not statistical content",
  "2": "Statistical or technology content",
  "3": "Example context",
};
