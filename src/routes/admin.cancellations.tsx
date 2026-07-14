import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Search, Info, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/cancellations")({
  component: CancellationsTab,
});

function CancellationsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-cancellations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, room:rooms(name), profile:profiles!bookings_user_id_fkey(fullname,email), payments(id, amount, status, notes, receipt_url)")
        .eq("status", "cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredBookings = useMemo(() => {
    return bookings.filter((b: any) => {
      let notes: any = {};
      const p = b.payments?.[0];
      try { if (p?.notes) notes = JSON.parse(p.notes); } catch(e){}

      // 1. Search Filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const guestMatch = b.guest_name?.toLowerCase().includes(term);
        const idMatch = b.id?.toLowerCase().includes(term);
        const reasonMatch = notes.cancellation_reason?.toLowerCase().includes(term);
        if (!guestMatch && !idMatch && !reasonMatch) return false;
      }

      return true;
    });
  }, [bookings, searchTerm]);



  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Cancellations</h2>
          <p className="text-sm text-muted-foreground">Manage cancelled bookings.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Name, ID, Reason..."
              className="pl-9 h-9 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <Card className="overflow-x-auto shadow-sm border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-700">Customer</TableHead>
              <TableHead className="font-bold text-slate-700">Room & Dates</TableHead>
              <TableHead className="font-bold text-slate-700">Cancellation Info</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-slate-500">
                  No cancellations found matching your criteria.
                </TableCell>
              </TableRow>
            ) : filteredBookings.map((b: any) => {
              const p = b.payments?.[0];
              let notes: any = {};
              try { if (p?.notes) notes = JSON.parse(p.notes); } catch (e) {}

              const isGcash = notes.method === "gcash";

              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{b.guest_name}</div>
                    <div className="text-xs text-slate-500">ID: {b.id.split("-")[0]}</div>
                    <div className="text-xs text-slate-500">{b.guest_email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.room?.name}</div>
                    <div className="text-xs text-slate-600">{b.check_in} to {b.check_out}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-slate-800">{notes.cancellation_reason || "No Reason Given"}</div>
                    <div className="text-[10px] text-slate-500">
                      {notes.cancellation_date ? new Date(notes.cancellation_date).toLocaleString() : "Unknown date"}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
