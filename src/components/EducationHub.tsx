import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Download, 
  Heart, 
  Apple, 
  Activity, 
  Lightbulb,
  TrendingUp,
  Shield,
  Brain
} from "lucide-react";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

const healthTips = [
  {
    title: "Morning Routine",
    tip: "Start your day with a glass of warm water and a 10-minute walk to regulate blood sugar naturally.",
    icon: Heart,
    category: "Daily Habits"
  },
  {
    title: "Portion Control",
    tip: "Use your hand as a guide: palm for protein, fist for vegetables, cupped hand for carbs.",
    icon: Apple,
    category: "Nutrition"
  },
  {
    title: "Stay Active",
    tip: "Just 30 minutes of brisk walking daily can improve insulin sensitivity by 25%.",
    icon: Activity,
    category: "Exercise"
  },
  {
    title: "Stress Management",
    tip: "Practice deep breathing for 5 minutes daily. Stress hormones can raise blood glucose levels.",
    icon: Brain,
    category: "Mental Health"
  }
];

const wellnessQuotes = [
  "Health is not about being thin. It's about being well.",
  "Take care of your body. It's the only place you have to live.",
  "Every step counts towards a healthier you.",
  "Small changes lead to remarkable transformations.",
  "Your health is an investment, not an expense."
];

const educationalMaterials = [
  {
    id: 1,
    title: "Understanding Diabetes: A Comprehensive Guide",
    description: "Learn about Type 1 and Type 2 diabetes, symptoms, and management strategies.",
    category: "Basics",
    pages: 24,
    downloadUrl: "#"
  },
  {
    id: 2,
    title: "Kenyan Diabetes-Friendly Recipe Book",
    description: "50+ delicious local recipes perfect for managing blood sugar levels.",
    category: "Nutrition",
    pages: 45,
    downloadUrl: "#"
  },
  {
    id: 3,
    title: "Exercise Guide for Diabetes Management",
    description: "Safe and effective exercises tailored for people with diabetes.",
    category: "Exercise",
    pages: 32,
    downloadUrl: "#"
  },
  {
    id: 4,
    title: "Blood Sugar Monitoring Best Practices",
    description: "When, how, and why to check your blood glucose levels.",
    category: "Monitoring",
    pages: 16,
    downloadUrl: "#"
  },
  {
    id: 5,
    title: "Preventing Diabetes Complications",
    description: "Essential guide to protecting your heart, eyes, kidneys, and feet.",
    category: "Prevention",
    pages: 28,
    downloadUrl: "#"
  },
  {
    id: 6,
    title: "Medication Management Handbook",
    description: "Understanding your diabetes medications and how to take them safely.",
    category: "Medication",
    pages: 20,
    downloadUrl: "#"
  }
];

const preventionTips = [
  {
    title: "Maintain Healthy Weight",
    description: "Losing just 5-10% of your body weight can significantly reduce diabetes risk.",
    icon: TrendingUp
  },
  {
    title: "Choose Whole Grains",
    description: "Replace refined grains with brown ugali, brown rice, and whole wheat products.",
    icon: Apple
  },
  {
    title: "Regular Physical Activity",
    description: "Aim for at least 150 minutes of moderate exercise per week.",
    icon: Activity
  },
  {
    title: "Regular Health Checkups",
    description: "Get your blood sugar tested annually, especially if you have risk factors.",
    icon: Shield
  }
];

const localMealGuide = [
  {
    meal: "Breakfast",
    options: [
      "Whole grain uji (porridge) with nuts and fruit",
      "Boiled arrow roots with tea (no sugar)",
      "Boiled eggs with whole wheat bread and avocado"
    ]
  },
  {
    meal: "Lunch",
    options: [
      "Brown ugali with sukuma wiki and grilled fish",
      "Brown rice with dengu (green grams) and vegetable stew",
      "Githeri (maize and beans) with vegetables"
    ]
  },
  {
    meal: "Dinner",
    options: [
      "Vegetable soup with chicken and sweet potatoes",
      "Mukimo made with green grams instead of potatoes",
      "Grilled meat with vegetable salad and avocado"
    ]
  },
  {
    meal: "Snacks",
    options: [
      "Roasted groundnuts (njugu karanga)",
      "Fresh fruits (oranges, apples, pawpaw)",
      "Roasted arrow roots (nduma)"
    ]
  }
];

export const EducationHub = () => {
  const [dailyQuote, setDailyQuote] = useState("");
  const [dailyTip, setDailyTip] = useState(healthTips[0]);

  useEffect(() => {
    // Set random daily quote and tip
    const randomQuote = wellnessQuotes[Math.floor(Math.random() * wellnessQuotes.length)];
    const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
    setDailyQuote(randomQuote);
    setDailyTip(randomTip);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Education Hub</h1>
          <p className="text-muted-foreground">Your resource center for diabetes management and healthy living</p>
        </div>
        <BookOpen className="h-12 w-12 text-primary" />
      </div>

      {/* Daily Quote and Tip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Daily Wellness Quote
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg italic text-foreground">"{dailyQuote}"</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/20 to-accent/5 border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <dailyTip.icon className="h-5 w-5 text-accent" />
              Daily Health Tip
            </CardTitle>
            <Badge variant="outline">{dailyTip.category}</Badge>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-2">{dailyTip.title}</h4>
            <p className="text-muted-foreground">{dailyTip.tip}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="prevention">Prevention</TabsTrigger>
          <TabsTrigger value="nutrition">Local Meals</TabsTrigger>
          <TabsTrigger value="tips">Health Tips</TabsTrigger>
        </TabsList>

        {/* Downloadable Materials */}
        <TabsContent value="materials" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {educationalMaterials.map((material) => (
              <Card key={material.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <BookOpen className="h-10 w-10 text-primary" />
                    <Badge variant="secondary">{material.category}</Badge>
                  </div>
                  <CardTitle className="text-lg">{material.title}</CardTitle>
                  <CardDescription>{material.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{material.pages} pages</span>
                    <Button size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Prevention Guide */}
        <TabsContent value="prevention" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Diabetes Prevention Strategies</CardTitle>
              <CardDescription>Reduce your risk and increase your longevity with these proven strategies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {preventionTips.map((tip, index) => (
                  <div key={index} className="flex gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <tip.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">{tip.title}</h4>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Factors to Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <span>Family history of diabetes</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <span>Overweight or obesity (BMI over 25)</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <span>Physical inactivity</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <span>High blood pressure (140/90 or above)</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary"></div>
                  <span>Age 45 or older</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Local Meal Guide */}
        <TabsContent value="nutrition" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kenyan Diabetes-Friendly Meals</CardTitle>
              <CardDescription>Delicious local foods that help manage blood sugar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {localMealGuide.map((mealType, index) => (
                  <div key={index}>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Apple className="h-5 w-5 text-primary" />
                      {mealType.meal}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {mealType.options.map((option, optIndex) => (
                        <div key={optIndex} className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                          <p className="text-sm">{option}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Foods to Limit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['White ugali', 'White bread', 'Sodas', 'Sugary tea', 'Fried foods', 'Processed meats', 'Excessive fruit juice', 'Sweet pastries'].map((food, index) => (
                  <div key={index} className="p-2 bg-destructive/10 rounded-lg text-center text-sm border border-destructive/20">
                    {food}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Health Tips Collection */}
        <TabsContent value="tips" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {healthTips.map((tip, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <tip.icon className="h-5 w-5 text-primary" />
                    </div>
                    <Badge variant="outline">{tip.category}</Badge>
                  </div>
                  <CardTitle>{tip.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{tip.tip}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-success" />
                Remember: Consistency is Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">
                Managing diabetes is a journey, not a destination. Small, consistent healthy choices add up to big results over time.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span>Track your progress regularly</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span>Celebrate small victories</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span>Stay connected with your healthcare team</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success"></div>
                  <span>Never hesitate to ask for help</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};