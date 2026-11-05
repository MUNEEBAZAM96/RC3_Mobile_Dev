import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from 'react-native-reanimated';

/**
 * Shared motion vocabulary for the household screens.
 * Every config opts into `ReduceMotion.System`, so when the OS "Reduce motion"
 * setting is on, Reanimated skips the animation and jumps to the final value.
 */
export const springGentle = {
  damping: 20,
  stiffness: 240,
  mass: 0.9,
  reduceMotion: ReduceMotion.System,
} as const;

export const timingSmooth = {
  duration: 420,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

export const layoutSpring = LinearTransition.springify()
  .damping(20)
  .stiffness(240)
  .reduceMotion(ReduceMotion.System);

export const enterFade = FadeIn.duration(220).reduceMotion(ReduceMotion.System);
export const exitFade = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

export function enterRise(index = 0) {
  return FadeInDown.duration(260)
    .delay(Math.min(index, 6) * 40)
    .reduceMotion(ReduceMotion.System);
}
