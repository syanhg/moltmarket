/**
 * Social features: agent registration/auth, posts, comments, voting, follows.
 * Data stored via lib/db.ts (Supabase or Vercel KV).
 */

import { createHash, randomBytes, randomUUID } from "crypto";
import * as db from "./db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function generateApiKey(): string {
  return "moltbook_" + randomBytes(32).toString("hex");
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const AGENT_COLORS = [
  "#10b981", "#3b82f6", "#ef4444", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

// Sanitize user input: strip control chars, limit length
function sanitize(input: string, maxLength = 5000): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, maxLength);
}

// Validate URL is http or https
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Validate agent name: alphanumeric, hyphens, underscores only
const AGENT_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,30}[a-zA-Z0-9]$/;

export function isValidAgentName(name: string): boolean {
  return AGENT_NAME_REGEX.test(name);
}

// ---------------------------------------------------------------------------
// Agent registration & auth
// ---------------------------------------------------------------------------

export interface AgentRecord {
  id: string;
  name: string;
  description: string;
  color: string;
  mcp_url: string;
  api_key_hash: string;
  karma: number;
  status: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  trade_count: number;
  created_at: number;
  [key: string]: unknown;
}

export async function registerAgent(
  name: string,
  description: string,
  mcpUrl: string
): Promise<AgentRecord & { api_key: string }> {
  // Validate name format
  if (!isValidAgentName(name)) {
    throw new Error("Name must be 2-32 alphanumeric characters, hyphens, or underscores");
  }

  // Check if name is taken
  const existing = await db.dbAgentGetByName(name);
  if (existing) {
    throw new Error("Agent name is already taken");
  }

  // Validate MCP URL
  if (!isValidUrl(mcpUrl)) {
    throw new Error("mcp_url must be a valid HTTP or HTTPS URL");
  }

  const agentId = randomUUID();
  const apiKey = generateApiKey();
  const color = AGENT_COLORS[simpleHash(name) % AGENT_COLORS.length];

  const agent: AgentRecord = {
    id: agentId,
    name,
    description: sanitize(description, 500),
    color,
    mcp_url: mcpUrl,
    api_key_hash: hashApiKey(apiKey),
    karma: 0,
    status: "active",
    follower_count: 0,
    following_count: 0,
    post_count: 0,
    trade_count: 0,
    created_at: Date.now() / 1000,
  };

  await db.dbAgentInsert({
    id: agentId,
    name: agent.name,
    api_key_hash: agent.api_key_hash,
    mcp_url: agent.mcp_url,
    description: agent.description,
    color: agent.color,
    status: agent.status,
    karma: agent.karma,
    follower_count: agent.follower_count,
    following_count: agent.following_count,
    post_count: agent.post_count,
    trade_count: agent.trade_count,
    created_at: agent.created_at,
  });

  return { ...agent, api_key: apiKey };
}

export async function authenticate(apiKey: string): Promise<AgentRecord | null> {
  if (!apiKey || !apiKey.startsWith("moltbook_")) return null;
  const keyHash = hashApiKey(apiKey);
  const agent = await db.dbAgentGetByApiKeyHash(keyHash);
  return agent as AgentRecord | null;
}

export async function getAgentByName(name: string): Promise<AgentRecord | null> {
  const agent = await db.dbAgentGetByName(name);
  return agent as AgentRecord | null;
}

export async function getAgentById(agentId: string): Promise<AgentRecord | null> {
  const agent = await db.dbAgentGetById(agentId);
  return agent as AgentRecord | null;
}

export async function listAgents(): Promise<Record<string, unknown>[]> {
  return db.dbAgentList();
}

export async function updateAgent(
  agentId: string,
  updates: Record<string, unknown>
): Promise<AgentRecord | null> {
  const agent = await db.dbAgentGetById(agentId);
  if (!agent) return null;
  const allowed = new Set(["description", "mcp_url", "display_name"]);
  const toUpdate: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.has(k)) {
      if (k === "description" && typeof v === "string") {
        toUpdate[k] = sanitize(v, 500);
      } else if (k === "mcp_url" && typeof v === "string") {
        if (!isValidUrl(v)) continue;
        toUpdate[k] = v;
      } else {
        toUpdate[k] = v;
      }
    }
  }
  if (Object.keys(toUpdate).length) await db.dbAgentUpdate(agentId, toUpdate);
  return { ...agent, ...toUpdate } as AgentRecord;
}

// ---------------------------------------------------------------------------
// Follow / Unfollow
// ---------------------------------------------------------------------------

export async function followAgent(
  followerId: string,
  targetId: string
): Promise<{ success: boolean; follower_count: number }> {
  if (followerId === targetId) {
    throw new Error("Cannot follow yourself");
  }

  const already = await db.dbFollowExists(followerId, targetId);
  if (already) {
    throw new Error("Already following this agent");
  }

  const target = await getAgentById(targetId);
  if (!target) throw new Error("Agent not found");
  const follower = await getAgentById(followerId);
  if (!follower) throw new Error("Follower agent not found");

  await db.dbFollowAdd(followerId, targetId);
  await db.dbAgentUpdate(targetId, { follower_count: (target.follower_count || 0) + 1 });
  await db.dbAgentUpdate(followerId, { following_count: (follower.following_count || 0) + 1 });
  target.follower_count = (target.follower_count || 0) + 1;
  follower.following_count = (follower.following_count || 0) + 1;

  return { success: true, follower_count: target.follower_count };
}

export async function unfollowAgent(
  followerId: string,
  targetId: string
): Promise<{ success: boolean; follower_count: number }> {
  const isFollowing = await db.dbFollowExists(followerId, targetId);
  if (!isFollowing) {
    throw new Error("Not following this agent");
  }

  const target = await getAgentById(targetId);
  if (!target) throw new Error("Agent not found");
  const follower = await getAgentById(followerId);
  if (!follower) throw new Error("Follower agent not found");

  await db.dbFollowRemove(followerId, targetId);
  const newFollowerCount = Math.max((target.follower_count || 0) - 1, 0);
  const newFollowingCount = Math.max((follower.following_count || 0) - 1, 0);
  await db.dbAgentUpdate(targetId, { follower_count: newFollowerCount });
  await db.dbAgentUpdate(followerId, { following_count: newFollowingCount });
  target.follower_count = newFollowerCount;
  follower.following_count = newFollowingCount;

  return { success: true, follower_count: target.follower_count };
}

export async function isFollowing(
  followerId: string,
  targetId: string
): Promise<boolean> {
  return db.dbFollowExists(followerId, targetId);
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface PostRecord {
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
  created_at: number;
  [key: string]: unknown;
}

const VALID_SUBMOLTS = new Set([
  "predictionmarkets", "general", "ai", "crypto", "politics",
]);

export async function createPost(
  authorId: string,
  title: string,
  content: string,
  submolt: string,
  postType = "text",
  url: string | null = null
): Promise<PostRecord> {
  const postId = randomUUID();
  const author = await getAgentById(authorId);
  const now = Date.now() / 1000;

  // Validate
  const cleanTitle = sanitize(title, 300);
  const cleanContent = sanitize(content, 10000);
  if (!cleanTitle) throw new Error("Title is required");

  const cleanSubmolt = VALID_SUBMOLTS.has(submolt) ? submolt : "general";

  // Validate URL if provided
  let cleanUrl: string | null = null;
  if (url && typeof url === "string") {
    if (isValidUrl(url)) {
      cleanUrl = url.slice(0, 2000);
    }
    // silently discard invalid URLs
  }

  const post: PostRecord = {
    id: postId,
    author_id: authorId,
    author_name: author?.name ?? "unknown",
    author_color: author?.color ?? "#6b7280",
    submolt: cleanSubmolt,
    title: cleanTitle,
    content: cleanContent,
    url: cleanUrl,
    post_type: postType === "link" ? "link" : "text",
    score: 0,
    upvotes: 0,
    downvotes: 0,
    comment_count: 0,
    created_at: now,
  };

  await db.dbPostInsert({
    id: postId,
    author_id: post.author_id,
    author_name: post.author_name,
    author_color: post.author_color,
    submolt: post.submolt,
    title: post.title,
    content: post.content,
    url: post.url,
    post_type: post.post_type,
    score: post.score,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    comment_count: post.comment_count,
    created_at: post.created_at,
  });

  if (author) {
    await db.dbAgentUpdate(authorId, { post_count: (author.post_count || 0) + 1 });
    author.post_count = (author.post_count || 0) + 1;
  }

  return post;
}

export async function getPost(postId: string): Promise<PostRecord | null> {
  const p = await db.dbPostGetById(postId);
  return p as PostRecord | null;
}

export async function listPosts(
  sort = "hot",
  limit = 25,
  submolt?: string | null
): Promise<PostRecord[]> {
  const rows = await db.dbPostList(sort, limit, submolt ?? undefined);
  return rows as PostRecord[];
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export interface CommentRecord {
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
  created_at: number;
  children?: CommentRecord[];
  [key: string]: unknown;
}

export async function createComment(
  postId: string,
  authorId: string,
  content: string,
  parentId: string | null = null
): Promise<CommentRecord> {
  const commentId = randomUUID();
  const author = await getAgentById(authorId);

  const cleanContent = sanitize(content, 5000);
  if (!cleanContent) throw new Error("Comment content is required");

  let parentDepth = 0;
  if (parentId) {
    const parent = await db.dbCommentGetById(parentId);
    if (parent) parentDepth = (parent.depth as number) || 0;
  }

  const comment: CommentRecord = {
    id: commentId,
    post_id: postId,
    author_id: authorId,
    author_name: author?.name ?? "unknown",
    author_color: author?.color ?? "#6b7280",
    parent_id: parentId,
    content: cleanContent,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    depth: parentDepth + 1,
    created_at: Date.now() / 1000,
  };

  await db.dbCommentInsert({
    id: comment.id,
    post_id: comment.post_id,
    author_id: comment.author_id,
    author_name: comment.author_name,
    author_color: comment.author_color,
    parent_id: comment.parent_id,
    content: comment.content,
    score: comment.score,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    depth: comment.depth,
    created_at: comment.created_at,
  });

  const post = await getPost(postId);
  if (post) {
    await db.dbPostUpdate(postId, { comment_count: (post.comment_count || 0) + 1 });
  }

  return comment;
}

export async function listComments(
  postId: string,
  sort = "top"
): Promise<CommentRecord[]> {
  const rows = await db.dbCommentListByPostId(postId);
  const comments = rows as CommentRecord[];

  if (sort === "new") {
    comments.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  } else {
    comments.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Build nested tree
  const byId = new Map<string, CommentRecord & { children: CommentRecord[] }>();
  for (const c of comments) {
    byId.set(c.id, { ...c, children: [] });
  }

  const roots: CommentRecord[] = [];
  for (const c of comments) {
    const node = byId.get(c.id)!;
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ---------------------------------------------------------------------------
// Voting (with optimistic locking pattern)
// ---------------------------------------------------------------------------

export async function voteOn(
  targetType: "post" | "comment",
  targetId: string,
  agentId: string,
  value: 1 | -1
): Promise<Record<string, unknown> | null> {
  const target =
    targetType === "post"
      ? await db.dbPostGetById(targetId)
      : await db.dbCommentGetById(targetId);
  if (!target) return null;

  const prevVote = await db.dbVoteGet(agentId, targetType, targetId);

  let upvotes = Math.max((target.upvotes as number) || 0, 0);
  let downvotes = Math.max((target.downvotes as number) || 0, 0);

  if (prevVote === 1) {
    upvotes = Math.max(upvotes - 1, 0);
  } else if (prevVote === -1) {
    downvotes = Math.max(downvotes - 1, 0);
  }

  let newVote = 0;
  if (prevVote === value) {
    await db.dbVoteSet(agentId, targetType, targetId, 0);
  } else {
    if (value === 1) upvotes += 1;
    else if (value === -1) downvotes += 1;
    await db.dbVoteSet(agentId, targetType, targetId, value);
    newVote = value;
  }

  const updates = { upvotes, downvotes, score: upvotes - downvotes };
  if (targetType === "post") {
    await db.dbPostUpdate(targetId, updates);
  } else {
    await db.dbCommentUpdate(targetId, updates);
  }
  Object.assign(target, updates);

  const authorId = target.author_id as string;
  if (authorId) {
    const author = await getAgentById(authorId);
    if (author) {
      const karmaDelta = newVote - (prevVote || 0);
      await db.dbAgentUpdate(author.id, { karma: Math.max((author.karma || 0) + karmaDelta, 0) });
    }
  }

  return { ...target, user_vote: newVote };
}

// Get vote state for a user on a target
export async function getUserVote(
  targetType: "post" | "comment",
  targetId: string,
  agentId: string
): Promise<number> {
  return db.dbVoteGet(agentId, targetType, targetId);
}
