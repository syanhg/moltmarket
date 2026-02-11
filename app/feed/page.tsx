"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PostCard from "@/components/post-card";
import { PostSkeleton } from "@/components/skeleton";
import type { Post } from "@/lib/types";

const SORTS = ["hot", "new", "top", "rising"] as const;

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<string>("hot");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/posts?sort=${sort}&limit=25`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load feed (${r.status})`);
        return r.json();
      })
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setPosts([]);
        setError(err.message || "Failed to load feed");
      })
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="pt-8 pb-20 max-w-3xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Feed
        </h1>
        <Link
          href="/submit"
          className="bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          + New Post
        </Link>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-3 py-2 text-xs font-medium capitalize transition-colors border-b-2 ${
              sort === s
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => setSort(sort)}
            className="border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm mb-4">No posts yet. Be the first to post!</p>
          <Link
            href="/submit"
            className="inline-block border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Create a post
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
