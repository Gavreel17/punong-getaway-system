import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/book/$roomId")({
  head: () => ({ meta: [{ title: "Book your stay — Punong Resort" }] }),
  component: BookPage,
});

function BookPage() {
  const { roomId } = useParams({ from: "/book/$roomId" });
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    fullname: "", email: "", phone: "", check_in: "", check_out: "", guests: 1, special_requests: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  const { data: room } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (user) supabase.from("profiles").select("fullname,email,phone").eq("id", user.id).single()
      .then(({ data }) => data && setForm(f => ({ ...f, fullname: data.fullname ?? "", email: data.email ?? "", phone: data.phone ?? "" })));
  }, [user]);

  const nights = form.check_in && form.check_out
    ? Math.max(0, Math.round((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 86400000))
    : 0;
  const total = room ? Number(room.price) * nights : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !room) return;
    if (nights <= 0) return toast.error("Check-out must be after check-in");
    if (form.guests > room.capacity) return toast.error(`Maximum ${room.capacity} guests for this room`);

    setSubmitting(true);
    // Conflict check
    const { data: conflicts } = await supabase
      .from("bookings").select("id")
      .eq("room_id", room.id)
      .in("status", ["pending", "approved"])
      .lt("check_in", form.check_out)
      .gt("check_out", form.check_in);

    if (conflicts && conflicts.length > 0) {
      setSubmitting(false);
      return toast.error("Those dates are already booked. Please pick different dates.");
    }

    const { error } = await supabase.from("bookings").insert({
      user_id: user.id, room_id: room.id,
      guest_name: form.fullname, guest_email: form.email, guest_phone: form.phone,
      check_in: form.check_in, check_out: form.check_out, guests: form.guests,
      total_amount: total, special_requests: form.special_requests || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Booking submitted! View it in your dashboard.");
    navigate({ to: "/dashboard" });
  }

  if (authLoading || !room) return <div className="flex min-h-screen items-center justify-center">Loading…</div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-[1fr_360px]">
        <Card className="p-6 md:p-8">
          <h1 className="text-3xl font-bold">Reserve {room.name}</h1>
          <p className="mt-2 text-muted-foreground">{room.description}</p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Full Name</Label><Input required value={form.fullname} onChange={e => setForm({ ...form, fullname: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Guests</Label><Input type="number" min={1} max={room.capacity} required value={form.guests} onChange={e => setForm({ ...form, guests: Number(e.target.value) })} /></div>
              <div><Label>Check-in</Label><Input type="date" required min={new Date().toISOString().slice(0,10)} value={form.check_in} onChange={e => setForm({ ...form, check_in: e.target.value })} /></div>
              <div><Label>Check-out</Label><Input type="date" required min={form.check_in || new Date().toISOString().slice(0,10)} value={form.check_out} onChange={e => setForm({ ...form, check_out: e.target.value })} /></div>
            </div>
            <div>
              <Label>Special Requests</Label>
              <Textarea rows={3} value={form.special_requests} onChange={e => setForm({ ...form, special_requests: e.target.value })} placeholder="Anything we should know?" />
            </div>
            <Button type="submit" disabled={submitting} size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              {submitting ? "Submitting…" : "Confirm Reservation"}
            </Button>
          </form>
        </Card>

        <Card className="h-fit p-6">
          {room.image_url && <img src={room.image_url} alt={room.name} className="mb-4 aspect-[4/3] w-full rounded-lg object-cover" />}
          <h3 className="font-semibold">{room.name}</h3>
          <p className="text-sm text-muted-foreground capitalize">{room.type} · up to {room.capacity} guests</p>
          <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><span>Rate</span><span>₱{Number(room.price).toLocaleString()} / night</span></div>
            <div className="flex justify-between"><span>Nights</span><span>{nights}</span></div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border"><span>Total</span><span className="text-primary">₱{total.toLocaleString()}</span></div>
          </div>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
