import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, size, space } from '@/theme';

type Props = {
  children: ReactNode;
  /** Centers the content vertically and horizontally. */
  centered?: boolean;
  /** Caps the content width (the auth column) and centers it. */
  narrow?: boolean;
  /** Wraps the body in a keyboard-aware ScrollView (for long forms). */
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, centered, narrow, scroll, style }: Props) {
  const insets = useSafeAreaInsets();
  const content = [styles.full, narrow && styles.narrow, style];

  return (
    // One background-coloured view fills the whole window, edge to edge. The
    // safe-area insets are padding *inside* it, so the strips under the status
    // bar and home indicator are painted by this same view: no seam.
    <View style={[styles.root, { paddingTop: insets.top }, !scroll && { paddingBottom: insets.bottom }]}>
      {scroll ? (
        // Tracks the keyboard frame-by-frame (native-driven), so the form
        // glides with the keyboard and the focused field is scrolled into view.
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom },
            centered && styles.centered,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={space.lg}
        >
          <View style={content}>{children}</View>
        </KeyboardAwareScrollView>
      ) : (
        <View style={[styles.body, centered && styles.centered]}>
          <View style={content}>{children}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  full: { width: '100%' },
  narrow: { maxWidth: size.authMaxWidth },
  body: { flex: 1, paddingHorizontal: space.screenMargin },
  scrollContent: { flexGrow: 1, paddingHorizontal: space.screenMargin },
  centered: { justifyContent: 'center', alignItems: 'center' },
});
