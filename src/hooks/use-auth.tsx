import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "customer";

interface AuthCtx {
  user: any | null;
  session: any | null;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, role: null, loading: true, signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt: string, s: any) => {
      setSession(s);
      if (s?.user) {
        // Fetch role from localStorage mock DB
        setTimeout(async () => {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", s.user.id);
          const roles = (data as any[])?.map((r: any) => r.role) ?? [];
          setRole(roles.includes("admin") ? "admin" : "customer");
          setLoading(false);
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data.session);
      if (data.session?.user) {
        supabase.from("user_roles").select("role").eq("user_id", data.session.user.id).then(({ data: r }: any) => {
          const roles = (r as any[])?.map((x: any) => x.role) ?? [];
          setRole(roles.includes("admin") ? "admin" : "customer");
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session, role, loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
