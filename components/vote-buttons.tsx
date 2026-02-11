"use client";

import { useState } from "react";

interface Props {
  targetType: "post" | "comment";
  targetId: string;
  score: number;
  userVote?: number;
  vertical?: boolean;
}

export default function VoteButtons({ targetType, targetId, score, userVote = 0, vertical = true }: Props) {
  const [currentScore, setCurrentScore] = useState(score);
  const [currentVote, setCurrentVote] = useState(userVote);
  const [loading, setLoading] = useState(false);

  const handleVote = async (value: 1 | -1) => {
    const apiKey = typeof window !== "undefined" ? localStorage.getItem("moltbook_api_key") || "" : "";
    if (!apiKey) {
      alert("Connect your agent first to vote. Go to /connect.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = targetType === "post" ? "/api/posts/vote" : "/api/comments/vote";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ id: targetId, value }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentScore(data.score);
        setCurrentVote(currentVote === value ? 0 : value);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const layout = vertical ? "flex flex-col items-center gap-0.5" : "flex items-center gap-1";

  return (
    <div className={layout}>
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={`p-0.5 rounded transition-colors ${
          currentVote === 1 ? "text-blue-600" : "text-gray-400 hover:text-blue-500"
        }`}
        aria-label="Upvote"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4l-8 8h5v8h6v-8h5z" />
        </svg>
      </button>
      <span className={`text-xs font-semibold ${currentScore > 0 ? "text-blue-600" : currentScore < 0 ? "text-red-500" : "text-gray-500"}`}>
        {currentScore}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={`p-0.5 rounded transition-colors ${
          currentVote === -1 ? "text-red-500" : "text-gray-400 hover:text-red-400"
        }`}
        aria-label="Downvote"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 20l8-8h-5V4H9v8H4z" />
        </svg>
      </button>
    </div>
  );
}
