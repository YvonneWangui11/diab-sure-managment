import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import yvonneAvatar from '@/assets/yvonne-avatar.png';
import { Send, Bot, User, AlertCircle, HelpCircle, FileText, Pill, Calendar, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AskYvonneForCliniciansProps {
  context?: {
    patientId?: string;
    patientName?: string;
    currentPage?: string;
  };
}

const quickActions = [
  { label: "How to create a prescription?", icon: Pill, category: "workflow" },
  { label: "How is adherence calculated?", icon: TrendingUp, category: "analytics" },
  { label: "How to schedule appointments?", icon: Calendar, category: "workflow" },
  { label: "Generate a patient report", icon: FileText, category: "reports" },
  { label: "Understanding glucose trends", icon: TrendingUp, category: "education" },
  { label: "Patient alert severity levels", icon: AlertCircle, category: "system" },
];

export const AskYvonneForClinicians = ({ context }: AskYvonneForCliniciansProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const systemContext = `You are Dr. Yvonne, an AI assistant for clinicians using the DiabeSure diabetes management platform. 
You help clinicians with:
- App workflows (prescriptions, appointments, messaging)
- System features and navigation
- DSMES educational content for patient care
- Analytics interpretation (adherence rates, glucose trends)
- Report generation

IMPORTANT DISCLAIMERS:
- You do NOT provide medical diagnoses or treatment decisions
- Always remind clinicians to use their clinical judgment
- For clinical decisions, defer to the clinician's expertise

${context?.patientName ? `Current context: Viewing patient "${context.patientName}"` : ''}
${context?.currentPage ? `Current page: ${context.currentPage}` : ''}

Be helpful, concise, and professional. When explaining app features, be specific about button locations and workflows.`;

    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch(
        "https://iynqladfgyhfpwadmtgd.supabase.co/functions/v1/ask-yvonne",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5bnFsYWRmZ3loZnB3YWRtdGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODEwODgsImV4cCI6MjA2OTM1NzA4OH0.Jbp5oP399VeaPkJBoxbMltKiK2DjKVhSk5IAdYK8FZ8`,
          },
          body: JSON.stringify({ 
            messages: [
              { role: "system", content: systemContext },
              ...newMessages
            ]
          }),
        }
      );

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          toast({
            variant: "destructive",
            title: "Rate Limit",
            description: "Too many requests. Please try again later.",
          });
        } else if (response.status === 402) {
          toast({
            variant: "destructive",
            title: "Service Unavailable",
            description: "AI credits depleted. Please contact support.",
          });
        } else {
          throw new Error("Failed to start chat stream");
        }
        setIsLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";
      let streamDone = false;

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
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setIsLoading(false);
    } catch (error: unknown) {
      console.error("Chat error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    await streamChat(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  return (
    <div className="h-full flex flex-col gap-0">
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <img 
                  src={yvonneAvatar} 
                  alt="Dr. Yvonne" 
                  className="h-12 w-12 rounded-full object-cover"
                />
              </div>
              <h3 className="text-base font-semibold mb-1">How can I help you today?</h3>
              <p className="text-sm text-muted-foreground mb-6">
                I can assist with app workflows, system features, and educational content.
              </p>
              
              {/* Disclaimer */}
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-6 text-left">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> I provide app guidance and educational content only. 
                    Clinical decisions should be made using your professional judgment.
                  </p>
                </div>
              </div>

              {/* Context Badge */}
              {context?.patientName && (
                <Badge variant="secondary" className="mb-4">
                  Viewing: {context.patientName}
                </Badge>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto text-left">
                {quickActions.map((action, idx) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={idx}
                      className="p-3 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors text-left group"
                      onClick={() => handleQuickAction(action.label)}
                    >
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">
                          {action.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              } animate-in fade-in slide-in-from-bottom-2 duration-200`}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  <img 
                    src={yvonneAvatar} 
                    alt="Dr. Yvonne" 
                    className="h-8 w-8 rounded-full border border-primary/20 object-cover shadow-sm"
                  />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border/50 rounded-bl-sm"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3 animate-in fade-in">
              <div className="flex-shrink-0">
                <img 
                  src={yvonneAvatar} 
                  alt="Dr. Yvonne" 
                  className="h-8 w-8 rounded-full border border-primary/20 object-cover shadow-sm"
                />
              </div>
              <div className="bg-card border border-border/50 rounded-xl rounded-bl-sm px-4 py-2.5">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t bg-card/50 px-6 py-3">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <Input
            placeholder="Ask about app features, workflows, or patient education..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            className="flex-1 h-10 px-4 text-sm rounded-full border focus:border-primary transition-colors"
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-10 w-10 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          For app guidance only. Clinical decisions require professional judgment.
        </p>
      </div>
    </div>
  );
};
