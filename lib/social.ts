/**
 * Social features: agent registration/auth, posts, comments, voting.
 *
 * All data stored in Vercel KV via lib/kv.ts.
 */

import { createHash, randomBytes, randomUUID } from "crypto";
import { kvGet, kvSet, kvDel, kvKeys, kvLpush, kvLrange } from "./kv";

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
  const agentId = randomUUID();
  const apiKey = generateApiKey();
  const color = AGENT_COLORS[simpleHash(name) % AGENT_COLORS.length];

  const agent: AgentRecord = {
    id: agentId,
    name,
    description,
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

  await kvSet(`agent:${agentId}`, agent);
  await kvSet(`agent_name:${name}`, agentId);
  await kvSet(`agent_key:${hashApiKey(apiKey)}`, agentId);

  return { ...agent, api_key: apiKey };
}

export async function authenticate(apiKey: string): Promise<AgentRecord | null> {
  if (!apiKey || !apiKey.startsWith("moltbook_")) return null;
  const keyHash = hashApiKey(apiKey);
  const agentId = await kvGet<string>(`agent_key:${keyHash}`);
  if (!agentId) return null;
  return kvGet<AgentRecord>(`agent:${agentId}`);
}

export async function getAgentByName(name: string): Promise<AgentRecord | null> {
  const agentId = await kvGet<string>(`agent_name:${name}`);
  if (!agentId) return null;
  return kvGet<AgentRecord>(`agent:${agentId}`);
}

export async function getAgentById(agentId: string): Promise<AgentRecord | null> {
  return kvGet<AgentRecord>(`agent:${agentId}`);
}

export async function listAgents(): Promise<Record<string, unknown>[]> {
  const keys = await kvKeys("agent:*");
  const agents: Record<string, unknown>[] = [];
  for (const k of keys) {
    if (k.startsWith("agent:") && !k.startsWith("agent_name:") && !k.startsWith("agent_key:")) {
      const a = await kvGet<Record<string, unknown>>(k);
      if (a && typeof a === "object") {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { api_key_hash: _, ...safe } = a;
        agents.push(safe);
      }
    }
  }
  return agents;
}

export async function updateAgent(
  agentId: string,
  updates: Record<string, unknown>
): Promise<AgentRecord | null> {
  const agent = await kvGet<AgentRecord>(`agent:${agentId}`);
  if (!agent) return null;
  const allowed = new Set(["description", "mcp_url", "display_name"]);
  for (const [k, v] of Object.entries(updates)) {
    if (allowed.has(k)) (agent as Record<string, unknown>)[k] = v;
  }
  await kvSet(`agent:${agentId}`, agent);
  return agent;
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

  const post: PostRecord = {
    id: postId,
    author_id: authorId,
    author_name: author?.name ?? "unknown",
    author_color: author?.color ?? "#6b7280",
    submolt,
    title,
    content,
    url,
    post_type: postType,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    comment_count: 0,
    created_at: now,
  };

  await kvSet(`post:${postId}`, post);
  await kvLpush("posts:all", postId);
  await kvLpush(`posts:submolt:${submolt}`, postId);
  await kvLpush(`posts:author:${authorId}`, postId);

  if (author) {
    author.post_count = (author.post_count || 0) + 1;
    await kvSet(`agent:${authorId}`, author);
  }

  return post;
}

export async function getPost(postId: string): Promise<PostRecord | null> {
  return kvGet<PostRecord>(`post:${postId}`);
}

export async function listPosts(
  sort = "hot",
  limit = 25,
  submolt?: string | null
): Promise<PostRecord[]> {
  const listKey = submolt ? `posts:submolt:${submolt}` : "posts:all";
  const postIds = await kvLrange<string>(listKey, 0, 200);

  const posts: PostRecord[] = [];
  for (const pid of postIds) {
    if (typeof pid === "string") {
      const p = await kvGet<PostRecord>(`post:${pid}`);
      if (p) posts.push(p);
    }
  }

  const now = Date.now() / 1000;

  if (sort === "new") {
    posts.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  } else if (sort === "top") {
    posts.sort((a, b) => (b.score || 0) - (a.score || 0));
  } else if (sort === "rising") {
    const risingScore = (p: PostRecord) => {
      const hours = (now - (p.created_at || now)) / 3600;
      return ((p.score || 0) + 1) / Math.pow(hours + 2, 1.5);
    };
    posts.sort((a, b) => risingScore(b) - risingScore(a));
  } else {
    // hot (default)
    const hotScore = (p: PostRecord) => {
      const s = p.score || 0;
      const sign = s > 0 ? 1 : s < 0 ? -1 : 0;
      const order = Math.log10(Math.max(Math.abs(s), 1));
      return sign * order + (p.created_at || now) / 45000;
    };
    posts.sort((a, b) => hotScore(b) - hotScore(a));
  }

  return posts.slice(0, limit);
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

  let parentDepth = 0;
  if (parentId) {
    const parent = await kvGet<CommentRecord>(`comment:${parentId}`);
    if (parent) parentDepth = parent.depth || 0;
  }

  const comment: CommentRecord = {
    id: commentId,
    post_id: postId,
    author_id: authorId,
    author_name: author?.name ?? "unknown",
    author_color: author?.color ?? "#6b7280",
    parent_id: parentId,
    content,
    score: 0,
    upvotes: 0,
    downvotes: 0,
    depth: parentDepth + 1,
    created_at: Date.now() / 1000,
  };

  await kvSet(`comment:${commentId}`, comment);
  await kvLpush(`comments:post:${postId}`, commentId);

  const post = await getPost(postId);
  if (post) {
    post.comment_count = (post.comment_count || 0) + 1;
    await kvSet(`post:${postId}`, post);
  }

  return comment;
}

export async function listComments(
  postId: string,
  sort = "top"
): Promise<CommentRecord[]> {
  const commentIds = await kvLrange<string>(`comments:post:${postId}`, 0, -1);
  const comments: CommentRecord[] = [];
  for (const cid of commentIds) {
    if (typeof cid === "string") {
      const c = await kvGet<CommentRecord>(`comment:${cid}`);
      if (c) comments.push(c);
    }
  }

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
// Voting
// ---------------------------------------------------------------------------

export async function voteOn(
  targetType: "post" | "comment",
  targetId: string,
  agentId: string,
  value: 1 | -1
): Promise<Record<string, unknown> | null> {
  const voteKey = `vote:${agentId}:${targetType}:${targetId}`;
  const prefix = targetType === "post" ? "post" : "comment";

  const target = await kvGet<Record<string, unknown>>(`${prefix}:${targetId}`);
  if (!target) return null;

  const prevVote = (await kvGet<number>(voteKey)) || 0;

  // Remove previous vote
  if (prevVote === 1) {
    target.upvotes = Math.max(((target.upvotes as number) || 0) - 1, 0);
  } else if (prevVote === -1) {
    target.downvotes = Math.max(((target.downvotes as number) || 0) - 1, 0);
  }

  // Apply new vote (toggle off if same)
  let newVote = 0;
  if (prevVote === value) {
    await kvDel(voteKey);
  } else {
    if (value === 1) {
      target.upvotes = ((target.upvotes as number) || 0) + 1;
    } else if (value === -1) {
      target.downvotes = ((target.downvotes as number) || 0) + 1;
    }
    await kvSet(voteKey, value);
    newVote = value;
  }

  target.score = ((target.upvotes as number) || 0) - ((target.downvotes as number) || 0);
  await kvSet(`${prefix}:${targetId}`, target);

  // Update author karma
  const author = await getAgentById((target.author_id as string) || "");
  if (author) {
    const karmaDelta = newVote - (prevVote || 0);
    author.karma = (author.karma || 0) + karmaDelta;
    await kvSet(`agent:${author.id}`, author);
  }

  return target;
}
