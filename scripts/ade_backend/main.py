"""
FastAPI backend pour l'agent ADE Consult.
Endpoints REST pour auth CAS, emploi du temps, recherche, iCal, routines.
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from .ade_client import ADEClient
from .ade_scraper import close_browser, execute_action
from .models import (
    Event,
    LoginRequest,
    RememberRequest,
    ResourceInfo,
    RoutineInfo,
    RoutineRequest,
    ScheduleResponse,
    StatusResponse,
)
from .scheduler import start_scheduler, stop_scheduler
from .session_store import (
    delete_resource,
    delete_routine,
    get_cookies,
    get_credentials,
    get_project_id,
    get_resources,
    get_routines,
    init_db,
    save_cookies,
    save_resource,
    save_routine,
)

load_dotenv(Path(__file__).parent / ".env")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache des clients ADE par user_id
_clients: dict[str, ADEClient] = {}


def _get_user_id(authorization: str = Header(...)) -> str:
    """Extrait un identifiant utilisateur du token Bearer."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token manquant")
    # On utilise le token lui-même comme user_id (hash pour la DB)
    token = authorization[7:]
    if not token:
        raise HTTPException(401, "Token vide")
    # Utiliser les 16 premiers chars du token comme user_id
    return token[:16]


async def _get_client(user_id: str) -> ADEClient:
    """Récupère ou crée un client ADE pour l'utilisateur."""
    if user_id not in _clients or _clients[user_id]._session is None:
        _clients[user_id] = ADEClient(user_id)
    return _clients[user_id]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await start_scheduler()
    logger.info("ADE Backend démarré")
    yield
    await stop_scheduler()
    await close_browser()
    for client in _clients.values():
        await client.close()
    logger.info("ADE Backend arrêté")


app = FastAPI(title="ADE Consult Agent", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth ---

@app.post("/ade/login")
async def login(req: LoginRequest, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    client = await _get_client(user_id)
    success = await client.login(req.cas_username, req.cas_password)
    if not success:
        raise HTTPException(401, "Échec authentification CAS")
    return {"status": "ok", "message": "Connecté à ADE Consult"}


@app.post("/ade/login/cookies")
async def login_with_cookies(request: Request, authorization: str = Header(...)):
    """Accepte les cookies CAS depuis le WebView au lieu de username/password."""
    user_id = _get_user_id(authorization)
    body = await request.json()
    cookies = body.get("cookies", {})
    if not cookies:
        raise HTTPException(400, "Pas de cookies fournis")
    await save_cookies(user_id, cookies)
    # Verifier si les cookies permettent d'acceder a ADE
    client = await _get_client(user_id)
    valid = await client.restore_session()
    if not valid:
        raise HTTPException(401, "Cookies invalides ou session expiree")
    return {"status": "ok", "authenticated": True}


@app.get("/ade/status", response_model=StatusResponse)
async def status(authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    creds = await get_credentials(user_id)
    cookies = await get_cookies(user_id)
    project_id = await get_project_id(user_id)
    resources = await get_resources(user_id)
    return StatusResponse(
        authenticated=cookies is not None,
        has_credentials=creds is not None,
        project_id=project_id,
        resources_count=len(resources),
    )


# --- Emploi du temps ---

@app.get("/ade/schedule", response_model=ScheduleResponse)
async def schedule(
    authorization: str = Header(...),
    weeks: int = Query(4, ge=1, le=52),
    resource_ids: str = Query(None, description="IDs séparés par des virgules"),
):
    user_id = _get_user_id(authorization)
    client = await _get_client(user_id)

    # Déterminer les resource_ids
    if resource_ids:
        ids = [int(x.strip()) for x in resource_ids.split(",")]
    else:
        # Utiliser les ressources mémorisées
        saved = await get_resources(user_id)
        if not saved:
            raise HTTPException(400, "Aucune ressource mémorisée. Utilisez /ade/search puis /ade/remember.")
        ids = [r["resource_id"] for r in saved]

    project_id = await get_project_id(user_id)
    events = await client.fetch_schedule(ids, project_id, weeks)
    if not events:
        return ScheduleResponse(events=[], ical_url=None)

    ical_url = client.build_ical_url(ids, project_id, weeks) if project_id else None
    return ScheduleResponse(
        events=[Event(**e) for e in events],
        ical_url=ical_url,
    )


# --- Recherche ---

@app.get("/ade/search")
async def search(
    q: str = Query(..., min_length=2),
    authorization: str = Header(...),
):
    user_id = _get_user_id(authorization)
    client = await _get_client(user_id)
    if not await client.ensure_authenticated():
        raise HTTPException(401, "Non authentifié. Appelez /ade/login d'abord.")
    results = await client.search_resources(q)
    return {"results": results}


# --- Projets ---

@app.get("/ade/projects")
async def projects(authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    client = await _get_client(user_id)
    if not await client.ensure_authenticated():
        raise HTTPException(401, "Non authentifié")
    return {"projects": await client.get_projects()}


@app.post("/ade/project/{project_id}")
async def set_project(project_id: int, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    client = await _get_client(user_id)
    if not await client.ensure_authenticated():
        raise HTTPException(401, "Non authentifié")
    success = await client.set_project(project_id)
    if not success:
        raise HTTPException(400, "Impossible de sélectionner ce projet")
    return {"status": "ok", "project_id": project_id}


# --- Ressources mémorisées ---

@app.post("/ade/remember")
async def remember(req: RememberRequest, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    await save_resource(user_id, req.name, req.resource_id, req.project_id)
    return {"status": "ok", "message": f"Ressource '{req.name}' mémorisée"}


@app.get("/ade/resources", response_model=list[ResourceInfo])
async def resources(authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    saved = await get_resources(user_id)
    return [ResourceInfo(**r) for r in saved]


@app.delete("/ade/resources/{name}")
async def remove_resource(name: str, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    await delete_resource(user_id, name)
    return {"status": "ok"}


# --- iCal ---

@app.get("/ade/ical")
async def ical(
    authorization: str = Header(...),
    resource_ids: str = Query(None),
    weeks: int = Query(4, ge=1, le=52),
):
    user_id = _get_user_id(authorization)

    if resource_ids:
        ids = [int(x.strip()) for x in resource_ids.split(",")]
    else:
        saved = await get_resources(user_id)
        if not saved:
            raise HTTPException(400, "Aucune ressource. Utilisez /ade/search puis /ade/remember.")
        ids = [r["resource_id"] for r in saved]

    project_id = await get_project_id(user_id)
    if not project_id:
        raise HTTPException(400, "Pas de projet sélectionné. Utilisez /ade/projects puis /ade/project/{id}.")

    client = await _get_client(user_id)
    url = client.build_ical_url(ids, project_id, weeks)
    return {"ical_url": url}


# --- Routines ---

@app.post("/ade/routines")
async def add_routine(req: RoutineRequest, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    await save_routine(user_id, req.name, req.cron, req.action, req.params)
    return {"status": "ok", "message": f"Routine '{req.name}' ajoutée"}


@app.get("/ade/routines", response_model=list[RoutineInfo])
async def list_routines(authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    saved = await get_routines(user_id)
    return [RoutineInfo(**r) for r in saved]


@app.delete("/ade/routines/{name}")
async def remove_routine(name: str, authorization: str = Header(...)):
    user_id = _get_user_id(authorization)
    await delete_routine(user_id, name)
    return {"status": "ok"}


# --- Navigation interactive Playwright ---

@app.post("/ade/action")
async def ade_action(request: Request, authorization: str = Header(...)):
    """
    Endpoint unique pour les actions ADE pilotees par le LLM.
    Body: {"action": "browse|expand|select|search|read", "params": {...}}
    """
    user_id = _get_user_id(authorization)
    body = await request.json()
    action = body.get("action", "")
    params = body.get("params", {})
    if not action:
        raise HTTPException(400, "Champ 'action' requis")
    result = await execute_action(user_id, action, params)
    # Toujours retourner 200 — le LLM a besoin de voir les erreurs pour reagir
    return result
