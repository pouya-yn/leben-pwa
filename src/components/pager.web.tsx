import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";

export type PagerRef = { setPage: (page: number) => void };

export type PagerProps = {
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  style?: object;
  children: React.ReactNode;
};

/**
 * Web pager backed by CSS scroll-snap: native-feeling swipe physics,
 * vertical scrolling inside pages keeps working, and programmatic
 * setPage() animates via smooth scrolling.
 */
export const Pager = forwardRef<PagerRef, PagerProps>(function Pager(
  { initialPage = 0, onPageSelected, style, children },
  ref
) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef(initialPage);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pages = React.Children.toArray(children);

  // Jump to the initial page instantly once layout is available.
  React.useLayoutEffect(() => {
    const apply = () => {
      const el = scrollRef.current;
      if (!el || el.clientWidth === 0) return false;
      el.scrollLeft = initialPage * el.clientWidth;
      return true;
    };
    if (!apply()) {
      requestAnimationFrame(() => apply());
    }
  }, [initialPage]);

  useImperativeHandle(
    ref,
    () => ({
      setPage: (page: number) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ left: page * el.clientWidth, behavior: "smooth" });
      },
    }),
    []
  );

  // Fire onPageSelected once scrolling has settled.
  const handleScroll = () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el || el.clientWidth === 0) return;
      const position = Math.max(
        0,
        Math.min(pages.length - 1, Math.round(el.scrollLeft / el.clientWidth))
      );
      if (position !== positionRef.current) {
        positionRef.current = position;
        onPageSelected?.({ nativeEvent: { position } });
      }
    }, 140);
  };

  return (
    <View style={[style, styles.fill]}>
      {React.createElement(
        "div",
        {
          ref: scrollRef,
          className: "leben-pager",
          onScroll: handleScroll,
        },
        ...pages.map((child, i) =>
          React.createElement(
            "div",
            { key: i, className: "leben-pager-slide" },
            child
          )
        )
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
