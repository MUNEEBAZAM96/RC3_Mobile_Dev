import type { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

function familyStyle(weight: '400' | '600' | '700', fontsLoaded: boolean): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  if (fontsLoaded) {
    const map = {
      '400': fontFamily.regular,
      '600': fontFamily.semibold,
      '700': fontFamily.bold,
    } as const;
    return { fontFamily: map[weight] };
  }
  const weights = { '400': '400', '600': '600', '700': '700' } as const satisfies Record<string, TextStyle['fontWeight']>;
  return { fontWeight: weights[weight] };
}

export function typeScale(fontsLoaded: boolean) {
  return {
    title: { fontSize: 28, lineHeight: 34, ...familyStyle('700', fontsLoaded) },
    heading: { fontSize: 20, lineHeight: 26, ...familyStyle('700', fontsLoaded) },
    body: { fontSize: 16, lineHeight: 22, ...familyStyle('400', fontsLoaded) },
    label: { fontSize: 13, lineHeight: 18, ...familyStyle('600', fontsLoaded) },
    caption: { fontSize: 11, lineHeight: 14, ...familyStyle('600', fontsLoaded) },
    balance: { fontSize: 32, lineHeight: 38, ...familyStyle('700', fontsLoaded) },
  } as const satisfies Record<string, TextStyle>;
}

export type TypeScale = ReturnType<typeof typeScale>;
