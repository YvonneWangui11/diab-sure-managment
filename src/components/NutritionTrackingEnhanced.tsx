import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Utensils, Plus, Apple } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import kenyanMeal1 from "@/assets/kenyan-meal-1.jpg";
import kenyanMeal2 from "@/assets/kenyan-meal-2.jpg";
import kenyanMeal3 from "@/assets/kenyan-meal-3.jpg";
import kenyanMeal4 from "@/assets/kenyan-meal-4.jpg";

interface MealLog {
  id: string;
  description: string;
  meal_type?: string;
  date_time: string;
  note?: string;
}

const kenyanMealInfo = [
  { img: kenyanMeal1, title: "Ugali with Sukuma Wiki & Fish", desc: "Balanced diabetes-friendly meal rich in fiber and protein" },
  { img: kenyanMeal2, title: "Whole Grain Uji", desc: "Nutritious breakfast with fruits and nuts for sustained energy" },
  { img: kenyanMeal3, title: "Brown Rice with Dengu", desc: "Protein-packed lunch that helps manage blood sugar" },
  { img: kenyanMeal4, title: "Roasted Arrow Roots", desc: "Healthy local snack alternative" }
];

interface NutritionTrackingEnhancedProps {
  userId: string;
}

export const NutritionTrackingEnhanced = ({ userId }: NutritionTrackingEnhancedProps) => {
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [newMeal, setNewMeal] = useState({
    description: "",
    meal_type: "breakfast",
    note: ""
  });

  const dailyTargets = {
    calories: 2000,
    meals: 3
  };

  const loadMealLogs = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('patient_id', userId)
        .gte('date_time', today.toISOString())
        .order('date_time', { ascending: false });

      if (error) throw error;
      setMealLogs(data || []);
    } catch (error) {
      console.error('Error loading meal logs:', error);
      toast({
        title: "Error",
        description: "Failed to load meal logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMeal = async () => {
    if (!newMeal.description) {
      toast({
        title: "Error",
        description: "Please enter meal description",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('meal_logs')
        .insert({
          patient_id: userId,
          description: newMeal.description,
          meal_type: newMeal.meal_type,
          note: newMeal.note || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meal logged successfully",
      });

      setNewMeal({ description: "", meal_type: "breakfast", note: "" });
      loadMealLogs();
    } catch (error) {
      console.error('Error adding meal:', error);
      toast({
        title: "Error",
        description: "Failed to log meal",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadMealLogs();

    const subscription = supabase
      .channel('meal-logs-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meal_logs',
        filter: `patient_id=eq.${userId}`
      }, () => {
        loadMealLogs();
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
          <h1 className="text-3xl font-bold text-foreground">Nutrition Tracking</h1>
          <p className="text-muted-foreground">Log your meals and track your nutrition</p>
        </div>
      </div>

      {/* Kenyan Healthy Meals Carousel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            Kenyan Diabetes-Friendly Meals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Carousel className="w-full">
            <CarouselContent>
              {kenyanMealInfo.map((meal, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="overflow-hidden">
                    <img src={meal.img} alt={meal.title} className="w-full h-48 object-cover" />
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">{meal.title}</h4>
                      <p className="text-sm text-muted-foreground">{meal.desc}</p>
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
          <TabsTrigger value="tracking">Daily Tracking</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="tracking" className="space-y-6">
          {/* Daily Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Meals Today</p>
                    <p className="text-2xl font-bold">{mealLogs.length}</p>
                    <p className="text-xs text-muted-foreground">of {dailyTargets.meals} meals</p>
                  </div>
                  <Utensils className="h-8 w-8 text-primary" />
                </div>
                <Progress value={(mealLogs.length / dailyTargets.meals) * 100} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Log Meal Form */}
          <Card>
            <CardHeader>
              <CardTitle>Log Meal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="meal-description">Meal Description</Label>
                  <Input
                    id="meal-description"
                    value={newMeal.description}
                    onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                    placeholder="e.g., Ugali with sukuma wiki and fish"
                  />
                </div>
                <div>
                  <Label htmlFor="meal-type">Meal Type</Label>
                  <select
                    id="meal-type"
                    value={newMeal.meal_type}
                    onChange={(e) => setNewMeal({ ...newMeal, meal_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="meal-note">Notes (optional)</Label>
                  <Input
                    id="meal-note"
                    value={newMeal.note}
                    onChange={(e) => setNewMeal({ ...newMeal, note: e.target.value })}
                    placeholder="Any notes..."
                  />
                </div>
              </div>
              <Button onClick={addMeal} className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Log Meal
              </Button>
            </CardContent>
          </Card>

          {/* Today's Meals */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Meals</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : mealLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No meals logged today</p>
              ) : (
                <div className="space-y-4">
                  {mealLogs.map((meal) => (
                    <div key={meal.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="capitalize">{meal.meal_type}</Badge>
                        <div>
                          <h4 className="font-medium">{meal.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(meal.date_time).toLocaleTimeString()}
                          </p>
                          {meal.note && <p className="text-xs text-muted-foreground italic">{meal.note}</p>}
                        </div>
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
              <p className="text-muted-foreground">Progress tracking coming soon!</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};