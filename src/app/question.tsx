import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useBottomInset } from "@/hooks/use-bottom-inset";
import { Pager, type PagerRef } from "@/components/pager";
import { shareText } from "@/utils/share";
import { useAppStore } from "@/store/app-store";
import {
  QUESTION_BY_ID,
  QUESTIONS,
  buildShareText,
  type Lang,
  type ListMode,
  type Question,
} from "@/data/questions";
import { ImageStrip } from "@/components/image-strip";
import { stringsFor } from "@/i18n";
import { theme } from "@/theme";

export default function QuestionScreen() {
  const params = useLocalSearchParams<{ mode?: string; index?: string }>();
  const listMode: ListMode = params.mode === "wrong" ? "wrong" : "all";
  const initialIndex = Math.max(
    0,
    parseInt(String(params.index ?? "0"), 10) || 0
  );

  const { answers, lang, setProgress } = useAppStore();
  const t = stringsFor(lang);
  const bottomInset = useBottomInset();

  // The id list this screen pages through. For "wrong" mode it is a snapshot
  // taken on mount so it stays stable while practicing.
  const ids = useMemo(() => {
    if (listMode === "all") return QUESTIONS.map((q) => q.id);
    return QUESTIONS.filter((q) => answers[q.id]?.state === "wrong").map(
      (q) => q.id
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listMode]);

  const safeIndex = ids.length > 0 ? Math.min(initialIndex, ids.length - 1) : 0;
  const [current, setCurrent] = useState(safeIndex);
  const pagerRef = useRef<PagerRef>(null);

  // Persist "continue where you left off" on every page change.
  useEffect(() => {
    setProgress(listMode, current);
  }, [listMode, current, setProgress]);

  const goTo = useCallback(
    (next: number) => {
      pagerRef.current?.setPage(next);
    },
    []
  );

  if (ids.length === 0) {
    return (
      <View style={[styles.container, styles.emptyWrap]}>
        <Text style={styles.emptyTitle}>{t.noWrong}</Text>
        <Text style={styles.emptyHint}>{t.noWrongHint}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: t.questionOf(current + 1, ids.length) }}
      />

      {/* The pager owns the middle area; the footer below stays fixed and
          only the question content pages horizontally with animation. */}
      <Pager
        ref={pagerRef}
        style={styles.pager}
        initialPage={safeIndex}
        onPageSelected={(e) => {
          const position = e.nativeEvent.position;
          setCurrent(position);
        }}
      >
        {ids.map((id, i) => (
          <View key={id} style={styles.page}>
            {/* Only mount real content for pages near the current position. */}
            <QuestionPageContent
              active={Math.abs(i - current) <= 1}
              question={QUESTION_BY_ID.get(id)!}
              peekKey={`${id}:${lang}`}
            />
          </View>
        ))}
      </Pager>

      <View
        style={[
          styles.footer,
          { paddingBottom: styles.footer.paddingBottom + bottomInset },
        ]}
      >
        <Pressable
          style={[styles.navButton, current === 0 && styles.navDisabled]}
          disabled={current === 0}
          onPress={() => goTo(current - 1)}
        >
          <Text style={styles.navText}>← {t.back}</Text>
        </Pressable>
        <Pressable
          style={[
            styles.navButton,
            current + 1 >= ids.length && styles.navDisabled,
          ]}
          disabled={current + 1 >= ids.length}
          onPress={() => goTo(current + 1)}
        >
          <Text style={styles.navText}>{t.next} →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function QuestionPageContent({
  active,
  question,
  peekKey,
}: {
  active: boolean;
  question: Question;
  peekKey: string;
}) {
  const { answers, lang, recordAnswer, markCorrect } = useAppStore();
  const t = stringsFor(lang);

  // Per-question translation peek: switches only the currently displayed
  // question (and its options) to the other language. The stored entry is
  // keyed by question + global language, so it is automatically stale
  // (ignored) when a different question is shown or the global language
  // changes.
  const [peek, setPeek] = useState<{ key: string; lang: Lang } | null>(null);
  const contentLang: Lang = peek && peek.key === peekKey ? peek.lang : lang;

  // Feedback is per visit: a question you answered before renders fresh
  // (no revealed answer) so you can re-test yourself. Only answering it
  // again in this visit shows the result again.
  const [visitAnswer, setVisitAnswer] = useState<number | undefined>(
    undefined
  );
  const answeredThisVisit = visitAnswer !== undefined;

  const onShare = () => {
    const catalogIndex = QUESTIONS.findIndex((q) => q.id === question.id) + 1;
    const text = buildShareText(question, contentLang, catalogIndex);
    void shareText(text);
  };

  if (!active) {
    return <View style={styles.pagePlaceholder} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.badge}>
        {t.question} {question.id}
        {question.section === "berlin" ? " · Berlin" : ""}
      </Text>
      <Text style={styles.questionText}>
        {contentLang === "de" ? question.question.de : question.question.en}
      </Text>

      <ImageStrip question={question} lang={contentLang} />

      <View style={styles.options}>
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          const wasChosen = visitAnswer === i;
          const answered = answeredThisVisit;

          const boxStyle = [styles.option as object];
          const textStyle = [styles.optionText as object];
          if (answered && isCorrect) {
            boxStyle.push(styles.optionCorrect as object);
            textStyle.push(styles.optionTextCorrect as object);
          } else if (answered && wasChosen) {
            boxStyle.push(styles.optionWrong as object);
            textStyle.push(styles.optionTextWrong as object);
          }

          const label =
            question.images && question.images.length > 1
              ? `${contentLang === "de" ? "Bild" : "Picture"} ${i + 1}`
              : contentLang === "de"
                ? opt.de
                : opt.en;

          return (
            <Pressable
              key={i}
              onPress={() => {
                recordAnswer(question.id, isCorrect, i);
                setVisitAnswer(i);
              }}
              style={boxStyle}
            >
              <Text style={textStyle}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {answeredThisVisit && answers[question.id]?.state === "wrong" && (
        <View style={styles.wrongNotice}>
          <Text style={styles.wrongNoticeText}>{t.markedWrong}</Text>
          <Pressable
            style={styles.markCorrectButton}
            onPress={() => markCorrect(question.id)}
          >
            <Text style={styles.markCorrectText}>{t.markAsCorrect}</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.actionsRow}>
        <Pressable style={styles.shareButton} onPress={onShare}>
          <Text style={styles.shareText}>↗ {t.share}</Text>
        </Pressable>
        <Pressable
          style={styles.langPill}
          onPress={() =>
            setPeek({ key: peekKey, lang: contentLang === "de" ? "en" : "de" })
          }
        >
          <Text style={styles.langPillText}>
            {contentLang === "de" ? "🌐 EN" : "🌐 DE"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pagePlaceholder: {
    flex: 1,
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
  image: {
    width: "48%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
  },
  imageSolo: {
    width: "100%",
    aspectRatio: 4 / 3,
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
  optionText: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.text,
  },
  optionCorrect: {
    backgroundColor: theme.correctSoft,
    borderColor: theme.correct,
  },
  optionTextCorrect: {
    color: theme.correct,
    fontWeight: "700",
  },
  optionWrong: {
    backgroundColor: theme.wrongSoft,
    borderColor: theme.wrong,
  },
  optionTextWrong: {
    color: theme.wrong,
    fontWeight: "600",
  },
  wrongNotice: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  wrongNoticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.muted,
  },
  markCorrectButton: {
    backgroundColor: theme.correct,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  markCorrectText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  shareButton: {
    alignSelf: "flex-start",
    backgroundColor: theme.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  shareText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
  },
  langPill: {
    alignSelf: "flex-start",
    backgroundColor: theme.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  langPillText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.primary,
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
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
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
