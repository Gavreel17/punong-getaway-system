import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palmtree } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Punong Resort" }, { name: "description", content: "Sign in or create your Punong Resort account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({ fullname: "", email: "", phone: "", password: "" });

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(signIn);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUp.email,
      password: signUp.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { fullname: signUp.fullname, phone: signUp.phone },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! You can now sign in.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[image:var(--gradient-hero)] p-4">
      <Card className="w-full max-w-md p-8 shadow-elegant">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-display text-2xl font-bold text-primary">
          <Palmtree className="h-7 w-7 text-accent" /> Punong Resort
        </Link>
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={onSignIn} className="space-y-4 pt-4">
              <div><Label>Email</Label><Input type="email" required value={signIn.email} onChange={e => setSignIn({ ...signIn, email: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" required minLength={6} value={signIn.password} onChange={e => setSignIn({ ...signIn, password: e.target.value })} /></div>
              <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={onSignUp} className="space-y-4 pt-4">
              <div><Label>Full Name</Label><Input required value={signUp.fullname} onChange={e => setSignUp({ ...signUp, fullname: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" required value={signUp.email} onChange={e => setSignUp({ ...signUp, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input type="tel" value={signUp.phone} onChange={e => setSignUp({ ...signUp, phone: e.target.value })} /></div>
              <div><Label>Password</Label><Input type="password" required minLength={8} value={signUp.password} onChange={e => setSignUp({ ...signUp, password: e.target.value })} /></div>
              <Button type="submit" disabled={loading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
