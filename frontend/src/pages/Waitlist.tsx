import { Clock, LogOut, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Waitlist() {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Pixie Branding Header */}
      <header className="w-full border-b bg-background/80 backdrop-blur-md px-4 py-4 sm:px-6 sticky top-0 z-10">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Pixie" className="h-8 w-8 rounded-lg" />
            <h1 className="text-2xl font-bold">Pixie</h1>
          </div>
        </div>
      </header>

      {/* Waitlist Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center space-y-6 pb-8">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse"></div>
                  <div className="relative p-4 rounded-full bg-amber-500/10 border-2 border-amber-500/20">
                    <Clock className="h-16 w-16 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <CardTitle className="text-4xl font-bold tracking-tight">
                  You're on the Waitlist
                </CardTitle>
                <CardDescription className="text-lg">
                  Thank you for signing up, <span className="font-semibold text-foreground">{user?.name || user?.email || "there"}</span>!
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pb-8">
              <div className="space-y-3 text-center">
                <p className="text-muted-foreground leading-relaxed">
                  Your account is currently on the waitlist. We're working hard to grant you access soon.
                  You'll be notified via email when your account is activated.
                </p>
              </div>

              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-amber-50/50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-sm">What's Next?</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Keep an eye on your inbox at <span className="font-medium text-foreground">{user?.email}</span>. 
                          We'll send you an email as soon as your account is activated.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1 justify-center sm:justify-start">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span>Account created successfully</span>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={logout}
                    className="w-full sm:w-auto"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

