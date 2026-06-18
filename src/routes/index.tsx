import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { ToolRenderer } from "@/components/workmate/tool-renderer";
import { Mail, FileText, CalendarCheck, BookOpen, Plus } from "lucide-react";
import logo from "@/assets/workmate-logo.png";

const STORAGE_KEY = "workmate-ai:messages:v1";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WorkMate AI — Your Workplace Productivity Assistant" },
      {
        name: "description",
        content:
          "Draft emails, summarize meetings, plan your week, and research topics — all in one AI chat built for busy professionals.",
      },
      { property: "og:title", content: "WorkMate AI" },
      {
        property: "og:description",
        content:
          "AI workplace assistant for emails, meeting notes, scheduling, and research.",
      },
    ],
  }),
  component: WorkMateChat,
});

const QUICK_PROMPTS = [
  {
    icon: Mail,
    label: "Draft an email",
    prompt:
      "Draft a polite but firm email to a client following up on an invoice that is 10 days overdue. Use a formal tone.",
  },
  {
    icon: FileText,
    label: "Summarize meeting",
    prompt:
      "Summarize these meeting notes into decisions, action items with owners and deadlines, and risks:\n\n[paste your notes here]",
  },
  {
    icon: CalendarCheck,
    label: "Plan my week",
    prompt:
      "Build a prioritized weekly plan. I need to: finish Q3 report, prep board slides, run 2 candidate interviews, review team OKRs, clear my inbox, and exercise 3x.",
  },
  {
    icon: BookOpen,
    label: "Research a topic",
    prompt:
      "Research the current state of AI agents in the workplace. Give me key insights, recommendations for adoption, and what to verify.",
  },
];

function WorkMateChat() {
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setInitialMessages(raw ? (JSON.parse(raw) as UIMessage[]) : []);
    } catch {
      setInitialMessages([]);
    }
  }, []);

  if (initialMessages === null) {
    return <div className="min-h-screen bg-background" />;
  }
  return <ChatInner initial={initialMessages} />;
}

function ChatInner({ initial }: { initial: UIMessage[] }) {
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [status]);

  const handleSubmit = (msg: PromptInputMessage) => {
    const value = (msg.text ?? text).trim();
    if (!value) return;
    sendMessage({ text: value });
    setText("");
  };

  const handleQuick = (prompt: string) => {
    sendMessage({ text: prompt });
  };

  const newChat = () => {
    stop();
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    textareaRef.current?.focus();
  };

  const isBusy = status === "submitted" || status === "streaming";

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="WorkMate AI" width={36} height={36} className="rounded" />
          <div>
            <h1 className="text-sm font-semibold leading-tight">WorkMate AI</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              Your workplace productivity assistant
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={newChat} disabled={messages.length === 0}>
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={logo} alt="" width={64} height={64} />}
              title="How can I help you work smarter today?"
              description="Draft emails, summarize meetings, plan your week, or research a topic."
            >
              <div className="mt-4 grid w-full gap-2 sm:grid-cols-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => handleQuick(q.prompt)}
                    className="flex items-start gap-3 rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <q.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{q.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {q.prompt}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent >
                  {message.parts.map((part, idx) => {
                    if (part.type === "text") {
                      return message.role === "assistant" ? (
                        <div
                          key={idx}
                          className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-headings:mt-3 prose-headings:mb-1"
                        >
                          <ReactMarkdown>{part.text}</ReactMarkdown>
                        </div>
                      ) : (
                        <p key={idx} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      );
                    }
                    if (part.type?.startsWith("tool-")) {
                      return <ToolRenderer key={idx} part={part as any} />;
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && (
            <div className="mx-auto max-w-prose rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message || "Something went wrong. Please try again."}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background px-4 py-3 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput onSubmit={handleSubmit} globalDrop multiple={false}>
            <PromptInputTextarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask WorkMate to draft, summarize, plan, or research…"
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={!text.trim() && !isBusy} />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            WorkMate AI can make mistakes. Review outputs before sending or committing.
          </p>
        </div>
      </div>
    </div>
  );
}
