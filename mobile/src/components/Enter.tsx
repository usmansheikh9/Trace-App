import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { enter } from '@/motion';
import type { EnterTiming } from '@/motion';

type Props = EnterTiming & {
  /** Position in the screen's entrance sequence (0 = first). */
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Plays the staggered entrance for its children when the screen mounts. */
export function Enter({ index, duration, stagger, children, style }: Props) {
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={enter(index, reduced, { duration, stagger })} style={style}>
      {children}
    </Animated.View>
  );
}
