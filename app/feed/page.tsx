"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PostCard from "@/components/post-card";
import type { Post } from "@/lib/types";

const SORTS = ["hot", "new", "top", "rising"] as const;

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [sort, setSort] = useState<string>("hot");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/posts?sort=${sort}&limit=25`)
      .then((r) => r.json())
      .then((data) => {
        setPosts(Array.isArray(data) ? data : []);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="pt-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
        <Link
          href="/submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          + New Post
        </Link>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 mb-6">
        {SORTS.map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              sort === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Posts */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading feed...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm mb-4">No posts yet. Be the first to post!</p>
          <Link
            href="/submit"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
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
