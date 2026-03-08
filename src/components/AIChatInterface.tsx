import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Plus,
  Send,
  Copy,
  Check,
  Trash2,
  ArrowLeft,
  Menu,
  X,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

interface Conversation {
  id: string;
  title: string;
  messages: Msg[];
  model: string;
  createdAt: number;
}

const MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", desc: "Fast & capable" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Balanced" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Most powerful" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", desc: "Strong & efficient" },
  { value: "openai/gpt-5", label: "GPT-5", desc: "Max accuracy" },
  { value: "openai/gpt-5.2", label: "GPT-5.2", desc: "Latest reasoning" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
      title="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function ChatMessage({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 px-4 py-5 ${isUser ? "bg-transparent" : "bg-muted/30"}`}>
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-emerald-600 text-white"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1 prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:m-0 prose-pre:bg-transparent">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              const codeStr = String(children).replace(/\n$/, "");
              if (match) {
                return (
                  <div className="relative my-3 rounded-lg overflow-hidden border border-gray-700">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 text-xs text-gray-400 border-b border-gray-700">
                      <span>{match[1]}</span>
                    </div>
                    <CopyButton text={codeStr} />
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8rem" }}
                    >
                      {codeStr}
                    </SyntaxHighlighter>
                  </div>
                );
              }
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {msg.content || "▍"}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export function AIChatInterface({ onBack }: { onBack: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ai-chats") || "[]");
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("google/gemini-3-flash-preview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeId) || null;

  const persist = useCallback((convos: Conversation[]) => {
    localStorage.setItem("ai-chats", JSON.stringify(convos));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvo?.messages]);

  const newConversation = () => {
    const id = crypto.randomUUID();
    const convo: Conversation = {
      id,
      title: "New Chat",
      messages: [],
      model,
      createdAt: Date.now(),
    };
    const updated = [convo, ...conversations];
    setConversations(updated);
    persist(updated);
    setActiveId(id);
    setSidebarOpen(false);
  };

  const deleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    persist(updated);
    if (activeId === id) setActiveId(null);
  };

  const updateConversation = (id: string, patch: Partial<Conversation>) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      persist(updated);
      return updated;
    });
  };

  const send = async () => {
    if (!input.trim() || isLoading) return;

    let convoId = activeId;
    let currentMessages: Msg[] = activeConvo?.messages || [];

    if (!convoId) {
      convoId = crypto.randomUUID();
      const convo: Conversation = {
        id: convoId,
        title: input.slice(0, 40),
        messages: [],
        model,
        createdAt: Date.now(),
      };
      const updated = [convo, ...conversations];
      setConversations(updated);
      persist(updated);
      setActiveId(convoId);
      currentMessages = [];
    }

    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...currentMessages, userMsg];

    // Set title from first message
    if (currentMessages.length === 0) {
      updateConversation(convoId, { title: input.trim().slice(0, 50), messages: newMessages });
    } else {
      updateConversation(convoId, { messages: newMessages });
    }

    setInput("");
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, model }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Error", description: err.error, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

      const cId = convoId;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const assistantMsg: Msg = { role: "assistant", content: assistantContent };
              updateConversation(cId, { messages: [...newMessages, assistantMsg] });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
            }
          } catch {}
        }
      }

      if (assistantContent) {
        const finalMsg: Msg = { role: "assistant", content: assistantContent };
        updateConversation(cId, { messages: [...newMessages, finalMsg] });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to get response", variant: "destructive" });
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative z-50 h-full w-72 bg-muted/50 border-r border-border flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3">
          <Button onClick={newConversation} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-2 pb-2 space-y-0.5">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  activeId === c.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground"
                }`}
                onClick={() => {
                  setActiveId(c.id);
                  setModel(c.model);
                  setSidebarOpen(false);
                }}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Bot className="h-5 w-5 text-emerald-500" />
          <span className="font-semibold text-sm">AI Chat</span>
          <div className="ml-auto">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!activeConvo || activeConvo.messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center h-full">
              <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600/10 flex items-center justify-center mx-auto mb-6">
                  <Bot className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">How can I help you?</h2>
                <p className="text-muted-foreground text-sm">
                  Ask me anything — code, math, writing, analysis. I support Markdown, code highlighting, and more.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              {activeConvo.messages.map((msg, i) => (
                <ChatMessage key={i} msg={msg} />
              ))}
              {isLoading && activeConvo.messages[activeConvo.messages.length - 1]?.role === "user" && (
                <div className="flex gap-3 px-4 py-5 bg-muted/30">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 shrink-0">
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-32 min-h-[44px]"
              style={{ height: "auto", overflow: "auto" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
            />
            <Button
              onClick={send}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Powered by Lovable AI • {MODELS.find((m) => m.value === model)?.label}
          </p>
        </div>
      </main>
    </div>
  );
}
