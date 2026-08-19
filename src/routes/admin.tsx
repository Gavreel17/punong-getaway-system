import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Users,
  CalendarCheck,
  PhilippinePeso,
  Database,
  Key,
  Copy,
  Percent,
  Calendar as CalendarIcon,
  Bed,
  CreditCard,
  LogOut,
  Home,
  Menu,
  X,
  FileText,
  Settings2,
  LayoutDashboard,
  BedDouble,
} from "lucide-react";
import { makeAdmin } from "@/lib/api/example.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Punong Spring Resort" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [makingAdmin, setMakingAdmin] = useState(false);

  const isLoginPage = location.pathname === "/admin/login";

  if (isLoginPage) {
    return <Outlet />;
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/admin/login" });
    } else if (role && role !== "admin") {
      toast.error("Access denied. Redirecting to your dashboard.");
      navigate({ to: "/dashboard" });
    }
  }, [user, role, loading, navigate]);

  const { data: pendingPaymentsCount } = useQuery({
    queryKey: ["pending-payments-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (loading || role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center animate-pulse text-slate-500">
          <Database className="h-8 w-8 mb-4 text-emerald-500" />
          <p>Verifying secure access...</p>
        </div>
      </div>
    );
  }

  const links: { label: string; to: string; icon: any; badge?: number }[] = [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Calendar", to: "/admin/calendar", icon: CalendarIcon },
    { label: "Bookings & Payments", to: "/admin/bookings", icon: CalendarCheck, badge: pendingPaymentsCount },
    { label: "Cancellations", to: "/admin/cancellations", icon: CalendarCheck },
    { label: "Rooms & Cottages", to: "/admin/rooms", icon: BedDouble },
    { label: "Customers", to: "/admin/customers", icon: Users },
    { label: "Reports", to: "/admin/reports", icon: FileText },
  ];

  const currentLink = links.find((link) => location.pathname === link.to) || links[0];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 w-full">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-900 text-slate-100 border-r border-slate-800">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-800 bg-slate-950">
          <img src="/logo.png" alt="Punong Logo" className="h-8 w-8 object-contain rounded-full bg-white/10 p-0.5" />
          <span className="font-display text-lg font-bold tracking-wider text-slate-100">
            Punong Admin
          </span>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-6 justify-between">
          <nav className="space-y-1">
            {links.map((link) => {
              const LinkIcon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-accent text-accent-foreground shadow-md font-semibold"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-4 w-4 shrink-0" />
                    {link.label}
                  </div>
                  {link.badge && link.badge > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-2 pt-6 border-t border-slate-800">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 transition-all"
            >
              <Home className="h-3.5 w-3.5" />
              Back to Public Site
            </Link>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all text-left cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer content */}
          <aside className="relative flex w-64 max-w-xs flex-col bg-slate-900 text-slate-100 border-r border-slate-800 animate-in slide-in-from-left duration-300">
            <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Punong Logo" className="h-8 w-8 object-contain rounded-full bg-white/10 p-0.5" />
                <span className="font-display text-lg font-bold tracking-wider text-slate-100">
                  Punong Admin
                </span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-100 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto px-4 py-6 justify-between">
              <nav className="space-y-1">
                {links.map((link) => {
                  const LinkIcon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-accent text-accent-foreground shadow-md font-semibold"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <LinkIcon className="h-4 w-4 shrink-0" />
                        {link.label}
                      </div>
                      {link.badge && link.badge > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                          {link.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="space-y-2 pt-6 border-t border-slate-800">
                <Link
                  to="/"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 transition-all"
                >
                  <Home className="h-3.5 w-3.5" />
                  Back to Public Site
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all text-left cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-500 hover:text-slate-700 focus:outline-none md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-xl font-bold tracking-tight text-slate-800 capitalize md:ml-0">
              {currentLink.label} Control Panel
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-700">
                {user?.email?.split("@")[0]}
              </span>
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Admin Active
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm border border-slate-300 shadow-inner">
              {user?.email?.[0].toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Display Stats Row only when Calendar or Bookings tabs are active for high visibility */}
            {["/admin/calendar", "/admin/bookings"].includes(location.pathname) && (
              <div className="mb-2">
                <StatsRow />
              </div>
            )}

            {/* The child subpage renders here */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 min-h-[500px]">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatsRow() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const [b, c, r, p] = await Promise.all([
        supabase.from("bookings").select("id,status,total_amount,check_in,check_out,room_id"),
        supabase.from("profiles").select("id"),
        supabase.from("rooms").select("id,is_available,maintenance_start,maintenance_end"),
        supabase.from("payments").select("amount,status"),
      ]);
      const totalRevenue = (p.data ?? [])
        .filter((x: any) => x.status === "verified")
        .reduce((s: number, x: any) => s + Number(x.amount), 0);

      const allRooms = r.data || [];
      const totalRooms = allRooms.length;
      let occupied = 0;

      allRooms.forEach((room: any) => {
        let isOccupied = false;
        if (room.maintenance_start && room.maintenance_end) {
          if (todayStr >= room.maintenance_start && todayStr < room.maintenance_end)
            isOccupied = true;
        }
        if (!isOccupied) {
          const roomBookings = (b.data || []).filter(
            (bk: any) => bk.room_id === room.id && bk.status === "approved",
          );
          for (const bk of roomBookings) {
            if (todayStr >= bk.check_in && todayStr < bk.check_out) {
              isOccupied = true;
              break;
            }
          }
        }
        if (isOccupied) occupied++;
      });

      const occupancyRate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

      return {
        totalBookings: b.data?.length ?? 0,
        customers: c.data?.length ?? 0,
        occupancyRate,
        revenue: totalRevenue,
      };
    },
  });
  const stats = [
    { label: "Total Reservations", value: data?.totalBookings ?? 0, icon: CalendarCheck },
    { label: "Occupancy Rate", value: `${data?.occupancyRate ?? 0}%`, icon: Percent },
    { label: "Customers", value: data?.customers ?? 0, icon: Users },
    {
      label: "Revenue (verified)",
      value: `₱${(data?.revenue ?? 0).toLocaleString()}`,
      icon: PhilippinePeso,
    },
  ];
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
