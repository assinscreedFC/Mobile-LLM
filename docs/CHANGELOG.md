# Changelog des corrections — L3T1

## 2026-03-25

### Passe 1 : Securite (.gitignore, logs sensibles, ADE allowlist, SSRF)

**Fichiers modifies :**
- `.gitignore` — Ajout exclusion `.env` (avant, seul `.env*.local` etait ignore, le `.env` etait commite avec la cle Fernet)
- `services/authService.ts` — Suppression des `console.log` qui loggaient `error.response.data` (peut contenir des infos serveur sensibles)
- `services/chatService.ts` — Validation URL dans `attachWebpage` (SSRF prevention), sanitisation du log SSE error
- `store/chatStore.ts` — Ajout allowlist dans `executeADECall` pour empecher l'execution d'actions ADE arbitraires depuis la sortie LLM

**Pourquoi :**
- C-1 : La cle de chiffrement Fernet etait dans l'historique git via `.env`
- C-2 : SSRF — URL utilisateur passee directement au serveur sans validation
- C-3 : Injection via LLM — les tags ADE etaient executes sans restriction
- H-1 : Logs de donnees serveur en production sur endpoint d'auth
- H-4 : Log SSE brut pouvait exposer le Bearer token

---

### Passe 2 : Performance (React.memo, debounce SSE, subscriptions, ActionBtn)

**Fichiers modifies :**
- `components/MessageBubble.tsx` — Wrap `React.memo`, `useSettingsStore` avec selecteur
- `app/chat.tsx` — `ActionBtn` deplace hors du composant, `useMemo` pour conversation, `useWindowDimensions`
- `components/InputBar.tsx` — `useSettingsStore` avec selecteur
- `components/Header.tsx` — `useSettingsStore` avec selecteur

**Pourquoi :**
- P-1 : Chaque token SSE declenchait un re-render de tout l'arbre (centaines/sec)
- P-2 : `buildConversation` + `reverse()` recalcules dans renderItem sans memo
- P-3 : `ActionBtn` defini dans le composant = re-mount a chaque chunk
- P-5/6 : `useSettingsStore()` sans selecteur = subscribe a tout le store

---

### Passe 3 : Qualite (chatStore extraction, ADE stop check, unify fetch/axios)

**Fichiers modifies :**
- `store/chatStore.ts` — Extraction `buildModelItem()`, `buildHistoryPayload()` partages entre `sendMessage` et `regenerateResponse`. Ajout check `_stopRequested` dans boucle ADE.
- `services/chatService.ts` — Migration `chatCompleted` et `stopTask` vers `apiClient` (au lieu de `fetch` manuel qui bypass le 401 interceptor)

**Pourquoi :**
- Q-1 : ~150 lignes dupliquees entre sendMessage et regenerateResponse
- Q-3 : La boucle ADE continuait meme apres stopGeneration
- Q-14 : 3 methodes utilisaient fetch() manuellement au lieu de apiClient, bypassant le 401 interceptor

---

### Passe 4 : i18n (textes hardcodes remplaces par t())

**Fichiers modifies :**
- `app/accountScreen.tsx` — Textes FR hardcodes remplaces par cles i18n
- `components/ModelSelector.tsx` — Ajout prop `t`, textes FR hardcodes remplaces
- `components/Sidebar.tsx` — Textes EN/FR hardcodes remplaces par `t()`
- `i18n/translations.ts` — Ajout cles manquantes (switchModel, searchModel, loadingModels, noModelFound, adeFillCredentials, adeCasDescription, adeCasPlaceholder)

**Pourquoi :**
- M-8 : Les textes hardcodes en francais ne s'affichaient pas dans la bonne langue pour les utilisateurs en/zh
- Les cles i18n existaient deja pour certains textes mais n'etaient pas utilisees
