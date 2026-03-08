import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Pill, 
  Apple, 
  Activity, 
  Calendar, 
  BarChart3,
  Shield,
  Users,
  Smartphone,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Stethoscope
} from "lucide-react";
import { useState, useEffect } from "react";
import heroImage1 from "@/assets/hero-1.jpg";
import heroImage2 from "@/assets/hero-2.jpg";
import heroImage3 from "@/assets/hero-3.jpg";

interface LandingPageProps {
  onGetStarted: () => void;
  onClinicianAccess: () => void;
}

export const LandingPage = ({ onGetStarted, onClinicianAccess }: LandingPageProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentImageSlide, setCurrentImageSlide] = useState(0);
  
  const heroImages = [heroImage1, heroImage2, heroImage3];

  const carouselSlides = [
    {
      title: "Medication Tracking",
      description: "Never miss a dose with smart reminders. Track your medications prescribed by your clinician and mark them as taken with a simple tick.",
      icon: Pill,
      color: "text-secondary"
    },
    {
      title: "Meal & Exercise Logging",
      description: "Log your meals and physical activities. Keep track of your nutrition and exercise patterns to maintain a healthy lifestyle.",
      icon: Apple,
      color: "text-accent"
    },
    {
      title: "Progress Graphs",
      description: "Visualize your health journey with intuitive charts. See your medication adherence, exercise trends, and overall progress at a glance.",
      icon: BarChart3,
      color: "text-primary"
    },
    {
      title: "Clinician Oversight",
      description: "Your healthcare provider can monitor your progress, prescribe medications digitally, and schedule appointments seamlessly.",
      icon: Users,
      color: "text-secondary"
    },
    {
      title: "AskYvonne Assistant",
      description: "Get help navigating the app and learn about diabetes self-management. AskYvonne provides educational support and app guidance (non-diagnostic).",
      icon: MessageCircle,
      color: "text-accent"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const imageTimer = setInterval(() => {
      setCurrentImageSlide((prev) => (prev + 1) % heroImages.length);
    }, 6000);
    return () => clearInterval(imageTimer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length);
  };

  const features = [
    {
      icon: Heart,
      title: "Glucose Monitoring",
      description: "Track blood sugar levels with visual trends and personalized insights"
    },
    {
      icon: Pill,
      title: "Medication Management",
      description: "Never miss a dose with smart reminders and adherence tracking"
    },
    {
      icon: Apple,
      title: "AI Meal Planning",
      description: "Personalized meal plans based on your health profile and preferences"
    },
    {
      icon: Activity,
      title: "Exercise Tracking",
      description: "Log physical activities and get guidance for optimal health"
    },
    {
      icon: Calendar,
      title: "Appointment Reminders",
      description: "Stay on top of clinic visits and health checkups"
    },
    {
      icon: BarChart3,
      title: "Health Analytics",
      description: "Comprehensive reports for you and your healthcare provider"
    }
  ];

  const benefits = [
    "Improved medication adherence",
    "Better glucose control",
    "Personalized health insights",
    "Enhanced patient-doctor communication",
    "Reduced hospital visits",
    "Lifestyle behavior tracking"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Image Carousel Background */}
      <section className="relative overflow-hidden min-h-screen">
        {/* Background Image Carousel */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentImageSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img 
                src={image} 
                alt={`Healthcare scene ${index + 1}`}
                className="w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-hero-overlay"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[85vh]">
            <div className="text-white z-10">
              <Badge className="bg-white/20 text-white border-white/30 mb-6">
                JKUAT Hospital - Kenya
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                DiabeSure
              </h1>
              <p className="text-xl md:text-2xl mb-4 text-white/90 font-medium">
                Own your routine. See your progress.
              </p>
              <p className="text-lg mb-8 text-white/80">
                Comprehensive diabetes management for Type 2 patients at JKUAT Hospital. 
                Track medications, log meals and exercise, visualize progress, and stay connected with your clinician.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-white text-primary hover:bg-white/90"
                  onClick={onGetStarted}
                >
                  Get Started as Patient
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="bg-transparent border-white text-white hover:bg-white/20"
                  onClick={onClinicianAccess}
                >
                  <Stethoscope className="mr-2 h-5 w-5" />
                  Clinician Portal
                </Button>
              </div>
            </div>
            
            {/* Feature Carousel */}
            <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-center text-white min-h-[300px] flex flex-col justify-center">
                {carouselSlides.map((slide, index) => {
                  const Icon = slide.icon;
                  return (
                    <div
                      key={index}
                      className={`transition-all duration-500 ${
                        index === currentSlide
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-95 absolute inset-0 pointer-events-none'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
                          <Icon className={`h-8 w-8 ${slide.color}`} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">{slide.title}</h3>
                        <p className="text-white/90 text-lg max-w-md">{slide.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Carousel Controls */}
              <div className="flex items-center justify-between mt-8">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevSlide}
                  className="text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <div className="flex gap-2">
                  {carouselSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentSlide
                          ? 'bg-white w-8'
                          : 'bg-white/40 hover:bg-white/60'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextSlide}
                  className="text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Comprehensive Diabetes Care
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              DiabeSure provides a complete digital solution for diabetes management, 
              designed specifically for the needs of JKUAT Hospital patients.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="shadow-card bg-gradient-card border-0">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose DiabeSure?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our platform is specifically designed for the Kenyan healthcare context, 
                addressing the unique challenges faced by diabetes patients at JKUAT Hospital.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Card className="shadow-card">
                <CardContent className="p-6 text-center">
                  <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Secure & Private</h3>
                  <p className="text-sm text-muted-foreground">
                    Your health data is protected with enterprise-grade security
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-secondary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Clinician Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Healthcare providers can monitor patient progress remotely
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-6 text-center">
                  <Smartphone className="h-12 w-12 text-accent mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Easy to Use</h3>
                  <p className="text-sm text-muted-foreground">
                    Intuitive interface designed for all age groups
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">AI-Powered Insights</h3>
                  <p className="text-sm text-muted-foreground">
                    Intelligent recommendations based on your health data
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Take Control of Your Diabetes?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join JKUAT Hospital patients who are already using DiabeSure to manage their health effectively.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90"
              onClick={onGetStarted}
            >
              Start Your Journey Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white/20"
              onClick={onClinicianAccess}
            >
              <Stethoscope className="mr-2 h-5 w-5" />
              Access Clinician Portal
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                DiabeSure
              </span>
            </div>
            <p className="text-muted-foreground text-center md:text-right">
              Developed for JKUAT Hospital<br />
              Supporting diabetes management in Kenya
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};