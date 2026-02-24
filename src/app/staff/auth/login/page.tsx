"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { setCurrentUserId } from "@/lib/role-utils";
import { users } from "@/data/users";
import { toast } from "sonner";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple demo login - in production, this would authenticate with backend
    const staffMember = users.find(
      (u) => u.email === email && u.role === "Staff"
    );

    if (staffMember) {
      // Set user ID
      setCurrentUserId(staffMember.id.toString());
      toast.success(`Welcome back, ${staffMember.name}!`);
      router.push("/staff");
    } else {
      toast.error("Invalid email or password");
    }

    setIsLoading(false);
  };

  // Quick login for demo (bypasses authentication)
  const handleQuickLogin = (staffId: string) => {
    setCurrentUserId(staffId);
    const staffMember = users.find((u) => u.id.toString() === staffId);
    if (staffMember) {
      toast.success(`Welcome, ${staffMember.name}!`);
      router.push("/staff");
    }
  };

  const staffMembers = users.filter((u) => u.role === "Staff");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Staff Portal</CardTitle>
          <CardDescription>Sign in to view your schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Quick Login for Demo */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Quick Login (Demo)
            </p>
            <div className="space-y-2">
              {staffMembers.map((staff, index) => (
                <Button
                  key={`staff-${staff.id}-${staff.email}-${index}`}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleQuickLogin(staff.id.toString())}
                >
                  <span className="font-medium">{staff.name}</span>
                  <span className="text-muted-foreground ml-2">({staff.email})</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
