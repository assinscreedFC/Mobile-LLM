"""
Persistence SQLite async pour l'agent ADE Consult.
Stocke credentials chiffrés, cookies de session, ressources mémorisées et routines.
"""

import json
import os
from pathlib import Path

import aiosqlite
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

DB_PATH = Path(__file__).parent / "data" / "ade.db"
_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = os.getenv("ADE_ENCRYPTION_KEY")
        if not key:
            raise RuntimeError("ADE_ENCRYPTION_KEY manquant dans .env")
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


async def init_db() -> None:
    """Crée les tables si elles n'existent pas."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                enc_username BLOB,
                enc_password BLOB,
                cookies TEXT,
                project_id INTEGER
            );
            CREATE TABLE IF NOT EXISTS resources (
                user_id TEXT,
                name TEXT,
                resource_id INTEGER,
                project_id INTEGER,
                PRIMARY KEY (user_id, name)
            );
            CREATE TABLE IF NOT EXISTS routines (
                user_id TEXT,
                name TEXT,
                cron TEXT,
                action TEXT,
                params TEXT DEFAULT '{}',
                PRIMARY KEY (user_id, name)
            );
        """)


# --- Credentials ---

async def save_credentials(user_id: str, username: str, password: str) -> None:
    f = _get_fernet()
    enc_user = f.encrypt(username.encode())
    enc_pass = f.encrypt(password.encode())
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO users (user_id, enc_username, enc_password) VALUES (?, ?, ?)",
            (user_id, enc_user, enc_pass),
        )
        await db.commit()


async def get_credentials(user_id: str) -> tuple[str, str] | None:
    f = _get_fernet()
    async with aiosqlite.connect(DB_PATH) as db:
        row = await db.execute_fetchall(
            "SELECT enc_username, enc_password FROM users WHERE user_id = ?",
            (user_id,),
        )
        if not row:
            return None
        enc_user, enc_pass = row[0]
        if not enc_user or not enc_pass:
            return None
        try:
            return f.decrypt(enc_user).decode(), f.decrypt(enc_pass).decode()
        except Exception:
            return None


# --- Cookies de session ---

async def save_cookies(user_id: str, cookies: dict) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO users (user_id, cookies) VALUES (?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET cookies = excluded.cookies",
            (user_id, json.dumps(cookies)),
        )
        await db.commit()


async def get_cookies(user_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        row = await db.execute_fetchall(
            "SELECT cookies FROM users WHERE user_id = ?", (user_id,),
        )
        if not row or not row[0][0]:
            return None
        return json.loads(row[0][0])


# --- Project ID ---

async def save_project_id(user_id: str, project_id: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO users (user_id, project_id) VALUES (?, ?) "
            "ON CONFLICT(user_id) DO UPDATE SET project_id = excluded.project_id",
            (user_id, project_id),
        )
        await db.commit()


async def get_project_id(user_id: str) -> int | None:
    async with aiosqlite.connect(DB_PATH) as db:
        row = await db.execute_fetchall(
            "SELECT project_id FROM users WHERE user_id = ?", (user_id,),
        )
        if not row or row[0][0] is None:
            return None
        return row[0][0]


# --- Ressources mémorisées ---

async def save_resource(user_id: str, name: str, resource_id: int, project_id: int) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO resources VALUES (?, ?, ?, ?)",
            (user_id, name, resource_id, project_id),
        )
        await db.commit()


async def get_resources(user_id: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        rows = await db.execute_fetchall(
            "SELECT name, resource_id, project_id FROM resources WHERE user_id = ?",
            (user_id,),
        )
        return [{"name": r[0], "resource_id": r[1], "project_id": r[2]} for r in rows]


async def delete_resource(user_id: str, name: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM resources WHERE user_id = ? AND name = ?",
            (user_id, name),
        )
        await db.commit()


# --- Routines ---

async def save_routine(user_id: str, name: str, cron: str, action: str, params: dict | None = None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO routines VALUES (?, ?, ?, ?, ?)",
            (user_id, name, cron, action, json.dumps(params or {})),
        )
        await db.commit()


async def get_routines(user_id: str) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        rows = await db.execute_fetchall(
            "SELECT name, cron, action, params FROM routines WHERE user_id = ?",
            (user_id,),
        )
        return [
            {"name": r[0], "cron": r[1], "action": r[2], "params": json.loads(r[3])}
            for r in rows
        ]


async def delete_routine(user_id: str, name: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM routines WHERE user_id = ? AND name = ?",
            (user_id, name),
        )
        await db.commit()
