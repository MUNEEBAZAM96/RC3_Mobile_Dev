import { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme';

const SPLASH_LOGO = require('../../../assets/images/splash-screen.jpeg');
const SPLASH_BACKGROUND = '#000000';

interface RefreshSplashOverlayProps {
  visible: boolean;
  /** Default: "Refreshing…" */
  label?: string;
}

export function RefreshSplashOverlay({ visible, label = 'Refreshing…' }: RefreshSplashOverlayProps) {
  const { colors, spacing, type } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!visible) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 700, reduceMotion: ReduceMotion.System }),
        withTiming(1, { duration: 700, reduceMotion: ReduceMotion.System }),
      ),
      -1,
      false,
    );
  }, [visible, scale]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <View
      style={styles.fill}
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      importantForAccessibility="yes"
      pointerEvents="auto"
    >
      <View style={[styles.content, { gap: spacing.md, padding: spacing.lg }]}>
        <Animated.View style={logoStyle}>
          <Image
            source={SPLASH_LOGO}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessibilityLabel="GharSplit"
          />
        </Animated.View>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[type.body, styles.label]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SPLASH_BACKGROUND,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 320,
    width: '100%',
  },
  logo: {
    width: 260,
    height: 260,
  },
  label: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
