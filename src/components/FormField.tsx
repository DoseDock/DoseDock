import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  ...inputProps
}) => {
  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <Text className="text-red-600"> *</Text>}
      </Text>
      <TextInput
        {...inputProps}
        className={`border rounded-lg px-4 py-3 text-base ${
          error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
        }`}
        accessibilityLabel={label}
        aria-required={required}
      />
      {error && (
        <Text className="text-red-600 text-sm mt-1" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
};

