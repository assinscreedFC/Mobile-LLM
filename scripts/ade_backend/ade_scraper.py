"""
Scraper ADE Consult via Playwright (API sync) — navigation interactive.
Le LLM pilote l'exploration via des actions primitives :
  browse, expand, select, search, read.
Chaque user a une session Playwright persistante (page ouverte).

Note: On utilise l'API sync de Playwright dans un thread dedie
car asyncio.create_subprocess_exec ne fonctionne pas avec uvicorn sur Windows.
"""

import asyncio
import logging
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Optional

from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page

from . import session_store

logger = logging.getLogger(__name__)

ADE_BASE_URL = "https://adeconsult.app.u-pariscite.fr"
ADE_PLANNING_URL = f"{ADE_BASE_URL}/direct/myplanning.jsp"

SESSION_TIMEOUT = 600  # 10 min d'inactivite → fermer la session

# Thread pool dedie a Playwright (1 thread = 1 browser)
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="playwright")
_lock = threading.Lock()

# --- Singleton browser (sync, dans le thread playwright) ---
_browser: Optional[Browser] = None
_pw = None


def _get_browser() -> Browser:
    global _browser, _pw
    if _browser is None or not _browser.is_connected():
        _pw = sync_playwright().start()
        _browser = _pw.chromium.launch(headless=True)
        logger.info("[SCRAPER] Chromium lance (sync thread)")
    return _browser


def _close_browser_sync() -> None:
    global _browser, _pw
    for sid in list(_sessions.keys()):
        _close_session_sync(sid)
    if _browser and _browser.is_connected():
        _browser.close()
        _browser = None
    if _pw:
        _pw.stop()
        _pw = None


async def close_browser() -> None:
    """Ferme le browser (appele au shutdown du backend)."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(_executor, _close_browser_sync)


# --- Sessions persistantes par user ---

class ADESession:
    """Page Playwright ouverte + etat de navigation pour un user."""

    def __init__(self, context: BrowserContext, page: Page):
        self.context = context
        self.page = page
        self.authenticated = False
        self.gwt_ready = False
        self.last_activity = time.time()

    def touch(self) -> None:
        self.last_activity = time.time()

    @property
    def expired(self) -> bool:
        return (time.time() - self.last_activity) > SESSION_TIMEOUT


_sessions: dict[str, ADESession] = {}


def _get_session_sync(user_id: str) -> ADESession:
    """Recupere ou cree une session Playwright pour l'user. Appele dans le thread PW."""
    with _lock:
        if user_id in _sessions:
            session = _sessions[user_id]
            if not session.expired and not session.page.is_closed():
                session.touch()
                return session
            _close_session_sync(user_id)

        browser = _get_browser()
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = context.new_page()
        session = ADESession(context, page)
        _sessions[user_id] = session
        return session


def _close_session_sync(user_id: str) -> None:
    session = _sessions.pop(user_id, None)
    if session:
        try:
            session.context.close()
        except Exception:
            pass


def _login_cas_sync(page: Page, username: str, password: str) -> str | None:
    """Login CAS Shibboleth. Retourne None si OK, message d'erreur sinon."""
    try:
        page.goto(ADE_PLANNING_URL, wait_until="load", timeout=30000)
        time.sleep(2)

        # Shibboleth proceed
        proceed_btn = page.locator("button[name='_eventId_proceed']")
        if proceed_btn.count() > 0:
            logger.info("[SCRAPER] Shibboleth proceed")
            proceed_btn.click()
            page.wait_for_load_state("load", timeout=15000)
            time.sleep(1)

        # Login CAS
        j_user = page.locator("input[name='j_username']")
        user_field = page.locator("input[name='username']")

        if j_user.count() > 0:
            j_user.fill(username)
            page.locator("input[name='j_password']").fill(password)
        elif user_field.count() > 0:
            user_field.fill(username)
            page.locator("input[name='password']").fill(password)
        else:
            return "Pas de champ login trouve sur la page CAS"

        submit = page.locator("button[type='submit'], input[type='submit']")
        submit.first.click()
        page.wait_for_load_state("load", timeout=30000)
        time.sleep(3)

        if "cas" in page.url or "idp" in page.url:
            return "Echec authentification CAS (identifiants incorrects ?)"

        logger.info("[SCRAPER] Login OK: %s", page.url)
        return None

    except Exception as e:
        logger.error("[SCRAPER] Login error: %s", e, exc_info=True)
        return f"Erreur login: {e}"


def _ensure_authenticated_sync(user_id: str, session: ADESession, creds: tuple[str, str]) -> str | None:
    """Login CAS si pas encore fait."""
    if session.authenticated:
        return None
    err = _login_cas_sync(session.page, creds[0], creds[1])
    if err:
        return err
    session.authenticated = True
    return None


def _ensure_gwt_sync(session: ADESession) -> str | None:
    """Attend le chargement GWT."""
    if session.gwt_ready:
        return None
    try:
        session.page.wait_for_selector(".x-panel", timeout=15000)
        time.sleep(2)
        session.gwt_ready = True
        return None
    except Exception:
        return "Interface ADE non chargee (timeout GWT)"


# --- Actions primitives (sync, executees dans le thread PW) ---

def _action_browse_sync(user_id: str, creds: tuple[str, str]) -> dict:
    session = _get_session_sync(user_id)
    err = _ensure_authenticated_sync(user_id, session, creds)
    if err:
        return {"error": err}
    err = _ensure_gwt_sync(session)
    if err:
        return {"error": err}

    # Scroller l'arbre pour forcer le chargement des noeuds lazy-loaded
    session.page.evaluate("""() => {
        const treeContainer = document.querySelector('.x-tree3');
        if (treeContainer) {
            const parent = treeContainer.closest('.x-panel-body') || treeContainer.parentElement;
            if (parent) {
                // Scroller jusqu'en bas puis revenir en haut pour forcer le rendu
                parent.scrollTop = parent.scrollHeight;
            }
        }
    }""")
    time.sleep(0.5)
    session.page.evaluate("""() => {
        const treeContainer = document.querySelector('.x-tree3');
        if (treeContainer) {
            const parent = treeContainer.closest('.x-panel-body') || treeContainer.parentElement;
            if (parent) { parent.scrollTop = 0; }
        }
    }""")
    time.sleep(0.3)

    nodes = session.page.evaluate("""() => {
        const result = [];
        const treeNodes = document.querySelectorAll('.x-tree3-node');
        treeNodes.forEach((node, i) => {
            const textEl = node.querySelector('.x-tree3-node-text');
            const joint = node.querySelector('.x-tree3-node-joint');
            const check = node.querySelector('.x-tree3-node-check');
            const text = textEl ? textEl.textContent.trim() : '';
            if (!text) return;
            const isExpanded = node.classList.contains('x-tree3-node-expanded');
            result.push({
                index: i,
                name: text,
                type: isExpanded ? 'expanded' : 'folder',
                hasCheckbox: !!check
            });
        });
        return result;
    }""")

    session.touch()
    return {"nodes": nodes, "count": len(nodes), "error": None}


def _action_expand_sync(user_id: str, creds: tuple[str, str], node_name: str) -> dict:
    session = _get_session_sync(user_id)
    err = _ensure_authenticated_sync(user_id, session, creds)
    if err:
        return {"error": err}
    err = _ensure_gwt_sync(session)
    if err:
        return {"error": err}

    clicked = session.page.evaluate("""(targetName) => {
        const nodes = document.querySelectorAll('.x-tree3-node-text');
        const lower = targetName.toLowerCase();
        for (const node of nodes) {
            const text = node.textContent.trim();
            if (text.toLowerCase().includes(lower)) {
                const event = new MouseEvent('dblclick', { bubbles: true });
                node.dispatchEvent(event);
                return { found: true, name: text };
            }
        }
        return { found: false, name: null };
    }""", node_name)

    if not clicked["found"]:
        return {"error": f"Noeud '{node_name}' non trouve dans l'arbre"}

    time.sleep(2)
    result = _action_browse_sync(user_id, creds)
    result["expanded"] = clicked["name"]
    session.touch()
    return result


def _action_select_sync(user_id: str, creds: tuple[str, str], node_name: str) -> dict:
    session = _get_session_sync(user_id)
    err = _ensure_authenticated_sync(user_id, session, creds)
    if err:
        return {"error": err}
    err = _ensure_gwt_sync(session)
    if err:
        return {"error": err}

    selected = session.page.evaluate("""(targetName) => {
        const nodes = document.querySelectorAll('.x-tree3-node');
        const lower = targetName.toLowerCase();
        for (const node of nodes) {
            const textEl = node.querySelector('.x-tree3-node-text');
            if (!textEl) continue;
            const text = textEl.textContent.trim();
            if (text.toLowerCase().includes(lower)) {
                const check = node.querySelector('.x-tree3-node-check');
                if (check) {
                    check.click();
                    return { found: true, name: text, method: 'checkbox' };
                }
                textEl.click();
                return { found: true, name: text, method: 'click' };
            }
        }
        return { found: false, name: null, method: null };
    }""", node_name)

    if not selected["found"]:
        return {"error": f"Noeud '{node_name}' non trouve"}

    time.sleep(3)
    session.touch()
    return {"selected": selected["name"], "method": selected["method"], "error": None}


def _action_search_sync(user_id: str, creds: tuple[str, str], query: str) -> dict:
    session = _get_session_sync(user_id)
    err = _ensure_authenticated_sync(user_id, session, creds)
    if err:
        return {"error": err}
    err = _ensure_gwt_sync(session)
    if err:
        return {"error": err}

    page = session.page
    search_inputs = page.locator("input.x-form-text")
    count = search_inputs.count()
    if count < 3:
        return {"error": f"Interface ADE incomplete ({count} inputs)"}

    search_input = search_inputs.nth(2)
    search_input.click()
    search_input.fill(query)
    time.sleep(0.5)

    search_btn = page.locator("img.x-form-trigger")
    if search_btn.count() > 0:
        search_btn.last.click()
    else:
        page.mouse.click(190, 266)

    time.sleep(3)

    result = _action_browse_sync(user_id, creds)
    result["searched"] = query
    session.touch()
    return result


def _action_read_sync(user_id: str, creds: tuple[str, str]) -> dict:
    session = _get_session_sync(user_id)
    err = _ensure_authenticated_sync(user_id, session, creds)
    if err:
        return {"error": err}

    # Scroller toute la zone planning pour forcer le rendu de tous les evenements
    session.page.evaluate("""() => {
        // Chercher le conteneur du planning (panneau central GWT)
        const panels = document.querySelectorAll('.x-panel-body');
        for (const panel of panels) {
            if (panel.scrollHeight > panel.clientHeight) {
                // Scroller progressivement pour forcer le rendu lazy
                const step = panel.clientHeight;
                let pos = 0;
                while (pos < panel.scrollHeight) {
                    panel.scrollTop = pos;
                    pos += step;
                }
                // Revenir en haut
                panel.scrollTop = 0;
            }
        }
    }""")
    time.sleep(0.5)

    raw_text = session.page.evaluate("() => document.body.innerText")
    events = _parse_schedule_text(raw_text)

    session.touch()
    return {
        "raw_text": raw_text[:12000],
        "events": events,
        "events_count": len(events),
        "error": None,
    }


def _parse_schedule_text(raw_text: str) -> list[dict]:
    """Parse le texte brut de la page ADE en evenements structures."""
    events = []
    lines = raw_text.split("\n")

    current_date = None
    date_pattern = re.compile(r"^(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)\w*\.?\s+(\d{2}/\d{2})")
    time_pattern = re.compile(r"(\d{2}[h:]\d{2})\s*-\s*(\d{2}[h:]\d{2})")

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        date_match = date_pattern.match(line)
        if date_match:
            current_date = line.strip()
            i += 1
            continue

        time_match = time_pattern.search(line)
        if time_match and current_date:
            event = {
                "date": current_date,
                "start": time_match.group(1),
                "end": time_match.group(2),
                "summary": "",
                "location": "",
                "description": "",
            }
            details = []
            i += 1
            while i < len(lines):
                detail_line = lines[i].strip()
                if not detail_line:
                    i += 1
                    break
                if date_pattern.match(detail_line) or time_pattern.search(detail_line):
                    break
                details.append(detail_line)
                i += 1

            if details:
                event["summary"] = details[0]
            if len(details) > 1:
                event["location"] = details[1]
            if len(details) > 2:
                event["description"] = " | ".join(details[2:])
            events.append(event)
            continue

        i += 1

    return events


# --- Point d'entree async (bridge vers le thread sync) ---

async def execute_action(user_id: str, action: str, params: dict) -> dict:
    """Dispatch une action ADE. Appele par l'endpoint /ade/action.
    Les credentials sont lus en async, puis l'action sync tourne dans le thread PW."""
    # Lire les credentials en async (DB)
    creds = await session_store.get_credentials(user_id)
    if not creds and action != "status":
        return {"error": "Pas de credentials CAS. Va dans Parametres > ADE Consult pour te connecter."}

    loop = asyncio.get_event_loop()

    handlers = {
        "browse": partial(_action_browse_sync, user_id, creds),
        "expand": partial(_action_expand_sync, user_id, creds, params.get("node", "")),
        "select": partial(_action_select_sync, user_id, creds, params.get("node", "")),
        "search": partial(_action_search_sync, user_id, creds, params.get("query", "")),
        "read": partial(_action_read_sync, user_id, creds),
    }
    handler = handlers.get(action)
    if not handler:
        return {"error": f"Action inconnue: {action}"}
    try:
        return await loop.run_in_executor(_executor, handler)
    except Exception as e:
        logger.error("[SCRAPER] Action %s error: %s", action, e, exc_info=True)
        return {"error": str(e)}
