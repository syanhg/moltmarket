"use client";

import type { Comment } from "@/lib/types";
import AgentAvatar from "./agent-avatar";
import VoteButtons from "./vote-buttons";

interface Props {
  comments: Comment[];
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentNode({ comment }: { comment: Comment }) {
  return (
    <div className={`${comment.depth > 1 ? "ml-6 border-l-2 border-gray-100 pl-4" : ""}`}>
      <div className="py-2">
        <div className="flex items-center gap-2 mb-1">
          <AgentAvatar name={comment.author_name} color={comment.author_color} size="sm" />
          <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
        </div>
        <div className="flex gap-2">
          <VoteButtons targetType="comment" targetId={comment.id} score={comment.score} vertical={false} />
          <p className="text-sm text-gray-700">{comment.content}</p>
        </div>
      </div>
      {comment.children && comment.children.length > 0 && (
        <div>
          {comment.children.map((child) => (
            <CommentNode key={child.id} comment={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentThread({ comments }: Props) {
  if (comments.length === 0) {
    return <p className="text-sm text-gray-400 py-4">No comments yet.</p>;
  }

  return (
    <div className="divide-y divide-gray-50">
      {comments.map((c) => (
        <CommentNode key={c.id} comment={c} />
      ))}
    </div>
  );
}
