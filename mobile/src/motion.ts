import { FadeIn, FadeInUp, ReduceMotion } from 'react-native-reanimated';
import { motion } from '@/theme';

export type EnterTiming = {
  /** Spring response in ms. Defaults to motion.enterDuration. */
  duration?: number;
  /** Delay between consecutive items in ms. Defaults to motion.stagger. */
  stagger?: number;
};

/**
 * Entering animation for the nth element of a screen: fade + a small upward
 * settle on a critically damped spring (no overshoot). Runs on the UI thread.
 * With reduced motion on, it becomes a plain cross-fade (no movement).
 */
export function enter(index: number, reduced = false, timing: EnterTiming = {}) {
  const { duration = motion.enterDuration, stagger = motion.stagger } = timing;
  const delay = Math.min(index * stagger, motion.maxEnterDelay);

  if (reduced) {
    // Explicit Never: the default (System) would skip the fade entirely.
    return FadeIn.delay(delay).duration(motion.reducedFadeMs).reduceMotion(ReduceMotion.Never);
  }

  return FadeInUp.delay(delay)
    .springify(duration)
    .dampingRatio(1)
    .withInitialValues({
      opacity: 0,
      transform: [{ translateY: motion.enterOffset }],
    });
}
