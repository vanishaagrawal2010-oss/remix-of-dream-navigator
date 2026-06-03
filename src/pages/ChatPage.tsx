import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plus, MessageSquare, Bot, User, ArrowDown, History, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import Loader from "@/components/Loader";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/counsellor-chat`;

// Strip AI self-identification and hello greetings the model sometimes adds.
const sanitiseReply = (text: string): string => {
  let t = text;
  // Remove "UniGuide AI Counsellor:" / "UniGuide AI:" / "UniGuide:" identity headers
  t = t.replace(/^(uni\s*guide\s*(ai)?\s*(counsellor|counselor|assistant)?[\s:—–-]*)+/gim, "");
  // Remove standalone greeting lines: "Hello!", "Hi there," "Hey," etc.
  t = t.replace(/^(hello|hi|hey)(\s+there)?[\s,!.]*\n/gim, "");
  // Remove greeting at the very start of the reply (no newline after)
  t = t.replace(/^(hello|hi|hey)(\s+there)?[\s,!.]{0,4}(?=[A-Z])/i, "");
  return t.trimStart();
};

const extractFacts = (content: string): { cleanContent: string; facts: string[] } => {
  const regex = /```extracted_facts\n([\s\S]*?)```/;
  const match = content.match(regex);
  if (!match) return { cleanContent: content, facts: [] };
  try {
    const facts = JSON.parse(match[1].trim());
    return { cleanContent: content.replace(regex, "").trim(), facts };
  } catch {
    return { cleanContent: content, facts: [] };
  }
};

const ChatPage = () => {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<{ id: string; title: string | null; updated_at: string }[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [showJumpDown, setShowJumpDown] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const getViewport = (): HTMLElement | null =>
    scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;

  useEffect(() => {
    const vp = getViewport();
    if (!vp) return;
    const onScroll = () => {
      const distanceFromBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      setShowJumpDown(distanceFromBottom > 120);
    };
    onScroll();
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => vp.removeEventListener("scroll", onScroll);
  }, [conversationId, messages.length]);

  const jumpToBottom = () => {
    const vp = getViewport();
    if (vp) vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
  };

  const loadConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setConversations(data);
  };

  useEffect(() => {
    loadConversations();
  }, [user, conversationId]);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    supabase.from("messages").select("role, content").eq("conversation_id", conversationId).order("created_at")
      .then(({ data }) => {
        if (data) setMessages(data.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
      });
  }, [conversationId]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "user") {
      requestAnimationFrame(() => {
        lastUserMsgRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [messages.length]);

  const createConversation = async () => {
    if (!user) return null;
    const { data } = await supabase.from("conversations").insert({ user_id: user.id, title: "New Chat" }).select().single();
    if (data) {
      setConversationId(data.id);
      setMessages([]);
      return data.id;
    }
    return null;
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // don't select the conversation when clicking delete
    setDeletingId(id);
    try {
      // Delete messages first (FK constraint), then the conversation
      await supabase.from("messages").delete().eq("conversation_id", id);
      await supabase.from("conversations").delete().eq("id", id);

      // If we deleted the active conversation, clear the view
      if (id === conversationId) {
        setConversationId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch {
      toast({ title: "Couldn't delete chat", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !user) return;
    const userMessage = input.trim();
    setInput("");

    let convId = conversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }

    const userMsg: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    await supabase.from("messages").insert({ conversation_id: convId, user_id: user.id, role: "user", content: userMessage });

    let assistantContent = "";
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          profile: profile ? {
            name: profile.full_name,
            school: profile.school,
            grades: profile.grades,
            degree_type: (profile as any).degree_type,
            stream: (profile as any).stream,
            interests: profile.interests,
            budget: profile.budget,
            target_countries: profile.target_countries,
            extracurriculars: profile.extracurriculars,
            extracted_facts: profile.extracted_facts,
          } : null,
          conversationId: convId,
          userId: user.id,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${resp.status})`);
      }

      const data = await resp.json();
      const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const content = rawContent ? sanitiseReply(rawContent) : undefined;
      if (content) updateAssistant(content);

      if (assistantContent) {
        const { cleanContent, facts } = extractFacts(assistantContent);
        if (facts.length > 0) {
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanContent } : m));
          assistantContent = cleanContent;
          const existing = (profile?.extracted_facts as string[]) || [];
          const merged = [...new Set([...existing, ...facts])];
          await updateProfile({ extracted_facts: merged as any });
        }
        await supabase.from("messages").insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: assistantContent });
        if (messages.length === 0) {
          const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
          await supabase.from("conversations").update({ title }).eq("id", convId);
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to send message", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable conversation list item — used in both desktop sidebar and mobile sheet
  const ConvItem = ({ conv, onSelect }: { conv: typeof conversations[0]; onSelect?: () => void }) => (
    <div
      className={cn(
        "group w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors mb-1 cursor-pointer",
        conv.id === conversationId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
      )}
      onClick={() => { setConversationId(conv.id); onSelect?.(); }}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate flex-1">{conv.title || "New Chat"}</span>
      <button
        onClick={(e) => deleteConversation(conv.id, e)}
        disabled={deletingId === conv.id}
        className={cn(
          "shrink-0 rounded p-1 transition-all",
          // Mobile: always visible. Desktop: show on hover only.
          "opacity-100 lg:opacity-0 lg:group-hover:opacity-100",
          conv.id === conversationId && "lg:opacity-60",
          "hover:text-destructive",
        )}
        aria-label="Delete conversation"
      >
        {deletingId === conv.id
          ? <span className="h-3.5 w-3.5 block animate-spin rounded-full border border-current border-t-transparent" />
          : <Trash2 className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-96px)] -mt-6">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-72 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <Button onClick={() => { setConversationId(null); setMessages([]); }} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center mt-6 px-4">No conversations yet. Start chatting!</p>
          ) : (
            conversations.map(conv => <ConvItem key={conv.id} conv={conv} />)
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile history bar */}
        <div className="lg:hidden flex items-center justify-between border-b border-border px-3 py-2">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-xs">
                <History className="h-3.5 w-3.5" /> History
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-left text-sm">Your conversations</SheetTitle>
              </SheetHeader>
              <div className="p-3">
                <Button
                  onClick={() => { setConversationId(null); setMessages([]); setHistoryOpen(false); }}
                  className="w-full gap-2 mb-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" /> New Chat
                </Button>
                <ScrollArea className="h-[calc(100vh-160px)]">
                  {conversations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center mt-6 px-4">No conversations yet.</p>
                  ) : (
                    conversations.map(conv => (
                      <ConvItem key={conv.id} conv={conv} onSelect={() => setHistoryOpen(false)} />
                    ))
                  )}
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="sm" onClick={() => { setConversationId(null); setMessages([]); }} className="gap-2 text-xs">
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>

        {/* Empty state */}
        {messages.length === 0 && !conversationId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-2xl font-bold">Your Counsellor</h2>
              <p className="text-muted-foreground text-sm">
                Ask anything about universities, applications, scholarships, SOPs, or your study plans. Every conversation is remembered across sessions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4">
                {["Which universities match my profile?", "Help me plan my application timeline", "What scholarships am I eligible for?", "Review my SOP draft"].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-left text-xs p-3 rounded-lg bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4 md:px-6 pt-4 pb-2 relative" ref={scrollAreaRef}>
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, i) => {
                const isLastUser = msg.role === "user" && i === messages.length - 1;
                return (
                  <div key={i} ref={isLastUser ? lastUserMsgRef : undefined} className={cn("flex gap-3 scroll-mt-4", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-1">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <Card className={cn(
                      "max-w-[80%] p-3 text-sm leading-relaxed",
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "glass-card"
                    )}>
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}
                    </Card>
                    {msg.role === "user" && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary mt-1">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <Card className="glass-card px-4 py-3">
                    <Loader size="sm" label="Composing" />
                  </Card>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        {/* Input bar */}
        <div className="relative border-t border-border px-4 pt-2 pb-2 md:pb-3">
          {showJumpDown && (
            <button
              type="button"
              onClick={jumpToBottom}
              aria-label="Jump to latest"
              className="absolute -top-12 left-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur shadow-md text-foreground hover:bg-secondary transition-colors"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
          <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="max-w-3xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about universities, scholarships, applications..."
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;