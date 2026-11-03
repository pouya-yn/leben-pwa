import React, { forwardRef, useImperativeHandle, useRef } from "react";
import PagerView from "react-native-pager-view";

export type PagerRef = { setPage: (page: number) => void };

export type PagerProps = {
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  style?: object;
  children: React.ReactNode;
};

/** Native pager (iOS/Android) backed by react-native-pager-view. */
export const Pager = forwardRef<PagerRef, PagerProps>(function Pager(
  { initialPage = 0, onPageSelected, style, children },
  ref
) {
  const pagerRef = useRef<PagerView>(null);
  useImperativeHandle(
    ref,
    () => ({
      setPage: (page: number) => pagerRef.current?.setPage(page),
    }),
    []
  );
  return (
    <PagerView
      ref={pagerRef}
      style={style}
      initialPage={initialPage}
      onPageSelected={onPageSelected}
    >
      {children}
    </PagerView>
  );
});
