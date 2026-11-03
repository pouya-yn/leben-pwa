import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { useAppStore } from "@/store/app-store";
import {
  BERLIN_QUESTIONS,
  GENERAL_QUESTIONS,
  QUESTIONS,
  CATALOG_VERSION,
} from "@/data/questions";
import { stringsFor } from "@/i18n";
import { theme } from "@/theme";

function LangToggle() {
  const { lang, setLang } = useAppStore();
  return (
    <View style={styles.langToggle}>
      {(["de", "en"] as const).map((l) => (
        <Pressable
          key={l}
          onPress={() => setLang(l)}
          style={[styles.langBtn, lang === l && styles.langBtnActive]}
        >
          <Text style={[styles.langBtnText, lang === l && styles.langBtnTextActive]}>
            {l.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatRow({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View style={styles.statRow}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const {
    answers,
    progress,
    lang,
    exam,
    examHistory,
  } = useAppStore();
  const t = stringsFor(lang);

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    for (const q of QUESTIONS) {
      const s = answers[q.id]?.state;
      if (s === "correct") correct++;
      else if (s === "wrong") wrong++;
    }
    return { correct, wrong, unanswered: QUESTIONS.length - correct - wrong };
  }, [answers]);

  // "Continue practicing" always resumes the full-catalog position; the
  // wrong-questions list has its own remembered position.
  const resumeIndex = progress?.all ?? 0;

  const byId = useMemo(() => new Map(QUESTIONS.map((q) => [q.id, q])), []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerRight: () => <LangToggle /> }} />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.progress}</Text>
        <StatRow label={t.correct} count={stats.correct} color={theme.correct} />
        <StatRow label={t.wrong} count={stats.wrong} color={theme.wrong} />
        <StatRow
          label={t.unanswered}
          count={stats.unanswered}
          color={theme.unanswered}
        />
        <Text style={styles.cardMeta}>
          {t.subtitle} · {GENERAL_QUESTIONS.length} + {BERLIN_QUESTIONS.length}{" "}
          · {t.catalogVersion} {CATALOG_VERSION}
        </Text>
      </View>

      <Link
        href={{
          pathname: "/question",
          params: { mode: "all", index: String(resumeIndex) },
        }}
        asChild
      >
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {stats.unanswered === QUESTIONS.length
              ? t.startPractice
              : t.continuePractice}
          </Text>
        </Pressable>
      </Link>

      <Link href={{ pathname: "/list", params: { mode: "all" } }} asChild>
        <Pressable style={styles.rowButton}>
          <Text style={styles.rowButtonText}>{t.allQuestions}</Text>
          <Text style={styles.rowButtonCount}>{QUESTIONS.length}</Text>
        </Pressable>
      </Link>

      <Link href={{ pathname: "/list", params: { mode: "wrong" } }} asChild>
        <Pressable style={styles.rowButton}>
          <Text style={styles.rowButtonText}>{t.wrongQuestions}</Text>
          <Text style={[styles.rowButtonCount, { color: theme.wrong }]}>
            {stats.wrong}
          </Text>
        </Pressable>
      </Link>

      <Link href={{ pathname: "/exam" }} asChild>
        <Pressable style={styles.rowButton}>
          <Text style={styles.rowButtonText}>📝 {t.mockExam}</Text>
          {exam && !exam.finishedAt ? (
            <Text style={[styles.rowButtonCount, { color: theme.primary }]}>
              {t.examInProgress}
            </Text>
          ) : exam?.finishedAt ? (
            <Text style={styles.rowButtonCount}>
              {t.lastResult(
                exam.ids.filter(
                  (id) =>
                    byId.get(id) &&
                    exam.answers[id] === byId.get(id)!.correctIndex
                ).length,
                exam.ids.length
              )}
            </Text>
          ) : (
            <Text style={styles.rowButtonCount}>33</Text>
          )}
        </Pressable>
      </Link>

      <Link href={{ pathname: "/exam-history" }} asChild>
        <Pressable style={styles.rowButton}>
          <Text style={styles.rowButtonText}>🗓 {t.examHistory}</Text>
          <Text style={styles.rowButtonCount}>{examHistory.length}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: theme.muted,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statLabel: {
    fontSize: 15,
    color: theme.text,
    flex: 1,
  },
  statCount: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardMeta: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.text,
  },
  rowButtonCount: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.muted,
  },
  langToggle: {
    flexDirection: "row",
    backgroundColor: theme.card,
    borderRadius: 8,
    padding: 2,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  langBtnActive: {
    backgroundColor: theme.primary,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.muted,
  },
  langBtnTextActive: {
    color: "#fff",
  },
});
