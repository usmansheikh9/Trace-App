import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, font, motion, radius, shadow, size, space } from '@/theme';

type Props = TextInputProps & {
  label: string;
  /** Muted line under the input's label. */
  subtitle?: string;
  error?: string;
  /** 'login' fields are 56 tall, 'register' fields are 48 tall. */
  density?: 'login' | 'register';
  /** Shows an eye toggle on the right (for secureTextEntry fields). */
  revealable?: boolean;
};

export function TextField({
  label,
  subtitle,
  error,
  density = 'register',
  revealable,
  secureTextEntry,
  onFocus,
  onBlur,
  style,
  ...input
}: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hidden = !!secureTextEntry && !(revealable && revealed);
  const height = density === 'login' ? size.inputHeightLogin : size.inputHeightRegister;

  // 0 = resting, 1 = focused. Drives a subtle shadow lift over ~150ms.
  const focus = useSharedValue(0);
  const lift = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(focus.value, [0, 1], [shadow.field.shadowOpacity, shadow.fieldFocused.shadowOpacity]),
    shadowRadius: interpolate(focus.value, [0, 1], [shadow.field.shadowRadius, shadow.fieldFocused.shadowRadius]),
    elevation: interpolate(focus.value, [0, 1], [shadow.field.elevation, shadow.fieldFocused.elevation]),
  }));

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <Animated.View
        style={[
          styles.box,
          { height },
          focused && styles.focused,
          !!error && styles.invalid,
          lift,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          {...input}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            focus.value = withTiming(1, { duration: motion.focusMs });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            focus.value = withTiming(0, { duration: motion.focusMs });
            onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {revealable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={space.sm}
            onPress={() => setRevealed((v) => !v)}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={size.fieldIcon}
              color={colors.placeholder}
            />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...font.label,
    color: colors.textMuted,
    paddingLeft: space.xs,
    marginBottom: space.xs,
  },
  subtitle: {
    ...font.caption,
    color: colors.textMuted,
    paddingLeft: space.xs,
    marginBottom: space.xs,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.input,
    borderWidth: 1,
    // Shadow-only field: the border is invisible (same as the fill) and only
    // appears for focus/error. Width stays 1 so those states don't shift layout.
    borderColor: colors.card,
    backgroundColor: colors.card,
    ...shadow.field,
  },
  input: {
    ...font.input,
    flex: 1,
    height: '100%',
    padding: 0,
    color: colors.text,
  },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.danger },
  error: {
    ...font.caption,
    color: colors.danger,
    paddingLeft: space.xs,
    marginTop: space.xs,
  },
});
