import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useAuthStore } from '../stores/authStore';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, register, isLoading, error } = useAuthStore();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (isLogin) {
      await login(email, password);
    } else {
      await register(email, password);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            SmokeRing
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            AI-Powered BBQ Assistant
          </Text>
        </Surface>

        <Surface style={styles.formContainer}>
          <Text variant="headlineSmall" style={styles.formTitle}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={!!errors.email}
            style={styles.input}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
          />
          {errors.email && (
            <HelperText type="error" visible>
              {errors.email}
            </HelperText>
          )}

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            error={!!errors.password}
            style={styles.input}
            outlineColor="#1f3460"
            activeOutlineColor="#ff6b35"
            textColor="#fff"
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          {errors.password && (
            <HelperText type="error" visible>
              {errors.password}
            </HelperText>
          )}

          {!isLogin && (
            <>
              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                error={!!errors.confirmPassword}
                style={styles.input}
                outlineColor="#1f3460"
                activeOutlineColor="#ff6b35"
                textColor="#fff"
              />
              {errors.confirmPassword && (
                <HelperText type="error" visible>
                  {errors.confirmPassword}
                </HelperText>
              )}
            </>
          )}

          {error && (
            <HelperText type="error" visible style={styles.apiError}>
              {error}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitButton}
            buttonColor="#ff6b35"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>

          <Button
            mode="text"
            onPress={toggleMode}
            style={styles.toggleButton}
            textColor="#ff8c42"
          >
            {isLogin
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  title: {
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#aaa',
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
  },
  formTitle: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#1a1a2e',
  },
  apiError: {
    textAlign: 'center',
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  toggleButton: {
    marginTop: 8,
  },
});
