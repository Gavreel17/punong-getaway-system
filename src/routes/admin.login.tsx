import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Database, ShieldCheck, Key, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Punong Spring Resort" },
      { name: "description", content: "Administrator secure sign in." },
    ],
  }),
  component: AdminLoginPage,
});

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({ fullname: "", email: "", password: "", secretCode: "" });
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);

  // If already authenticated as admin, redirect directly to calendar
  useEffect(() => {
    if (!authLoading && user && role === "admin") {
      navigate({ to: "/admin/calendar" });
    }
  }, [user, role, authLoading, navigate]);

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signIn.email,
        password: signIn.password,
      });

      if (error) {
        setLoading(false);
        return toast.error(error.message);
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const roles = (roleData as any[])?.map((r: any) => r.role) ?? [];
      const isAdmin = roles.includes("admin");

      if (!isAdmin) {
        // Sign out since they are not an admin
        await supabase.auth.signOut();
        setLoading(false);
        return toast.error("Access denied. You do not have administrator privileges.");
      }

      setLoading(false);
      toast.success("Welcome to the Admin Dashboard!");
      navigate({ to: "/admin/calendar" });
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "An unexpected error occurred during login.");
    }
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    // Simple security check to prevent normal users from making admin accounts easily
    if (signUp.secretCode !== "ADMIN2026" && signUp.secretCode !== "punong") {
      return toast.error("Invalid Admin Secret Code.");
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUp.email,
        password: signUp.password,
        options: {
          data: { fullname: signUp.fullname },
        },
      });

      if (error) {
        setLoading(false);
        return toast.error(error.message);
      }

      if (data.user) {
        // Promote newly registered user to admin role immediately
        await supabase.from("user_roles").update({ role: "admin" }).eq("user_id", data.user.id);
      }

      setLoading(false);
      toast.success("Admin Account created successfully! Logging you in...");
      setTimeout(() => {
        navigate({ to: "/admin/calendar" });
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setLoading(false);
      toast.error(err.message || "Failed to register admin.");
    }
  }

  const handleEnableOfflineMode = () => {
    localStorage.setItem("supabase_mock_mode", "true");
    toast.success("Offline Mock Mode enabled! Redirecting...");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-3xl font-bold text-white hover:text-accent transition-colors"
          >
            <img src="/logo.png" alt="Punong Logo" className="h-10 w-10 object-contain rounded-full bg-white/10 p-0.5" /> Punong Admin
          </Link>
          <p className="text-slate-400 text-sm">Secure Portal for Resort Management</p>
        </div>

        <Card className="p-1 border-slate-800 bg-slate-900 shadow-2xl">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-950 text-slate-400 border-b border-slate-800 p-0 h-12 rounded-t-lg rounded-b-none">
              <TabsTrigger
                value="signin"
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-accent rounded-none rounded-tl-lg h-full"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-slate-900 data-[state=active]:text-accent rounded-none rounded-tr-lg h-full"
              >
                Register Admin
              </TabsTrigger>
            </TabsList>

            <div className="p-7">
              <TabsContent value="signin" className="mt-0 outline-none">
                <form onSubmit={onSignIn} className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                    <Key className="h-5 w-5 text-accent" /> Admin Login
                  </h2>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Admin Email</Label>
                    <Input
                      type="email"
                      required
                      placeholder="admin@punongresort.com"
                      value={signIn.email}
                      onChange={(e) => setSignIn({ ...signIn, email: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-accent focus:ring-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Password</Label>
                    <div className="relative">
                      <Input
                        type={showSignInPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={signIn.password}
                        onChange={(e) => setSignIn({ ...signIn, password: e.target.value })}
                        className="bg-slate-950 border-slate-800 text-white focus:border-accent focus:ring-accent pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                      >
                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 mt-4 font-semibold shadow-md cursor-pointer"
                  >
                    {loading ? "Verifying Credentials..." : "Authenticate Admin"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0 outline-none">
                <form onSubmit={onSignUp} className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-accent" /> Create Admin
                  </h2>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Full Name</Label>
                    <Input
                      required
                      placeholder="Admin Name"
                      value={signUp.fullname}
                      onChange={(e) => setSignUp({ ...signUp, fullname: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-accent focus:ring-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Admin Email</Label>
                    <Input
                      type="email"
                      required
                      placeholder="admin@punongresort.com"
                      value={signUp.email}
                      onChange={(e) => setSignUp({ ...signUp, email: e.target.value })}
                      className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus:border-accent focus:ring-accent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Password</Label>
                    <div className="relative">
                      <Input
                        type={showSignUpPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={signUp.password}
                        onChange={(e) => setSignUp({ ...signUp, password: e.target.value })}
                        className="bg-slate-950 border-slate-800 text-white focus:border-accent focus:ring-accent pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Admin Secret Code</Label>
                    <div className="relative">
                      <Input
                        type={showSecretCode ? "text" : "password"}
                        required
                        placeholder="Enter secret code"
                        value={signUp.secretCode}
                        onChange={(e) => setSignUp({ ...signUp, secretCode: e.target.value })}
                        className="bg-slate-950 border-slate-800 text-white focus:border-accent focus:ring-accent pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretCode(!showSecretCode)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                      >
                        {showSecretCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 mt-4 font-semibold shadow-md cursor-pointer"
                  >
                    {loading ? "Creating Admin..." : "Register Admin"}
                  </Button>
                </form>
              </TabsContent>

              <div className="relative flex py-6 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-wider">
                  System
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <Button
                onClick={handleEnableOfflineMode}
                type="button"
                variant="outline"
                className="w-full border-dashed border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-950/30 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500 cursor-pointer transition-colors"
              >
                <Database className="h-4 w-4 mr-2" />
                Launch Offline Mock Mode
              </Button>
            </div>
          </Tabs>
        </Card>

        <div className="text-center pt-2">
          <Link
            to="/"
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            ← Return to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
}
