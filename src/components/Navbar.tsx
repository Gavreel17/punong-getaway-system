import { Link, useNavigate } from "@tanstack/react-router";
import { Palmtree, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: "/", label: "Home" },
    { to: "/rooms", label: "Rooms & Cottages" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <Palmtree className="h-6 w-6 text-accent" />
          Punong Resort
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
              activeProps={{ className: "text-primary" }}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {role === "admin" && (
                <Button variant="outline" size="sm" onClick={() => navigate({ to: "/admin" })}>Admin</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>My Bookings</Button>
              <Button variant="outline" size="sm" onClick={() => signOut()}>Sign out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth" })}>Sign in</Button>
              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate({ to: "/rooms" })}>Book Now</Button>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="container mx-auto flex flex-col gap-2 px-4 py-4">
            {links.map(l => (
              <Link key={l.to} to={l.to} className="py-2 text-sm font-medium" onClick={() => setOpen(false)}>{l.label}</Link>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              {user ? (
                <>
                  {role === "admin" && <Button variant="outline" onClick={() => { navigate({ to: "/admin" }); setOpen(false); }}>Admin</Button>}
                  <Button variant="ghost" onClick={() => { navigate({ to: "/dashboard" }); setOpen(false); }}>My Bookings</Button>
                  <Button variant="outline" onClick={() => { signOut(); setOpen(false); }}>Sign out</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => { navigate({ to: "/auth" }); setOpen(false); }}>Sign in</Button>
                  <Button className="bg-accent text-accent-foreground" onClick={() => { navigate({ to: "/rooms" }); setOpen(false); }}>Book Now</Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
