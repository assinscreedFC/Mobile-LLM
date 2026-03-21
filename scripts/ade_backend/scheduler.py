"""
APScheduler pour les routines ADE (ex: fetch emploi du temps chaque lundi matin).
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from .ade_client import ADEClient
from .session_store import get_resources, get_routines, init_db

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None

# Résultats des dernières routines (par user_id + routine_name)
routine_results: dict[str, list[dict]] = {}


async def _execute_routine(user_id: str, name: str, action: str, params: dict) -> None:
    """Exécute une routine planifiée."""
    logger.info("Exécution routine '%s' pour user '%s' (action: %s)", name, user_id, action)
    client = ADEClient(user_id)
    try:
        if not await client.ensure_authenticated():
            logger.error("Routine '%s': impossible de s'authentifier", name)
            return

        if action == "week_schedule":
            weeks = params.get("weeks", 1)
            resources = await get_resources(user_id)
            if not resources:
                logger.warning("Routine '%s': aucune ressource mémorisée", name)
                return
            ids = [r["resource_id"] for r in resources]
            events = await client.fetch_schedule(ids, weeks=weeks)
            key = f"{user_id}:{name}"
            routine_results[key] = events
            logger.info("Routine '%s': %d événements récupérés", name, len(events))

        elif action == "fetch_ical":
            # Juste vérifier que l'URL iCal est accessible
            resources = await get_resources(user_id)
            if resources:
                ids = [r["resource_id"] for r in resources]
                events = await client.fetch_schedule(ids)
                key = f"{user_id}:{name}"
                routine_results[key] = events
    finally:
        await client.close()


def _parse_cron(cron_str: str) -> dict:
    """Parse une expression cron '0 7 * * 1' en kwargs pour CronTrigger."""
    parts = cron_str.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Expression cron invalide: {cron_str}")
    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


async def start_scheduler() -> None:
    """Démarre le scheduler et charge les routines depuis la DB."""
    global _scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.start()
    logger.info("Scheduler démarré")
    # Note: les routines sont chargées par user au moment du login/status
    # Pour un vrai daemon, il faudrait charger toutes les routines au démarrage


async def load_user_routines(user_id: str) -> None:
    """Charge les routines d'un utilisateur dans le scheduler."""
    if not _scheduler:
        return
    routines = await get_routines(user_id)
    for r in routines:
        job_id = f"{user_id}:{r['name']}"
        # Supprimer le job existant s'il y en a un
        if _scheduler.get_job(job_id):
            _scheduler.remove_job(job_id)
        try:
            cron_kwargs = _parse_cron(r["cron"])
            _scheduler.add_job(
                _execute_routine,
                trigger=CronTrigger(**cron_kwargs),
                id=job_id,
                args=[user_id, r["name"], r["action"], r["params"]],
                replace_existing=True,
            )
            logger.info("Routine '%s' chargée pour user '%s'", r["name"], user_id)
        except ValueError as e:
            logger.error("Routine '%s' invalide: %s", r["name"], e)


async def stop_scheduler() -> None:
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Scheduler arrêté")
