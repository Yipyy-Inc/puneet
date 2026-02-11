"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetRolePage() {
  const router = useRouter();

  const setFacilityAdmin = () => {
    document.cookie = "user_role=facility_admin; path=/; max-age=31536000";
    router.push("/facility/dashboard");
  };

  const setSuperAdmin = () => {
    document.cookie = "user_role=super_admin; path=/; max-age=31536000";
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set User Role</CardTitle>
          <CardDescription>
            Choose a role to access the appropriate dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={setFacilityAdmin} className="w-full" size="lg">
            Set as Facility Admin
          </Button>
          <Button onClick={setSuperAdmin} variant="outline" className="w-full" size="lg">
            Set as Super Admin
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
