import { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useBottomInset } from "@/hooks/use-bottom-inset";
import { confirmDestructive } from "@/utils/confirm";
import { useAppStore } from "@/store/app-store";
import {
  QUESTIONS,
  type AnswerState,
  type ListMode,
} from "@/data/questions";
import { stringsFor } from "@/i18n";
import { theme } from "@/theme";

function StatusIcon({ state }: { state: AnswerState | undefined }) {  if (state === "correct") {
    return (
      <View style={[styles.icon, { backgroundColor: theme.correctSoft }]}>
        <Text style={[styles.iconText, { color: theme.correct }]}>✓</Text>
      </View>
    );
  }
  if (state === "wrong") {
    return (
      <View style={[styles.icon, { backgroundColor: theme.wrongSoft }]}>
        <Text style={[styles.iconText, { color: theme.wrong }]}>✗</Text>
      </View>
    );
  }
  return (
    <View style={[styles.icon, styles.iconUnanswered]}>
      <Text style={[styles.iconText, { color: theme.unanswered }]}>–</Text>
    </View>
  );
}

export default function ListScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const listMode: ListMode = mode === "wrong" ? "wrong" : "all";
  const { answers, lang, clearAnswers } = useAppStore();
  const t = stringsFor(lang);
  const bottomInset = useBottomInset();

  const answeredCount = useMemo(
    () => Object.values(answers).length,
    [answers]
  );

  const confirmReset = () => {
    confirmDestructive(
      t.resetAnswersTitle,
      t.resetAnswersText,
      t.cancel,
      t.delete,
      clearAnswers
    );
  };

  const items = useMemo(() => {
    if (listMode === "all") {
      return QUESTIONS.map((q) => ({ q, index: q.id - 1 }));
    }
    const out: { q: (typeof QUESTIONS)[number]; index: number }[] = [];
    QUESTIONS.forEach((q, i) => {
      if (answers[q.id]?.state === "wrong") out.push({ q, index: i });
    });
    return out;
    // Snapshot taken when the screen opens; answering while the list is open
    // does not reshuffle it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listMode]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title:
            listMode === "wrong" ? t.wrongListTitle : t.allListTitle,
          headerRight:
            listMode === "all" && answeredCount > 0
              ? () => (
                  <Pressable onPress={confirmReset} hitSlop={8}>
                    <Text style={styles.resetButton}>
                      ↺ {t.resetAnswers}
                    </Text>
                  </Pressable>
                )
              : undefined,
        }}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.q.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: styles.listContent.paddingBottom + bottomInset },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{t.noWrong}</Text>
            <Text style={styles.emptyHint}>{t.noWrongHint}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Link
            href={{
              pathname: "/question",
              params: { mode: listMode, index: String(item.index) },
            }}
            asChild
          >
            <Pressable style={styles.row}>
              <StatusIcon state={answers[item.q.id]?.state} />
              <View style={styles.rowMain}>
                <Text style={styles.rowId}>
                  {t.question} {item.q.id}
                  {item.q.section === "berlin" ? " · Berlin" : ""}
                </Text>
                <Text numberOfLines={2} style={styles.rowText}>
                  {lang === "de" ? item.q.question.de : item.q.question.en}
                </Text>
              </View>
            </Pressable>
          </Link>
        )}
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
    paddingBottom: 12,
    gap: 8,
  },
  resetButton: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.wrong,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
  },
  rowMain: {
    flex: 1,
  },
  rowId: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  rowText: {
    fontSize: 15,
    color: theme.text,
    lineHeight: 20,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconUnanswered: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  iconText: {
    fontSize: 15,
    fontWeight: "800",
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
