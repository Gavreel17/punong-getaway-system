import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Upload, Eye, AlertCircle, RefreshCw, Star } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My Bookings — Punong Spring Resort" }] }),
  component: Dashboard,
});

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  approved: "bg-palm/20 text-palm",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-primary/15 text-primary",
  "no-show": "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  refund_pending: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  refunded: "bg-green-500/15 text-green-700 dark:text-green-300",
  "non-refundable": "bg-red-500/15 text-red-700 dark:text-red-300",
};

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelData, setCancelData] = useState<{ id: string, payment: any } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [feedbackData, setFeedbackData] = useState<{ id: string } | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<string>("5");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackData || !user) return;
    setSubmittingFeedback(true);
    
    const { error } = await supabase.from("feedbacks").insert({
      booking_id: feedbackData.id,
      user_id: user.id,
      rating: parseInt(feedbackRating),
      comment: feedbackComment,
    });

    setSubmittingFeedback(false);
    if (error) return toast.error(error.message);

    toast.success("Feedback submitted successfully. Thank you!");
    setFeedbackData(null);
    setFeedbackRating("5");
    setFeedbackComment("");
    queryClient.invalidateQueries({ queryKey: ["approved-feedbacks"] });
    refetch();
  }


  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, room:rooms(name,type,image_url), payments(id,amount,status,receipt_url,notes), feedbacks(id,rating,comment)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const today = new Date().toISOString().split("T")[0];
      const pastBookings = data?.filter((b: any) => b.status === "approved" && b.check_out < today);
      if (pastBookings && pastBookings.length > 0) {
        for (const b of pastBookings) {
          await supabase.from("bookings").update({ status: "completed" }).eq("id", b.id);
          b.status = "completed";
        }
      }

      return data;
    },
  });

  async function handleCancel() {
    if (!cancelData || !cancelReason) return;
    
    const { error: bErr } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", cancelData.id);
    if (bErr) return toast.error(bErr.message);

    const payment = cancelData.payment;
    if (payment) {
        let parsedNotes: any = {};
        try { parsedNotes = JSON.parse(payment.notes); } catch(e){}

        parsedNotes.cancellation_reason = cancelReason;
        parsedNotes.cancellation_date = new Date().toISOString();

        let newPaymentStatus = payment.status;
        if (parsedNotes.method === "resort") {
            newPaymentStatus = "unpaid";
        } else if (parsedNotes.method === "gcash") {
            newPaymentStatus = "refund_pending";
        }

        await supabase.from("payments").update({
            status: newPaymentStatus,
            notes: JSON.stringify(parsedNotes)
        }).eq("id", payment.id);
    }

    toast.success("Booking cancelled successfully.");
    setCancelData(null);
    setCancelReason("");
    refetch();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <section className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="mt-1 text-muted-foreground">Manage your reservations and payments</p>
          </div>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm">
            <Link to="/rooms">New Booking</Link>
          </Button>
        </div>

        {bookings.length === 0 ? (
          <Card className="p-12 text-center shadow-sm border-slate-200">
            <p className="text-muted-foreground">No bookings yet.</p>
            <Button asChild className="mt-4 shadow-sm">
              <Link to="/rooms">Browse Rooms</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            {bookings.map((b: any) => (
              <Card key={b.id} className="overflow-hidden p-0 shadow-sm border-slate-200 transition-all hover:shadow-md">
                <div className="grid gap-0 sm:grid-cols-[200px_1fr]">
                  {b.room?.image_url ? (
                    <img
                      src={b.room.image_url}
                      alt={b.room.name}
                      className="h-full max-h-48 w-full object-cover sm:max-h-none"
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-200 flex items-center justify-center text-slate-400">
                      No Image
                    </div>
                  )}
                  <div className="flex flex-col p-6">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">
                          {b.room?.name}{" "}
                          <span className="text-xs text-muted-foreground uppercase tracking-wider ml-2 px-2 py-1 bg-slate-100 rounded-full font-semibold">
                            {b.room?.type}
                          </span>
                        </h3>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                          {b.check_in} → {b.check_out} · {b.guests} guests
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={statusColors[b.status]}>Booking: {b.status}</Badge>
                      </div>
                    </div>

                    <div className="grid gap-1 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-800 mb-1">Guest Details</div>
                      <div>Name: <span className="text-slate-900 font-medium">{b.guest_name}</span></div>
                      <div>Contact: <span className="text-slate-900 font-medium">{b.guest_email} • {b.guest_phone}</span></div>
                    </div>

                      <div className="mt-auto pt-6 flex flex-wrap items-end justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Total Amount</p>
                          <p className="text-2xl font-black text-primary">
                            ₱{Number(b.total_amount).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <PaymentSection booking={b} onChange={refetch} />
                          {(b.status !== "cancelled" && b.status !== "rejected") && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-destructive border-destructive hover:bg-destructive/10"
                              onClick={() => setCancelData({ id: b.id, payment: b.payments?.[0] })}
                            >
                              Cancel Booking
                            </Button>
                          )}
                          {(!b.feedbacks || b.feedbacks.length === 0) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary border-primary hover:bg-primary/10"
                              onClick={() => setFeedbackData({ id: b.id })}
                            >
                              Leave Feedback
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-slate-600 border-slate-300 hover:bg-slate-100"
                            asChild
                          >
                            <Link to="/receipt/$bookingId" params={{ bookingId: b.id }}>
                              Download and Print
                            </Link>
                          </Button>
                        </div>
                      </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!cancelData} onOpenChange={(o) => !o && setCancelData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Cancellation</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Change of Plans">Change of Plans</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                  <SelectItem value="Wrong Booking Details">Wrong Booking Details</SelectItem>
                  <SelectItem value="Financial Reasons">Financial Reasons</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800">
              Are you sure you want to cancel this booking? This action cannot be undone. 
              {cancelData?.payment?.notes?.includes("gcash") && " For GCash payments, refunds are subject to admin approval."}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelData(null)}>Keep Booking</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason}>Confirm Cancellation</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!feedbackData} onOpenChange={(o) => !o && setFeedbackData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select value={feedbackRating} onValueChange={setFeedbackRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="3">3 - Average</SelectItem>
                  <SelectItem value="2">2 - Poor</SelectItem>
                  <SelectItem value="1">1 - Terrible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Input
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Tell us about your stay..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFeedbackData(null)}>Cancel</Button>
              <Button type="submit" disabled={submittingFeedback}>
                {submittingFeedback ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function PaymentSection({ booking, onChange }: { booking: any; onChange: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const payment = booking.payments?.[0];
  let parsedNotes: any = {};
  if (payment?.notes) {
    try {
      parsedNotes = JSON.parse(payment.notes);
    } catch (e) {}
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !user) return;
    setUploading(true);
    
    // Upload receipt
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const { error: upErr } = await supabase.storage.from("receipts").upload(fileName, file, { upsert: false });
    
    if (upErr) {
      setUploading(false);
      return toast.error("Failed to upload: " + upErr.message);
    }
    
    const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(fileName);

    const notesPayload = JSON.stringify({
      method: "gcash",
      reference_number: paymentRef,
      remarks: "Re-uploaded receipt",
    });

    // We can update the existing payment record or insert a new one if it didn't exist
    if (payment?.id) {
      const { error } = await supabase.from("payments").update({
        amount: Number(amount),
        receipt_url: urlData.publicUrl,
        status: "pending",
        notes: notesPayload
      }).eq("id", payment.id);
      
      setUploading(false);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("payments").insert({
        booking_id: booking.id,
        user_id: user.id,
        amount: Number(amount),
        receipt_url: urlData.publicUrl,
        status: "pending",
        notes: notesPayload
      });
      setUploading(false);
      if (error) return toast.error(error.message);
    }

    toast.success("Payment receipt uploaded. Awaiting verification.");
    setOpen(false);
    onChange();
  }

  if (!payment) {
    // Old bookings with no payment record
    if (booking.status === "rejected" || booking.status === "cancelled") return null;
    return (
      <Badge variant="outline" className="bg-slate-100 text-slate-500 px-3 py-1">
        Legacy Booking (No Payment Data)
      </Badge>
    );
  }

  const isResort = parsedNotes.method === "resort";
  const isGcash = parsedNotes.method === "gcash";

  return (
    <div className="flex flex-col items-end gap-2 text-right">
      <div className="flex items-center gap-2">
        {isResort && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
            Method: Pay at Resort
          </Badge>
        )}
        {isGcash && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
            Method: GCash
          </Badge>
        )}
        
        {isResort && payment.status !== "verified" && (
          <Badge className="bg-yellow-500/15 text-yellow-700">Payment: Unpaid</Badge>
        )}
        {isResort && payment.status === "verified" && (
          <Badge className="bg-palm/20 text-palm">Payment: Paid</Badge>
        )}
        
        {isGcash && (
          <Badge className={statusColors[payment.status === "verified" ? "approved" : payment.status]}>
            Payment: {payment.status === "pending" ? "Pending Verification" : payment.status}
          </Badge>
        )}
      </div>

      {isGcash && payment.status === "rejected" && parsedNotes.remarks && (
        <div className="text-sm text-destructive flex items-center gap-1 mt-1 bg-destructive/10 px-3 py-1.5 rounded-md">
          <AlertCircle className="w-4 h-4" />
          Reason: {parsedNotes.remarks}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        {payment.receipt_url && (
          <Button size="sm" variant="outline" asChild>
            <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-2 h-4 w-4" /> View Receipt
            </a>
          </Button>
        )}

        {isGcash && payment.status === "rejected" && booking.status !== "no-show" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" className="bg-destructive hover:bg-destructive/90 text-white">
                <RefreshCw className="mr-2 h-4 w-4" /> Re-upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Re-upload Payment Receipt</DialogTitle>
              </DialogHeader>
              <form onSubmit={upload} className="space-y-4">
                <div>
                  <Label>GCash Reference Number</Label>
                  <Input
                    required
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Amount Paid (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Receipt Image (JPG/PNG)</Label>
                  <Input
                    type="file"
                    accept="image/jpeg, image/jpg, image/png"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={uploading}
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {uploading ? "Uploading…" : "Submit"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
