import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Send, Sparkles, Check, Loader2, Dumbbell, Apple } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface NaturalLanguageLoggerProps {
  userId: string;
}

interface ParsedEntry {
  type: "exercise" | "meal";
  data: {
    exercise_type?: string;
    duration_minutes?: number;
    intensity?: string;
    description?: string;
    meal_type?: string;
    portion_size?: string;
  };
}

interface ParseResult {
  entries: ParsedEntry[];
  summary: string;
}

export const NaturalLanguageLogger = ({ userId }: NaturalLanguageLoggerProps) => {
  const [input, setInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [savedEntries, setSavedEntries] = useState<Set<number>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const { toast } = useToast();

  const parseInput = useCallback(async () => {
    if (!input.trim()) return;
    setIsParsing(true);
    setParseResult(null);
    setSavedEntries(new Set());

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-health-log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ text: input.trim() }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          toast({ variant: "destructive", title: "Rate Limit", description: "Too many requests. Please wait a moment." });
          return;
        }
        throw new Error("Failed to parse");
      }

      const result: ParseResult = await response.json();
      
      if (result.entries.length === 0) {
        toast({ title: "Hmm...", description: "I couldn't identify any health entries. Try being more specific, e.g. 'walked 30 minutes and had ugali for lunch'." });
        return;
      }
      
      setParseResult(result);
    } catch (error) {
      console.error("Parse error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to understand your input. Please try again." });
    } finally {
      setIsParsing(false);
    }
  }, [input, toast]);

  const saveEntry = async (index: number) => {
    if (!parseResult || savedEntries.has(index)) return;
    const entry = parseResult.entries[index];
    setIsSaving(true);

    try {
      if (entry.type === "exercise") {
        const { error } = await supabase.from("exercise_logs").insert({
          patient_id: userId,
          exercise_type: entry.data.exercise_type || "general",
          duration_minutes: entry.data.duration_minutes || 30,
          intensity: entry.data.intensity || "moderate",
          date_time: new Date().toISOString(),
        });
        if (error) throw error;
      } else if (entry.type === "meal") {
        const { error } = await supabase.from("meal_logs").insert({
          patient_id: userId,
          description: entry.data.description || "Meal",
          meal_type: entry.data.meal_type || "snack",
          portion_size: entry.data.portion_size || "medium",
          date_time: new Date().toISOString(),
        });
        if (error) throw error;
      }

      setSavedEntries(prev => new Set([...prev, index]));
      toast({ title: "Saved!", description: `${entry.type === "exercise" ? "Exercise" : "Meal"} logged successfully.` });
    } catch (error) {
      console.error("Save error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save entry." });
    } finally {
      setIsSaving(false);
    }
  };

  const saveAll = async () => {
    if (!parseResult) return;
    for (let i = 0; i < parseResult.entries.length; i++) {
      if (!savedEntries.has(i)) {
        await saveEntry(i);
      }
    }
  };

  const reset = () => {
    setInput("");
    setParseResult(null);
    setSavedEntries(new Set());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      parseInput();
    }
  };

  const examples = [
    "Walked for 30 minutes this morning and had ugali with sukuma wiki for lunch",
    "Did 20 minutes of jogging, then ate 2 chapati with beans and a cup of chai",
    "Had mandazi and tea for breakfast, then did some gardening for an hour",
    "Ate nyama choma with kachumbari for dinner, small portion",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Quick Log</h2>
        <p className="text-muted-foreground">Describe what you did or ate in your own words</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <Input
              placeholder="e.g., 'Walked 30 minutes and had ugali for lunch'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isParsing}
              className="flex-1 h-12 text-base"
            />
            <Button onClick={parseInput} disabled={isParsing || !input.trim()} className="h-12 px-6">
              {isParsing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parse
                </>
              )}
            </Button>
          </div>

          {!parseResult && !isParsing && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Try these examples:</p>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(ex)}
                    className="text-xs px-3 py-1.5 bg-muted rounded-full hover:bg-muted/80 transition-colors text-left"
                  >
                    {ex.length > 50 ? ex.slice(0, 50) + "..." : ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parse Results */}
      {parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Parsed Entries
            </CardTitle>
            <CardDescription>{parseResult.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {parseResult.entries.map((entry, idx) => {
              const isSaved = savedEntries.has(idx);
              return (
                <div key={idx} className={`flex items-center justify-between p-4 rounded-lg border ${isSaved ? "bg-green-500/10 border-green-500/30" : "bg-muted/50"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${entry.type === "exercise" ? "bg-primary/10" : "bg-orange-500/10"}`}>
                      {entry.type === "exercise" ? (
                        <Dumbbell className="h-5 w-5 text-primary" />
                      ) : (
                        <Apple className="h-5 w-5 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {entry.type === "exercise"
                            ? `${entry.data.exercise_type} • ${entry.data.duration_minutes}min`
                            : entry.data.description}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {entry.type === "exercise" ? entry.data.intensity : entry.data.meal_type}
                        </Badge>
                      </div>
                      {entry.type === "meal" && entry.data.portion_size && (
                        <p className="text-xs text-muted-foreground">Portion: {entry.data.portion_size}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isSaved ? "ghost" : "default"}
                    disabled={isSaved || isSaving}
                    onClick={() => saveEntry(idx)}
                  >
                    {isSaved ? (
                      <><Check className="h-4 w-4 mr-1" /> Saved</>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              );
            })}

            <div className="flex gap-3 pt-2">
              {!parseResult.entries.every((_, i) => savedEntries.has(i)) && (
                <Button onClick={saveAll} disabled={isSaving}>
                  <Check className="h-4 w-4 mr-2" />
                  Save All
                </Button>
              )}
              <Button variant="outline" onClick={reset}>
                Log More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-foreground mb-2">💡 Tips for better parsing</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Include duration for exercises: "walked <strong>30 minutes</strong>"</li>
            <li>Mention meal type: "had chapati for <strong>breakfast</strong>"</li>
            <li>Include intensity: "<strong>vigorous</strong> jogging"</li>
            <li>Combine multiple entries: "walked 20 min <strong>and</strong> had ugali for lunch"</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
