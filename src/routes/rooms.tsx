import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search } from "lucide-react";

export const Route = createFileRoute("/rooms")({
  head: () => ({ meta: [{ title: "Rooms & Cottages — Punong Resort" }, { name: "description", content: "Browse rooms, cottages and villas at Punong Resort." }] }),
  component: RoomsPage,
});

function RoomsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").order("price");
      if (error) throw error;
      return data;
    },
  });

  const filtered = rooms.filter(r =>
    (type === "all" || r.type === type) &&
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="bg-[image:var(--gradient-hero)] py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold">Rooms & Cottages</h1>
          <p className="mt-3 text-white/90">Choose your tropical sanctuary</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="room">Rooms</SelectItem>
              <SelectItem value="cottage">Cottages</SelectItem>
              <SelectItem value="villa">Villas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground">Loading rooms…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">No rooms match your filters.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(r => (
              <Card key={r.id} className="group overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:shadow-elegant">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {r.image_url && (
                    <img src={r.image_url} alt={r.name} loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xl font-semibold">{r.name}</h3>
                    <Badge variant={r.is_available ? "default" : "secondary"} className={r.is_available ? "bg-palm text-white" : ""}>
                      {r.is_available ? "Available" : "Full"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                  <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {r.capacity} guests</span>
                    <span className="capitalize">· {r.type}</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <span className="text-2xl font-bold text-primary">₱{Number(r.price).toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground"> / night</span>
                    </div>
                    <Button asChild disabled={!r.is_available} className="bg-accent text-accent-foreground hover:bg-accent/90">
                      <Link to="/book/$roomId" params={{ roomId: r.id }}>Book Now</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
