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
    <div className="p-6 space-y-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Calling</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
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
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Messaging</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
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
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
