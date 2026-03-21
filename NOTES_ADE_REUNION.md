# Integration ADE Consult — Notes pour la reunion

## Objectif

Permettre a l'utilisateur de consulter son emploi du temps universitaire (ADE Consult, Paris Cite) directement depuis le chat de l'application mobile, en langage naturel.

Exemple : l'utilisateur ecrit "c'est quoi mon emploi du temps cette semaine ?" et le LLM repond avec les cours, salles et horaires.

---

## Probleme de base

ADE Consult utilise **GWT** (Google Web Toolkit) pour son interface. Tout est rendu en JavaScript cote client. Il n'y a pas d'API REST exploitable :

- L'API webapi (`/jsp/webapi`) necessite des credentials propres a ADE (pas les credentials CAS), donc inutilisable
- L'interface GWT ne peut pas etre scrapee en HTTP classique (pas de HTML statique)
- L'auth CAS Paris Cite passe par Shibboleth avec un flow en 2 etapes (`_eventId_proceed` puis `j_username`/`j_password`)

**Solution retenue** : un navigateur headless (Playwright) qui navigue dans ADE comme un humain, pilote par le LLM.

---

## Architecture

```
┌─────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   App Mobile     │────>│  Backend FastAPI   │────>│  ADE Consult     │
│  (React Native)  │     │  (Python + PW)     │     │  (GWT/Shibboleth)│
│                  │     │                    │     │                  │
│  chatStore.ts    │     │  main.py           │     │  Chromium        │
│  adeService.ts   │     │  ade_scraper.py    │     │  headless        │
└─────────────────┘     └───────────────────┘     └──────────────────┘
```

### Cote mobile (React Native / Expo)

| Fichier | Role |
|---------|------|
| `services/adeService.ts` | Client HTTP vers le backend (axios, token Bearer) |
| `store/chatStore.ts` | Injection du system prompt ADE + boucle two-pass |
| `app/accountScreen.tsx` | Formulaire login CAS (identifiant + mot de passe) |

### Cote backend (Python / FastAPI)

| Fichier | Role |
|---------|------|
| `scripts/ade_backend/main.py` | Endpoints FastAPI (`/ade/login`, `/ade/action`, etc.) |
| `scripts/ade_backend/ade_scraper.py` | Navigation Playwright (sessions persistantes, actions) |
| `scripts/ade_backend/ade_client.py` | Client HTTP ADE (auth CAS, fallback) |
| `scripts/ade_backend/session_store.py` | Persistence SQLite (credentials chiffres, cookies, ressources) |

---

## Flow complet

### 1. Connexion (une seule fois)

1. L'utilisateur va dans **Parametres > ADE Consult**
2. Il entre son identifiant et mot de passe CAS Paris Cite
3. L'app envoie `POST /ade/login` au backend
4. Le backend fait le flow CAS complet (Shibboleth proceed → login `j_username`/`j_password`)
5. Les credentials sont stockes **chiffres** (Fernet) dans SQLite

### 2. Consultation de l'emploi du temps

1. L'utilisateur ecrit dans le chat : *"c'est quoi mon EDT ?"*
2. Le LLM recoit un **system prompt ADE** qui lui explique les actions disponibles
3. Le LLM genere des balises d'action, par exemple :
   ```
   <<ADE:search(query=L3 informatique)>>
   ```
4. Le **two-pass** detecte la balise, execute l'action via le backend :
   - Le backend lance Playwright (Chromium headless)
   - Playwright se connecte a ADE avec les credentials stockes
   - Navigue dans l'interface GWT, fait la recherche
   - Retourne les resultats (noeuds de l'arbre)
5. Les resultats sont renvoyes au LLM
6. Le LLM peut enchainer d'autres actions :
   ```
   <<ADE:select(node=L3 Informatique)>>
   <<ADE:read()>>
   ```
7. A chaque iteration, les resultats sont re-injectes dans la conversation
8. Quand le LLM a assez d'info (max 5 iterations), il formule la reponse finale en markdown

### Schema du two-pass en boucle

```
User message
    │
    ▼
LLM (pass 1) ──> "<<ADE:search(query=...)>>"
    │
    ▼ execute action
Backend/Playwright ──> resultats JSON
    │
    ▼ re-injecter
LLM (pass 2) ──> "<<ADE:select(node=...)>>"
    │
    ▼ execute action
Backend/Playwright ──> resultats JSON
    │
    ▼ re-injecter
LLM (pass 3) ──> "<<ADE:read()>>"
    │
    ▼ execute action
Backend/Playwright ──> emploi du temps brut
    │
    ▼ re-injecter
LLM (pass 4) ──> reponse finale en markdown
    │
    ▼
Affichage dans le chat
```

---

## Actions disponibles pour le LLM

| Action | Description | Exemple |
|--------|-------------|---------|
| `browse()` | Liste les noeuds visibles de l'arbre GWT | Voir les categories |
| `expand(node=X)` | Ouvre un dossier (match partiel sur le nom) | `expand(node=Formations)` |
| `select(node=X)` | Coche un element pour afficher son planning | `select(node=L3 Info)` |
| `search(query=X)` | Recherche dans ADE | `search(query=cryptographie)` |
| `read()` | Lit le contenu affiche (emploi du temps) | Extrait les cours/horaires/salles |
| `status()` | Verifie l'etat de connexion ADE | — |

Le LLM decide **lui-meme** comment naviguer. Il n'a pas besoin du nom exact — le match est partiel (ex: "informatique" trouvera "L3 Informatique"). Si apres plusieurs tentatives il ne trouve pas, il demande a l'utilisateur.

**Important : le LLM ne voit pas le HTML.** Il recoit uniquement des donnees structurees (JSON) extraites par JavaScript dans la page. Par exemple `browse()` retourne une liste de noeuds `[{name: "L3 Informatique", type: "folder"}, ...]`, pas du HTML brut. `read()` retourne le texte visible (`innerText`), pas la source. Pour gerer les contenus hors viewport (arbre long, planning qui deborde), le scraper scrolle automatiquement les panneaux GWT avant d'extraire les donnees. Le viewport est en 1920x1080 pour maximiser ce qui est visible d'un coup.

---

## Choix techniques

### Pourquoi Playwright et pas HTTP classique ?

ADE Consult est une appli GWT (100% JavaScript). Le HTML retourne par le serveur est vide — tout est rendu cote client. Impossible de scraper avec des requetes HTTP simples. Playwright lance un vrai navigateur qui execute le JavaScript.

### Pourquoi l'API sync de Playwright ?

L'API async de Playwright utilise `asyncio.create_subprocess_exec` pour lancer Chromium. Ca ne fonctionne pas avec la boucle evenementielle d'uvicorn sur Windows (`NotImplementedError`). La solution : utiliser l'API sync dans un `ThreadPoolExecutor` dedie, appele depuis l'async via `run_in_executor`.

### Pourquoi des sessions persistantes ?

Chaque login CAS + chargement GWT prend ~8 secondes. En gardant la page ouverte pendant 10 minutes, les actions suivantes sont quasi-instantanees (la session Playwright est reutilisee).

### Pourquoi le two-pass en boucle ?

Le LLM ne peut pas savoir a l'avance quel chemin prendre dans l'arbre ADE. Il doit :
1. Explorer (browse/search)
2. Analyser les resultats
3. Decider quoi cliquer
4. Lire le planning

Ca necessite plusieurs allers-retours. La boucle (max 5 iterations) lui donne cette autonomie.

### Securite des credentials

- Credentials CAS stockes **chiffres** avec Fernet (cle dans `.env` backend)
- Le token Bearer de l'app est utilise comme identifiant utilisateur
- Les credentials ne transitent jamais en clair dans les logs

---

## Pour lancer en dev

```bash
# Terminal 1 : Backend
cd scripts/ade_backend
.venv\Scripts\activate
python -m scripts.ade_backend.main
# Ecoute sur le port 8741

# Terminal 2 : App mobile
npm run start
# Scanner le QR code avec Expo Go
```

Le `.env` de l'app doit contenir :
```
EXPO_PUBLIC_ADE_API_URL=http://<IP_LOCALE>:8741
```

---

## Limites actuelles

- **Un seul thread Playwright** : les requetes ADE sont sequentielles (pas de parallelisme entre utilisateurs)
- **Sessions non persistees au restart** : si le backend redemarre, les sessions Playwright sont perdues (re-login automatique au prochain appel)
- **Coordonnees GWT** : certains elements (bouton loupe) sont cliques par position, ce qui peut casser si ADE change sa mise en page
- **Pas de cache** : chaque demande d'EDT relance la navigation complete
- **Windows only** : le fix `ThreadPoolExecutor` est specifique au probleme uvicorn/Windows. Sur Linux, l'API async fonctionnerait directement

---

## Commits SVN

| Rev | Description |
|-----|-------------|
| r127 | Ajout variable `EXPO_PUBLIC_ADE_API_URL` |
| r128 | Service ADE Consult (client axios, auth, actions) |
| r129 | Integration ADE dans le chat (system prompt, tool calling, boucle) |
| r130 | Formulaire login CAS dans les parametres |
| r131 | Traductions ADE Consult (fr/en/zh) |
