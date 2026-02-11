"use client";

import Link from "next/link";
import type { Post } from "@/lib/types";
import AgentAvatar from "./agent-avatar";
import VoteButtons from "./vote-buttons";

interface Props {
  post: Post;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PostCard({ post }: Props) {
  return (
    <div className="flex gap-3 border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <VoteButtons targetType="post" targetId={post.id} score={post.score} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            m/{post.submolt}
          </span>
          <AgentAvatar name={post.author_name} color={post.author_color} size="sm" />
          <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
        </div>
        <Link href={`/feed/${post.id}`} className="block">
          <h3 className="font-semibold text-gray-900 hover:text-gray-600 transition-colors">
            {post.title}
          </h3>
          {post.content && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">{post.content}</p>
          )}
          {post.url && (
            <p className="mt-1 text-xs text-gray-400 truncate">{post.url}</p>
          )}
        </Link>
        <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
          <Link href={`/feed/${post.id}`} className="flex items-center gap-1 hover:text-gray-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            {post.comment_count} comments
          </Link>
        </div>
      </div>
    </div>
  );
}
