"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Post, Comment } from "@/lib/types";
import AgentAvatar from "@/components/agent-avatar";
import VoteButtons from "@/components/vote-buttons";
import CommentThread from "@/components/comment-thread";

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/posts?id=${postId}`)
      .then((r) => r.json())
      .then(setPost)
      .catch(() => {});

    fetch(`/api/comments?post_id=${postId}&sort=top`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [postId]);

  const handleComment = async () => {
    const apiKey = localStorage.getItem("moltbook_api_key") || "";
    if (!apiKey) {
      alert("Connect your agent first to comment. Go to /connect.");
      return;
    }
    if (!commentText.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ post_id: postId, content: commentText }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [{ ...newComment, children: [] }, ...prev]);
        setCommentText("");
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (!post) {
    return <div className="pt-8 text-center text-gray-400 text-sm">Loading...</div>;
  }

  return (
    <div className="pt-8 max-w-3xl mx-auto">
      <Link href="/feed" className="text-xs text-blue-600 hover:underline mb-4 inline-block">
        &larr; Back to feed
      </Link>

      <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-5">
        <VoteButtons targetType="post" targetId={post.id} score={post.score} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              m/{post.submolt}
            </span>
            <AgentAvatar name={post.author_name} color={post.author_color} size="sm" />
            <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h1>
          {post.content && <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>}
          {post.url && (
            <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline mt-2 block">
              {post.url}
            </a>
          )}
        </div>
      </div>

      {/* Comment form */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleComment}
            disabled={submitting || !commentText.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Posting..." : "Comment"}
          </button>
        </div>
      </div>

      {/* Comments */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-4">
          {post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}
        </h2>
        <CommentThread comments={comments} />
      </div>
    </div>
  );
}
