import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { useAppStore } from "@/store/app-store";
import { confirmDestructive } from "@/utils/confirm";
import { QUESTION_BY_ID, type Lang, type Question } from "@/data/questions";
import { stringsFor } from "@/i18n";
import { theme } from "@/theme";

function formatDate(ts: number, lang: Lang): string {
  const locale = lang === "de" ? "de-DE" : "en-US";
  const d = new Date(ts);
  return `${d.toLocaleDateString(locale)}, ${d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatDuration(seconds: number, lang: Lang): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return lang === "de" ? `${minutes} Min.` : `${minutes} min`;
}

export default function ExamHistoryScreen() {
  const { examHistory, lang, clearExamHistory } = useAppStore();
  const t = stringsFor(lang);
  const [expanded, setExpanded] = useState<number | null>(null);

  const confirmClear = () => {
    confirmDestructive(
      t.clearHistoryConfirmTitle,
      t.clearHistoryConfirmText,
      t.cancel,
      t.delete,
      () => {
        clearExamHistory();
        setExpanded(null);
      }
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t.examHistory,
          headerRight:
            examHistory.length > 0
              ? () => (
                  <Pressable onPress={confirmClear} hitSlop={8}>
                    <Text style={styles.clearButton}>{t.clearHistory}</Text>
                  </Pressable>
                )
              : undefined,
        }}
      />
      <FlatList
        data={examHistory}
        keyExtractor={(r) => String(r.takenAt)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t.historyEmpty}</Text>
            <Text style={styles.emptyHint}>{t.historyEmptyHint}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOpen = expanded === item.takenAt;
          const wrongDetails: { q: Question; chosen: number }[] = [];
          for (const id of item.ids) {
            const q = QUESTION_BY_ID.get(id);
            if (!q) continue;
            const chosen = item.answers[id];
            if (chosen === undefined || chosen === q.correctIndex) continue;
            wrongDetails.push({ q, chosen });
          }

          return (
            <View style={styles.card}>
              <Pressable
                style={styles.row}
                onPress={() => setExpanded(isOpen ? null : item.takenAt)}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowDate}>
                    {formatDate(item.takenAt, lang)}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {t.scoreOf(item.correct, item.ids.length)} ·{" "}
                    {formatDuration(item.durationSeconds, lang)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: item.passed
                        ? theme.correctSoft
                        : theme.wrongSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: item.passed ? theme.correct : theme.wrong },
                    ]}
                  >
                    {item.passed ? t.passed : t.failed}
                  </Text>
                </View>
              </Pressable>

              {isOpen && (
                <View style={styles.details}>
                  {wrongDetails.length === 0 ? (
                    <Text style={styles.allCorrect}>{t.allCorrectInExam}</Text>
                  ) : (
                    wrongDetails.map(({ q, chosen }) => (
                      <View key={q.id} style={styles.detailCard}>
                        <Text style={styles.detailId}>
                          {t.question} {q.id}
                          {q.section === "berlin" ? " · Berlin" : ""}
                        </Text>
                        <Text style={styles.detailQuestion}>
                          {lang === "de" ? q.question.de : q.question.en}
                        </Text>
                        <Text style={[styles.detailLine, { color: theme.wrong }]}>
                          {t.yourAnswer}:{" "}
                          {lang === "de"
                            ? q.options[chosen].de
                            : q.options[chosen].en}
                        </Text>
                        <Text
                          style={[styles.detailLine, { color: theme.correct }]}
                        >
                          {t.correctAnswer}:{" "}
                          {lang === "de"
                            ? q.options[q.correctIndex].de
                            : q.options[q.correctIndex].en}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  clearButton: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.wrong,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowDate: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
  },
  rowMeta: {
    fontSize: 13,
    color: theme.muted,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    padding: 12,
    gap: 8,
  },
  allCorrect: {
    fontSize: 14,
    color: theme.correct,
    fontWeight: "600",
  },
  detailCard: {
    backgroundColor: theme.background,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  detailId: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.muted,
    textTransform: "uppercase",
  },
  detailQuestion: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
    color: theme.text,
  },
  detailLine: {
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.text,
  },
  emptyHint: {
    fontSize: 14,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});
