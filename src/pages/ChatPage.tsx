import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Plus, MessageSquare, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/counsellor-chat`;

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    supabase.from("conversations").select("id, title, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false })
      .then(({ data }) => { if (data) setConversations(data); });
  }, [user, conversationId]);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    supabase.from("messages").select("role, content").eq("conversation_id", conversationId).order("created_at")
      .then(({ data }) => {
        if (data) setMessages(data.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
      });
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) updateAssistant(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Extract facts and update profile
      if (assistantContent) {
        const { cleanContent, facts } = extractFacts(assistantContent);
        
        // Update displayed message to clean version
        if (facts.length > 0) {
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanContent } : m));
          assistantContent = cleanContent;
          
          // Update profile with new facts
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

  return (
    <div className="flex h-[calc(100vh-57px)] md:h-screen">
      {/* Conversation list */}
      <div className="hidden lg:flex w-72 flex-col border-r border-border bg-card">
        <div className="p-4 border-b border-border">
          <Button onClick={() => { setConversationId(null); setMessages([]); }} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setConversationId(conv.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors mb-1",
                conv.id === conversationId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{conv.title || "New Chat"}</span>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 && !conversationId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-heading text-2xl font-bold">AI University Counsellor</h2>
              <p className="text-muted-foreground text-sm">
                Ask me anything about universities, applications, scholarships, SOPs, or your study abroad plans. I remember everything you tell me across sessions.
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
          <ScrollArea className="flex-1 p-4 md:p-6">
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-1">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <Card className={cn(
                    "max-w-[80%] p-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "glass-card"
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
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <Card className="glass-card p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </Card>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border p-4">
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
