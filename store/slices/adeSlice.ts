/**
 * @author Anis Hammouche
 * @email anishammouche50@gmail.com
 * @github https://github.com/assinscreedFC
 */

import { adeService } from '../../services/adeService';

// --- ADE System Prompt ---
export const ADE_SYSTEM_PROMPT = `Tu as accès au système ADE Consult (emploi du temps universitaire Paris Cité).
Tu peux naviguer dans l'interface ADE de manière autonome via des actions.

Pour appeler une action, écris une balise sur une ligne seule :
<<ADE:action(param1=valeur1,param2=valeur2)>>

Actions disponibles :
- <<ADE:browse()>> : Liste les noeuds visibles de l'arbre (catégories, formations, salles...)
- <<ADE:expand(node=nom)>> : Ouvre un dossier de l'arbre pour voir son contenu (match partiel)
- <<ADE:select(node=nom)>> : Sélectionne/coche un élément pour afficher son planning (match partiel)
- <<ADE:search(query=texte)>> : Recherche dans ADE (formations, salles, profs...)
- <<ADE:read()>> : Lit le contenu affiché (emploi du temps, événements)
- <<ADE:status()>> : Vérifie la connexion ADE

Workflow typique pour obtenir un emploi du temps :
1. <<ADE:search(query=L3 informatique)>> — chercher la formation
2. Analyser les résultats retournés
3. <<ADE:select(node=L3 Informatique)>> — sélectionner le bon noeud
4. <<ADE:read()>> — lire l'emploi du temps affiché

Ou pour explorer l'arbre :
1. <<ADE:browse()>> — voir les catégories
2. <<ADE:expand(node=Formations)>> — ouvrir le dossier
3. <<ADE:expand(node=Licence)>> — descendre dans l'arbre
4. <<ADE:select(node=L3 Info)>> — sélectionner
5. <<ADE:read()>> — lire le planning

Règles :
- N'invente JAMAIS de données. Utilise les actions ADE pour les obtenir.
- Tu peux enchainer plusieurs actions dans une seule réponse.
- Si l'utilisateur n'est pas connecté, dis-lui d'aller dans Paramètres > ADE Consult.
- Si la demande ne concerne PAS l'emploi du temps, réponds normalement.
- Utilise le match partiel : <<ADE:select(node=informatique)>> trouvera "L3 Informatique".
- Si après plusieurs tentatives (search, browse, expand) tu ne trouves pas la formation ou la ressource, DEMANDE à l'utilisateur le nom exact de sa formation, son département ou son groupe. Ne boucle pas indéfiniment.`;

export const ADE_MAX_ITERATIONS = 5;

export function parseADEParams(raw: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!raw || raw.trim() === '') return params;
  for (const part of raw.split(',')) {
    const eq = part.indexOf('=');
    if (eq > 0) {
      params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }
  return params;
}

export const ADE_ALLOWED_ACTIONS = new Set(['browse', 'expand', 'select', 'search', 'read', 'status']);

export async function executeADECall(action: string, params: Record<string, string>): Promise<string> {
  if (!ADE_ALLOWED_ACTIONS.has(action)) {
    return `[ADE] Action non autorisée: ${action}`;
  }
  try {
    if (action === 'status') {
      const s = await adeService.getStatus();
      return `[ADE] Connecté: ${s.authenticated}, Credentials: ${s.has_credentials}, Projet: ${s.project_id ?? 'aucun'}, Ressources: ${s.resources_count}`;
    }
    const result = await adeService.adeAction(action, params);
    return `[ADE] ${JSON.stringify(result)}`;
  } catch (error: any) {
    const msg = error?.response?.data?.detail || error?.message || 'Erreur inconnue';
    return `[ADE] Erreur : ${msg}`;
  }
}

export async function processADECalls(text: string): Promise<{ hasADE: boolean; processed: string }> {
  const regex = /<<ADE:(\w+)\(([^)]*)\)>>/g;
  const calls: { fullMatch: string; action: string; rawParams: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    calls.push({ fullMatch: match[0], action: match[1] ?? '', rawParams: match[2] ?? '' });
  }
  if (calls.length === 0) return { hasADE: false, processed: text };

  let processed = text;
  for (const call of calls) {
    const params = parseADEParams(call.rawParams);
    const result = await executeADECall(call.action, params);
    processed = processed.replace(call.fullMatch, result);
  }
  return { hasADE: true, processed };
}
