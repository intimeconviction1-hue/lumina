import React, { createContext, useContext } from 'react';

// Auth neutralisée pour la sortie de Base44.
// Lumina est une bibliothèque personnelle (toi + Sasha) : on ne reconstruit pas
// une auth d'entreprise. L'app considère un utilisateur unique, toujours connecté.
// (Une vraie auth pourra être ajoutée plus tard sans toucher au reste du code.)

const AuthContext = createContext(null);

const LOCAL_USER = {
  id: 'local',
  full_name: 'David',
  email: 'local@lumina',
  role: 'admin',
};

export const AuthProvider = ({ children }) => {
  const value = {
    user: LOCAL_USER,
    isAuthenticated: true,
    isLoadingAuth: false,
    isLoadingPublicSettings: false,
    authChecked: true,
    authError: null,
    appPublicSettings: {},
    logout: () => {},
    navigateToLogin: () => {},
    checkAppState: () => {},
    checkUserAuth: () => {},
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
