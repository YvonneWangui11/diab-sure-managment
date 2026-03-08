import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import yvonneAvatar from '@/assets/yvonne-avatar.png';
import { Send, User, Mic, MicOff, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface HealthContext {
  recentGlucose?: { value: number; time: string; testTime: string }[];
  avgGlucose?: number;
  timeInRange?: number;
  estimatedA1C?: string;
  medicationAdherence?: number;
  activeMedications?: string[];
  exerciseMinutes?: number;
  mealsToday?: number;
  patterns?: string[];
}

interface AskYvonneProps {
  mode?: "chat" | "predictive" | "clinician-copilot" | "meal-analysis";
  patientContext?: HealthContext;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const AskYvonne = ({ mode = "chat", patientContext }: AskYvonneProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [healthContext, setHealthContext] = useState<HealthContext | null>(patientContext || null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load user health context on mount (for patient mode)
  useEffect(() => {
    if (patientContext || mode === "clinician-copilot") return;
    loadHealthContext();
  }, []);

  const loadHealthContext = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const week = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const month = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [glucoseRes, rxRes, intakeRes, exerciseRes, mealsRes, prescRes] = await Promise.all([
        supabase.from("glucose_readings").select("glucose_value, test_time, created_at").eq("patient_id", user.id).gte("created_at", month).order("created_at", { ascending: false }).limit(20),
        supabase.from("prescriptions").select("drug_name").eq("patient_id", user.id).eq("status", "active"),
        supabase.from("medication_intake").select("status").eq("patient_id", user.id).gte("scheduled_time", week),
        supabase.from("exercise_logs").select("duration_minutes").eq("patient_id", user.id).gte("date_time", week),
        supabase.from("meal_logs").select("id", { count: "exact", head: true }).eq("patient_id", user.id).gte("date_time", todayStart),
        supabase.from("prescriptions").select("drug_name").eq("patient_id", user.id).eq("status", "active"),
      ]);

      const glucoseData = glucoseRes.data || [];
      const values = glucoseData.map(g => g.glucose_value);
      const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : undefined;
      const inRange = values.filter(v => v >= 70 && v <= 180).length;
      const tir = values.length > 0 ? Math.round((inRange / values.length) * 100) : undefined;
      const eA1C = avg ? ((avg + 46.7) / 28.7).toFixed(1) : undefined;

      const intakeData = intakeRes.data || [];
      const taken = intakeData.filter(i => i.status === "taken").length;
      const adherence = intakeData.length > 0 ? Math.round((taken / intakeData.length) * 100) : undefined;

      const exerciseMin = (exerciseRes.data || []).reduce((s, e) => s + (e.duration_minutes || 0), 0);

      const patterns: string[] = [];
      const fastingReadings = glucoseData.filter(g => g.test_time === "fasting");
      const highFasting = fastingReadings.filter(g => g.glucose_value > 130);
      if (fastingReadings.length >= 3 && highFasting.length / fastingReadings.length > 0.5) {
        patterns.push("Elevated fasting glucose pattern detected");
      }
      const hypos = values.filter(v => v < 70);
      if (hypos.length >= 2) {
        patterns.push(`${hypos.length} hypoglycemic episodes in last 30 days`);
      }
      if (adherence !== undefined && adherence < 70) {
        patterns.push("Low medication adherence this week");
      }

      setHealthContext({
        recentGlucose: glucoseData.slice(0, 5).map(g => ({ value: g.glucose_value, time: g.created_at, testTime: g.test_time })),
        avgGlucose: avg,
        timeInRange: tir,
        estimatedA1C: eA1C,
        medicationAdherence: adherence,
        activeMedications: (prescRes.data || []).map(p => p.drug_name),
        exerciseMinutes: exerciseMin,
        mealsToday: mealsRes.count || 0,
        patterns: patterns.length > 0 ? patterns : undefined,
      });
    } catch (e) {
      console.error("Failed to load health context:", e);
    }
  };

  const streamChat = async (userMessage: string) => {
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ask-yvonne`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          healthContext: healthContext || patientContext,
          mode,
        }),
      });

      if (!response.ok || !response.body) {
        if (response.status === 429) {
          toast({ variant: "destructive", title: "Rate Limit", description: "Too many requests. Please try again later." });
        } else if (response.status === 402) {
          toast({ variant: "destructive", title: "Service Unavailable", description: "AI credits depleted. Please contact support." });
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
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const finalContent = assistantContent;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: finalContent } : m);
                }
                return [...prev, { role: "assistant", content: finalContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "" || !raw.startsWith("data: ")) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              const finalContent = assistantContent;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: finalContent } : m);
                }
                return [...prev, { role: "assistant", content: finalContent }];
              });
            }
          } catch { /* ignore */ }
        }
      }

      setIsLoading(false);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send message" });
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ variant: "destructive", title: "Microphone Error", description: "Could not access microphone." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const response = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
          body: JSON.stringify({ audio: base64Data }),
        });
        if (!response.ok) throw new Error("Transcription failed");
        const { text } = await response.json();
        setInput(text);
        setIsTranscribing(false);
        toast({ title: "Voice Transcribed", description: "Your message has been transcribed." });
      };
    } catch {
      setIsTranscribing(false);
      toast({ variant: "destructive", title: "Transcription Error", description: "Failed to transcribe audio." });
    }
  };

  const getPlaceholder = () => {
    switch (mode) {
      case "predictive": return "Ask about your glucose predictions...";
      case "clinician-copilot": return "Ask about this patient's trends...";
      case "meal-analysis": return "Describe a meal to analyze (e.g., 'ugali with sukuma wiki and nyama choma')";
      default: return isTranscribing ? "Transcribing..." : "Ask Dr. Yvonne about diabetes care...";
    }
  };

  const getSuggestions = () => {
    switch (mode) {
      case "predictive":
        return [
          { emoji: "🔮", label: "Predict Tonight", desc: "What to expect tonight", q: "Based on my patterns, what should I expect for my glucose tonight?" },
          { emoji: "⚠️", label: "Risk Today", desc: "Any risks for today?", q: "Are there any glucose risks I should watch for today?" },
          { emoji: "🛡️", label: "Prevention", desc: "How to prevent spikes", q: "What can I do right now to prevent a glucose spike?" },
          { emoji: "📈", label: "Pattern Alert", desc: "Weekly pattern analysis", q: "What patterns do you see in my recent glucose data?" },
        ];
      case "clinician-copilot":
        return [
          { emoji: "📋", label: "Patient Summary", desc: "Comprehensive overview", q: "Give me a comprehensive summary of this patient's recent health data and trends." },
          { emoji: "⚠️", label: "Concerns", desc: "Identify red flags", q: "What are the key concerns or red flags in this patient's data?" },
          { emoji: "💊", label: "Treatment", desc: "Adjustment suggestions", q: "Based on the data, should we consider any medication or treatment adjustments?" },
          { emoji: "📝", label: "Follow-up Plan", desc: "Next steps", q: "Suggest a follow-up plan for this patient including goals and timeline." },
        ];
      case "meal-analysis":
        return [
          { emoji: "🥘", label: "Analyze Ugali", desc: "Ugali with sukuma wiki", q: "Analyze this meal: ugali with sukuma wiki and a glass of mala" },
          { emoji: "🍳", label: "Breakfast", desc: "Mandazi and chai", q: "Analyze this breakfast: 3 mandazi with sweet chai and 2 boiled eggs" },
          { emoji: "🥩", label: "Nyama Choma", desc: "Roasted meat plate", q: "Analyze this meal: nyama choma with kachumbari and 2 chapati" },
          { emoji: "🥗", label: "Healthy Option", desc: "Get alternatives", q: "What is a diabetes-friendly version of pilau with kachumbari?" },
        ];
      default:
        return [
          { emoji: "💡", label: "My Glucose", desc: "Personalized glucose advice", q: "What do my recent glucose numbers tell you? Any advice?" },
          { emoji: "🏃", label: "Exercise Plan", desc: "Based on my data", q: "Based on my exercise this week, what should I do differently?" },
          { emoji: "📊", label: "My Progress", desc: "How am I doing?", q: "How am I doing overall with my diabetes management?" },
          { emoji: "🍽️", label: "Meal Ideas", desc: "Kenyan diabetes-friendly meals", q: "Suggest diabetes-friendly Kenyan meals for this week" },
        ];
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "predictive": return "Predictive Alerts";
      case "clinician-copilot": return "Clinical AI Assistant";
      case "meal-analysis": return "Meal Analyzer";
      default: return "Dr. Yvonne";
    }
  };

  return (
    <div className="h-full flex flex-col gap-0">
      <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                {mode === "clinician-copilot" ? (
                  <Sparkles className="h-10 w-10 text-primary" />
                ) : (
                  <img src={yvonneAvatar} alt="Dr. Yvonne" className="h-16 w-16 rounded-full object-cover" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">{getTitle()}</h3>
              <p className="text-muted-foreground mb-1 text-sm">
                {mode === "chat" && healthContext ? "✨ I have access to your health data for personalized advice" : ""}
                {mode === "predictive" ? "🔮 Analyzing your patterns for glucose predictions" : ""}
                {mode === "clinician-copilot" ? "📋 AI-powered patient analysis assistant" : ""}
                {mode === "meal-analysis" ? "🍽️ Describe a meal to see its glycemic impact" : ""}
              </p>
              {healthContext && mode === "chat" && (
                <div className="flex flex-wrap gap-2 justify-center mt-3 mb-4">
                  {healthContext.avgGlucose && (
                    <span className="text-xs px-2 py-1 bg-primary/10 rounded-full">Avg: {healthContext.avgGlucose} mg/dL</span>
                  )}
                  {healthContext.timeInRange !== undefined && (
                    <span className="text-xs px-2 py-1 bg-primary/10 rounded-full">TIR: {healthContext.timeInRange}%</span>
                  )}
                  {healthContext.medicationAdherence !== undefined && (
                    <span className="text-xs px-2 py-1 bg-primary/10 rounded-full">Adherence: {healthContext.medicationAdherence}%</span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto text-left mt-4">
                {getSuggestions().map((card) => (
                  <div key={card.label} className="p-4 rounded-lg bg-card border border-border/50 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setInput(card.q)}>
                    <p className="text-sm font-medium">{card.emoji} {card.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {message.role === "assistant" && (
                <div className="flex-shrink-0">
                  {mode === "clinician-copilot" ? (
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  ) : (
                    <img src={yvonneAvatar} alt="Dr. Yvonne" className="h-10 w-10 rounded-full border-2 border-primary/20 object-cover shadow-sm" />
                  )}
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${message.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border/50 rounded-bl-sm"}`}>
                {message.role === "assistant" ? (
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.role === "user" && (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-secondary/20">
                  <User className="h-5 w-5 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex-shrink-0">
                {mode === "clinician-copilot" ? (
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                ) : (
                  <img src={yvonneAvatar} alt="Dr. Yvonne" className="h-10 w-10 rounded-full border-2 border-primary/20 object-cover shadow-sm" />
                )}
              </div>
              <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2.5 w-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2.5 w-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="border-t bg-card/50 backdrop-blur-sm px-6 py-4">
        <div className="flex gap-3 max-w-4xl mx-auto">
          {mode === "chat" && (
            <Button onClick={isRecording ? stopRecording : startRecording} disabled={isLoading || isTranscribing} size="lg" variant={isRecording ? "destructive" : "outline"} className="h-12 w-12 rounded-full p-0 shadow-lg hover:shadow-xl transition-all">
              {isRecording ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
            </Button>
          )}
          <Input
            placeholder={getPlaceholder()}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading || isRecording || isTranscribing}
            className="flex-1 h-12 px-4 text-base rounded-full border-2 focus:border-primary transition-colors"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim() || isRecording || isTranscribing} size="lg" className="h-12 w-12 rounded-full p-0 shadow-lg hover:shadow-xl transition-all">
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3 max-w-4xl mx-auto">
          {isRecording && "🎤 Recording... Click the microphone button again to stop"}
          {isTranscribing && "✨ Transcribing your voice..."}
          {!isRecording && !isTranscribing && (mode === "clinician-copilot" 
            ? "AI assistant for clinical decision support. Final decisions rest with the healthcare provider."
            : "Dr. Yvonne provides general health information. Always consult your healthcare provider for medical advice."
          )}
        </p>
      </div>
    </div>
  );
};
