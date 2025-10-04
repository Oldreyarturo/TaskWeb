// Frontend/src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configura la URL base según la plataforma
const getBaseUrl = () => {
  if (__DEV__) {
    // En desarrollo, usa la IP de tu computadora para Expo Go
    // Cambia esta IP por la de tu computadora en tu red local
    return Platform.select({
      // Para iOS en el simulador, localhost funciona
      ios: 'http://localhost:5000/api',
      // Para Android y Expo Go, necesitas usar la IP
      android: 'http://192.168.18.6:5000/api',
      default: 'http://localhost:5000/api',
    });
  }
  // En producción usarías tu dominio real
  return 'https://tu-api-produccion.com/api';
};

const API_BASE_URL = getBaseUrl();

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