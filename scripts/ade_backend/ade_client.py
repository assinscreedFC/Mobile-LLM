"""
Client ADE Consult : authentification CAS, API ADE, export iCal.
"""

import logging
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse

from yarl import URL

import aiohttp
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from icalendar import Calendar

from . import session_store

load_dotenv(Path(__file__).parent / ".env")
logger = logging.getLogger(__name__)

ADE_BASE_URL = os.getenv("ADE_BASE_URL", "https://adeconsult.app.u-pariscite.fr")


class ADEClient:
    """Client async pour ADE Consult avec auth CAS."""

    def __init__(self, user_id: str):
        self.user_id = user_id
        self.base_url = ADE_BASE_URL
        self._session: aiohttp.ClientSession | None = None
        self._authenticated = False

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            jar = aiohttp.CookieJar(unsafe=True)
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
            }
            self._session = aiohttp.ClientSession(cookie_jar=jar, headers=headers)
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    # --- Auth CAS ---

    async def login(self, username: str, password: str) -> bool:
        """Authentification CAS complete (gere le flow Shibboleth 2-step)."""
        session = await self._get_session()
        try:
            # 1. GET page ADE → redirige vers CAS/IdP
            planning_url = f"{self.base_url}/direct/myplanning.jsp"
            logger.info("[LOGIN] 1. GET %s", planning_url)
            async with session.get(planning_url, allow_redirects=True) as resp:
                cas_url = str(resp.url)
                cas_html = await resp.text()
                logger.info("[LOGIN] 1. Status=%d, URL finale=%s, HTML=%d chars", resp.status, cas_url, len(cas_html))

            # 2. Gerer la page Shibboleth intermediaire si presente
            if "_eventId_proceed" in cas_html and not self._has_username_field(cas_html):
                logger.info("[LOGIN] 2. Page Shibboleth detectee, POST _eventId_proceed")
                action, form_data = self._parse_form(cas_html)
                post_url = self._build_post_url(cas_url, action)
                logger.info("[LOGIN] 2. POST %s, champs=%s", post_url, list(form_data.keys()))
                async with session.post(post_url, data=form_data, allow_redirects=True) as resp:
                    cas_url = str(resp.url)
                    cas_html = await resp.text()
                    logger.info("[LOGIN] 2. Status=%d, URL=%s", resp.status, cas_url)

            # 3. Verifier qu'on a le vrai formulaire login
            if not self._has_username_field(cas_html):
                logger.error("[LOGIN] 3. ECHEC: Pas de champ username. URL=%s, HTML debut=%s", cas_url, cas_html[:500])
                return False

            action, form_data = self._parse_form(cas_html)
            if not form_data:
                logger.error("[LOGIN] 3. ECHEC: Form vide. URL=%s", cas_url)
                return False

            # CAS Paris Cité utilise j_username/j_password
            if "j_username" in str(cas_html):
                form_data["j_username"] = username
                form_data["j_password"] = password
            else:
                form_data["username"] = username
                form_data["password"] = password
            post_url = self._build_post_url(cas_url, action)

            # 4. POST credentials
            logger.info("[LOGIN] 4. POST credentials vers %s, champs=%s", post_url, [k for k in form_data if k != "password"])
            async with session.post(post_url, data=form_data, allow_redirects=True) as resp:
                final_url = str(resp.url)
                final_html = await resp.text()
                logger.info("[LOGIN] 4. Status=%d, URL finale=%s", resp.status, final_url)

            # Verifier si on est bien redirige vers ADE
            if "cas/login" in final_url or "idp/profile" in final_url:
                # Chercher le message d'erreur CAS dans le HTML
                from bs4 import BeautifulSoup as BS
                soup = BS(final_html, "html.parser")
                err_div = soup.find("div", class_="errors") or soup.find("div", id="msg") or soup.find("p", class_="error")
                err_msg = err_div.get_text(strip=True) if err_div else "inconnu"
                logger.error("[LOGIN] 4. ECHEC auth CAS. URL=%s, erreur=%s", final_url, err_msg)
                return False

            # 5. Succes — sauvegarder
            cookies = {}
            for cookie in session.cookie_jar:
                cookies[cookie.key] = cookie.value
            logger.info("[LOGIN] 5. OK — cookies=%s", list(cookies.keys()))

            await session_store.save_cookies(self.user_id, cookies)
            await session_store.save_credentials(self.user_id, username, password)

            self._authenticated = True
            logger.info("[LOGIN] Authentification CAS reussie pour user=%s", self.user_id[:4])
            return True

        except aiohttp.ClientError as e:
            logger.error("[LOGIN] Erreur reseau: %s", e, exc_info=True)
            return False
        except Exception as e:
            logger.error("[LOGIN] Erreur inattendue: %s", e, exc_info=True)
            return False

    async def restore_session(self) -> bool:
        """Tente de restaurer une session avec les cookies sauvegardés."""
        cookies = await session_store.get_cookies(self.user_id)
        if not cookies:
            return False

        session = await self._get_session()
        ade_url = URL(self.base_url)
        for name, value in cookies.items():
            session.cookie_jar.update_cookies({name: value}, ade_url)

        # Tester si la session est encore valide
        try:
            async with session.get(
                f"{self.base_url}/direct/myplanning.jsp",
                allow_redirects=False,
            ) as resp:
                # Si 200 → session valide, si 302 → expirée
                if resp.status == 200:
                    self._authenticated = True
                    return True
        except aiohttp.ClientError:
            pass

        # Session expirée → tenter re-login avec credentials sauvegardés
        creds = await session_store.get_credentials(self.user_id)
        if creds:
            return await self.login(creds[0], creds[1])
        return False

    async def ensure_authenticated(self) -> bool:
        """S'assure qu'on est authentifié (restore ou re-login)."""
        if self._authenticated:
            return True
        return await self.restore_session()

    @staticmethod
    def _parse_form(html: str) -> tuple[str | None, dict]:
        """Retourne (action, {champs hidden + buttons}) du premier form POST."""
        soup = BeautifulSoup(html, "html.parser")
        form = (
            soup.find("form", id="fm1")
            or soup.find("form", attrs={"action": lambda v: v and "login" in str(v)})
            or soup.find("form", attrs={"method": "post"})
            or soup.find("form")
        )
        if not form:
            logger.error("Aucun <form> trouve dans le HTML")
            return None, {}

        data = {}
        for inp in form.find_all("input"):
            name = inp.get("name")
            if not name:
                continue
            input_type = (inp.get("type") or "").lower()
            if input_type in ("hidden", ""):
                data[name] = inp.get("value", "")
        # Aussi les <button name=...> (Shibboleth utilise des buttons)
        for btn in form.find_all("button"):
            name = btn.get("name")
            if name:
                data[name] = btn.get("value", "")
        logger.info("Champs form extraits: %s", list(data.keys()))
        return form.get("action"), data

    @staticmethod
    def _has_username_field(html: str) -> bool:
        """Verifie si le HTML contient un champ username (username ou j_username)."""
        soup = BeautifulSoup(html, "html.parser")
        return (
            soup.find("input", attrs={"name": "username"}) is not None
            or soup.find("input", attrs={"name": "j_username"}) is not None
        )

    @staticmethod
    def _build_post_url(base_url: str, action: str | None) -> str:
        """Construit l'URL de POST a partir de l'action du form."""
        if not action:
            return base_url
        if action.startswith("http"):
            return action
        parsed = urlparse(base_url)
        return f"{parsed.scheme}://{parsed.netloc}{action}"

    # --- API ADE (Web API) ---

    async def _api_call(self, function: str, **params) -> str | None:
        """Appel générique à /jsp/webapi."""
        if not await self.ensure_authenticated():
            return None

        session = await self._get_session()
        url = f"{self.base_url}/jsp/webapi"
        params["function"] = function
        try:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    return await resp.text()
                logger.error("API ADE %s → %d", function, resp.status)
                return None
        except aiohttp.ClientError as e:
            logger.error("Erreur réseau API ADE: %s", e)
            return None

    async def get_projects(self) -> list[dict]:
        """Liste les projets ADE disponibles."""
        xml_text = await self._api_call("getProjects")
        if not xml_text:
            return []
        return self._parse_xml_items(xml_text, "project")

    async def set_project(self, project_id: int) -> bool:
        """Sélectionne le projet actif."""
        result = await self._api_call("setProject", projectId=str(project_id))
        if result is not None:
            await session_store.save_project_id(self.user_id, project_id)
            return True
        return False

    async def search_resources(self, query: str, category: str = "") -> list[dict]:
        """Recherche des ressources (cours, salles, groupes)."""
        project_id = await session_store.get_project_id(self.user_id)
        if project_id:
            await self.set_project(project_id)

        params = {"search": query}
        if category:
            params["category"] = category
        xml_text = await self._api_call("getResources", **params)
        if not xml_text:
            return []
        return self._parse_xml_items(xml_text, "resource")

    async def get_events(
        self,
        resource_ids: list[int],
        weeks: int = 4,
    ) -> list[dict]:
        """Récupère les événements pour les ressources données."""
        project_id = await session_store.get_project_id(self.user_id)
        if project_id:
            await self.set_project(project_id)

        now = datetime.now()
        end = now + timedelta(weeks=weeks)
        xml_text = await self._api_call(
            "getEvents",
            resources=",".join(str(r) for r in resource_ids),
            startDate=now.strftime("%m/%d/%Y"),
            endDate=end.strftime("%m/%d/%Y"),
        )
        if not xml_text:
            return []
        return self._parse_xml_items(xml_text, "event")

    @staticmethod
    def _parse_xml_items(xml_text: str, tag: str) -> list[dict]:
        """Parse le XML ADE et retourne une liste de dicts."""
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            logger.error("XML invalide reçu de l'API ADE")
            return []
        items = []
        for elem in root.iter(tag):
            items.append(dict(elem.attrib))
        return items

    # --- iCal ---

    def build_ical_url(
        self,
        resource_ids: list[int],
        project_id: int,
        weeks: int = 4,
        first_date: str | None = None,
        last_date: str | None = None,
    ) -> str:
        """Génère l'URL iCal anonyme (pas besoin d'auth)."""
        params = {
            "resources": ",".join(str(r) for r in resource_ids),
            "projectId": project_id,
            "calType": "ical",
        }
        if first_date and last_date:
            params["firstDate"] = first_date
            params["lastDate"] = last_date
        else:
            params["nbWeeks"] = weeks

        base = f"{self.base_url}/jsp/custom/modules/plannings/anonymous_cal.jsp"
        return f"{base}?{urlencode(params)}"

    async def fetch_schedule(
        self,
        resource_ids: list[int],
        project_id: int | None = None,
        weeks: int = 4,
    ) -> list[dict]:
        """Télécharge et parse le flux iCal en événements lisibles."""
        if project_id is None:
            project_id = await session_store.get_project_id(self.user_id)
        if not project_id:
            logger.error("Pas de project_id configuré")
            return []

        url = self.build_ical_url(resource_ids, project_id, weeks)
        session = await self._get_session()

        try:
            async with session.get(url) as resp:
                if resp.status != 200:
                    logger.error("Erreur iCal %d pour %s", resp.status, url)
                    return []
                ical_text = await resp.text()
        except aiohttp.ClientError as e:
            logger.error("Erreur réseau iCal: %s", e)
            return []

        return self._parse_ical(ical_text)

    @staticmethod
    def _parse_ical(ical_text: str) -> list[dict]:
        """Parse un fichier .ics en liste d'événements."""
        try:
            cal = Calendar.from_ical(ical_text)
        except Exception:
            logger.error("Erreur parsing iCal")
            return []

        events = []
        for component in cal.walk():
            if component.name != "VEVENT":
                continue
            dt_start = component.get("DTSTART")
            dt_end = component.get("DTEND")
            events.append({
                "summary": str(component.get("SUMMARY", "")),
                "start": dt_start.dt.isoformat() if dt_start else None,
                "end": dt_end.dt.isoformat() if dt_end else None,
                "location": str(component.get("LOCATION", "")),
                "description": str(component.get("DESCRIPTION", "")),
            })

        events.sort(key=lambda e: e["start"] or "")
        return events
