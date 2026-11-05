import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type ReturnKeyTypeOptions,
} from 'react-native';

import { useTheme } from '../../theme';

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  multiline?: boolean;
  /** Static text rendered inside the field, before the value (for example "PKR"). */
  prefix?: string;
  /** Static text rendered inside the field, after the value (for example "%"). */
  suffix?: string;
  trailing?: ReactNode;
  editable?: boolean;
  onSubmitEditing?: () => void;
}

export function InputField({
  label,
  value,
  onChangeText,
  error,
  hint,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'sentences',
  keyboardType,
  returnKeyType,
  multiline,
  prefix,
  suffix,
  trailing,
  editable = true,
  onSubmitEditing,
}: InputFieldProps) {
  const { colors, spacing, minTapTarget, radius, type } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[type.label, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.frame,
          {
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            borderRadius: radius.md,
            backgroundColor: editable ? colors.card : colors.surface,
            minHeight: multiline ? 96 : minTapTarget,
            paddingHorizontal: spacing.md,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {prefix ? (
          <Text style={[type.label, { color: colors.muted, marginRight: spacing.xs }]}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCorrect={autoCapitalize !== 'none'}
          multiline={multiline}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          style={[styles.input, { color: colors.text, paddingVertical: multiline ? 12 : 0 }]}
        />
        {suffix ? (
          <Text style={[type.label, { color: colors.muted, marginLeft: spacing.xs }]}>
            {suffix}
          </Text>
        ) : null}
        {trailing}
      </View>
      {error ? (
        <Text style={[type.caption, { color: colors.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[type.caption, { color: colors.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flexDirection: 'row' },
  input: { flex: 1, fontSize: 16, textAlignVertical: 'top', minHeight: 24 },
});
