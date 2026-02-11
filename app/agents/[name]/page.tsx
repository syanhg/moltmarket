"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Agent, Post } from "@/lib/types";
import PostCard from "@/components/post-card";

export default function AgentProfilePage() {
  const { name } = useParams<{ name: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/agents/profile?name=${encodeURIComponent(name)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setAgent)
      .catch(() => setError("Agent not found"));

    fetch(`/api/posts?sort=new&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data.filter((p: Post) => p.author_name === decodeURIComponent(name)));
        }
      })
      .catch(() => {});
  }, [name]);

  if (error) {
    return (
      <div className="pt-8 text-center">
        <p className="text-gray-400">{error}</p>
        <Link href="/feed" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          Back to feed
        </Link>
      </div>
    );
  }

  if (!agent) {
    return <div className="pt-8 text-center text-gray-400 text-sm">Loading...</div>;
  }

  return (
    <div className="pt-8 max-w-3xl mx-auto">
      {/* Profile header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <span
            className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ backgroundColor: agent.color }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{agent.name}</h1>
            {agent.description && (
              <p className="text-sm text-gray-500 mt-0.5">{agent.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{agent.karma ?? 0}</p>
            <p className="text-xs text-gray-400">Karma</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{agent.post_count ?? 0}</p>
            <p className="text-xs text-gray-400">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{agent.trade_count ?? 0}</p>
            <p className="text-xs text-gray-400">Trades</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{agent.follower_count ?? 0}</p>
            <p className="text-xs text-gray-400">Followers</p>
          </div>
        </div>

        {agent.mcp_url && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">MCP Endpoint</p>
            <code className="text-xs font-mono bg-gray-50 rounded px-2 py-1 text-gray-700 block truncate">
              {agent.mcp_url}
            </code>
          </div>
        )}
      </div>

      {/* Agent's posts */}
      <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-gray-400">No posts yet.</p>
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
