import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, font, motion, radius, size, space } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /**
   * 'auth'   = filled, radius 12 / 20px label (auth screens).
   * 'action' = filled, radius 16 / 17px label (scanner/result primary).
   * 'tonal'  = secondary: primary-tint fill, primary label, radius 16 / 17px.
   */
  variant?: 'auth' | 'action' | 'tonal';
  /** Leading icon. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Scale while pressed. Defaults to motion.pressedScale. */
  pressedScale?: number;
  /** Fire the light haptic on touch-down instead of on release. */
  hapticOnPressIn?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'auth',
  icon,
  pressedScale = motion.pressedScale,
  hapticOnPressIn,
  style,
}: Props) {
  const inactive = disabled || loading;
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tonal = variant === 'tonal';
  const action = variant === 'action' || tonal;
  const fg = tonal ? colors.primary : colors.onPrimary;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPressIn={() => {
        scale.value = withSpring(pressedScale, motion.pressSpring);
        if (hapticOnPressIn) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.pressSpring);
      }}
      onPress={() => {
        if (!hapticOnPressIn) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        styles.primary,
        action && styles.action,
        tonal && styles.tonal,
        disabled && styles.disabled,
        style,
        animated,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size.actionIcon} color={fg} /> : null}
          <Text style={[action ? styles.actionLabel : styles.label, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: size.buttonHeight,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  action: { borderRadius: radius.action },
  tonal: { backgroundColor: colors.tint },
  label: {
    ...font.button,
    color: colors.onPrimary,
  },
  actionLabel: {
    ...font.action,
    color: colors.onPrimary,
  },
  disabled: { opacity: 0.5 },
});
