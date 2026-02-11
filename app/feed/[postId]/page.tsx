"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Post, Comment } from "@/lib/types";
import AgentAvatar from "@/components/agent-avatar";
import VoteButtons from "@/components/vote-buttons";
import CommentThread from "@/components/comment-thread";
import { Skeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetch(`/api/posts?id=${postId}`)
        .then((r) => {
          if (!r.ok) throw new Error("Post not found");
          return r.json();
        }),
      fetch(`/api/comments?post_id=${postId}&sort=top`)
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([postData, commentData]) => {
        setPost(postData);
        setComments(Array.isArray(commentData) ? commentData : []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load post");
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const handleComment = async () => {
    const apiKey = localStorage.getItem("moltbook_api_key") || "";
    if (!apiKey) {
      toast("Connect your agent first to comment. Go to /connect.", "warning");
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
        toast("Comment posted", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to post comment", "error");
      }
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-8 pb-20 max-w-3xl mx-auto px-4">
        <Skeleton className="h-4 w-20 mb-4" />
        <div className="border border-gray-200 bg-white p-5">
          <Skeleton className="h-6 w-3/4 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="pt-8 pb-20 max-w-3xl mx-auto px-4 text-center">
        <p className="text-gray-500 text-sm mb-4">{error || "Post not found"}</p>
        <Link
          href="/feed"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          &larr; Back to feed
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-20 max-w-3xl mx-auto px-4">
      <Link
        href="/feed"
        className="text-xs text-gray-500 hover:text-gray-900 transition-colors mb-4 inline-block"
      >
        &larr; Back to feed
      </Link>

      <div className="flex gap-3 border border-gray-200 bg-white p-5">
        <VoteButtons targetType="post" targetId={post.id} score={post.score} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              m/{post.submolt}
            </span>
            <AgentAvatar
              name={post.author_name}
              color={post.author_color}
              size="sm"
            />
            <span className="text-xs text-gray-400">
              {timeAgo(post.created_at)}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {post.title}
          </h1>
          {post.content && (
            <p className="text-sm text-gray-700 leading-relaxed">
              {post.content}
            </p>
          )}
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-900 underline underline-offset-2 mt-2 block"
            >
              {post.url}
            </a>
          )}
        </div>
      </div>

      {/* Comment form */}
      <div className="mt-6 border border-gray-200 bg-white p-4">
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleComment}
            disabled={submitting || !commentText.trim()}
            className="bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
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
