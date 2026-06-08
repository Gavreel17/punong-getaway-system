import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute('/admin/payments')({
  component: PaymentsTab,
})

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

  async function updateStatus(id: string, status: "pending" | "verified" | "rejected") {
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
    <Card className="overflow-x-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
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
