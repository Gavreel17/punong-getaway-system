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
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Eye, CheckCircle2, XCircle, Banknote, CreditCard, Search, CalendarClock, Trash2, Printer, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { processAutoBookingStatuses } from "@/lib/booking-utils";

const MySwal = withReactContent(Swal);

export const Route = createFileRoute("/admin/bookings")({
  component: BookingsTab,
});

function BookingsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: bookings = [] } = useQuery({
    queryKey: ["admin-bookings-unified"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, room:rooms(name), profile:profiles!bookings_user_id_fkey(fullname,email), payments(id, amount, status, notes, receipt_url)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      if (data) {
        await processAutoBookingStatuses(data);
      }

      return data;
    },
  });

  const filteredBookings = useMemo(() => {
    return bookings.filter((b: any) => {
      let notes: any = {};
      const p = b.payments?.[0];
      try { if (p?.notes) notes = JSON.parse(p.notes); } catch(e){}

      // 1. Status Filter
      if (statusFilter !== "all") {

        if (statusFilter === "pending-booking" && b.status !== "pending") return false;
        if (statusFilter === "approved" && b.status !== "approved") return false;
        if (statusFilter === "completed" && b.status !== "completed") return false;
        if (statusFilter === "no-show" && b.status !== "no-show") return false;
        if (statusFilter === "cancelled" && b.status !== "cancelled" && b.status !== "rejected") return false;
      }

      // 2. Search Filter (Customer Name, Booking ID, Ref Number)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const guestMatch = b.guest_name?.toLowerCase().includes(term);
        const idMatch = b.id?.toLowerCase().includes(term);
        if (!guestMatch && !idMatch) return false;
      }

      return true;
    });
  }, [bookings, searchTerm, statusFilter]);

  async function updateBookingStatus(
    id: string,
    status: "pending" | "approved" | "rejected" | "cancelled" | "completed" | "no-show",
  ) {
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: `Do you want to mark this booking as ${status}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, proceed!",
    });

    if (!result.isConfirmed) return;

    const { data: updatedBooking, error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", id)
      .select("*, room:rooms(name, type)")
      .single();
    if (error) return MySwal.fire("Error!", error.message, "error");

    // Trigger status update email notification
    if (updatedBooking) {
      toast.info("Sending email notification...");
      supabase.functions
        .invoke("booking-emails", {
          body: { emailType: "status_update", bookingData: updatedBooking },
        })
        .then((res: { error: Error | null }) => {
          if (res.error) toast.error("Email failed to send: " + res.error.message);
          else toast.success("Email notification sent successfully!");
        })
        .catch((err: Error) => toast.error("Email system error: " + err.message));
    }

    MySwal.fire("Updated!", `Booking has been ${status}.`, "success");
    qc.invalidateQueries({ queryKey: ["admin-bookings-unified"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-availability-calendar"] });
    qc.invalidateQueries({ queryKey: ["pending-payments-count"] });
  }

  async function updatePaymentStatus(bookingId: string, userId: string, paymentId: string | undefined, status: string, totalAmount: number) {
    if (paymentId) {
      const { error } = await supabase.from("payments").update({ status }).eq("id", paymentId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("payments").insert({
        booking_id: bookingId,
        user_id: userId,
        amount: totalAmount,
        status,
        notes: JSON.stringify({ method: "resort" })
      });
      if (error) return toast.error(error.message);
    }

    const { data: b } = await supabase.from("bookings").select("status, check_out").eq("id", bookingId).single();
    if (b && b.status === "no-show" && status === "verified") {
      const today = new Date().toISOString().split("T")[0];
      const newStatus = b.check_out <= today ? "completed" : "approved";
      await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
    }

    toast.success(`Payment marked as ${status}`);
    qc.invalidateQueries({ queryKey: ["admin-bookings-unified"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-availability-calendar"] });
  }


  async function undoPaymentStatus(bookingId: string, paymentId: string, currentStatus: string) {
    if (!user) return;
    const result = await MySwal.fire({
      title: "Undo Payment?",
      text: "Are you sure you want to revert this payment to Unpaid?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, revert to Unpaid",
    });

    if (!result.isConfirmed) return;

    let adminName = "Admin";
    try {
      const { data: profile } = await supabase.from("profiles").select("fullname").eq("id", user.id).single();
      if (profile && profile.fullname) adminName = profile.fullname;
    } catch(e){}

    const { error: pErr } = await supabase.from("payments").update({ status: "unpaid" }).eq("id", paymentId);
    if (pErr) return toast.error(pErr.message);

    const { error: aErr } = await supabase.from("payment_audit_logs").insert({
      payment_id: paymentId,
      booking_id: bookingId,
      admin_id: user.id,
      admin_name: adminName,
      previous_status: currentStatus,
      new_status: "unpaid"
    });
    if (aErr) console.warn("Audit log failed (table might not exist):", aErr.message);

    const { error: bErr } = await supabase.from("bookings").update({ status: "approved" }).eq("id", bookingId);
    if (bErr) return toast.error(bErr.message);

    MySwal.fire("Reverted!", "Payment status has been reverted to Unpaid.", "success");
    qc.invalidateQueries({ queryKey: ["admin-bookings-unified"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  async function markNoShow(bookingId: string, paymentId?: string, isResort?: boolean) {
    const result = await MySwal.fire({
      title: "Mark as No-Show?",
      text: "The guest failed to arrive. Do you want to mark this reservation as No-Show?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, mark No-Show!",
    });

    if (!result.isConfirmed) return;

    // Update booking status
    const { error: bErr } = await supabase.from("bookings").update({ status: "no-show" }).eq("id", bookingId);
    if (bErr) return toast.error(bErr.message);

    // If pay-at-resort, ensure payment record is marked as unpaid
    if (paymentId && isResort) {
      await supabase.from("payments").update({ status: "unpaid" }).eq("id", paymentId);
    }

    MySwal.fire("Updated!", "Booking has been marked as No-Show.", "success");
    qc.invalidateQueries({ queryKey: ["admin-bookings-unified"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-availability-calendar"] });
  }


  async function deleteBooking(id: string) {
    const result = await MySwal.fire({
      title: "Move to Recently Deleted?",
      text: "You can restore this later from the Reports dashboard.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("bookings").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) return MySwal.fire("Error!", error.message, "error");

    MySwal.fire("Deleted!", "Booking has been deleted.", "success");
    qc.invalidateQueries({ queryKey: ["admin-bookings-unified"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["admin-availability-calendar"] });
    qc.invalidateQueries({ queryKey: ["reports-bookings-all"] });
  }

  async function viewReceipt(urlOrPath: string) {
    if (urlOrPath.startsWith("http")) {
      window.open(urlOrPath, "_blank");
    } else {
      const { data } = await supabase.storage.from("receipts").createSignedUrl(urlOrPath, 60);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Unified Bookings & Payments Dashboard</h2>
          <p className="text-sm text-muted-foreground">Manage reservations, verify GCash receipts, and track payment statuses in one place.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Name, Booking ID, Ref No..."
              className="pl-9 h-9 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="approved">Approved Bookings</SelectItem>
              <SelectItem value="completed">Completed Bookings</SelectItem>
              <SelectItem value="no-show">No-Show Bookings</SelectItem>
              <SelectItem value="cancelled">Cancelled/Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Card className="overflow-x-auto shadow-sm border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-700">Booking / Guest</TableHead>
              <TableHead className="font-bold text-slate-700">Room & Dates</TableHead>
              <TableHead className="font-bold text-slate-700">Amount</TableHead>
              <TableHead className="font-bold text-slate-700">Payment Info</TableHead>
              <TableHead className="font-bold text-slate-700">Statuses</TableHead>
              <TableHead className="font-bold text-slate-700 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  No bookings found matching your criteria.
                </TableCell>
              </TableRow>
            ) : filteredBookings.map((b: any) => {
              const p = b.payments?.[0];
              let notes: any = {};
              try { if (p?.notes) notes = JSON.parse(p.notes); } catch (e) {}

              const isGcash = notes.method === "gcash";
              const isResort = notes.method === "resort";

              // Format customer payment date
              let formattedDate = "—";
              if (notes.payment_date && notes.payment_time) {
                formattedDate = `${notes.payment_date} ${notes.payment_time}`;
              } else if (notes.payment_date) {
                formattedDate = notes.payment_date;
              }

              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium text-slate-900">{b.guest_name}</div>
                    <div className="text-xs text-slate-500">ID: {b.id.split("-")[0]}</div>
                    <div className="text-xs text-slate-500">{b.guest_email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{b.room?.name}</div>
                    <div className="text-xs text-slate-600">{b.check_in} <span className="text-slate-400">to</span> {b.check_out}</div>
                  </TableCell>
                  <TableCell className="font-medium text-primary">
                    ₱{Number(b.total_amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {isResort ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <Banknote className="w-3 h-3 mr-1" /> Pay at Resort
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">Legacy / Unknown</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-y-2">
                    <div className="flex flex-col gap-1 items-start">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payment</div>
                      <Badge 
                        className={
                          p?.status === "verified" ? "bg-palm/20 text-palm" :
                          p?.status === "rejected" ? "bg-destructive/15 text-destructive" :
                          "bg-yellow-500/15 text-yellow-700"
                        }
                      >
                        {p?.status === "pending" ? "Pending Verify" : (p?.status || "Unpaid")}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-1 items-start">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Booking</div>
                      <Badge variant={b.status === "approved" || b.status === "completed" ? "default" : "secondary"} className="capitalize">
                        {b.status}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-end gap-2 min-w-[120px]">
                      {p?.receipt_url && (
                        <Button size="sm" variant="outline" onClick={() => viewReceipt(p.receipt_url)} className="w-full h-7 text-xs">
                          <Eye className="w-3 h-3 mr-1" /> Receipt
                        </Button>
                      )}
                      
                      {b.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateBookingStatus(b.id, "approved")}
                            className="bg-palm text-white hover:bg-palm/90 h-7 text-xs shadow-sm w-full"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateBookingStatus(b.id, "rejected")}
                            className="h-7 text-xs w-full"
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}

                      {(b.status === "approved" || b.status === "completed" || b.status === "no-show") && (
                        <>
                          {(!p || p.status !== "verified") && (
                            <Button
                              size="sm"
                              onClick={() => updatePaymentStatus(b.id, b.user_id, p?.id, "verified", b.total_amount)}
                              className="bg-blue-600 text-white hover:bg-blue-700 h-7 text-xs shadow-sm w-full mb-2"
                            >
                              <Banknote className="w-3 h-3 mr-1" /> Mark Paid
                            </Button>
                          )}

                          {(p && p.status === "verified") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => undoPaymentStatus(b.id, p.id, p.status)}
                              className="h-7 text-xs border-orange-500 text-orange-600 hover:bg-orange-50 w-full mb-2"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Undo Payment
                            </Button>
                          )}

                          {b.status !== "completed" && b.status !== "no-show" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingStatus(b.id, "completed")}
                              className="h-7 text-xs border-primary text-primary hover:bg-primary/5 w-full mb-2"
                            >
                              Mark Complete
                            </Button>
                          )}
                          {b.status !== "completed" && b.status !== "no-show" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markNoShow(b.id, p?.id, isResort)}
                              className="h-7 text-xs border-orange-500 text-orange-600 hover:bg-orange-50 w-full mb-2"
                            >
                              Mark No-Show
                            </Button>
                          )}

                        </>
                      )}
                      
                      
                      <Button size="icon" variant="ghost" onClick={() => deleteBooking(b.id)} className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-destructive/10 self-end mt-1">
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
