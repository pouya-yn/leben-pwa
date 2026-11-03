import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useBottomInset } from "@/hooks/use-bottom-inset";
import { confirmDestructive } from "@/utils/confirm";
import { useAppStore, type ExamState } from "@/store/app-store";
import {
  BERLIN_QUESTIONS,
  GENERAL_QUESTIONS,
  type Question,
} from "@/data/questions";
import { getImages } from "@/data/images";
import { stringsFor } from "@/i18n";
import {
  EXAM_BERLIN_COUNT,
  EXAM_DURATION_SECONDS,
  EXAM_GENERAL_COUNT,
  EXAM_PASS_COUNT,
  EXAM_TOTAL,
} from "@/exam-config";
import { theme } from "@/theme";

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function drawExamIds(): number[] {
  const general = shuffle(GENERAL_QUESTIONS)
    .slice(0, EXAM_GENERAL_COUNT)
    .map((q) => q.id);
  const berlin = shuffle(BERLIN_QUESTIONS)
    .slice(0, EXAM_BERLIN_COUNT)
    .map((q) => q.id);
  // Interleave the 3 Berlin questions at random positions, like the real test.
  const ids = [...general];
  for (const id of berlin) {
    ids.splice(Math.floor(Math.random() * (ids.length + 1)), 0, id);
  }
  return ids;
}

function scoreExam(
  exam: { ids: number[]; answers: Record<number, number> },
  byId: Map<number, Question>
) {
  let correct = 0;
  const details = exam.ids.map((id) => {
    const q = byId.get(id)!;
    const chosen = exam.answers[id];
    const isCorrect = chosen !== undefined && chosen === q.correctIndex;
    if (isCorrect) correct++;
    return { q, chosen, isCorrect };
  });
  return { correct, details };
}

export default function ExamScreen() {
  const {
    exam,
    startExam,
    setExamAnswer,
    finishExam,
    clearExam,
    lang,
  } = useAppStore();
  const t = stringsFor(lang);

  const byId = useMemo(
    () => new Map([...GENERAL_QUESTIONS, ...BERLIN_QUESTIONS].map((q) => [q.id, q])),
    []
  );

  const phase = !exam ? "intro" : exam.finishedAt ? "results" : "running";

  const start = useCallback(() => {
    startExam(drawExamIds());
  }, [startExam]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t.mockExam }} />
      {phase === "intro" && <IntroView t={t} onStart={start} />}
      {phase === "running" && exam && (
        <RunningView
          key={exam.startedAt}
          exam={exam}
          byId={byId}
          onAnswer={setExamAnswer}
          onFinish={finishExam}
        />
      )}
      {phase === "results" && exam && (
        <ResultsView
          exam={exam}
          byId={byId}
          onNewExam={start}
          onDone={clearExam}
        />
      )}
    </View>
  );
}

function IntroView({
  t,
  onStart,
}: {
  t: ReturnType<typeof stringsFor>;
  onStart: () => void;
}) {
  return (
    <View style={styles.introWrap}>
      <View style={styles.card}>
        <Text style={styles.rulesTitle}>{t.examRulesTitle}</Text>
        <Text style={styles.rulesText}>{t.examRules}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={onStart}>
        <Text style={styles.primaryButtonText}>{t.startExam}</Text>
      </Pressable>
    </View>
  );
}

function RunningView({
  exam,
  byId,
  onAnswer,
  onFinish,
}: {
  exam: ExamState;
  byId: Map<number, Question>;
  onAnswer: (id: number, optionIndex: number) => void;
  onFinish: () => void;
}) {
  const { lang } = useAppStore();
  const t = stringsFor(lang);
  const bottomInset = useBottomInset();

  const [pos, setPos] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - exam.startedAt) / 1000);
    return Math.max(0, EXAM_DURATION_SECONDS - elapsed);
  });

  // Countdown timer: the interval is an external subscription; the updater
  // only clamps at zero. Auto-finish happens in the watcher effect below.
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      onFinish();
    }
  }, [secondsLeft, onFinish]);

  const id = exam.ids[pos];
  const question = byId.get(id);
  if (!question) return null;
  const chosen = exam.answers[id];
  const answeredCount = Object.keys(exam.answers).length;

  const confirmFinish = () => {
    const unanswered = EXAM_TOTAL - answeredCount;
    if (unanswered > 0) {
      confirmDestructive(
        t.finishExam,
        t.unansweredWarning(unanswered),
        t.cancel,
        t.finishExam,
        onFinish
      );
    } else {
      onFinish();
    }
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <View style={styles.flex}>
      <View style={styles.examBar}>
        <Text style={styles.examProgress}>
          {t.questionOf(pos + 1, EXAM_TOTAL)}
        </Text>
        <Text
          style={[
            styles.examTimer,
            secondsLeft < 300 && { color: theme.wrong },
          ]}
        >
          {mm}:{ss}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.badge}>
          {t.question} {question.id}
          {question.section === "berlin" ? " · Berlin" : ""}
        </Text>
        <Text style={styles.questionText}>
          {lang === "de" ? question.question.de : question.question.en}
        </Text>

        {(() => {
          const images = getImages(question.images);
          if (images.length === 0) return null;
          return (
            <View
              style={[
                styles.imageStrip,
                images.length === 1 && styles.imageSingle,
              ]}
            >
              {images.map((src, i) => (
                <View
                  key={i}
                  style={[
                    styles.imageCell,
                    images.length === 1 && styles.imageCellFull,
                  ]}
                >
                  <Image source={src} style={styles.image} resizeMode="contain" />
                </View>
              ))}
            </View>
          );
        })()}

        <View style={styles.options}>
          {question.options.map((opt, i) => {
            const selected = chosen === i;
            const isPicture = Boolean(question.images && question.images.length > 1);
            const label = isPicture
              ? `${lang === "de" ? "Bild" : "Picture"} ${i + 1}`
              : lang === "de"
                ? opt.de
                : opt.en;
            return (
              <Pressable
                key={i}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => onAnswer(id, i)}
              >
                <Text
                  style={[styles.optionText, selected && styles.optionTextSelected]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.finishButton} onPress={confirmFinish}>
          <Text style={styles.finishText}>
            {t.finishExam} ({answeredCount}/{EXAM_TOTAL})
          </Text>
        </Pressable>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: styles.footer.paddingBottom + bottomInset },
        ]}
      >
        <Pressable
          style={[styles.navButton, pos === 0 && styles.navDisabled]}
          disabled={pos === 0}
          onPress={() => setPos((p) => p - 1)}
        >
          <Text style={styles.navText}>← {t.back}</Text>
        </Pressable>
        <Pressable
          style={[
            styles.navButton,
            pos + 1 >= exam.ids.length && styles.navDisabled,
          ]}
          disabled={pos + 1 >= exam.ids.length}
          onPress={() => setPos((p) => p + 1)}
        >
          <Text style={styles.navText}>{t.next} →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ResultsView({
  exam,
  byId,
  onNewExam,
  onDone,
}: {
  exam: ExamState;
  byId: Map<number, Question>;
  onNewExam: () => void;
  onDone: () => void;
}) {
  const { lang } = useAppStore();
  const t = stringsFor(lang);
  const { correct, details } = scoreExam(exam, byId);
  const passed = correct >= EXAM_PASS_COUNT;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View
        style={[
          styles.resultBanner,
          { backgroundColor: passed ? theme.correctSoft : theme.wrongSoft },
        ]}
      >
        <Text style={[styles.resultTitle, { color: passed ? theme.correct : theme.wrong }]}>
          {passed ? t.passed : t.failed}
        </Text>
        <Text style={[styles.resultScore, { color: passed ? theme.correct : theme.wrong }]}>
          {t.scoreOf(correct, EXAM_TOTAL)}
        </Text>
      </View>

      <Text style={styles.reviewTitle}>{t.reviewTitle}</Text>
      {details.map(({ q, chosen, isCorrect }, i) => (
        <View key={q.id} style={styles.reviewCard}>
          <Text style={styles.reviewIndex}>
            {i + 1}. {t.question} {q.id}
          </Text>
          <Text style={styles.reviewQuestion}>
            {lang === "de" ? q.question.de : q.question.en}
          </Text>
          <Text
            style={[
              styles.reviewLine,
              { color: isCorrect ? theme.correct : theme.wrong },
            ]}
          >
            {t.yourAnswer}:{" "}
            {chosen === undefined
              ? "—"
              : `${chosen + 1}) ${
                  lang === "de"
                    ? q.options[chosen].de
                    : q.options[chosen].en
                }`}
          </Text>
          {!isCorrect && (
            <Text style={[styles.reviewLine, { color: theme.correct }]}>
              {t.correctAnswer}: {q.correctIndex + 1}){" "}
              {lang === "de"
                ? q.options[q.correctIndex].de
                : q.options[q.correctIndex].en}
            </Text>
          )}
        </View>
      ))}

      <Pressable style={styles.primaryButton} onPress={onNewExam}>
        <Text style={styles.primaryButtonText}>{t.newExam}</Text>
      </Pressable>
      <Pressable style={styles.rowButton} onPress={onDone}>
        <Text style={styles.rowButtonText}>{t.backHome}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  flex: {
    flex: 1,
  },
  introWrap: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: theme.muted,
  },
  rulesText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.text,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  rowButton: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  rowButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
  },
  examBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  examProgress: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
  },
  examTimer: {
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    color: theme.text,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 19,
    fontWeight: "600",
    lineHeight: 27,
    color: theme.text,
  },
  imageStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 8,
  },
  imageSingle: {
    justifyContent: "center",
  },
  imageCell: {
    width: "48%",
  },
  imageCellFull: {
    width: "100%",
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
  },
  options: {
    gap: 10,
  },
  option: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionSelected: {
    backgroundColor: theme.primarySoft,
    borderColor: theme.primary,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.text,
  },
  optionTextSelected: {
    color: theme.primary,
    fontWeight: "700",
  },
  finishButton: {
    backgroundColor: theme.correct,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  finishText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    paddingBottom: 12,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.background,
  },
  navDisabled: {
    opacity: 0.4,
  },
  navText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.text,
  },
  resultBanner: {
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  resultScore: {
    fontSize: 16,
    fontWeight: "600",
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: theme.muted,
  },
  reviewCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  reviewIndex: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.muted,
    textTransform: "uppercase",
  },
  reviewQuestion: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
    color: theme.text,
  },
  reviewLine: {
    fontSize: 14,
    lineHeight: 20,
  },
});
