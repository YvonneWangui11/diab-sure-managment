import { useState, useEffect } from "react";
import { useStreakTracker } from "@/hooks/useStreakTracker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Activity, Plus, Heart, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import { format } from "date-fns";

interface GlucoseReading {
  id: string;
  glucose_value: number;
  test_time: string;
  notes?: string;
  created_at: string;
}

interface GlucoseTrackingProps {
  userId: string;
}

export const GlucoseTracking = ({ userId }: GlucoseTrackingProps) => {
  const { trackActivity } = useStreakTracker();
  const [glucoseValue, setGlucoseValue] = useState("");
  const [testTime, setTestTime] = useState("fasting");
  const [notes, setNotes] = useState("");
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [chartReadings, setChartReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadReadings = async () => {
    try {
      setLoading(true);
      const [recentRes, chartRes] = await Promise.all([
        supabase
          .from('glucose_readings')
          .select('*')
          .eq('patient_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('glucose_readings')
          .select('*')
          .eq('patient_id', userId)
          .order('created_at', { ascending: true })
          .limit(30),
      ]);

      if (recentRes.error) throw recentRes.error;
      setReadings(recentRes.data || []);
      setChartReadings(chartRes.data || []);
    } catch (error) {
      console.error('Error loading glucose readings:', error);
      toast({ title: "Error", description: "Failed to load glucose readings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveReading = async () => {
    if (!glucoseValue) {
      toast({ title: "Error", description: "Please enter a glucose value", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from('glucose_readings')
        .insert({ patient_id: userId, glucose_value: Number(glucoseValue), test_time: testTime, notes: notes || null });
      if (error) throw error;
      toast({ title: "Success", description: "Glucose reading saved successfully" });
      trackActivity('glucose_logging');
      setGlucoseValue("");
      setNotes("");
      setTestTime("fasting");
      loadReadings();
    } catch (error) {
      console.error('Error saving glucose reading:', error);
      toast({ title: "Error", description: "Failed to save glucose reading", variant: "destructive" });
    }
  };

  useEffect(() => {
    loadReadings();
    const subscription = supabase
      .channel('glucose-readings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'glucose_readings', filter: `patient_id=eq.${userId}` }, () => loadReadings())
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [userId]);

  const getStatus = (value: number, testTime: string) => {
    if (testTime === "fasting") {
      if (value < 70) return { text: "Low", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
      if (value <= 100) return { text: "Normal", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
      if (value <= 125) return { text: "Pre-diabetes", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
      return { text: "High", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    } else {
      if (value < 70) return { text: "Low", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
      if (value <= 140) return { text: "Normal", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
      if (value <= 199) return { text: "Pre-diabetes", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
      return { text: "High", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    }
  };

  const chartData = chartReadings.map(r => ({
    date: format(new Date(r.created_at), 'MMM d'),
    time: format(new Date(r.created_at), 'HH:mm'),
    value: r.glucose_value,
    testTime: r.test_time,
  }));

  // Stats
  const avgGlucose = readings.length > 0 ? Math.round(readings.reduce((s, r) => s + r.glucose_value, 0) / readings.length) : 0;
  const minGlucose = readings.length > 0 ? Math.min(...readings.map(r => r.glucose_value)) : 0;
  const maxGlucose = readings.length > 0 ? Math.max(...readings.map(r => r.glucose_value)) : 0;
  const inRange = readings.filter(r => r.glucose_value >= 70 && r.glucose_value <= 180).length;
  const inRangePct = readings.length > 0 ? Math.round((inRange / readings.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Glucose Tracking</h1>
          <p className="text-muted-foreground">Monitor and log your blood glucose levels</p>
        </div>
      </div>

      {/* Stats Row */}
      {readings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Average</p>
            <p className="text-2xl font-bold">{avgGlucose}</p>
            <p className="text-xs text-muted-foreground">mg/dL</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Range</p>
            <p className="text-2xl font-bold">{minGlucose}-{maxGlucose}</p>
            <p className="text-xs text-muted-foreground">mg/dL</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">In Range</p>
            <p className="text-2xl font-bold">{inRangePct}%</p>
            <p className="text-xs text-muted-foreground">70-180 mg/dL</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Readings</p>
            <p className="text-2xl font-bold">{readings.length}</p>
            <p className="text-xs text-muted-foreground">Recent</p>
          </CardContent></Card>
        </div>
      )}

      {/* Glucose Trend Chart */}
      {chartData.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Glucose Trend
            </CardTitle>
            <CardDescription>Your recent glucose readings over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card border rounded-lg p-3 shadow-lg">
                            <p className="font-medium">{data.value} mg/dL</p>
                            <p className="text-sm text-muted-foreground">{data.date} at {data.time}</p>
                            <p className="text-xs text-muted-foreground capitalize">{data.testTime?.replace('-', ' ')}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "Low (70)", position: "insideBottomLeft", fontSize: 10 }} />
                  <ReferenceLine y={180} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: "High (180)", position: "insideTopLeft", fontSize: 10 }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#glucoseGradient)" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add New Reading */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Log New Reading
            </CardTitle>
            <CardDescription>Record your current blood glucose level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="glucose">Glucose Level (mg/dL)</Label>
              <Input id="glucose" type="number" placeholder="Enter reading..." value={glucoseValue} onChange={(e) => setGlucoseValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testTime">Test Time</Label>
              <Select value={testTime} onValueChange={setTestTime}>
                <SelectTrigger><SelectValue placeholder="Select test time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fasting">Fasting (before breakfast)</SelectItem>
                  <SelectItem value="pre-lunch">Before lunch</SelectItem>
                  <SelectItem value="post-lunch">After lunch (2 hours)</SelectItem>
                  <SelectItem value="pre-dinner">Before dinner</SelectItem>
                  <SelectItem value="post-dinner">After dinner (2 hours)</SelectItem>
                  <SelectItem value="bedtime">Bedtime</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" placeholder="Any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <Button className="w-full" onClick={saveReading}>
              <Heart className="h-4 w-4 mr-2" />
              Save Reading
            </Button>
          </CardContent>
        </Card>

        {/* Recent Readings */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Readings
            </CardTitle>
            <CardDescription>Your glucose readings history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : readings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No glucose readings yet</p>
                <p className="text-sm mt-2">Start tracking by adding your first reading above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {readings.map((reading) => {
                  const status = getStatus(reading.glucose_value, reading.test_time);
                  return (
                    <div key={reading.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-foreground">{reading.glucose_value}</p>
                          <p className="text-xs text-muted-foreground">mg/dL</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground capitalize">{reading.test_time.replace('-', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(reading.created_at).toLocaleDateString()} at {new Date(reading.created_at).toLocaleTimeString()}
                          </p>
                          {reading.notes && <p className="text-xs text-muted-foreground italic mt-1">{reading.notes}</p>}
                        </div>
                      </div>
                      <Badge className={status.color}>{status.text}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Glucose Ranges Reference */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Target Glucose Ranges</CardTitle>
          <CardDescription>Reference ranges for blood glucose levels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2">Normal Range</h3>
              <p className="text-sm text-muted-foreground mb-2">Fasting: 70-100 mg/dL</p>
              <p className="text-sm text-muted-foreground">Post-meal: &lt;140 mg/dL</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Pre-diabetes</h3>
              <p className="text-sm text-muted-foreground mb-2">Fasting: 100-125 mg/dL</p>
              <p className="text-sm text-muted-foreground">Post-meal: 140-199 mg/dL</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <h3 className="font-semibold text-destructive mb-2">Diabetes Range</h3>
              <p className="text-sm text-muted-foreground mb-2">Fasting: ≥126 mg/dL</p>
              <p className="text-sm text-muted-foreground">Post-meal: ≥200 mg/dL</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
