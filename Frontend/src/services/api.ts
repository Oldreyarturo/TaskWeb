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

  // Permitir override desde app.json / app.config.js -> extra.API_URL
  const expoExtraApi = Constants.manifest?.extra?.API_URL ?? Constants.expoConfig?.extra?.API_URL;
  if (expoExtraApi) return expoExtraApi;

  // Web usa localhost
  if (Platform.OS === 'web') return 'http://localhost:5000/api';

  // En Expo (Android/iOS) intentar deducir la IP desde el debuggerHost
  const debuggerHost = Constants.manifest?.debuggerHost ?? Constants.expoConfig?.extra?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:5000/api`;
  }

  // Si no se pudo obtener la IP de ninguna manera, mostramos un error útil
  console.error(`
    ⚠️ No se pudo determinar la IP del servidor automáticamente.
    
    Para solucionar esto:
    1. Asegúrate de que el servidor backend está corriendo (npm run dev en la carpeta Backend)
    2. Verifica que tu dispositivo y PC están en la misma red WiFi
    3. El servidor debe estar escuchando en 0.0.0.0:5000
  `);
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
    console.log('✅ Response exitoso:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    console.error('❌ Error en response:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      data: error.response?.data
    });
    
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('Sesión expirada');
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