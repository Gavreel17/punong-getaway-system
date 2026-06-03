import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Users, BedDouble, CalendarCheck, DollarSign, Plus } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Punong Resort" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (role && role !== "admin") navigate({ to: "/dashboard" });
  }, [user, role, loading, navigate]);

  if (loading || role !== "admin") {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-muted-foreground">Admin access required.</p>
          {role === "customer" && <p className="max-w-md text-xs text-muted-foreground">To grant yourself admin access, open Lovable Cloud and add an <code>admin</code> role to your user in the <code>user_roles</code> table.</p>}
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Manage rooms, bookings, customers and payments</p>

        <StatsRow />

        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings" className="mt-4"><BookingsTab /></TabsContent>
          <TabsContent value="rooms" className="mt-4"><RoomsTab /></TabsContent>
          <TabsContent value="payments" className="mt-4"><PaymentsTab /></TabsContent>
          <TabsContent value="customers" className="mt-4"><CustomersTab /></TabsContent>
        </Tabs>
      </section>
      <Footer />
    </div>
  );
}

function StatsRow() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [b, c, r, p] = await Promise.all([
        supabase.from("bookings").select("id,status,total_amount"),
        supabase.from("profiles").select("id"),
        supabase.from("rooms").select("id,is_available"),
        supabase.from("payments").select("amount,status"),
      ]);
      const totalRevenue = (p.data ?? []).filter(x => x.status === "verified").reduce((s, x) => s + Number(x.amount), 0);
      return {
        totalBookings: b.data?.length ?? 0,
        pendingBookings: b.data?.filter(x => x.status === "pending").length ?? 0,
        customers: c.data?.length ?? 0,
        availableRooms: r.data?.filter(x => x.is_available).length ?? 0,
        revenue: totalRevenue,
      };
    },
  });
  const stats = [
    { label: "Total Reservations", value: data?.totalBookings ?? 0, icon: CalendarCheck },
    { label: "Pending", value: data?.pendingBookings ?? 0, icon: CalendarCheck },
    { label: "Customers", value: data?.customers ?? 0, icon: Users },
    { label: "Available Rooms", value: data?.availableRooms ?? 0, icon: BedDouble },
    { label: "Revenue (verified)", value: `₱${(data?.revenue ?? 0).toLocaleString()}`, icon: DollarSign },
  ];
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map(s => (
        <Card key={s.label} className="p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary p-2 text-primary"><s.icon className="h-5 w-5" /></div>
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

function BookingsTab() {
  const qc = useQueryClient();
  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings")
        .select("*, room:rooms(name), profile:profiles!bookings_user_id_fkey(fullname,email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow><TableHead>Guest</TableHead><TableHead>Room</TableHead><TableHead>Dates</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b: any) => (
            <TableRow key={b.id}>
              <TableCell>
                <div className="font-medium">{b.guest_name}</div>
                <div className="text-xs text-muted-foreground">{b.guest_email}</div>
              </TableCell>
              <TableCell>{b.room?.name}</TableCell>
              <TableCell className="text-sm">{b.check_in} → {b.check_out}</TableCell>
              <TableCell>₱{Number(b.total_amount).toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{b.status}</Badge></TableCell>
              <TableCell className="space-x-2">
                {b.status === "pending" && <>
                  <Button size="sm" onClick={() => updateStatus(b.id, "approved")} className="bg-palm text-white hover:bg-palm/90">Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(b.id, "rejected")}>Reject</Button>
                </>}
                {b.status === "approved" && <Button size="sm" variant="outline" onClick={() => updateStatus(b.id, "completed")}>Mark complete</Button>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function RoomsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const blank = { name: "", type: "room", description: "", price: 0, capacity: 1, image_url: "", is_available: true };
  const [form, setForm] = useState<any>(blank);

  const { data: rooms = [] } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  function openNew() { setEdit(null); setForm(blank); setOpen(true); }
  function openEdit(r: any) { setEdit(r); setForm(r); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price), capacity: Number(form.capacity) };
    const { error } = edit
      ? await supabase.from("rooms").update(payload).eq("id", edit.id)
      : await supabase.from("rooms").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(edit ? "Room updated" : "Room added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-rooms"] });
    qc.invalidateQueries({ queryKey: ["rooms"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this room?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Room deleted");
    qc.invalidateQueries({ queryKey: ["admin-rooms"] });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="mr-2 h-4 w-4" />Add Room</Button>
      </div>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Price</TableHead><TableHead>Capacity</TableHead><TableHead>Available</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {rooms.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="capitalize">{r.type}</TableCell>
                <TableCell>₱{Number(r.price).toLocaleString()}</TableCell>
                <TableCell>{r.capacity}</TableCell>
                <TableCell>{r.is_available ? "Yes" : "No"}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit ? "Edit Room" : "Add Room"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="grid gap-3">
            <div><Label>Name</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="cottage">Cottage</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Capacity</Label><Input type="number" min={1} required value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
            </div>
            <div><Label>Price (₱ / night)</Label><Input type="number" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
            <div><Label>Image URL</Label><Input value={form.image_url ?? ""} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://… or /src/assets/…" /></div>
            <div><Label>Description</Label><Textarea required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_available} onChange={e => setForm({ ...form, is_available: e.target.checked })} />
              Available for booking
            </label>
            <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">{edit ? "Save changes" : "Add room"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentsTab() {
  const qc = useQueryClient();
  const { data: payments = [] } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payments")
        .select("*, booking:bookings(guest_name, room:rooms(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("payments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Payment updated");
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  async function viewReceipt(path: string) {
    const { data } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Guest</TableHead><TableHead>Room</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {payments.map((p: any) => (
            <TableRow key={p.id}>
              <TableCell>{p.booking?.guest_name}</TableCell>
              <TableCell>{p.booking?.room?.name}</TableCell>
              <TableCell>₱{Number(p.amount).toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline" className="capitalize">{p.status}</Badge></TableCell>
              <TableCell className="space-x-2">
                {p.receipt_url && <Button size="sm" variant="outline" onClick={() => viewReceipt(p.receipt_url)}>View receipt</Button>}
                {p.status === "pending" && <>
                  <Button size="sm" onClick={() => updateStatus(p.id, "verified")} className="bg-palm text-white hover:bg-palm/90">Verify</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(p.id, "rejected")}>Reject</Button>
                </>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function CustomersTab() {
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
        <TableBody>
          {customers.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.fullname}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.phone ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
