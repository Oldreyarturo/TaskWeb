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

  // 1. Primero intentar obtener del config (app.json o app.config.js)
  const configApiUrl = Constants.expoConfig?.extra?.API_URL ?? Constants.manifest?.extra?.API_URL;
  if (configApiUrl) return configApiUrl;

  // Web usa localhost
  if (Platform.OS === 'web') return 'http://localhost:5000/api';

  // 2. Intentar obtener la IP del host de varias fuentes (Expo 54+)
  const possibleHosts = [
    Constants.manifest?.debuggerHost,                    // Classic
    Constants.manifest?.hostUri?.split(':')[0],         // Expo 54+
    Constants.expoConfig?.hostUri?.split(':')[0],       // Alternative
    Constants.manifest?.packagerOpts?.dev 
      ? Constants.manifest?.packagerOpts?.host          // Dev mode
      : null,
    Constants.expoConfig?.extra?.debuggerHost,          // Custom config
  ].filter(Boolean);

  // Usar el primer host válido que encontremos
  for (const host of possibleHosts) {
    if (host && host !== 'localhost') {
      console.log('✅ IP detectada:', host);
      return `http://${host}:5000/api`;
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
      packagerOpts: Constants.manifest?.packagerOpts
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
  console.error('\n2) Intenta reiniciar Expo con:');
  console.error('   npx expo start --lan -c');
  console.error('   # o si usas tunnel:');
  console.error('   npx expo start --tunnel');
  console.error('\n3) Si el problema persiste, configura la IP manualmente en app.json:');
  console.error('   {');
  console.error('     "expo": {');
  console.error('       "extra": {');
  console.error('         "API_URL": "http://TU-IP-LOCAL:5000/api"');
  console.error('       }');
  console.error('     }');
  console.error('   }');
  // Usar localhost como último recurso (funcionará en web)
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getBaseUrl();
// Log de la URL en desarrollo para debugging
logServerUrl(API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para debugging
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
    // Log de respuestas exitosas solo en desarrollo
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
    
    // No mostrar 401 de login como error en consola
    if (!isLoginError && __DEV__) {
      console.error('❌ Error en response:', {
        status: error.response?.status,
        message: error.message,
        url: error.config?.url,
        data: error.response?.data
      });
    }
    
    // Limpiar sesión en 401 (excepto en login)
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
  // ✅ RUTAS CORREGIDAS - Todas empiezan con /api
  getAll: () => api.get('/tareas'),
  create: (taskData: any) => api.post('/tareas', taskData),
  update: (id: number, taskData: any) => api.put(`/tareas/${id}`, taskData),
  updateStatus: (id: number, estado: string) => api.patch(`/tareas/${id}/estado`, { estado }),
  delete: (id: number) => api.delete(`/tareas/${id}`),
  
  // Búsqueda y usuarios
  searchUsers: (query: string) => api.get(`/tareas/users/search?query=${encodeURIComponent(query)}`),
  getUsers: () => api.get('/tareas/users'),
  getStats: () => api.get('/tareas/stats'),
};

// Helper functions para autenticación
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