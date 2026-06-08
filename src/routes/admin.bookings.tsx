import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute('/admin/bookings')({
  component: BookingsTab,
})

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

  async function updateStatus(id: string, status: "pending" | "approved" | "rejected" | "cancelled" | "completed") {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-availability-calendar"] });
  }

  return (
    <Card className="overflow-x-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
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
