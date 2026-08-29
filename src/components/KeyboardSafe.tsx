import { KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps } from 'react-native';
import type { ReactNode } from 'react';

/**
 * The one home for keyboard behavior. Two contexts, two mechanisms — never
 * both on one surface (insets + KeyboardAvoidingView double-shift):
 *
 * - Screens (Settings, setup): ScrollView with taps handled and iOS
 *   `automaticallyAdjustKeyboardInsets`, which scrolls the focused input into
 *   view. Android needs nothing — window `adjustResize` is the default.
 * - Bottom sheets (session sheet, category picker): KeyboardAvoidingView
 *   (iOS padding) around a taps-handled ScrollView, riding the keyboard. On
 *   Android the modal window resizes and the bottom-anchored sheet rises.
 *
 * Two shipped bugs came from this knowledge living per-surface; a new input
 * surface starts safe by using one of these and configuring nothing.
 */
export function KeyboardSafeScrollView(props: ScrollViewProps) {
  return <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets {...props} />;
}

/** The sheet variant: content rides the keyboard; short content just doesn't scroll. */
export function KeyboardSafeSheetBody({ children, ...props }: ScrollViewProps & { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" {...props}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
