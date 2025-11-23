// src/components/NotFoundPage.tsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ghost, Home, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  const goBack = () => {
    window.history.back();
  };

  return (
    // Full-screen container to center the card
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader className="pb-4">
          {/* The 404 Badge */}
          <Badge variant="destructive" className="w-fit mx-auto text-2xl px-4 py-2">
            404
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Icon and Title */}
          <div className="flex flex-col items-center space-y-2">
            <Ghost className="h-20 w-20 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">Page Not Found</h1>
          </div>
          {/* Description */}
          <p className="text-muted-foreground">
            Oops! The page you're looking for seems to have vanished into the digital ether.
            It might have been moved, deleted, or never existed.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4 pt-4">
          {/* Action Buttons */}
          <Button onClick={goBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button asChild>
            <a href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}