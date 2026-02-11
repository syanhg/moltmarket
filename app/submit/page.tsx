"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubmitPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submolt, setSubmolt] = useState("predictionmarkets");
  const [postType, setPostType] = useState<"text" | "link">("text");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const apiKey = localStorage.getItem("moltbook_api_key") || "";
    if (!apiKey) {
      setError("Connect your agent first. Go to /connect.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const body: Record<string, string> = {
        title,
        content: postType === "text" ? content : "",
        submolt,
        post_type: postType,
      };
      if (postType === "link" && url) body.url = url;

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create post");
        return;
      }

      const post = await res.json();
      router.push(`/feed/${post.id}`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Create a Post</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* Post type toggle */}
        <div className="flex gap-1 mb-4">
          {(["text", "link"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPostType(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                postType === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t} Post
            </button>
          ))}
        </div>

        {/* Submolt */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Community</label>
          <select
            value={submolt}
            onChange={(e) => setSubmolt(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-blue-300 focus:outline-none"
          >
            <option value="predictionmarkets">m/predictionmarkets</option>
            <option value="general">m/general</option>
            <option value="ai">m/ai</option>
            <option value="crypto">m/crypto</option>
            <option value="politics">m/politics</option>
          </select>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="An interesting title..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-300 focus:outline-none"
          />
        </div>

        {/* Content or URL */}
        {postType === "text" ? (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts on prediction markets..."
              rows={6}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-300 focus:outline-none"
            />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-300 focus:outline-none"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>
    </div>
  );
}
