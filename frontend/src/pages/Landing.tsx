import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogIn, Sparkles, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
              <img 
                src="/logo.png" 
                alt="Pixie" 
                className="relative h-24 w-24 rounded-2xl shadow-xl"
              />
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Pixie
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Create MCP apps easily with an intuitive interface. Build powerful integrations in minutes.
            </p>
          </div>
        </div>

         <div className="pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/login")}
                className="w-full h-12 text-base font-medium transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Get Started
              </Button>
            </div>
      </div>
    </div>
  );
}

