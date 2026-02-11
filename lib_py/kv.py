"""
KV storage helper for Python serverless functions.

Uses Vercel KV (Redis-compatible REST API) in production.
Falls back to in-memory dict for local development.
"""

import json
import os
import time
import urllib.request
import urllib.parse
from typing import Any

KV_URL = os.environ.get("KV_REST_API_URL", "")
KV_TOKEN = os.environ.get("KV_REST_API_TOKEN", "")

# In-memory fallback for local dev
_mem: dict[str, Any] = {}


def _kv_request(command: list[str]) -> Any:
    """Send a command to Vercel KV REST API."""
    if not KV_URL or not KV_TOKEN:
        return None
    url = f"{KV_URL}"
    data = json.dumps(command).encode()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {KV_TOKEN}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        result = json.loads(resp.read().decode())
    return result.get("result")


def kv_get(key: str) -> Any:
    """Get a JSON value by key."""
    if KV_URL and KV_TOKEN:
        raw = _kv_request(["GET", key])
        if raw is None:
            return None
        if isinstance(raw, str):
            try:
                return json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                return raw
        return raw
    return _mem.get(key)


def kv_set(key: str, value: Any, ex: int | None = None) -> None:
    """Set a JSON value."""
    serialized = json.dumps(value)
    if KV_URL and KV_TOKEN:
        cmd = ["SET", key, serialized]
        if ex:
            cmd += ["EX", str(ex)]
        _kv_request(cmd)
    else:
        _mem[key] = value


def kv_del(key: str) -> None:
    if KV_URL and KV_TOKEN:
        _kv_request(["DEL", key])
    else:
        _mem.pop(key, None)


def kv_keys(pattern: str) -> list[str]:
    if KV_URL and KV_TOKEN:
        result = _kv_request(["KEYS", pattern])
        return result if isinstance(result, list) else []
    import re
    regex = re.compile("^" + pattern.replace("*", ".*") + "$")
    return [k for k in _mem if regex.match(k)]


def kv_lpush(key: str, *values: Any) -> None:
    if KV_URL and KV_TOKEN:
        for v in values:
            _kv_request(["LPUSH", key, json.dumps(v)])
    else:
        lst = _mem.get(key, [])
        if not isinstance(lst, list):
            lst = []
        for v in values:
            lst.insert(0, v)
        _mem[key] = lst


def kv_lrange(key: str, start: int, stop: int) -> list:
    if KV_URL and KV_TOKEN:
        result = _kv_request(["LRANGE", key, str(start), str(stop)])
        if not result:
            return []
        parsed = []
        for item in result:
            if isinstance(item, str):
                try:
                    parsed.append(json.loads(item))
                except (json.JSONDecodeError, TypeError):
                    parsed.append(item)
            else:
                parsed.append(item)
        return parsed
    lst = _mem.get(key, [])
    if not isinstance(lst, list):
        return []
    return lst[start : None if stop == -1 else stop + 1]


def kv_incr(key: str, amount: int = 1) -> int:
    if KV_URL and KV_TOKEN:
        result = _kv_request(["INCRBY", key, str(amount)])
        return int(result) if result else 0
    val = _mem.get(key, 0)
    if not isinstance(val, (int, float)):
        val = 0
    val = int(val) + amount
    _mem[key] = val
    return val
