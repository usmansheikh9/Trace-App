import { Pressable, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, font, motion } from '@/theme';

type Props = {
  title: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** A quiet, muted text action (e.g. Sign out). Dips in opacity while pressed, like FooterPrompt. */
export function TextLink({ title, onPress, style }: Props) {
  const opacity = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      hitSlop={8}
      onPress={onPress}
      onPressIn={() => {
        opacity.value = withTiming(motion.linkPressedOpacity, { duration: motion.linkPressInMs });
      }}
      onPressOut={() => {
        opacity.value = withTiming(1, { duration: motion.linkPressOutMs });
      }}
      style={[styles.hit, style]}
    >
      <Animated.Text style={[styles.text, animated]}>{title}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { alignSelf: 'center' },
  text: { ...font.link, color: colors.textMuted },
});
