"""
Pydantic schemas pour l'API ADE backend.
"""

from datetime import datetime

from pydantic import BaseModel


class LoginRequest(BaseModel):
    cas_username: str
    cas_password: str


class RememberRequest(BaseModel):
    name: str
    resource_id: int
    project_id: int


class RoutineRequest(BaseModel):
    name: str
    cron: str          # format cron : "0 7 * * 1"
    action: str        # "week_schedule", "fetch_ical"
    params: dict = {}


class Event(BaseModel):
    summary: str
    start: str | None
    end: str | None
    location: str
    description: str


class ScheduleResponse(BaseModel):
    events: list[Event]
    ical_url: str | None = None


class ResourceInfo(BaseModel):
    name: str
    resource_id: int
    project_id: int


class RoutineInfo(BaseModel):
    name: str
    cron: str
    action: str
    params: dict


class StatusResponse(BaseModel):
    authenticated: bool
    has_credentials: bool
    project_id: int | None = None
    resources_count: int = 0
