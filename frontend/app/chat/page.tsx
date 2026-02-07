"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { chat as chatApi, type ChatMessage, type RecommendedProvider } from "@/lib/api";

const WELCOME =
  "Hi! I'm your Urban home services assistant. Describe what you need—e.g. a leaking pipe, electrical issue, cleaning, or tutoring—and I'll recommend the best nearby providers.";

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastProviders, setLastProviders] = useState<RecommendedProvider[] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setLastProviders(null);
    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const { data } = await chatApi.send(text, history);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.recommended_providers?.length) setLastProviders(data.recommended_providers);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
            "Sorry, I couldn't process that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-slate-800">
            Urban
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/search" className="text-sm font-medium text-slate-600 hover:text-slate-800">
              Find Providers
            </Link>
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-800">
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-4">
        <h1 className="text-xl font-bold text-slate-800 mb-1">AI Service Assistant</h1>
        <p className="text-sm text-slate-500 mb-4">
          Describe your problem in plain language. I&apos;ll ask follow-ups if needed and recommend the best nearby providers.
        </p>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white min-h-[320px] max-h-[50vh] p-4 space-y-4"
        >
          {messages.length === 0 && !loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-indigo-50 text-slate-800 px-4 py-3 shadow-sm">
                <p className="text-sm">{WELCOME}</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  m.role === "user"
                    ? "rounded-tr-md bg-indigo-600 text-white"
                    : "rounded-tl-md bg-slate-100 text-slate-800"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-md bg-slate-100 text-slate-600 px-4 py-3 shadow-sm flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {lastProviders && lastProviders.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Recommended providers</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lastProviders.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition"
                >
                  <p className="font-semibold text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{p.service_type.replace(/_/g, " ")}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span>★ {p.rating}</span>
                    <span>Trust {p.trust_score}</span>
                    <span>₹{p.price}</span>
                    <span>{p.distance} km</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your problem or need..."
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={loading}
          />
          <button
            type="button"
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition"
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
