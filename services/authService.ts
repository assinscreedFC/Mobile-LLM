/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import apiClient from './apiClient';
import * as SecureStore from 'expo-secure-store';
import { loginSchema, validate, ValidationError } from '../utils/validation';

/**
 * Fonction pour se connecter
 * Elle envoie les identifiants au serveur, récupère la clé et la stocke.
 */
export const login = async (email: string, password: string) => {
  const validation = validate(loginSchema, { email: email.trim(), password });
  if (!validation.success) {
    const [field, message] = Object.entries(validation.errors!)[0]!;
    throw new ValidationError(message, field);
  }

  try {
    const response = await apiClient.post('/auths/signin', {
      email: validation.data!.email,
      password: validation.data!.password,
    });


    const { token } = response.data;

    if (token) {
      await SecureStore.setItemAsync('token', token);
      return true;
    } else {
      throw new Error("Le serveur n'a pas renvoyé de clé d'authentification.");
    }
  } catch (error: any) {
    if (error.response) {
      console.error('[Auth Service] Échec connexion, status:', error.response.status);
    } else if (error.request) {
      console.error('[Auth Service] Aucune réponse du serveur.');
    } else {
      console.error('[Auth Service] Erreur:', error.message);
    }

    throw error;
  }
};

/**
 * Fonction pour se déconnecter
 * Elle vide le coffre-fort.
 */
export const logout = async () => {
  try {
    await SecureStore.deleteItemAsync('token');
  } catch (error) {
    console.error('[Auth Service] Erreur lors de la déconnexion', error);
  }
};

/**
 * Fonction utilitaire pour vérifier si l'utilisateur est déjà connecté au lancement de l'application
 */
export const checkAuthStatus = async () => {
  try {
    const key = await SecureStore.getItemAsync('token');
    if (!key) {
      return false;
    }
    await apiClient.get('/models');

    return true;

  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      console.log('[Auth Service] La clé a expiré ou est invalide. Nettoyage...');
      await SecureStore.deleteItemAsync('token');
    } else {
      console.error('[Auth Service] Erreur réseau lors de la vérification', error.message);
    }

    return false;
  }
};