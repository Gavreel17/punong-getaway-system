import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Bookings — Punong Resort" }] }),
  component: Dashboard,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  approved: "bg-palm/20 text-palm",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-primary/15 text-primary",
};

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings")
        .select("*, room:rooms(name,image_url), payments(id,amount,status,receipt_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">My Bookings</h1>
            <p className="mt-1 text-muted-foreground">Manage your reservations and payments</p>
          </div>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/rooms">New Booking</Link></Button>
        </div>

        {bookings.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No bookings yet.</p>
            <Button asChild className="mt-4"><Link to="/rooms">Browse Rooms</Link></Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {bookings.map(b => (
              <Card key={b.id} className="overflow-hidden p-0">
                <div className="grid gap-0 sm:grid-cols-[160px_1fr]">
                  {b.room?.image_url && <img src={b.room.image_url} alt={b.room.name} className="h-full max-h-40 w-full object-cover sm:max-h-none" />}
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{b.room?.name}</h3>
                        <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {b.guests} guests</p>
                      </div>
                      <Badge className={statusColors[b.status]}>{b.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <p className="text-lg font-bold text-primary">₱{Number(b.total_amount).toLocaleString()}</p>
                      <PaymentSection booking={b} onChange={refetch} />
                    </div>
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

function PaymentSection({ booking, onChange }: { booking: any; onChange: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const payment = booking.payments?.[0];

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !user) return;
    setUploading(true);
    const path = `${user.id}/${booking.id}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("payments").insert({
      booking_id: booking.id, user_id: user.id,
      amount: Number(amount), receipt_url: path, status: "pending",
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    toast.success("Payment receipt uploaded. Awaiting verification.");
    setOpen(false);
    onChange();
  }

  if (payment) {
    return <Badge className={statusColors[payment.status === "verified" ? "approved" : payment.status]}>Payment: {payment.status}</Badge>;
  }

  if (booking.status === "rejected" || booking.status === "cancelled") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Upload className="mr-2 h-4 w-4" />Upload Receipt</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload Payment Receipt</DialogTitle></DialogHeader>
        <form onSubmit={upload} className="space-y-4">
          <div><Label>Amount Paid (₱)</Label><Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div><Label>Receipt Image / PDF</Label><Input type="file" accept="image/*,application/pdf" required onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
          <Button type="submit" disabled={uploading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {uploading ? "Uploading…" : "Submit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
