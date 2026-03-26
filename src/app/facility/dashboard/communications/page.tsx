"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, ArrowRight } from "lucide-react";

export default function CommunicationsPage() {
  const router = useRouter();

  // Redirect to messaging by default (most commonly used)
  useEffect(() => {
    router.replace("/facility/dashboard/messaging");
  }, [router]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Communications</h1>
          <p className="text-muted-foreground mt-1">
            This page has been reorganized. Please select a section below.
          </p>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-3">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Calling</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Voice calls, dialer, and call routing
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/facility/dashboard/calling")}
              className="w-full"
            >
              Go to Calling
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-3">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Messaging</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Email, SMS, automations, and internal communications
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push("/facility/dashboard/messaging")}
              className="w-full"
            >
              Go to Messaging
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
