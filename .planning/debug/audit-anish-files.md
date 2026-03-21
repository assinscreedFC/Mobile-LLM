---
status: resolved
trigger: "Audit complet de bugs sur les fichiers appartenant à @author Anis Hammouche"
created: 2026-03-17T00:00:00Z
updated: 2026-03-17T00:00:00Z
---

## Current Focus

hypothesis: Audit terminé — tous les bugs identifiés
test: Lecture statique complète des 15 fichiers
expecting: N/A
next_action: Rapport livré

## Symptoms

expected: Code correct, sans bugs logiques, race conditions, fuites mémoire
actual: Audit préventif
errors: Inconnus — objet de l'audit
reproduction: N/A
started: Audit proactif

## Eliminated

- hypothesis: Aucune fuite mémoire dans apiClient.ts
  evidence: Axios interceptors stateless, pas d'EventSource
  timestamp: 2026-03-17

- hypothesis: authService.ts sans erreur critique
  evidence: Logique correcte, SecureStore bien utilisé — seule faiblesse: log de mot de passe implicite possible via error.response.data
  timestamp: 2026-03-17

## Evidence

- timestamp: 2026-03-17
  checked: chatStore.ts lignes 209-429 (sendMessage)
  found: forEach avec async/await — les erreurs des streams ne remontent pas, activeStreamsCount muté en closure partagée entre modèles concurrents
  implication: Race condition critique sur le compteur de streams

- timestamp: 2026-03-17
  checked: chatStore.ts ligne 313 (es.close override)
  found: es.close remplacé par une fonction async mais EventSource.close() est synchrone — l'appel original ne peut pas attendre la promesse
  implication: Le close personnalisé n'est jamais awaité par les appelants (stopGeneration)

- timestamp: 2026-03-17
  checked: chatStore.ts lignes 432-448 (stopGeneration)
  found: stopGeneration appelle es.close() qui est maintenant la version override async — mais forEach ne l'await pas
  implication: La persistance post-close peut s'exécuter APRÈS que l'état isTyping soit remis à false par stopGeneration

- timestamp: 2026-03-17
  checked: chatStore.ts lignes 339-342 (assistantMsgId dans close)
  found: Pour les messages différents du message courant, generateUUID() est appelé à chaque fermeture de stream — IDs différents à chaque appel
  implication: Historique corrompu si plusieurs modèles terminent à des moments différents

- timestamp: 2026-03-17
  checked: chatStore.ts ligne 426 (setTimeout fetchHistory 3000ms)
  found: setTimeout sans cleanup — si startNewChat est appelé dans ce délai, fetchHistory polluera le nouvel état
  implication: Race condition UI

- timestamp: 2026-03-17
  checked: chatService.ts lignes 153-164 (streamCompletion message handler)
  found: catch vide dans le handler SSE — erreurs JSON silencieuses
  implication: Chunks malformés ignorés silencieusement, debug impossible

- timestamp: 2026-03-17
  checked: chatService.ts lignes 91-121 (uploadFile)
  found: filename et mimeType typés string mais peuvent être undefined (Attachment.name? et mimeType?)
  implication: TypeScript runtime error possible, FormData avec undefined

- timestamp: 2026-03-17
  checked: chat.tsx lignes 116-120 (handleRegenerate)
  found: Extraction de userMsgId via string replace fragile — si modelName contient un UUID ou si le format change
  implication: userMsgId incorrect → regeneration sur mauvais message

- timestamp: 2026-03-17
  checked: MessageBubble.tsx ligne 182
  found: useMemo avec blocks appelé de façon conditionnelle (après early return isUser) — violation Rules of Hooks
  implication: Crash React en mode strict ou hot reload

- timestamp: 2026-03-17
  checked: MessageBubble.tsx buildKatexHtml ligne 76
  found: Escape incomplet du latex pour injection dans template string JS — seuls \, ` et ' sont échappés, pas les caractères HTML ni les retours à la ligne
  implication: XSS possible dans WebView si le contenu LaTeX vient du serveur

- timestamp: 2026-03-17
  checked: accountScreen.tsx
  found: "Log out" ne fait qu'appuyer sur route '/' — n'appelle pas logout() de authService
  implication: Token jamais supprimé du SecureStore à la déconnexion

- timestamp: 2026-03-17
  checked: Sidebar.tsx ligne 58
  found: fetchHistory dans useEffect sans fetchHistory dans le tableau de dépendances
  implication: Warning ESLint / comportement instable si fetchHistory change de référence

- timestamp: 2026-03-17
  checked: apiClient.ts ligne 47
  found: router.push("/sign-in") appelé dans un intercepteur Axios potentiellement hors contexte React
  implication: Peut crasher si appelé avant que le router soit monté (ex: checkAuthStatus au démarrage)

## Resolution

root_cause: Multiple — voir rapport ci-dessous
fix: Non appliqué (audit only)
verification: N/A
files_changed: []
