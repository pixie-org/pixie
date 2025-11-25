import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ComingSoon({
  title,
  description,
  icon: Icon,
}: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Icon className="h-12 w-12 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {title}
            </h1>
            <p className="text-foreground/90 text-base leading-relaxed">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

