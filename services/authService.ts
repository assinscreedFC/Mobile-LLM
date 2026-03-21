/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import apiClient from './apiClient';
import * as SecureStore from 'expo-secure-store';

/**
 * Fonction pour se connecter
 * Elle envoie les identifiants au serveur, récupère la clé et la stocke.
 */
export const login = async (email: string, password: string) => {
  try {

    const response = await apiClient.post('/auths/signin', {
      email,
      password,
    });


    const { token } = response.data;

    if (token) {
      await SecureStore.setItemAsync('token', token);
      return true;
    } else {
      throw new Error("Le serveur n'a pas renvoyé de clé d'authentification.");
    }
  } catch (error) {
    if (error.response) {
      console.log("STATUT DE L'ERREUR :", error.response.status);
      console.log("RÉPONSE DU SERVEUR :", error.response.data);
    }
    else if (error.request) {
      console.log("AUCUNE RÉPONSE DU SERVEUR. Problème réseau ou URL incorrecte.");
    }
    else {
      console.log("ERREUR INTERNE :", error.message);
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