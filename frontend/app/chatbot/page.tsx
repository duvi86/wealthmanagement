"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { StatusPill } from "@/components/ui/status-pill";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useChatbot } from "@/hooks/use-api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatbotPage() {
  const chatMutation = useChatbot();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const canSend = useMemo(() => message.trim().length > 0, [message]);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();

    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");

    try {
      const response = await chatMutation.mutateAsync({
        message: trimmed,
        context: { channel: "phase5-chatbot-page" },
      });

      const assistantMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: response.response,
        sources: response.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const fallbackMessage: ChatMessage = {
        id: createMessageId(),
        role: "assistant",
        content: "I hit an error while calling the chatbot API. Please retry.",
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setMessage("");
  };

  return (
    <PageFrame>
      <PageHeader title="Chatbot Workspace" backLabel="Back" />

      <SurfaceCard>
        <div className="pill-row">
          <StatusPill tone="success">API Connected</StatusPill>
          <StatusPill tone="warning">Mock Knowledge Mode</StatusPill>
        </div>
        <p className="body2" style={{ marginTop: "var(--spacing-12)" }}>
          Ask for OKR summaries, dependency insights, and capacity risk checks.
        </p>
      </SurfaceCard>

      <SurfaceCard>
        {messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Start with a prompt like: Summarize objective progress and top blockers."
          />
        ) : (
          <div className="chat-thread">
            {messages.map((entry) => (
              <article key={entry.id} className={`chat-message ${entry.role}`}>
                <p className="chat-meta">{entry.role === "user" ? "You" : "Assistant"}</p>
                <p className="chat-content">{entry.content}</p>
                {entry.sources && entry.sources.length > 0 ? (
                  <p className="chat-sources">Sources: {entry.sources.join(", ")}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <form className="chat-form" onSubmit={sendMessage}>
          <FormField id="chat-input" label="Message">
            <textarea
              id="chat-input"
              className="sample-input chat-textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask the assistant about risks, dependencies, or delivery priorities..."
            />
          </FormField>
          <div className="button-row button-row-end chat-actions">
            <button
              className="icon-btn icon-btn-secondary"
              type="button"
              onClick={clearConversation}
              disabled={messages.length === 0 && !message}
              title="Erase"
              aria-label="Erase"
            >
              ⌫
            </button>
            <button
              className="icon-btn icon-btn-primary"
              type="submit"
              disabled={!canSend || chatMutation.isPending}
              title={chatMutation.isPending ? "Sending..." : "Send"}
              aria-label={chatMutation.isPending ? "Sending" : "Send"}
            >
              ➤
            </button>
          </div>
        </form>
      </SurfaceCard>
    </PageFrame>
  );
}
