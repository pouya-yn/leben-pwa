import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  QUESTION_BY_ID,
  type AnswerRecord,
  type Lang,
  type ListMode,
} from "@/data/questions";
import { EXAM_HISTORY_LIMIT, EXAM_PASS_COUNT } from "@/exam-config";

const ANSWERS_KEY = "leben.answers.v1";
const PROGRESS_KEY = "leben.progress.v1";
const LANG_KEY = "leben.lang.v1";
const EXAM_KEY = "leben.exam.v1";
const EXAM_HISTORY_KEY = "leben.exam-history.v1";

export type ExamState = {
  /** Question ids in exam order (30 general + 3 Berlin). */
  ids: number[];
  /** questionId -> chosen option index (missing = unanswered). */
  answers: Record<number, number>;
  startedAt: number;
  finishedAt?: number;
};

export type ExamRecord = {
  takenAt: number;
  durationSeconds: number;
  ids: number[];
  answers: Record<number, number>;
  correct: number;
  passed: boolean;
};

export type { AnswerRecord };

export type Progress = {
  /** Position within the full catalog (mode "all"). */
  all?: number;
  /** Position within the wrong-questions snapshot (mode "wrong"). */
  wrong?: number;
};

type AppState = {
  /** null while loading from storage */
  answers: Record<number, AnswerRecord>;
  progress: Progress | null;
  lang: Lang;
  ready: boolean;
  setLang: (lang: Lang) => void;
  /** Records the result of answering a question. */
  recordAnswer: (id: number, correct: boolean, chosenIndex: number) => void;
  /** Explicit CTA: clears the "wrong" state by marking the question correct. */
  markCorrect: (id: number) => void;
  setProgress: (mode: ListMode, index: number) => void;
  /** Mock exam state; null when no exam has been started. */
  exam: ExamState | null;
  /** Finished exams, newest first. */
  examHistory: ExamRecord[];
  startExam: (ids: number[]) => void;
  setExamAnswer: (id: number, optionIndex: number) => void;
  finishExam: () => void;
  clearExam: () => void;
  clearExamHistory: () => void;
  /** Clears all practice answer states and positions. */
  clearAnswers: () => void;
};

const AppStateContext = createContext<AppState | null>(null);

function persistAnswers(next: Record<number, AnswerRecord>) {
  AsyncStorage.setItem(ANSWERS_KEY, JSON.stringify(next)).catch(() => {});
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<Record<number, AnswerRecord>>({});
  const [progress, setProgressState] = useState<Progress | null>(null);
  const [lang, setLangState] = useState<Lang>("de");
  const [exam, setExamState] = useState<ExamState | null>(null);
  const [examHistory, setExamHistory] = useState<ExamRecord[]>([]);
  const [ready, setReady] = useState(false);

  // Mirrors for synchronous access inside event handlers, so no side effects
  // are needed inside setState updaters. Synced in an effect (not during
  // render) per React Compiler rules; mutators also keep them current.
  const answersRef = React.useRef(answers);
  const examHistoryRef = React.useRef(examHistory);
  const examRef = React.useRef<ExamState | null>(exam);

  useEffect(() => {
    answersRef.current = answers;
    examHistoryRef.current = examHistory;
    examRef.current = exam;
  }, [answers, examHistory, exam]);

  useEffect(() => {
    (async () => {
      try {
        const [a, p, l, e, h] = await Promise.all([
          AsyncStorage.getItem(ANSWERS_KEY),
          AsyncStorage.getItem(PROGRESS_KEY),
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(EXAM_KEY),
          AsyncStorage.getItem(EXAM_HISTORY_KEY),
        ]);
        if (a) setAnswers(JSON.parse(a));
        if (p) setProgressState(JSON.parse(p));
        if (l === "en" || l === "de") setLangState(l);
        if (e) setExamState(JSON.parse(e));
        if (h) setExamHistory(JSON.parse(h));
      } catch (e) {
        // Corrupt storage: start fresh rather than crash.
        console.warn("Failed to load app state", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persistExam = useCallback((next: ExamState | null) => {
    if (next === null) {
      AsyncStorage.removeItem(EXAM_KEY).catch(() => {});
    } else {
      AsyncStorage.setItem(EXAM_KEY, JSON.stringify(next)).catch(() => {});
    }
  }, []);

  const startExam = useCallback(
    (ids: number[]) => {
      const next: ExamState = { ids, answers: {}, startedAt: Date.now() };
      examRef.current = next;
      setExamState(next);
      persistExam(next);
    },
    [persistExam]
  );

  const setExamAnswer = useCallback(
    (id: number, optionIndex: number) => {
      const prev = examRef.current;
      if (!prev || prev.finishedAt) return;
      if (prev.answers[id] === optionIndex) return;
      const next: ExamState = {
        ...prev,
        answers: { ...prev.answers, [id]: optionIndex },
      };
      examRef.current = next;
      setExamState(next);
      persistExam(next);
    },
    [persistExam]
  );

  const finishExam = useCallback(() => {
    const prev = examRef.current;
    if (!prev || prev.finishedAt) return;
    const finishedAt = Date.now();
    const next: ExamState = { ...prev, finishedAt };
    examRef.current = next;
    setExamState(next);
    persistExam(next);

    // Score the exam and fold wrongly answered questions into the practice
    // state ("answered wrongly" list). Following the practice rules:
    // answering wrong always marks wrong; a correct exam answer never clears
    // an existing "wrong" state — only the explicit CTA does.
    const updatedAnswers = { ...answersRef.current };
    let answersChanged = false;
    let correct = 0;
    for (const id of next.ids) {
      const q = QUESTION_BY_ID.get(id);
      if (!q) continue;
      const chosen = next.answers[id];
      if (chosen === undefined) continue; // unanswered: leave untouched
      if (chosen === q.correctIndex) {
        correct++;
      } else {
        updatedAnswers[id] = { state: "wrong", chosenIndex: chosen };
        answersChanged = true;
      }
    }
    if (answersChanged) {
      answersRef.current = updatedAnswers;
      setAnswers(updatedAnswers);
      persistAnswers(updatedAnswers);
    }

    // Add to exam history (newest first).
    const record: ExamRecord = {
      takenAt: finishedAt,
      durationSeconds: Math.round((finishedAt - prev.startedAt) / 1000),
      ids: next.ids,
      answers: next.answers,
      correct,
      passed: correct >= EXAM_PASS_COUNT,
    };
    const nextHistory = [record, ...examHistoryRef.current].slice(
      0,
      EXAM_HISTORY_LIMIT
    );
    examHistoryRef.current = nextHistory;
    setExamHistory(nextHistory);
    AsyncStorage.setItem(EXAM_HISTORY_KEY, JSON.stringify(nextHistory)).catch(
      () => {}
    );
  }, [persistExam]);

  const clearExam = useCallback(() => {
    examRef.current = null;
    setExamState(null);
    persistExam(null);
  }, [persistExam]);

  const clearExamHistory = useCallback(() => {
    const next: ExamRecord[] = [];
    examHistoryRef.current = next;
    setExamHistory(next);
    AsyncStorage.removeItem(EXAM_HISTORY_KEY).catch(() => {});
  }, []);

  const clearAnswers = useCallback(() => {
    const next: Record<number, AnswerRecord> = {};
    answersRef.current = next;
    setAnswers(next);
    AsyncStorage.removeItem(ANSWERS_KEY).catch(() => {});
    const nextProgress: Progress = {};
    setProgressState(nextProgress);
    AsyncStorage.removeItem(PROGRESS_KEY).catch(() => {});
  }, []);

  const recordAnswer = useCallback(
    (id: number, correct: boolean, chosenIndex: number) => {
      // Per spec: a question marked "wrong" is NOT cleared by answering it
      // correctly again. Only the explicit "mark as correct" CTA clears it.
      // Answering wrong always marks it wrong.
      setAnswers((prev) => {
        const current = prev[id];
        let next: AnswerRecord;
        if (current?.state === "wrong") {
          next = { state: "wrong", chosenIndex };
        } else {
          next = {
            state: correct ? "correct" : "wrong",
            chosenIndex,
          };
        }
        if (
          current &&
          current.state === next.state &&
          current.chosenIndex === next.chosenIndex
        ) {
          return prev;
        }
        const updated = { ...prev, [id]: next };
        persistAnswers(updated);
        return updated;
      });
    },
    []
  );

  const markCorrect = useCallback((id: number) => {
    setAnswers((prev) => {
      if (prev[id]?.state === "correct") return prev;
      const updated = { ...prev, [id]: { state: "correct" as const } };
      persistAnswers(updated);
      return updated;
    });
  }, []);

  const setProgress = useCallback((mode: ListMode, index: number) => {
    setProgressState((prev) => {
      if (prev && prev[mode] === index) {
        return prev;
      }
      const next = { ...prev, [mode]: index };
      AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({
      answers,
      progress,
      lang,
      ready,
      setLang,
      recordAnswer,
      markCorrect,
      setProgress,
      exam,
      examHistory,
      startExam,
      setExamAnswer,
      finishExam,
      clearExam,
      clearExamHistory,
      clearAnswers,
    }),
    [
      answers,
      progress,
      lang,
      ready,
      setLang,
      recordAnswer,
      markCorrect,
      setProgress,
      exam,
      examHistory,
      startExam,
      setExamAnswer,
      finishExam,
      clearExam,
      clearExamHistory,
      clearAnswers,
    ]
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppStore(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}
