"""Polymarket API client – shared utilities for all Python serverless functions."""

import json
import urllib.request
import urllib.parse
import os
from typing import Any

CLOB_BASE = "https://clob.polymarket.com"
GAMMA_BASE = "https://gamma-api.polymarket.com"


def _get(url: str, params: dict | None = None) -> Any:
    """Simple GET request returning parsed JSON."""
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


# ---------------------------------------------------------------------------
# Markets
# ---------------------------------------------------------------------------

def list_markets(limit: int = 20, offset: int = 0, active: bool = True) -> list[dict]:
    """Return a list of markets from the Polymarket CLOB."""
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if active:
        params["active"] = "true"
    data = _get(f"{CLOB_BASE}/markets", params)
    # CLOB returns list or {data: [...]}
    if isinstance(data, list):
        return data
    return data.get("data", data.get("markets", []))


def get_market(condition_id: str) -> dict:
    """Return a single market by condition_id."""
    return _get(f"{CLOB_BASE}/markets/{condition_id}")


# ---------------------------------------------------------------------------
# Events (Gamma API)
# ---------------------------------------------------------------------------

def list_events(limit: int = 20, offset: int = 0, active: bool = True) -> list[dict]:
    """Return a list of events from the Gamma API."""
    params: dict[str, Any] = {"limit": limit, "offset": offset}
    if active:
        params["active"] = "true"
    data = _get(f"{GAMMA_BASE}/events", params)
    if isinstance(data, list):
        return data
    return data.get("data", data.get("events", []))


def get_event(event_id: str) -> dict:
    """Return a single event by id."""
    return _get(f"{GAMMA_BASE}/events/{event_id}")


# ---------------------------------------------------------------------------
# Prices (CLOB)
# ---------------------------------------------------------------------------

def get_prices(token_ids: list[str]) -> dict:
    """Return mid-market prices for a list of token_ids."""
    if not token_ids:
        return {}
    params = {"token_ids": ",".join(token_ids)}
    return _get(f"{CLOB_BASE}/prices", params)
