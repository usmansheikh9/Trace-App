import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, font, motion } from '@/theme';

type Props = {
  /** Muted lead-in, e.g. "Need an account?" */
  prompt: string;
  /** Primary-coloured action, e.g. "Register" */
  action: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** "Prompt  Action" footer line; the action dips in opacity while pressed. */
export function FooterPrompt({ prompt, action, onPress, style }: Props) {
  const opacity = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[styles.row, style]}>
      <Text style={styles.prompt}>{`${prompt} `}</Text>
      <Pressable
        accessibilityRole="link"
        hitSlop={8}
        onPress={onPress}
        onPressIn={() => {
          opacity.value = withTiming(motion.linkPressedOpacity, { duration: motion.linkPressInMs });
        }}
        onPressOut={() => {
          opacity.value = withTiming(1, { duration: motion.linkPressOutMs });
        }}
      >
        <Animated.Text style={[styles.action, animated]}>{action}</Animated.Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  prompt: { ...font.link, color: colors.textMuted },
  action: { ...font.link, color: colors.primary },
});
