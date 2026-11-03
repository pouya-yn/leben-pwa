import data from "./questions.json";

export type Lang = "de" | "en";

export type Localized = {
  de: string;
  en: string;
};

export type Question = {
  id: number;
  section: "general" | "berlin";
  question: Localized;
  options: Localized[];
  /** 0-based index into `options` */
  correctIndex: number;
  /** Asset file names, rendered in order. Present for picture questions. */
  images?: string[];
};

export const QUESTIONS: Question[] = data.questions as Question[];

/** Fast id -> question lookup. */
export const QUESTION_BY_ID: Map<number, Question> = new Map(
  QUESTIONS.map((q) => [q.id, q])
);

export const CATALOG_VERSION: string = data.meta.catalogVersion;

export const GENERAL_QUESTIONS: Question[] = QUESTIONS.filter(
  (q) => q.section === "general"
);

export const BERLIN_QUESTIONS: Question[] = QUESTIONS.filter(
  (q) => q.section === "berlin"
);

export type AnswerRecord = {
  state: AnswerState;
  /** 0-based option index the user picked (kept for rendering the review). */
  chosenIndex?: number;
};

export type ListMode = "all" | "wrong";

/** Ordered id list for a given list mode ("all" keeps catalog order). */
export function idsForMode(mode: ListMode): number[] {
  return QUESTIONS.map((q) => q.id);
}

export function getQuestion(id: number): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export type AnswerState = "correct" | "wrong";

export function buildShareText(
  q: Question,
  lang: Lang,
  indexInCatalog: number
): string {
  const t =
    lang === "de"
      ? {
          header: "Leben in Deutschland – Frage",
          correct: "Richtige Antwort",
          picture: "Bild",
        }
      : {
          header: "Life in Germany – Question",
          correct: "Correct answer",
          picture: "Picture",
        };
  const lines: string[] = [];
  lines.push(`${t.header} ${q.id} (${indexInCatalog})`);
  lines.push("");
  lines.push(lang === "de" ? q.question.de : q.question.en);
  lines.push("");
  q.options.forEach((opt, i) => {
    const label =
      q.images && q.images.length > 1 && opt.de.startsWith("Bild")
        ? `${t.picture} ${i + 1}`
        : lang === "de"
          ? opt.de
          : opt.en;
    lines.push(`${i + 1}) ${label}`);
  });
  lines.push("");
  const correct = q.options[q.correctIndex];
  const correctLabel =
    q.images && q.images.length > 1 && correct.de.startsWith("Bild")
      ? `${t.picture} ${q.correctIndex + 1}`
      : lang === "de"
        ? correct.de
        : correct.en;
  lines.push(`${t.correct}: ${q.correctIndex + 1}) ${correctLabel}`);
  return lines.join("\n");
}
