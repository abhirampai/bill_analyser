import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import Colors from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

export default function Login() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth listener in _layout.tsx will handle navigation
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.headerIconBg }]}>
             <Ionicons name="receipt-outline" size={40} color={theme.headerIconColor} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Sign in to access your bills
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
            placeholder="Enter your email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.text, borderColor: theme.border }]}
            placeholder="Enter your password"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
             <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Don't have an account?
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={[styles.link, { color: theme.accent }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
  },
});
