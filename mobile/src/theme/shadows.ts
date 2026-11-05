import { Platform, type ViewStyle } from 'react-native';

export function cardShadow(elevation = 2): ViewStyle {
  if (Platform.OS === 'android') return { elevation };
  return {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  };
}
