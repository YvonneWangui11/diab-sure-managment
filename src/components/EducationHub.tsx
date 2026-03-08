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
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const randomQuote = wellnessQuotes[Math.floor(Math.random() * wellnessQuotes.length)];
    const randomTip = healthTips[Math.floor(Math.random() * healthTips.length)];
    setDailyQuote(randomQuote);
    setDailyTip(randomTip);
  }, []);

  const generatePDF = (material: typeof educationalMaterials[0]) => {
    setDownloadingId(material.id);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title page
      doc.setFontSize(24);
      doc.text(material.title, pageWidth / 2, 60, { align: "center", maxWidth: pageWidth - 40 });

      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(material.description, pageWidth / 2, 90, { align: "center", maxWidth: pageWidth - 40 });

      doc.setFontSize(10);
      doc.text(`Category: ${material.category}`, pageWidth / 2, 110, { align: "center" });
      doc.text(`DiabSure Education Hub`, pageWidth / 2, 120, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 130, { align: "center" });

      // Content pages based on category
      const contentMap: Record<string, string[]> = {
        Basics: [
          "What is Diabetes?",
          "Diabetes is a chronic condition that affects how your body turns food into energy. There are two main types:",
          "Type 1 Diabetes: The body doesn't produce insulin. Usually diagnosed in children and young adults.",
          "Type 2 Diabetes: The body doesn't use insulin well. Most common form, often linked to lifestyle factors.",
          "",
          "Common Symptoms:",
          "• Increased thirst and frequent urination",
          "• Unexplained weight loss",
          "• Fatigue and blurred vision",
          "• Slow-healing sores",
          "",
          "Management Strategies:",
          "• Monitor blood glucose regularly",
          "• Take medications as prescribed",
          "• Follow a balanced diet",
          "• Exercise regularly (150 min/week)",
          "• Attend regular check-ups",
        ],
        Nutrition: [
          "Diabetes-Friendly Kenyan Recipes",
          "",
          "Breakfast: Brown Ugali with Vegetables",
          "Ingredients: Brown maize flour, spinach, tomatoes, onions",
          "Preparation: Cook brown ugali as usual. Sauté vegetables with minimal oil.",
          "Benefits: High fiber, low glycemic index, rich in vitamins.",
          "",
          "Lunch: Grilled Tilapia with Sukuma Wiki",
          "Ingredients: Fresh tilapia, sukuma wiki, lemon, garlic",
          "Preparation: Season and grill fish. Lightly sauté greens.",
          "Benefits: Lean protein, iron-rich greens, heart-healthy.",
          "",
          "Dinner: Githeri (Beans & Maize Mix)",
          "Ingredients: Boiled beans, maize, vegetables, herbs",
          "Benefits: Plant protein, slow-release carbs, high fiber.",
          "",
          "Snack: Fresh Fruit & Nuts",
          "Options: Mangoes, passion fruit, groundnuts in moderation.",
        ],
        Exercise: [
          "Exercise Guide for Diabetes Management",
          "",
          "Recommended Activities:",
          "• Walking: 30 minutes daily, brisk pace",
          "• Swimming: Low-impact, full-body workout",
          "• Cycling: Great for cardiovascular health",
          "• Yoga: Reduces stress, improves flexibility",
          "",
          "Safety Guidelines:",
          "• Check blood sugar before and after exercise",
          "• Carry fast-acting glucose (juice, sweets)",
          "• Stay hydrated throughout",
          "• Wear proper footwear to protect feet",
          "• Start slowly and increase intensity gradually",
          "",
          "Weekly Target: 150 minutes of moderate activity",
          "Strength training: 2-3 sessions per week",
        ],
        Monitoring: [
          "Blood Sugar Monitoring Best Practices",
          "",
          "When to Test:",
          "• Before meals (fasting)",
          "• 2 hours after meals (post-prandial)",
          "• Before bedtime",
          "• Before and after exercise",
          "",
          "Target Ranges:",
          "• Fasting: 70-130 mg/dL",
          "• Post-meal (2hrs): Below 180 mg/dL",
          "• HbA1c: Below 7%",
          "",
          "Tips for Accurate Readings:",
          "• Wash hands before testing",
          "• Use the side of your fingertip",
          "• Rotate testing sites",
          "• Keep a log of all readings",
          "• Share logs with your healthcare team",
        ],
        Prevention: [
          "Preventing Diabetes Complications",
          "",
          "Heart Health:",
          "• Maintain healthy blood pressure (<130/80)",
          "• Keep cholesterol in check",
          "• Avoid smoking and limit alcohol",
          "",
          "Eye Care:",
          "• Annual dilated eye exams",
          "• Report vision changes immediately",
          "",
          "Kidney Protection:",
          "• Regular kidney function tests",
          "• Control blood pressure",
          "• Stay hydrated",
          "",
          "Foot Care:",
          "• Inspect feet daily for cuts or sores",
          "• Wear comfortable, well-fitting shoes",
          "• Never walk barefoot",
          "• See a podiatrist regularly",
        ],
        Medication: [
          "Medication Management Handbook",
          "",
          "Common Diabetes Medications:",
          "• Metformin: First-line for Type 2, reduces glucose production",
          "• Sulfonylureas: Stimulate insulin release",
          "• Insulin: Required for Type 1, sometimes Type 2",
          "",
          "Important Guidelines:",
          "• Take medications at the same time daily",
          "• Never skip doses without consulting your doctor",
          "• Store insulin properly (refrigerate, avoid freezing)",
          "• Report side effects to your healthcare team",
          "",
          "Medication Safety:",
          "• Keep an updated medication list",
          "• Inform all doctors about your medications",
          "• Check for drug interactions",
          "• Refill prescriptions before running out",
        ],
      };

      const content = contentMap[material.category] || contentMap["Basics"];
      doc.addPage();
      doc.setTextColor(0);
      let y = 20;

      doc.setFontSize(16);
      doc.text(content[0], 14, y);
      y += 12;
      doc.setFontSize(11);

      for (let i = 1; i < content.length; i++) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const line = content[i];
        if (line === "") {
          y += 6;
        } else {
          doc.text(line, 14, y, { maxWidth: pageWidth - 28 });
          y += 7;
        }
      }

      // Footer on all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `DiabSure Education Hub — Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      const filename = material.title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      doc.save(`${filename}.pdf`);

      toast({ title: "Downloaded", description: `${material.title} saved as PDF` });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to generate PDF" });
    } finally {
      setDownloadingId(null);
    }
  };

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
                    <Button size="sm" onClick={() => generatePDF(material)} disabled={downloadingId === material.id}>
                      <Download className="h-4 w-4 mr-2" />
                      {downloadingId === material.id ? "Generating..." : "Download PDF"}
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