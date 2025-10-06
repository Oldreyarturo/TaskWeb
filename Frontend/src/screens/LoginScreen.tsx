import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { authAPI, authHelper } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface ApiError {
  response?: {
    data?: {
      message: string;
    };
    status?: number;
  };
  message: string;
}

interface ValidationErrors {
  username?: string;
  password?: string;
}

const LoginScreen = ({ navigation }: any) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string>('');
  
  const auth = useAuth();
  
  // Animaciones
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    setLoginError('');

    if (!username.trim()) {
      newErrors.username = 'El usuario es requerido';
    }

    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setLoginError('');

    try {
      const response = await authAPI.login({
        nombreUsuario: username,
        contrasena: password
      });

      // Login exitoso
      await authHelper.saveAuthData(response.data.token, response.data.user);
      auth.setUser(response.data.user);
      
      // Animación de éxito antes de navegar
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.replace('Dashboard');
      });

    } catch (error: unknown) {
      const apiError = error as ApiError;
      
      if (apiError.response?.status === 401) {
        // Error de credenciales
        setLoginError(apiError.response.data?.message || 'Usuario o contraseña incorrectos');
      } else if (apiError.message.includes('Network Error')) {
        setLoginError('Error de conexión. Verifica tu internet o que el servidor esté ejecutándose.');
      } else {
        setLoginError('Error al intentar iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = (fieldName: string) => {
    setFocusedField(fieldName);
    setLoginError('');
    if (errors[fieldName as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [fieldName]: undefined }));
    }
  };

  const handleInputBlur = () => {
    setFocusedField(null);
  };

  const handleKeyPress = (event: any) => {
    if (event.nativeEvent.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header con logo */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>📋</Text>
            </View>
            <Text style={styles.title}>TaskWeb</Text>
            <Text style={styles.subtitle}>Sistema de Gestión de Tareas</Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Iniciar Sesión</Text>
            
            {/* Mensaje de error de login */}
            {loginError ? (
              <View style={styles.loginErrorContainer}>
                <Text style={styles.loginErrorText}>⚠️ {loginError}</Text>
              </View>
            ) : null}
            
            {/* Campo Usuario */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Usuario</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'username' && styles.inputFocused,
                  errors.username && styles.inputError
                ]}
                placeholder="Ingresa tu usuario"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                onFocus={() => handleInputFocus('username')}
                onBlur={handleInputBlur}
                onKeyPress={handleKeyPress}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />
              {errors.username && (
                <Text style={styles.errorText}>{errors.username}</Text>
              )}
            </View>

            {/* Campo Contraseña */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'password' && styles.inputFocused,
                  errors.password && styles.inputError
                ]}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                onFocus={() => handleInputFocus('password')}
                onBlur={handleInputBlur}
                onKeyPress={handleKeyPress}
                secureTextEntry
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Botón de Login */}
            <TouchableOpacity 
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled
              ]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Ingresar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Información del sistema */}
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              Usa tus credenciales institucionales para acceder al sistema
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 30,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  form: {
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 30,
    textAlign: 'center',
  },
  loginErrorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  loginErrorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  inputFocused: {
    borderColor: '#6366f1',
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 20,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default LoginScreen;