import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/receipt/$bookingId")({
  component: ReceiptPage,
});

function ReceiptPage() {
  const { bookingId } = Route.useParams();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking-receipt", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, room:rooms(*), profile:profiles!bookings_user_id_fkey(*), payments(*)")
        .eq("id", bookingId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="p-8 text-center">Loading receipt...</div>;
  }

  if (!booking) {
    return <div className="p-8 text-center text-red-500">Booking not found.</div>;
  }

  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const payment = booking.payments?.[0];
  let notes: any = {};
  if (payment?.notes) {
    try { notes = JSON.parse(payment.notes); } catch (e) {}
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 print:bg-white print:py-0 print:px-0">
      <div className="max-w-2xl mx-auto">
        
        {/* Controls - Hidden when printing */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="outline" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
            <Printer className="w-4 h-4 mr-2" /> Download and Print
          </Button>
        </div>

        {/* Printable Area */}
        <div ref={receiptRef} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
          
          <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Punong Spring Resort</h1>
              <p className="text-slate-500 mt-1">Official Booking Receipt</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800">RECEIPT</div>
              <div className="text-sm text-slate-500 mt-1">#{booking.id.split("-")[0].toUpperCase()}</div>
              <div className="text-sm text-slate-500">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Guest Details</h3>
              <p className="font-semibold text-slate-800">{booking.guest_name}</p>
              <p className="text-sm text-slate-600">{booking.guest_email}</p>
              <p className="text-sm text-slate-600">{booking.guest_phone}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Booking Status</h3>
              <p className="font-semibold text-slate-800 capitalize">{booking.status}</p>
              {payment?.status === "verified" ? (
                <p className="text-sm text-green-600 font-semibold mt-1">PAID</p>
              ) : (
                <p className="text-sm text-amber-600 font-semibold mt-1">
                  {payment?.status === "pending" ? "PAYMENT PENDING VERIFICATION" : "UNPAID"}
                </p>
              )}
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-4">
                  <p className="font-semibold text-slate-800">{booking.room?.name}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Check-in: {new Date(booking.check_in).toLocaleDateString()}
                    <br />
                    Check-out: {new Date(booking.check_out).toLocaleDateString()}
                    <br />
                    Guests: {booking.guests}
                  </p>
                </td>
                <td className="py-4 text-right font-medium text-slate-800 align-top">
                  ₱{Number(booking.total_amount).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between items-center py-2 border-b border-slate-200 font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">₱{Number(booking.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 text-sm text-slate-500 text-center">
            <p>Thank you for choosing Punong Spring Resort!</p>
            <p className="mt-1">For questions about your booking, please contact our support.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
