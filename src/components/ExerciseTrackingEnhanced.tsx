import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Timer, Plus, Target, Flame } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import exercise1 from "@/assets/exercise-1.jpg";
import exercise2 from "@/assets/exercise-2.jpg";
import exercise3 from "@/assets/exercise-3.jpg";
import exercise4 from "@/assets/exercise-4.jpg";

interface ExerciseLog {
  id: string;
  exercise_type: string;
  duration_minutes: number;
  intensity?: string;
  note?: string;
  date_time: string;
}

const exerciseInfo = [
  { img: exercise1, title: "Yoga & Stretching", desc: "Gentle exercises perfect for improving flexibility and balance" },
  { img: exercise2, title: "Brisk Walking", desc: "Low-impact cardio excellent for blood sugar control" },
  { img: exercise3, title: "Group Exercise", desc: "Strength training and community support" },
  { img: exercise4, title: "Cycling", desc: "Cardiovascular fitness for active aging" }
];

interface ExerciseTrackingEnhancedProps {
  userId: string;
}

export const ExerciseTrackingEnhanced = ({ userId }: ExerciseTrackingEnhancedProps) => {
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [newExercise, setNewExercise] = useState({
    exercise_type: "",
    duration: "",
    intensity: "moderate",
    note: ""
  });

  const weeklyGoals = {
    exerciseMinutes: 150,
    workouts: 5,
    caloriesBurned: 1000
  };

  const weeklyProgress = {
    exerciseMinutes: exercises.reduce((total, ex) => total + ex.duration_minutes, 0),
    workouts: exercises.length,
    caloriesBurned: exercises.reduce((total, ex) => total + (ex.duration_minutes * 5), 0)
  };

  const loadExercises = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('patient_id', userId)
        .gte('date_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('date_time', { ascending: false });

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast({
        title: "Error",
        description: "Failed to load exercise logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addExercise = async () => {
    if (!newExercise.exercise_type || !newExercise.duration) {
      toast({
        title: "Error",
        description: "Please fill in exercise type and duration",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('exercise_logs')
        .insert({
          patient_id: userId,
          exercise_type: newExercise.exercise_type,
          duration_minutes: Number(newExercise.duration),
          intensity: newExercise.intensity,
          note: newExercise.note || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Exercise logged successfully",
      });

      setNewExercise({ exercise_type: "", duration: "", intensity: "moderate", note: "" });
      loadExercises();
    } catch (error) {
      console.error('Error adding exercise:', error);
      toast({
        title: "Error",
        description: "Failed to log exercise",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadExercises();

    const subscription = supabase
      .channel('exercise-logs-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'exercise_logs',
        filter: `patient_id=eq.${userId}`
      }, () => {
        loadExercises();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Exercise Tracking</h1>
          <p className="text-muted-foreground">Track your physical activity and stay active</p>
        </div>
      </div>

      {/* Exercise Inspiration Carousel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Exercise Inspiration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Carousel className="w-full">
            <CarouselContent>
              {exerciseInfo.map((exercise, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="overflow-hidden">
                    <img src={exercise.img} alt={exercise.title} className="w-full h-48 object-cover" />
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">{exercise.title}</h4>
                      <p className="text-sm text-muted-foreground">{exercise.desc}</p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </CardContent>
      </Card>

      <Tabs defaultValue="tracking" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tracking">Track Workout</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-6">
          {/* Weekly Goals Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Exercise Minutes</p>
                    <p className="text-2xl font-bold">{weeklyProgress.exerciseMinutes}</p>
                    <p className="text-xs text-muted-foreground">of {weeklyGoals.exerciseMinutes} weekly</p>
                  </div>
                  <Timer className="h-8 w-8 text-primary" />
                </div>
                <Progress value={(weeklyProgress.exerciseMinutes / weeklyGoals.exerciseMinutes) * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Workouts</p>
                    <p className="text-2xl font-bold">{weeklyProgress.workouts}</p>
                    <p className="text-xs text-muted-foreground">of {weeklyGoals.workouts} weekly</p>
                  </div>
                  <Target className="h-8 w-8 text-success" />
                </div>
                <Progress value={(weeklyProgress.workouts / weeklyGoals.workouts) * 100} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Calories Burned</p>
                    <p className="text-2xl font-bold">{weeklyProgress.caloriesBurned}</p>
                    <p className="text-xs text-muted-foreground">of {weeklyGoals.caloriesBurned} weekly</p>
                  </div>
                  <Flame className="h-8 w-8 text-orange-500" />
                </div>
                <Progress value={(weeklyProgress.caloriesBurned / weeklyGoals.caloriesBurned) * 100} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Log Exercise Form */}
          <Card>
            <CardHeader>
              <CardTitle>Log Exercise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="exercise-type">Exercise Type</Label>
                  <Input
                    id="exercise-type"
                    value={newExercise.exercise_type}
                    onChange={(e) => setNewExercise({ ...newExercise, exercise_type: e.target.value })}
                    placeholder="e.g., Brisk Walking"
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newExercise.duration}
                    onChange={(e) => setNewExercise({ ...newExercise, duration: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div>
                  <Label htmlFor="intensity">Intensity</Label>
                  <Select value={newExercise.intensity} onValueChange={(val) => setNewExercise({ ...newExercise, intensity: val })}>
                    <SelectTrigger id="intensity">
                      <SelectValue placeholder="Select intensity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="note">Notes (optional)</Label>
                <Input
                  id="note"
                  value={newExercise.note}
                  onChange={(e) => setNewExercise({ ...newExercise, note: e.target.value })}
                  placeholder="How did you feel?"
                />
              </div>
              <Button onClick={addExercise} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Log Exercise
              </Button>
            </CardContent>
          </Card>

          {/* Recent Exercises */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Workouts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : exercises.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No exercises logged yet</p>
              ) : (
                <div className="space-y-4">
                  {exercises.slice(0, 5).map((exercise) => (
                    <div key={exercise.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">{exercise.exercise_type}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(exercise.date_time).toLocaleDateString()}
                          </p>
                          {exercise.note && <p className="text-xs text-muted-foreground italic">{exercise.note}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{exercise.duration_minutes} min</p>
                        <Badge variant={
                          exercise.intensity === 'high' ? 'destructive' :
                          exercise.intensity === 'moderate' ? 'default' : 'secondary'
                        }>
                          {exercise.intensity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Detailed progress tracking coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};