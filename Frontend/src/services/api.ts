// Frontend/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Helper para mostrar la URL en desarrollo
const logServerUrl = (url: string) => {
  if (__DEV__) {
    console.log(`
      🔌 Conectando al servidor:
      URL: ${url}
      Platform: ${Platform.OS}
      ${Platform.OS !== 'web' ? '📱 En dispositivo móvil usa la IP de tu PC' : '🌐 En web usa localhost'}
    `);
  }
};

// Configura la URL base según la plataforma
const getBaseUrl = () => {
  // Producción
  if (!__DEV__) return 'https://tu-api-produccion.com/api';

  // 0. Variables de entorno (recomendado en redes restringidas: usar ngrok/túnel)
  const envApiUrl = (process.env as any)?.EXPO_PUBLIC_API_URL || (process.env as any)?.API_URL;
  if (envApiUrl) return envApiUrl;

  // 1. Primero intentar obtener del config (app.json o app.config.js)
  const configApiUrl = Constants.expoConfig?.extra?.API_URL ?? Constants.manifest?.extra?.API_URL;
  if (configApiUrl) return configApiUrl;

  // Web usa localhost
  if (Platform.OS === 'web') return 'http://localhost:5000/api';

  // 2. Intentar obtener la IP del host de varias fuentes (Expo 54+)
  const possibleHosts = [
    Constants.manifest?.debuggerHost,
    Constants.manifest?.hostUri?.split(':')[0],
    Constants.expoConfig?.hostUri?.split(':')[0],
    Constants.manifest?.packagerOpts?.dev 
      ? (Constants.manifest as any)?.packagerOpts?.host
      : null,
    (Constants.expoConfig as any)?.extra?.debuggerHost,
  ].filter(Boolean) as string[];

  // Usar el primer host válido que encontremos, normalizando para quitar puerto si viene incluido
  for (const rawHost of possibleHosts) {
    const hostOnly = rawHost.includes(':') ? rawHost.split(':')[0] : rawHost;
    if (hostOnly && hostOnly !== 'localhost') {
      console.log('✅ IP detectada:', hostOnly);
      return `http://${hostOnly}:5000/api`;
    }
  }

  // Si no se pudo obtener la IP de ninguna manera, mostramos un error útil
  console.error('\n⚠️ No se pudo determinar la IP del servidor automáticamente.');
  console.error('\nInformación de diagnóstico:');
  console.log('Platform:', Platform.OS);
  console.log('Expo Config:', {
    manifest: {
      debuggerHost: Constants.manifest?.debuggerHost,
      hostUri: Constants.manifest?.hostUri,
      packagerOpts: (Constants.manifest as any)?.packagerOpts
    },
    expoConfig: {
      hostUri: Constants.expoConfig?.hostUri,
      extra: Constants.expoConfig?.extra
    }
  });
  
  console.error('\nPara solucionar esto:');
  console.error('1) Asegúrate de que:');
  console.error('   - El servidor backend está corriendo (npm run dev en Backend)');
  console.error('   - El servidor escucha en 0.0.0.0:5000');
  console.error('   - Tu dispositivo y PC están en la misma red WiFi');
  console.error('\n2) Si la red está restringida (p. ej., escuela), usa una URL pública:');
  console.error('   - Ejemplo ngrok: ngrok http 5000  -> copia la URL HTTPS');
  console.error('   - Luego exporta EXPO_PUBLIC_API_URL="https://<tu-ngrok>.ngrok.io/api"');
  console.error('   - O añade extra.API_URL en app.json/app.config.ts');
  console.error('\n3) Reinicia Expo con: npx expo start --clear');
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getBaseUrl();
logServerUrl(API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🚀 Enviando request a:', `${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Error en request:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log('✅ Response exitoso:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }
    return response;
  },
  async (error) => {
    const isLoginError = error.config?.url?.includes('/auth/login') && error.response?.status === 401;
    
    if (!isLoginError && __DEV__) {
      console.error('❌ Error en response:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url,
        data: error.response?.data
      });
    }
    
    if (error.response?.status === 401 && !isLoginError) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      if (__DEV__) console.log('Sesión expirada');
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials: { nombreUsuario: string; contrasena: string }) => 
    api.post('/auth/login', credentials),
};

export const tasksAPI = {
  getAll: () => api.get('/tareas'),
  create: (taskData: any) => api.post('/tareas', taskData),
  update: (id: number, taskData: any) => api.put(`/tareas/${id}`, taskData),
  updateStatus: (id: number, estado: string) => api.patch(`/tareas/${id}/estado`, { estado }),
  delete: (id: number) => api.delete(`/tareas/${id}`),
  searchUsers: (query: string) => api.get(`/tareas/users/search?query=${encodeURIComponent(query)}`),
  getUsers: () => api.get('/tareas/users'),
  getStats: () => api.get('/tareas/stats'),
};

export const authHelper = {
  saveAuthData: async (token: string, user: any) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
  },
  
  clearAuthData: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },
  
  getCurrentUser: async () => {
    const userData = await AsyncStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },
  
  getToken: async () => {
    return await AsyncStorage.getItem('token');
  }
};

export default api;