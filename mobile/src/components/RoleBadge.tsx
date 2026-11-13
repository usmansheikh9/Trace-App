import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, font, motion, radius, size, space } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  role: string;
  /** Pulses the dot (result screen). */
  pulse?: boolean;
  /** Fill colour; defaults to the light tint. Pass the palette tint for dark mode. */
  tint?: string;
  /** Makes the badge tappable (DEV role cycling). */
  onPress?: () => void;
};

/** Uppercase role pill: tint fill, 6px primary dot, 11px semibold primary text. */
export function RoleBadge({ role, pulse = false, tint = colors.tint, onPress }: Props) {
  const reduceMotion = useReducedMotion();
  const dotOpacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!pulse || reduceMotion) return;
    dotOpacity.value = withRepeat(
      withTiming(0.35, { duration: motion.pulseMs, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(dotOpacity);
  }, [pulse, reduceMotion, dotOpacity]);

  const dot = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));
  const pressed = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const content = (
    <>
      <Animated.View style={[styles.dot, dot]} />
      <Text style={styles.text}>{role.toUpperCase()}</Text>
    </>
  );

  if (!onPress) return <View style={[styles.badge, { backgroundColor: tint }]}>{content}</View>;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Role: ${role}. Tap to switch role.`}
      hitSlop={space.sm}
      onPressIn={() => {
        scale.value = withSpring(motion.pillPressedScale, motion.pressSpring);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.pressSpring);
      }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.badge, { backgroundColor: tint }, pressed]}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: size.roleDot,
    paddingHorizontal: space.md - space.xs,
    paddingVertical: space.xs,
    borderRadius: radius.full,
  },
  dot: {
    width: size.roleDot,
    height: size.roleDot,
    borderRadius: size.roleDot / 2,
    backgroundColor: colors.primary,
  },
  text: { ...font.badge, color: colors.primary },
});
