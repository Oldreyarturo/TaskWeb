// Frontend/src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { authHelper } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  username: string;
  role: string;
  roleId: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  // Cargar usuario del AsyncStorage al iniciar
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await authHelper.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };
    loadUser();
  }, []);

  const isAdmin = () => user?.role === 'Administrador';
  const isSupervisor = () => user?.role === 'Supervisor';
  const isUser = () => user?.role === 'Usuario';

  // PERMISOS 
  const canCreateTask = () => isAdmin() || isSupervisor();
  const canEditTask = (taskCreatorId: number) => 
    isAdmin() || isSupervisor() || (isUser() && taskCreatorId === user?.id);
  const canDeleteTasks = () => isAdmin() || isSupervisor(); 
  const canAssignTasks = () => isAdmin() || isSupervisor();
  const canSeeAllTasks = () => isAdmin() || isSupervisor();
  const canChangeStatus = (task: any) => 
    isAdmin() || isSupervisor() || task.asignadoAId === user?.id;

  // Función para actualizar el usuario
  const updateUser = (userData: User | null) => {
    setUser(userData);
  };

  // Función para cerrar sesión
  const logout = () => {
    authHelper.clearAuthData();
    setUser(null);
  };

  return {
    user,
    setUser: updateUser,
    logout,
    isAdmin,
    isSupervisor,
    isUser,
    canCreateTask,
    canEditTask,
    canDeleteTasks,
    canAssignTasks,
    canSeeAllTasks,
    canChangeStatus
  };
};