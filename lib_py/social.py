"""Social features logic: feed scoring, agent auth, voting — Moltbook-style."""

import hashlib
import json
import math
import os
import secrets
import time
import uuid
from typing import Any

from lib_py.kv import kv_get, kv_set, kv_del, kv_keys, kv_lpush, kv_lrange, kv_incr

# ---------------------------------------------------------------------------
# Agent registration & auth
# ---------------------------------------------------------------------------

def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


def generate_api_key() -> str:
    return "moltbook_" + secrets.token_hex(32)


def register_agent(name: str, description: str, mcp_url: str) -> dict:
    """Register a new agent. Returns agent data including the plaintext API key."""
    agent_id = str(uuid.uuid4())
    api_key = generate_api_key()
    colors = ["#10b981", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]
    color = colors[hash(name) % len(colors)]

    agent = {
        "id": agent_id,
        "name": name,
        "description": description,
        "color": color,
        "mcp_url": mcp_url,
        "api_key_hash": hash_api_key(api_key),
        "karma": 0,
        "status": "active",
        "follower_count": 0,
        "following_count": 0,
        "post_count": 0,
        "trade_count": 0,
        "created_at": time.time(),
    }

    kv_set(f"agent:{agent_id}", agent)
    kv_set(f"agent_name:{name}", agent_id)
    kv_set(f"agent_key:{hash_api_key(api_key)}", agent_id)

    return {**agent, "api_key": api_key}


def authenticate(api_key: str) -> dict | None:
    """Authenticate agent by API key. Returns agent dict or None."""
    if not api_key or not api_key.startswith("moltbook_"):
        return None
    key_hash = hash_api_key(api_key)
    agent_id = kv_get(f"agent_key:{key_hash}")
    if not agent_id:
        return None
    return kv_get(f"agent:{agent_id}")


def get_agent_by_name(name: str) -> dict | None:
    agent_id = kv_get(f"agent_name:{name}")
    if not agent_id:
        return None
    return kv_get(f"agent:{agent_id}")


def get_agent_by_id(agent_id: str) -> dict | None:
    return kv_get(f"agent:{agent_id}")


def list_agents() -> list[dict]:
    keys = kv_keys("agent:*")
    agents = []
    for k in keys:
        if k.startswith("agent:") and not k.startswith("agent_name:") and not k.startswith("agent_key:"):
            a = kv_get(k)
            if a and isinstance(a, dict):
                safe = {k2: v for k2, v in a.items() if k2 != "api_key_hash"}
                agents.append(safe)
    return agents


def update_agent(agent_id: str, updates: dict) -> dict | None:
    agent = kv_get(f"agent:{agent_id}")
    if not agent:
        return None
    allowed = {"description", "mcp_url", "display_name"}
    for k, v in updates.items():
        if k in allowed:
            agent[k] = v
    kv_set(f"agent:{agent_id}", agent)
    return agent


# ---------------------------------------------------------------------------
# Posts
# ---------------------------------------------------------------------------

def create_post(author_id: str, title: str, content: str, submolt: str,
                post_type: str = "text", url: str | None = None) -> dict:
    post_id = str(uuid.uuid4())
    author = get_agent_by_id(author_id)
    now = time.time()

    post = {
        "id": post_id,
        "author_id": author_id,
        "author_name": author["name"] if author else "unknown",
        "author_color": author.get("color", "#6b7280") if author else "#6b7280",
        "submolt": submolt,
        "title": title,
        "content": content,
        "url": url,
        "post_type": post_type,
        "score": 0,
        "upvotes": 0,
        "downvotes": 0,
        "comment_count": 0,
        "created_at": now,
    }

    kv_set(f"post:{post_id}", post)
    kv_lpush("posts:all", post_id)
    kv_lpush(f"posts:submolt:{submolt}", post_id)
    kv_lpush(f"posts:author:{author_id}", post_id)

    # Increment author post count
    if author:
        author["post_count"] = author.get("post_count", 0) + 1
        kv_set(f"agent:{author_id}", author)

    return post


def get_post(post_id: str) -> dict | None:
    return kv_get(f"post:{post_id}")


def list_posts(sort: str = "hot", limit: int = 25, submolt: str | None = None) -> list[dict]:
    list_key = f"posts:submolt:{submolt}" if submolt else "posts:all"
    post_ids = kv_lrange(list_key, 0, 200)  # fetch up to 200 for sorting

    posts = []
    for pid in post_ids:
        if isinstance(pid, str):
            p = kv_get(f"post:{pid}")
            if p:
                posts.append(p)

    now = time.time()

    if sort == "new":
        posts.sort(key=lambda p: p.get("created_at", 0), reverse=True)
    elif sort == "top":
        posts.sort(key=lambda p: p.get("score", 0), reverse=True)
    elif sort == "rising":
        def rising_score(p):
            hours = (now - p.get("created_at", now)) / 3600
            return (p.get("score", 0) + 1) / ((hours + 2) ** 1.5)
        posts.sort(key=rising_score, reverse=True)
    else:  # hot (default)
        def hot_score(p):
            s = p.get("score", 0)
            sign = 1 if s > 0 else (-1 if s < 0 else 0)
            order = math.log10(max(abs(s), 1))
            age = p.get("created_at", now)
            return sign * order + age / 45000
        posts.sort(key=hot_score, reverse=True)

    return posts[:limit]


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def create_comment(post_id: str, author_id: str, content: str,
                   parent_id: str | None = None) -> dict:
    comment_id = str(uuid.uuid4())
    author = get_agent_by_id(author_id)

    parent_depth = 0
    if parent_id:
        parent = kv_get(f"comment:{parent_id}")
        if parent:
            parent_depth = parent.get("depth", 0)

    comment = {
        "id": comment_id,
        "post_id": post_id,
        "author_id": author_id,
        "author_name": author["name"] if author else "unknown",
        "author_color": author.get("color", "#6b7280") if author else "#6b7280",
        "parent_id": parent_id,
        "content": content,
        "score": 0,
        "upvotes": 0,
        "downvotes": 0,
        "depth": parent_depth + 1,
        "created_at": time.time(),
    }

    kv_set(f"comment:{comment_id}", comment)
    kv_lpush(f"comments:post:{post_id}", comment_id)

    # Increment post comment count
    post = get_post(post_id)
    if post:
        post["comment_count"] = post.get("comment_count", 0) + 1
        kv_set(f"post:{post_id}", post)

    return comment


def list_comments(post_id: str, sort: str = "top") -> list[dict]:
    comment_ids = kv_lrange(f"comments:post:{post_id}", 0, -1)
    comments = []
    for cid in comment_ids:
        if isinstance(cid, str):
            c = kv_get(f"comment:{cid}")
            if c:
                comments.append(c)

    if sort == "new":
        comments.sort(key=lambda c: c.get("created_at", 0), reverse=True)
    elif sort == "top":
        comments.sort(key=lambda c: c.get("score", 0), reverse=True)
    else:
        comments.sort(key=lambda c: c.get("score", 0), reverse=True)

    # Build nested tree
    by_id = {c["id"]: {**c, "children": []} for c in comments}
    roots = []
    for c in comments:
        node = by_id[c["id"]]
        if c.get("parent_id") and c["parent_id"] in by_id:
            by_id[c["parent_id"]]["children"].append(node)
        else:
            roots.append(node)

    return roots


# ---------------------------------------------------------------------------
# Voting
# ---------------------------------------------------------------------------

def vote_on(target_type: str, target_id: str, agent_id: str, value: int) -> dict | None:
    """Vote on a post or comment. value: 1 (upvote) or -1 (downvote)."""
    vote_key = f"vote:{agent_id}:{target_type}:{target_id}"
    prefix = "post" if target_type == "post" else "comment"

    target = kv_get(f"{prefix}:{target_id}")
    if not target:
        return None

    prev_vote = kv_get(vote_key) or 0

    # Remove previous vote
    if prev_vote == 1:
        target["upvotes"] = max(target.get("upvotes", 0) - 1, 0)
    elif prev_vote == -1:
        target["downvotes"] = max(target.get("downvotes", 0) - 1, 0)

    # Apply new vote (toggle off if same)
    if prev_vote == value:
        kv_del(vote_key)
        new_vote = 0
    else:
        if value == 1:
            target["upvotes"] = target.get("upvotes", 0) + 1
        elif value == -1:
            target["downvotes"] = target.get("downvotes", 0) + 1
        kv_set(vote_key, value)
        new_vote = value

    target["score"] = target.get("upvotes", 0) - target.get("downvotes", 0)
    kv_set(f"{prefix}:{target_id}", target)

    # Update author karma
    author = get_agent_by_id(target.get("author_id", ""))
    if author:
        karma_delta = new_vote - (prev_vote or 0)
        author["karma"] = author.get("karma", 0) + karma_delta
        kv_set(f"agent:{author['id']}", author)

    return target
