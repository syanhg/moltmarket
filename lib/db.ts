/**
 * Data layer: Supabase (Postgres) when env is set, else Vercel KV.
 * Single interface so social, benchmark, MCP, resolution all use this.
 *
 * IMPORTANT: All Supabase write operations check for errors and throw.
 */

import { supabase, hasSupabase } from "./supabase";
import * as kv from "./kv";

/** Untyped table access for Supabase (no generated schema). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: string): any {
  return supabase().from(name);
}

/** Throw if Supabase returned an error. */
function throwIfError(result: { error: { message: string; code?: string } | null }, context: string): void {
  if (result.error) {
    throw new Error(`DB error [${context}]: ${result.error.message} (code: ${result.error.code ?? "unknown"})`);
  }
}


// ---------------------------------------------------------------------------
// Types (DB row shapes)
// ---------------------------------------------------------------------------

export interface AgentRow {
  id: string;
  name: string;
  api_key_hash: string;
  mcp_url: string;
  description: string;
  color: string;
  status: string;
  karma: number;
  follower_count: number;
  following_count: number;
  post_count: number;
  trade_count: number;
  created_at: string;
}

export interface PostRow {
  id: string;
  author_id: string;
  author_name: string;
  author_color: string;
  submolt: string;
  title: string;
  content: string;
  url: string | null;
  post_type: string;
  score: number;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  created_at: string;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string;
  author_color: string;
  parent_id: string | null;
  content: string;
  score: number;
  upvotes: number;
  downvotes: number;
  depth: number;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  handle: string | null;
  created_at: string;
}

export interface TradeRow {
  id: string;
  agent_id: string | null;
  agent_name: string | null;
  user_id: string | null;
  user_display_name: string | null;
  side: string;
  ticker: string;
  market_id: string | null;
  qty: number;
  price: number;
  confidence: number | null;
  price_at_submit: number | null;
  resolved: boolean;
  outcome_yes: number | null;
  pnl_realized: number | null;
  resolved_at: number | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers: row <-> app format (created_at as unix number where needed)
// ---------------------------------------------------------------------------

function agentRowToRecord(r: AgentRow): Record<string, unknown> {
  return {
    id: r.id,
    name: r.name,
    api_key_hash: r.api_key_hash,
    mcp_url: r.mcp_url,
    description: r.description,
    color: r.color,
    status: r.status,
    karma: r.karma,
    follower_count: r.follower_count,
    following_count: r.following_count,
    post_count: r.post_count,
    trade_count: r.trade_count,
    created_at: new Date(r.created_at).getTime() / 1000,
  };
}

function postRowToRecord(r: PostRow): Record<string, unknown> {
  return {
    id: r.id,
    author_id: r.author_id,
    author_name: r.author_name,
    author_color: r.author_color,
    submolt: r.submolt,
    title: r.title,
    content: r.content,
    url: r.url,
    post_type: r.post_type,
    score: r.score,
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    comment_count: r.comment_count,
    created_at: new Date(r.created_at).getTime() / 1000,
  };
}

function commentRowToRecord(r: CommentRow): Record<string, unknown> {
  return {
    id: r.id,
    post_id: r.post_id,
    author_id: r.author_id,
    author_name: r.author_name,
    author_color: r.author_color,
    parent_id: r.parent_id,
    content: r.content,
    score: r.score,
    upvotes: r.upvotes,
    downvotes: r.downvotes,
    depth: r.depth,
    created_at: new Date(r.created_at).getTime() / 1000,
  };
}

function tradeRowToRecord(r: TradeRow): Record<string, unknown> {
  return {
    id: r.id,
    agent_id: r.agent_id ?? undefined,
    agent_name: r.agent_name ?? undefined,
    user_id: r.user_id ?? undefined,
    user_display_name: r.user_display_name ?? undefined,
    side: r.side,
    ticker: r.ticker,
    market_id: r.market_id ?? undefined,
    qty: r.qty,
    price: r.price,
    confidence: r.confidence ?? undefined,
    price_at_submit: r.price_at_submit ?? undefined,
    resolved: r.resolved,
    outcome_yes: r.outcome_yes ?? undefined,
    pnl_realized: r.pnl_realized ?? undefined,
    resolved_at: r.resolved_at ?? undefined,
    timestamp: new Date(r.created_at).getTime() / 1000,
  };
}

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export async function dbAgentInsert(row: Omit<AgentRow, "created_at"> & { created_at?: number }): Promise<void> {
  if (hasSupabase()) {
    const result = await table("agents").insert({
      id: row.id,
      name: row.name,
      api_key_hash: row.api_key_hash,
      mcp_url: row.mcp_url,
      description: row.description ?? "",
      color: row.color,
      status: row.status,
      karma: row.karma,
      follower_count: row.follower_count,
      following_count: row.following_count,
      post_count: row.post_count,
      trade_count: row.trade_count,
    });
    throwIfError(result, "agents.insert");
    return;
  }
  const created_at = row.created_at ?? Date.now() / 1000;
  const agent = { ...row, created_at };
  await kv.kvSet(`agent:${row.id}`, agent);
  await kv.kvSet(`agent_name:${row.name}`, row.id);
  await kv.kvSet(`agent_key:${row.api_key_hash}`, row.id);
}

export async function dbAgentGetById(id: string): Promise<Record<string, unknown> | null> {
  if (hasSupabase()) {
    const { data, error } = await table("agents").select("*").eq("id", id).single();
    if (error || !data) return null;
    return agentRowToRecord(data as AgentRow);
  }
  return kv.kvGet(`agent:${id}`);
}

export async function dbAgentGetByName(name: string): Promise<Record<string, unknown> | null> {
  if (hasSupabase()) {
    const { data, error } = await table("agents").select("*").eq("name", name).single();
    if (error || !data) return null;
    return agentRowToRecord(data as AgentRow);
  }
  const agentId = await kv.kvGet<string>(`agent_name:${name}`);
  if (!agentId) return null;
  return kv.kvGet(`agent:${agentId}`);
}

export async function dbAgentGetByApiKeyHash(hash: string): Promise<Record<string, unknown> | null> {
  if (hasSupabase()) {
    const { data: agent } = await table("agents").select("*").eq("api_key_hash", hash).single();
    if (!agent) return null;
    return agentRowToRecord(agent as AgentRow);
  }
  const agentId = await kv.kvGet<string>(`agent_key:${hash}`);
  if (!agentId) return null;
  return kv.kvGet(`agent:${agentId}`);
}

export async function dbAgentList(): Promise<Record<string, unknown>[]> {
  if (hasSupabase()) {
    const { data, error } = await table("agents").select("id,name,mcp_url,description,color,status,karma,follower_count,following_count,post_count,trade_count,created_at");
    if (error) return [];
    return (data || []).map((r: Record<string, unknown>) => {
      const row = r;
      const created_at = new Date((row.created_at as string)).getTime() / 1000;
      return { ...row, created_at };
    });
  }
  const keys = await kv.kvKeys("agent:*");
  const agents: Record<string, unknown>[] = [];
  for (const k of keys) {
    if (k.startsWith("agent:") && !k.startsWith("agent_name:") && !k.startsWith("agent_key:")) {
      const a = await kv.kvGet<Record<string, unknown>>(k);
      if (a && typeof a === "object") {
        const { api_key_hash: _, ...safe } = a;
        agents.push(safe);
      }
    }
  }
  return agents;
}

export async function dbAgentUpdate(id: string, updates: Record<string, unknown>): Promise<void> {
  if (hasSupabase()) {
    const allowed: Record<string, unknown> = {};
    const allow = new Set(["description", "mcp_url", "display_name", "status", "karma", "follower_count", "following_count", "post_count", "trade_count"]);
    for (const [k, v] of Object.entries(updates)) {
      if (allow.has(k)) allowed[k] = v;
    }
    if (Object.keys(allowed).length) {
      const result = await table("agents").update(allowed).eq("id", id);
      throwIfError(result, "agents.update");
    }
    return;
  }
  const agent = await kv.kvGet<Record<string, unknown>>(`agent:${id}`);
  if (!agent) return;
  Object.assign(agent, updates);
  await kv.kvSet(`agent:${id}`, agent);
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export async function dbFollowAdd(followerId: string, followingId: string): Promise<void> {
  if (hasSupabase()) {
    const result = await table("follows").upsert(
      { follower_id: followerId, following_id: followingId },
      { onConflict: "follower_id,following_id" }
    );
    throwIfError(result, "follows.upsert");
    return;
  }
  await kv.kvSet(`follow:${followerId}:${followingId}`, true);
  await kv.kvLpush(`followers:${followingId}`, followerId);
  await kv.kvLpush(`following:${followerId}`, followingId);
}

export async function dbFollowRemove(followerId: string, followingId: string): Promise<void> {
  if (hasSupabase()) {
    await table("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
    return;
  }
  await kv.kvDel(`follow:${followerId}:${followingId}`);
}

export async function dbFollowExists(followerId: string, followingId: string): Promise<boolean> {
  if (hasSupabase()) {
    const { data } = await table("follows").select("follower_id").eq("follower_id", followerId).eq("following_id", followingId).maybeSingle();
    return !!data;
  }
  const val = await kv.kvGet<boolean>(`follow:${followerId}:${followingId}`);
  return !!val;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function dbPostInsert(row: Omit<PostRow, "created_at"> & { created_at?: number }): Promise<void> {
  const created = row.created_at ?? Date.now() / 1000;
  if (hasSupabase()) {
    const result = await table("posts").insert({
      id: row.id,
      author_id: row.author_id,
      author_name: row.author_name,
      author_color: row.author_color,
      submolt: row.submolt,
      title: row.title,
      content: row.content,
      url: row.url,
      post_type: row.post_type,
      score: row.score,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      comment_count: row.comment_count,
    });
    throwIfError(result, "posts.insert");
    return;
  }
  const post = { ...row, created_at: created };
  await kv.kvSet(`post:${row.id}`, post);
  await kv.kvLpush("posts:all", row.id);
  await kv.kvLpush(`posts:submolt:${row.submolt}`, row.id);
  await kv.kvLpush(`posts:author:${row.author_id}`, row.id);
}

export async function dbPostGetById(id: string): Promise<Record<string, unknown> | null> {
  if (hasSupabase()) {
    const { data, error } = await table("posts").select("*").eq("id", id).single();
    if (error || !data) return null;
    return postRowToRecord(data as PostRow);
  }
  return kv.kvGet(`post:${id}`);
}

export async function dbPostList(sort: string, limit: number, submolt?: string | null): Promise<Record<string, unknown>[]> {
  if (hasSupabase()) {
    let q = table("posts").select("*");
    if (submolt) q = q.eq("submolt", submolt);
    if (sort === "new") q = q.order("created_at", { ascending: false });
    else q = q.order("created_at", { ascending: false });
    const { data } = await q.limit(limit * 2);
    let rows = (data || []) as PostRow[];
    const now = Date.now() / 1000;
    if (sort === "new") {
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === "top") {
      rows.sort((a, b) => b.score - a.score);
    } else if (sort === "rising") {
      const score = (p: PostRow) => ((p.score || 0) + 1) / Math.pow((now - new Date(p.created_at).getTime() / 1000) / 3600 + 2, 1.5);
      rows.sort((a, b) => score(b) - score(a));
    } else {
      const hotScore = (p: PostRow) => {
        const s = p.score || 0;
        const sign = s > 0 ? 1 : s < 0 ? -1 : 0;
        const order = Math.log10(Math.max(Math.abs(s), 1));
        return sign * order + new Date(p.created_at).getTime() / 1000 / 45000;
      };
      rows.sort((a, b) => hotScore(b) - hotScore(a));
    }
    return rows.slice(0, limit).map(postRowToRecord);
  }
  const listKey = submolt ? `posts:submolt:${submolt}` : "posts:all";
  const postIds = await kv.kvLrange<string>(listKey, 0, 200);
  const posts: Record<string, unknown>[] = [];
  for (const pid of postIds) {
    if (typeof pid === "string") {
      const p = await kv.kvGet<Record<string, unknown>>(`post:${pid}`);
      if (p) posts.push(p);
    }
  }
  const now = Date.now() / 1000;
  if (sort === "new") {
    posts.sort((a, b) => ((b.created_at as number) || 0) - ((a.created_at as number) || 0));
  } else if (sort === "top") {
    posts.sort((a, b) => ((b.score as number) || 0) - ((a.score as number) || 0));
  } else if (sort === "rising") {
    const risingScore = (p: Record<string, unknown>) => ((p.score as number) || 0 + 1) / Math.pow(((now - (p.created_at as number)) / 3600) + 2, 1.5);
    posts.sort((a, b) => risingScore(b) - risingScore(a));
  } else {
    const hotScore = (p: Record<string, unknown>) => {
      const s = (p.score as number) || 0;
      const sign = s > 0 ? 1 : s < 0 ? -1 : 0;
      const order = Math.log10(Math.max(Math.abs(s), 1));
      return sign * order + ((p.created_at as number) || now) / 45000;
    };
    posts.sort((a, b) => hotScore(b) - hotScore(a));
  }
  return posts.slice(0, limit);
}

export async function dbPostUpdate(id: string, updates: Record<string, unknown>): Promise<void> {
  if (hasSupabase()) {
    const allow = new Set(["score", "upvotes", "downvotes", "comment_count"]);
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allow.has(k)) obj[k] = v;
    }
    if (Object.keys(obj).length) {
      const result = await table("posts").update(obj).eq("id", id);
      throwIfError(result, "posts.update");
    }
    return;
  }
  const post = await kv.kvGet<Record<string, unknown>>(`post:${id}`);
  if (post) {
    Object.assign(post, updates);
    await kv.kvSet(`post:${id}`, post);
  }
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function dbCommentInsert(row: Omit<CommentRow, "created_at"> & { created_at?: number }): Promise<void> {
  if (hasSupabase()) {
    const result = await table("comments").insert({
      id: row.id,
      post_id: row.post_id,
      author_id: row.author_id,
      author_name: row.author_name,
      author_color: row.author_color,
      parent_id: row.parent_id,
      content: row.content,
      score: row.score,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      depth: row.depth,
    });
    throwIfError(result, "comments.insert");
    return;
  }
  const comment = { ...row, created_at: row.created_at ?? Date.now() / 1000 };
  await kv.kvSet(`comment:${row.id}`, comment);
  await kv.kvLpush(`comments:post:${row.post_id}`, row.id);
}

export async function dbCommentListByPostId(postId: string): Promise<Record<string, unknown>[]> {
  if (hasSupabase()) {
    const { data } = await table("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    return (data || []).map((r: CommentRow) => commentRowToRecord(r));
  }
  const commentIds = await kv.kvLrange<string>(`comments:post:${postId}`, 0, -1);
  const comments: Record<string, unknown>[] = [];
  for (const cid of commentIds) {
    if (typeof cid === "string") {
      const c = await kv.kvGet<Record<string, unknown>>(`comment:${cid}`);
      if (c) comments.push(c);
    }
  }
  return comments;
}

export async function dbCommentGetById(id: string): Promise<Record<string, unknown> | null> {
  if (hasSupabase()) {
    const { data } = await table("comments").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    return commentRowToRecord(data as CommentRow);
  }
  return kv.kvGet<Record<string, unknown>>(`comment:${id}`);
}

export async function dbCommentUpdate(id: string, updates: Record<string, unknown>): Promise<void> {
  if (hasSupabase()) {
    const allow = new Set(["score", "upvotes", "downvotes"]);
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allow.has(k)) obj[k] = v;
    }
    if (Object.keys(obj).length) {
      const result = await table("comments").update(obj).eq("id", id);
      throwIfError(result, "comments.update");
    }
    return;
  }
  const comment = await kv.kvGet<Record<string, unknown>>(`comment:${id}`);
  if (comment) {
    Object.assign(comment, updates);
    await kv.kvSet(`comment:${id}`, comment);
  }
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

export async function dbVoteGet(agentId: string, targetType: string, targetId: string): Promise<number> {
  if (hasSupabase()) {
    const { data } = await table("votes").select("value").eq("agent_id", agentId).eq("target_type", targetType).eq("target_id", targetId).maybeSingle();
    return (data?.value as number) ?? 0;
  }
  return (await kv.kvGet<number>(`vote:${agentId}:${targetType}:${targetId}`)) ?? 0;
}

export async function dbVoteSet(agentId: string, targetType: string, targetId: string, value: number): Promise<void> {
  if (hasSupabase()) {
    if (value === 0) {
      await table("votes").delete().eq("agent_id", agentId).eq("target_type", targetType).eq("target_id", targetId);
    } else {
      const result = await table("votes").upsert(
        { agent_id: agentId, target_type: targetType, target_id: targetId, value },
        { onConflict: "agent_id,target_type,target_id" }
      );
      throwIfError(result, "votes.upsert");
    }
    return;
  }
  if (value === 0) await kv.kvDel(`vote:${agentId}:${targetType}:${targetId}`);
  else await kv.kvSet(`vote:${agentId}:${targetType}:${targetId}`, value);
}

// ---------------------------------------------------------------------------
// Profiles (human users; id = auth.users.id)
// ---------------------------------------------------------------------------

export async function dbProfileGetById(id: string): Promise<Record<string, unknown> | null> {
  if (hasSupabase()) {
    const { data, error } = await table("profiles").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    const r = data as ProfileRow;
    return {
      id: r.id,
      display_name: r.display_name ?? undefined,
      handle: r.handle ?? undefined,
      created_at: new Date(r.created_at).getTime() / 1000,
    };
  }
  return null;
}

export async function dbProfileUpsert(profile: {
  id: string;
  display_name?: string | null;
  handle?: string | null;
}): Promise<void> {
  if (hasSupabase()) {
    const result = await table("profiles").upsert(
      {
        id: profile.id,
        display_name: profile.display_name ?? null,
        handle: profile.handle ?? null,
      },
      { onConflict: "id" }
    );
    throwIfError(result, "profiles.upsert");
  }
}

/**
 * Ensure a profile row exists for the given user. Creates one if missing.
 * Must be called before inserting a human user trade (FK constraint).
 */
export async function dbProfileEnsure(userId: string, displayName?: string): Promise<void> {
  if (!hasSupabase()) return;
  const existing = await dbProfileGetById(userId);
  if (existing) return;
  await dbProfileUpsert({ id: userId, display_name: displayName ?? "User" });
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

export async function dbTradeInsert(trade: Record<string, unknown>): Promise<void> {
  if (hasSupabase()) {
    // Ensure profile exists for human user trades (FK: user_id -> profiles.id)
    if (trade.user_id && !trade.agent_id) {
      await dbProfileEnsure(
        trade.user_id as string,
        (trade.user_display_name as string) ?? "User"
      );
    }

    const result = await table("trades").insert({
      id: trade.id,
      agent_id: trade.agent_id ?? null,
      agent_name: trade.agent_name ?? null,
      user_id: trade.user_id ?? null,
      user_display_name: trade.user_display_name ?? null,
      side: trade.side,
      ticker: trade.ticker,
      market_id: trade.market_id ?? null,
      qty: trade.qty,
      price: trade.price,
      confidence: trade.confidence ?? null,
      price_at_submit: trade.price_at_submit ?? null,
      resolved: false,
      outcome_yes: null,
      pnl_realized: null,
      resolved_at: null,
    });
    throwIfError(result, "trades.insert");
    return;
  }
  await kv.kvSet(`trade:${trade.id}`, trade);
  await kv.kvLpush("trades:all", trade.id);
  const aid = trade.agent_id as string | undefined;
  if (aid) await kv.kvLpush(`trades:agent:${aid}`, trade.id);
  const uid = trade.user_id as string | undefined;
  if (uid) await kv.kvLpush(`trades:user:${uid}`, trade.id);
}

export async function dbTradeGetByAgentId(agentId: string, limit: number): Promise<Record<string, unknown>[]> {
  if (hasSupabase()) {
    const { data } = await table("trades").select("*").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(limit);
    return (data || []).map((r: TradeRow) => tradeRowToRecord(r));
  }
  const tradeIds = await kv.kvLrange<string>(`trades:agent:${agentId}`, 0, limit - 1);
  const trades: Record<string, unknown>[] = [];
  for (const tid of tradeIds) {
    const t = await kv.kvGet<Record<string, unknown>>(`trade:${tid}`);
    if (t) trades.push(t);
  }
  return trades;
}

export async function dbTradeGetAll(limit: number): Promise<Record<string, unknown>[]> {
  if (hasSupabase()) {
    const { data } = await table("trades").select("*").order("created_at", { ascending: false }).limit(limit);
    return (data || []).map((r: TradeRow) => tradeRowToRecord(r));
  }
  const tradeIds = await kv.kvLrange<string>("trades:all", 0, limit - 1);
  const trades: Record<string, unknown>[] = [];
  for (const tid of tradeIds) {
    const t = await kv.kvGet<Record<string, unknown>>(`trade:${tid}`);
    if (t) trades.push(t);
  }
  return trades;
}

export async function dbTradeListByAgentId(agentId: string): Promise<Record<string, unknown>[]> {
  if (hasSupabase()) {
    const { data } = await table("trades").select("*").eq("agent_id", agentId).order("created_at", { ascending: true });
    return (data || []).map((r: TradeRow) => tradeRowToRecord(r));
  }
  const tradeIds = await kv.kvLrange<string>(`trades:agent:${agentId}`, 0, -1);
  const trades: Record<string, unknown>[] = [];
  for (const tid of tradeIds) {
    const t = await kv.kvGet<Record<string, unknown>>(`trade:${tid}`);
    if (t) trades.push(t);
  }
  return trades;
}

export async function dbTradeListByUserId(userId: string, limit?: number): Promise<Record<string, unknown>[]> {
  if (hasSupabase()) {
    let q = table("trades").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (limit != null) q = q.limit(limit);
    const { data } = await q;
    return (data || []).map((r: TradeRow) => tradeRowToRecord(r));
  }
  // KV fallback: read from user-specific trade list
  const tradeIds = await kv.kvLrange<string>(`trades:user:${userId}`, 0, (limit ?? 200) - 1);
  const trades: Record<string, unknown>[] = [];
  for (const tid of tradeIds) {
    const t = await kv.kvGet<Record<string, unknown>>(`trade:${tid}`);
    if (t) trades.push(t);
  }
  return trades;
}

export async function dbTradeGetById(id: string): Promise<Record<string, unknown> | null> {
  if (hasSupabase()) {
    const { data } = await table("trades").select("*").eq("id", id).maybeSingle();
    if (!data) return null;
    return tradeRowToRecord(data as TradeRow);
  }
  return kv.kvGet<Record<string, unknown>>(`trade:${id}`);
}

export async function dbTradeUpdate(id: string, updates: Record<string, unknown>): Promise<void> {
  if (hasSupabase()) {
    const allow = new Set(["resolved", "outcome_yes", "pnl_realized", "resolved_at"]);
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (allow.has(k)) obj[k] = v;
    }
    if (Object.keys(obj).length) {
      const result = await table("trades").update(obj).eq("id", id);
      throwIfError(result, "trades.update");
    }
    return;
  }
  const trade = await kv.kvGet<Record<string, unknown>>(`trade:${id}`);
  if (trade) {
    Object.assign(trade, updates);
    await kv.kvSet(`trade:${id}`, trade);
  }
}

// ---------------------------------------------------------------------------
// Rate limit (MCP)
// ---------------------------------------------------------------------------

export async function dbRateLimitIncr(key: string, windowSeconds: number): Promise<number> {
  if (hasSupabase()) {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + windowSeconds * 1000).toISOString();

    // Check if existing row is expired; if so, reset to 0 first
    const { data: existing } = await table("rate_limits")
      .select("count, expires_at")
      .eq("key", key)
      .maybeSingle();

    if (existing && existing.expires_at && new Date(existing.expires_at) < new Date(now)) {
      // Window expired — reset count
      await table("rate_limits").update({ count: 1, expires_at: expiresAt }).eq("key", key);
      return 1;
    }

    // Use Postgres RPC for atomic increment via raw SQL, falling back to upsert
    const count = (existing?.count ?? 0) + 1;
    await table("rate_limits").upsert(
      { key, count, expires_at: existing ? existing.expires_at : expiresAt },
      { onConflict: "key" }
    );

    // Opportunistically clean stale rows (non-blocking, max once per call)
    table("rate_limits").delete().lt("expires_at", now).then(() => {});

    return count;
  }
  const count = await kv.kvIncr(key);
  if (count === 1) await kv.kvSet(key, count, windowSeconds + 60);
  return count;
}
