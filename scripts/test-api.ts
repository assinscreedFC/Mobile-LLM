/**
 * Script de test API Pleiade — Debug title generation
 * 
 * Pour exécuter :
 *   npx ts-node scripts/test-api.ts
 * 
 * Prérequis : configurer TOKEN et BASE_URL ci-dessous
 */

// ---- CONFIGURATION ----
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU1ZTBhMThhLTFkOTktNDljMy04NmYwLTUzN2VkODk4NmJmZCIsImp0aSI6ImFiZWY0ODRjLTkyN2YtNGRjZi1iNDE0LTFlMjZjZTQyMzVkMiJ9.eJPyfsnsP2Ri5nSCEaBT-_eqabzjObnrso9xB1bmoD4'; // Récupéré depuis SecureStore
const BASE_URL_V1 = 'https://pleiade.mi.parisdescartes.fr/api/v1';
const BASE_URL = 'https://pleiade.mi.parisdescartes.fr/api';
const MODEL_NAME = 'athene-v2:latest';

// ---- HELPERS ----
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

async function apiCall(method: string, url: string, body?: any) {
    const opts: any = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`,
        },
    };
    if (body) opts.body = JSON.stringify(body);

    console.log(`\n=== ${method} ${url} ===`);
    if (body) console.log('Body:', JSON.stringify(body, null, 2).substring(0, 500));

    const response = await fetch(url, opts);
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 500));
    return data;
}

// ---- TEST FLOW ----
async function testCompleteFlow() {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1 : Créer un chat + Envoyer un message + chatCompleted');
    console.log('='.repeat(60));

    const userMsgId = generateUUID();
    const assistantMsgId = generateUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const userContent = 'Bonjour, comment ça va ?';
    const assistantContent = 'Bonjour ! Je vais très bien, merci de demander. Comment puis-je vous aider ?';

    // 1. Créer le chat
    console.log('\n--- STEP 1 : POST /api/v1/chats/new ---');
    const createResult = await apiCall('POST', `${BASE_URL_V1}/chats/new`, {
        chat: {
            id: '',
            title: 'Nouvelle conversation',
            models: [MODEL_NAME],
            params: {},
            history: {
                messages: {
                    [userMsgId]: {
                        id: userMsgId,
                        parentId: null,
                        childrenIds: [],
                        role: 'user',
                        content: userContent,
                        timestamp,
                        models: [MODEL_NAME],
                    },
                },
                currentId: userMsgId,
            },
            messages: [{
                id: userMsgId,
                parentId: null,
                childrenIds: [],
                role: 'user',
                content: userContent,
                timestamp,
                models: [MODEL_NAME],
            }],
            tags: [],
            timestamp: Date.now(),
        },
        folder_id: null,
    });

    const chatId = createResult.id;
    console.log('Chat ID créé:', chatId);
    console.log('Titre initial:', createResult.title);

    // 2. Mettre à jour le chat avec la réponse assistant
    console.log('\n--- STEP 2 : POST /api/v1/chats/{id} (updateChat) ---');
    await apiCall('POST', `${BASE_URL_V1}/chats/${chatId}`, {
        chat: {
            models: [MODEL_NAME],
            history: {
                messages: {
                    [userMsgId]: {
                        id: userMsgId,
                        parentId: null,
                        childrenIds: [assistantMsgId],
                        role: 'user',
                        content: userContent,
                        timestamp,
                        models: [MODEL_NAME],
                    },
                    [assistantMsgId]: {
                        parentId: userMsgId,
                        id: assistantMsgId,
                        childrenIds: [],
                        role: 'assistant',
                        content: assistantContent,
                        model: MODEL_NAME,
                        modelName: MODEL_NAME,
                        modelIdx: 0,
                        timestamp,
                    },
                },
                currentId: assistantMsgId,
            },
            messages: [
                {
                    id: userMsgId,
                    parentId: null,
                    childrenIds: [assistantMsgId],
                    role: 'user',
                    content: userContent,
                    timestamp,
                    models: [MODEL_NAME],
                },
                {
                    parentId: userMsgId,
                    id: assistantMsgId,
                    childrenIds: [],
                    role: 'assistant',
                    content: assistantContent,
                    model: MODEL_NAME,
                    modelName: MODEL_NAME,
                    modelIdx: 0,
                    timestamp,
                },
            ],
            params: {},
            files: [],
        },
    });

    // 3. Appeler chatCompleted
    console.log('\n--- STEP 3 : POST /api/chat/completed ---');
    const completedPayload = {
        model: MODEL_NAME,
        messages: [
            { id: userMsgId, role: 'user', content: userContent, timestamp },
            { id: assistantMsgId, role: 'assistant', content: assistantContent, timestamp },
        ],
        model_item: {
            id: MODEL_NAME,
            name: MODEL_NAME,
            object: 'model',
            connection_type: 'local',
            tags: [],
            info: {
                id: MODEL_NAME,
                name: MODEL_NAME,
                meta: {
                    capabilities: {
                        vision: false,
                        file_upload: true,
                        web_search: true,
                        image_generation: true,
                        code_interpreter: true,
                        citations: true,
                    },
                },
            },
            actions: [],
            filters: [],
        },
        chat_id: chatId,
        session_id: '',
        id: assistantMsgId,
    };
    const completedResult = await apiCall('POST', `${BASE_URL}/chat/completed`, completedPayload);
    console.log('chatCompleted result:', JSON.stringify(completedResult).substring(0, 300));

    // 4. Vérifier le titre immédiatement
    console.log('\n--- STEP 4 : GET /api/v1/chats/{id} (titre immédiat) ---');
    const chatDetails1 = await apiCall('GET', `${BASE_URL_V1}/chats/${chatId}`);
    console.log('Titre IMMÉDIAT:', chatDetails1.title);

    // 5. Attendre 5 secondes
    console.log('\n⏳ Attente 5 secondes...');
    await new Promise(r => setTimeout(r, 5000));

    // 6. Vérifier le titre après 5s
    console.log('\n--- STEP 5 : GET /api/v1/chats/{id} (titre après 5s) ---');
    const chatDetails2 = await apiCall('GET', `${BASE_URL_V1}/chats/${chatId}`);
    console.log('Titre après 5s:', chatDetails2.title);

    // 7. Vérifier l'historique
    console.log('\n--- STEP 6 : GET /api/v1/chats/?page=1 ---');
    const history = await apiCall('GET', `${BASE_URL_V1}/chats/?page=1&include_folders=true&include_pinned=true`);
    const thisChat = history.find((c: any) => c.id === chatId);
    console.log('Titre dans historique:', thisChat?.title);

    // Résumé
    console.log('\n' + '='.repeat(60));
    console.log('RÉSUMÉ');
    console.log('='.repeat(60));
    console.log('Chat ID:', chatId);
    console.log('Titre initial:', createResult.title);
    console.log('Titre immédiat:', chatDetails1.title);
    console.log('Titre après 5s:', chatDetails2.title);
    console.log('Titre historique:', thisChat?.title);

    if (chatDetails2.title !== 'Nouvelle conversation') {
        console.log('\n✅ SUCCÈS: Le titre a été mis à jour !');
    } else {
        console.log('\n❌ ÉCHEC: Le titre est toujours "Nouvelle conversation"');
        console.log('→ Le serveur ne génère pas le titre. Vérifions si le problème vient du payload chatCompleted.');

        // Debug : Essayer avec le payload exact du serveur (copié des traces)
        console.log('\n--- STEP 7 : Attente supplémentaire de 10s ---');
        await new Promise(r => setTimeout(r, 10000));
        const chatDetails3 = await apiCall('GET', `${BASE_URL_V1}/chats/${chatId}`);
        console.log('Titre après 15s:', chatDetails3.title);
    }
}

// ---- LANCEMENT ----
testCompleteFlow().catch(console.error);
