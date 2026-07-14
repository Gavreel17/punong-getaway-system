import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { z } from "zod";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { AlertCircle, Banknote } from "lucide-react";
import { DayButton } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const MySwal = withReactContent(Swal);

export const Route = createFileRoute("/book/$roomId")({
  head: () => ({ meta: [{ title: "Book your stay — Punong Spring Resort" }] }),
  validateSearch: z.object({
    check_in: z.string().optional(),
    check_out: z.string().optional(),
  }),
  component: BookPage,
});

function BookPage() {
  const { roomId } = useParams({ from: "/book/$roomId" });
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    fullname: "",
    email: "",
    phone: "",
    check_in: searchParams.check_in || "",
    check_out: searchParams.check_out || "",
    guests: 1,
  });



  const [submitting, setSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [guestExceeded, setGuestExceeded] = useState(false);

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

  const maxCapacity = (() => {
    if (!room?.capacity) return undefined;
    const nums = String(room.capacity).match(/\d+/g);
    if (!nums || nums.length === 0) return undefined;
    return Math.max(...nums.map(Number));
  })();

  const { data: bookings } = useQuery({
    queryKey: ["room-bookings", roomId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("room_id", roomId);
      if (error) throw error;
      return data;
    },
  });

  const { data: blocks } = useQuery({
    queryKey: ["resort-blocks"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("resort_blocks" as any).select("*");
        return (data || []) as any[];
      } catch (e) {
        return [] as any[];
      }
    },
  });

  useEffect(() => {
    if (user)
      supabase
        .from("profiles")
        .select("fullname,email,phone")
        .eq("id", user.id)
        .single()
        .then(
          ({ data }: any) =>
            data &&
            setForm((f) => ({
              ...f,
              fullname: data.fullname ?? "",
              email: data.email ?? "",
              phone: data.phone ?? "",
            })),
        );
  }, [user]);

  useEffect(() => {
    if (form.check_in && form.check_out) {
      const start = new Date(form.check_in + "T00:00:00").getTime();
      const end = new Date(form.check_out + "T00:00:00").getTime();
      let hasConflict = false;
      let conflictReason =
        "Sorry, this room/cottage is already booked for the selected dates. Please choose another date.";

      if (start > end) {
        setConflictWarning("Check-out cannot be before check-in.");
        return;
      }

      if (room?.maintenance_start && room?.maintenance_end) {
        const mStart = new Date(room.maintenance_start + "T00:00:00").getTime();
        const mEnd = new Date(room.maintenance_end + "T00:00:00").getTime();
        if (start < mEnd && end > mStart) {
          hasConflict = true;
          conflictReason = "Sorry, this room is under maintenance during these dates.";
        }
      }

      if (blocks) {
        for (const block of blocks) {
          const bStart = new Date(block.start_date + "T00:00:00").getTime();
          const bEnd = new Date(block.end_date + "T00:00:00").getTime();
          if (start <= bEnd && end >= bStart) {
            hasConflict = true;
            conflictReason = "The resort is blocked during these dates.";
          }
        }
      }

      if (bookings) {
        for (const b of bookings) {
          if (b.status === "approved" || b.status === "pending") {
            const bStart = new Date(b.check_in + "T00:00:00").getTime();
            const bEnd = new Date(b.check_out + "T00:00:00").getTime();
            if (start === end || bStart === bEnd) {
              if (start <= bEnd && end >= bStart) {
                hasConflict = true;
              }
            } else {
              if (start < bEnd && end > bStart) {
                hasConflict = true;
              }
            }
          }
        }
      }

      if (hasConflict) {
        setConflictWarning(conflictReason);
      } else {
        setConflictWarning(null);
      }
    } else {
      setConflictWarning(null);
    }
  }, [form.check_in, form.check_out, room, bookings, blocks]);

  const nights =
    form.check_in && form.check_out
      ? Math.max(
          form.check_in === form.check_out ? 1 : 0,
          Math.round(
            (new Date(form.check_out + "T00:00:00").getTime() -
              new Date(form.check_in + "T00:00:00").getTime()) /
              86400000,
          ),
        )
      : 0;
  const total = room ? Number(room.price) * nights : 0;


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !room) return;
    if (conflictWarning) return toast.error(conflictWarning);
    if (nights <= 0) return toast.error("Invalid dates selected");

    const phoneRegex = /^(09|\+639)\d{9}$/;
    if (!phoneRegex.test(form.phone.replace(/[\s-]/g, ""))) {
      return toast.error(
        "Please provide a valid Philippine phone number (e.g. 09171234567 or +639171234567).",
      );
    }

    setSubmitting(true);

    try {
      const { data: newBooking, error } = await supabase
        .from("bookings")
        .insert({
          user_id: user.id,
          room_id: room.id,
          guest_name: form.fullname,
          guest_email: form.email,
          guest_phone: form.phone,
          check_in: form.check_in,
          check_out: form.check_out,
          guests: form.guests,
          total_amount: total,
          status: "approved",
        })
        .select()
        .single();

      if (error) {
        MySwal.fire("Error!", error.message, "error");
        return;
      }

      const notesPayload = JSON.stringify({
        method: "resort",
      });

      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          booking_id: newBooking.id,
          user_id: user.id,
          amount: 0,
          status: "pending",
          receipt_url: null,
          notes: notesPayload
        });

      if (paymentError) {
        console.error("Payment insert failed", paymentError);
      }

      // Trigger confirmation email
      if (newBooking) {
        const bookingDataWithRoom = { ...newBooking, room: { name: room.name, type: room.type } };
        supabase.functions
          .invoke("booking-emails", {
            body: { emailType: "confirmation", bookingData: bookingDataWithRoom },
          })
          .catch((err: Error) => console.error("Email system error: " + err.message));
      }

      await MySwal.fire({
        title: "Booking Submitted!",
        text: "Your reservation is confirmed! Payment will be collected upon your arrival.",
        icon: "success",
        confirmButtonText: "Go to Dashboard",
      });

      navigate({ to: "/dashboard" });
    } catch (err: any) {
      MySwal.fire("Error!", err.message || "An unexpected error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || !room)
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDayStatus = (date: Date) => {
    if (date < today) return { status: "past", tooltip: "Past date" };

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (blocks) {
      for (const block of blocks) {
        if (dateStr >= block.start_date && dateStr <= block.end_date) {
          return { status: "booked", tooltip: "Resort Blocked" };
        }
      }
    }

    if (room.maintenance_start && room.maintenance_end) {
      if (dateStr >= room.maintenance_start && dateStr < room.maintenance_end) {
        return { status: "booked", tooltip: "Under Maintenance" };
      }
    }

    if (bookings) {
      for (const b of bookings) {
        if (b.status === "approved" || b.status === "pending") {
          if (dateStr >= b.check_in && dateStr < b.check_out) {
            return { status: "booked", tooltip: "Booked" };
          }
        }
      }
    }

    return { status: "available", tooltip: "Available" };
  };

  const CustomDayButton = (dayProps: React.ComponentProps<typeof DayButton>) => {
    const { day, modifiers, className: defaultClassName, ...btnProps } = dayProps;
    const { status, tooltip } = getDayStatus(day.date);

    let bgColor = "";
    let textColor = "text-foreground";

    if (status === "past") {
      bgColor = "bg-muted opacity-50";
      textColor = "text-muted-foreground";
    } else if (status === "booked") {
      bgColor = "bg-red-500 hover:bg-red-600";
      textColor = "text-white";
    } else if (status === "available") {
      bgColor = "bg-green-500 hover:bg-green-600";
      textColor = "text-white";
    }

    const isSelected = modifiers.selected;
    if (isSelected) {
      bgColor = "bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2";
    }

    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DayButton
              day={day}
              modifiers={modifiers}
              {...btnProps}
              disabled={btnProps.disabled || status === "booked" || status === "past"}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 transition-colors rounded-md",
                bgColor,
                textColor,
                defaultClassName,
              )}
            />
          </TooltipTrigger>
          <TooltipContent className="z-[60] font-medium shadow-md">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_400px]">
        <Card className="p-6 md:p-8">
          <h1 className="text-3xl font-bold">Reserve {room.name}</h1>
          <p className="mt-2 text-muted-foreground">{room.description}</p>

          <div className="mt-8 mb-8 border border-border/60 bg-slate-50/50 p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-center">1. Select Your Dates</h2>
            <div className="flex flex-col items-center justify-center">
              <Calendar
                mode="range"
                selected={{
                  from: form.check_in ? new Date(form.check_in + "T00:00:00") : undefined,
                  to: form.check_out ? new Date(form.check_out + "T00:00:00") : undefined,
                }}
                onSelect={(range: any) => {
                  let check_in = "";
                  let check_out = "";
                  if (range?.from) check_in = format(range.from, "yyyy-MM-dd");
                  if (range?.to) check_out = format(range.to, "yyyy-MM-dd");
                  setForm((f) => ({ ...f, check_in, check_out }));
                }}
                disabled={(date) => getDayStatus(date).status === "booked" || date < today}
                className="bg-white rounded-md border shadow-sm p-4"
                components={{ DayButton: CustomDayButton }}
              />
              
              <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 text-sm text-muted-foreground flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span>Booked / Unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary ring-1 ring-primary ring-offset-1"></div>
                  <span>Selected</span>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-4 border-t pt-6">2. Guest Details</h2>
          <form id="booking-form" onSubmit={onSubmit} className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input required value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Guests {maxCapacity ? `(Max: ${maxCapacity})` : ""}</Label>
                <Input 
                  type="number" 
                  min={1} 
                  required 
                  value={form.guests || ""} 
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setForm({ ...form, guests: "" as any });
                      setGuestExceeded(false);
                      return;
                    }
                    const val = Number(e.target.value);
                    if (maxCapacity && val > maxCapacity) {
                      setGuestExceeded(true);
                    } else {
                      setGuestExceeded(false);
                    }
                    setForm({ ...form, guests: val });
                  }} 
                />
                {guestExceeded && maxCapacity && (
                  <p className="mt-1.5 text-sm text-red-600 font-medium flex items-center gap-1.5">
                    ❌ Guest count exceeds the maximum capacity of {maxCapacity}. Please reduce the number of guests to proceed.
                  </p>
                )}
              </div>
            </div>

            {conflictWarning && (
              <div className="rounded-md bg-destructive/15 p-4 text-destructive flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{conflictWarning}</p>
              </div>
            )}

            <h2 className="text-xl font-semibold mb-2 border-t pt-6">3. Payment Details</h2>
            <div className="bg-amber-50/50 p-6 rounded-xl border border-amber-100">
              <div className="flex items-center gap-2 mb-3 text-amber-900">
                <Banknote className="w-6 h-6" />
                <h3 className="font-bold text-lg">Pay at the Resort</h3>
              </div>

              <p className="text-amber-700 text-sm italic border-t border-amber-200/50 pt-3">
                <span className="font-bold mr-1">Policy:</span>
                Reservations will only be held until the scheduled check-in time. Failure to arrive without prior notice may result in automatic cancellation.
              </p>
            </div>

            <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200 mt-6 text-sm text-slate-600">
              <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Resort Policies
              </h4>
              <p>
                Reservations may be cancelled up to 24 hours before the scheduled check-in date. Failure to arrive without prior cancellation may result in the reservation being marked as a No-Show.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting || !!conflictWarning || !form.check_in || !form.check_out || guestExceeded}
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 w-full mt-4"
            >
              {submitting ? "Submitting…" : "Confirm Reservation"}
            </Button>
          </form>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="h-fit p-6 sticky top-24">
            {room.image_url && (
              <img src={room.image_url} alt={room.name} className="mb-4 aspect-[4/3] w-full rounded-lg object-cover" />
            )}
            <h3 className="font-semibold">{room.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">{room.type} · up to {room.capacity} guests</p>
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><span>Rate</span><span>₱{Number(room.price).toLocaleString()} / night</span></div>
              {form.check_in && (
                <div className="flex justify-between">
                  <span>Check-in</span>
                  <span className="font-medium">{format(new Date(form.check_in + "T00:00:00"), "MMM d, yyyy")}</span>
                </div>
              )}
              {form.check_out && (
                <div className="flex justify-between">
                  <span>Check-out</span>
                  <span className="font-medium">{format(new Date(form.check_out + "T00:00:00"), "MMM d, yyyy")}</span>
                </div>
              )}
              <div className="flex justify-between"><span>Nights</span><span>{nights > 0 ? nights : 0}</span></div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                <span>Total</span><span className="text-primary">₱{total > 0 ? total.toLocaleString() : 0}</span>
              </div>
            </div>
          </Card>
        </div>
      </section>
      <Footer />
    </div>
  );
}
