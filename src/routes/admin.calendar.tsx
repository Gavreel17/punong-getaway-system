import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { processAutoBookingStatuses } from "@/lib/booking-utils";

export const Route = createFileRoute("/admin/calendar")({
  component: AvailabilityCalendarTab,
});

function AvailabilityCalendarTab() {
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ start_date: "", end_date: "", reason: "" });

  const { data, refetch } = useQuery({
    queryKey: ["admin-availability-calendar"],
    queryFn: async () => {
      const [roomsRes, bookingsRes, blocksRes] = await Promise.all([
        supabase.from("rooms").select("*"),
        supabase
          .from("bookings")
          .select("*, room:rooms(name), profile:profiles!bookings_user_id_fkey(fullname,email), payments(*)"),
        (async () => {
          try {
            const { data } = await supabase.from("resort_blocks" as any).select("*");
            return { data: data || [] };
          } catch (e) {
            console.error("Failed to fetch resort blocks:", e);
            return { data: [] };
          }
        })(),
      ]);

      const fetchedBookings = bookingsRes.data || [];
      await processAutoBookingStatuses(fetchedBookings);

      return {
        rooms: roomsRes.data || [],
        bookings: fetchedBookings,
        blocks: blocksRes.data || [],
      };
    },
  });

  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const rooms = data?.rooms || [];
  const bookings = data?.bookings || [];
  const blocks = (data?.blocks || []) as any[];

  const getCellData = (room: any, day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    let isBlocked = false;
    for (const block of blocks) {
      if (dateStr >= block.start_date && dateStr <= block.end_date) {
        isBlocked = true;
      }
    }
    if (isBlocked) return { color: "bg-red-900", type: "blocked", text: "X" };

    if (room.status === "maintenance" || (room.maintenance_start && room.maintenance_end)) {
      if (
        !room.maintenance_start ||
        (dateStr >= room.maintenance_start && dateStr < room.maintenance_end)
      ) {
        return { color: "bg-slate-500", type: "maintenance" };
      }
    }

    const dailyBookings = bookings.filter(
      (b: any) =>
        b.room_id === room.id &&
        b.status !== "rejected" &&
        b.status !== "cancelled" &&
        b.status !== "completed",
    );

    for (const b of dailyBookings) {
      if (dateStr >= b.check_in && dateStr < b.check_out) {
        if (b.status === "approved") return { color: "bg-red-500", type: "booking", booking: b };
        if (b.status === "pending") return { color: "bg-yellow-500", type: "booking", booking: b };
      }
    }

    return { color: "bg-green-100", type: "free" };
  };

  const getGlobalCellData = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    let isBlocked = false;
    for (const block of blocks) {
      if (dateStr >= block.start_date && dateStr <= block.end_date) {
        isBlocked = true;
      }
    }
    if (isBlocked)
      return {
        color: "bg-red-900 border-red-900 text-white font-bold",
        tooltip: "Resort Blocked",
        icon: "X",
      };

    if (rooms.length === 0) return { color: "bg-muted", tooltip: "No rooms" };

    let occupied = 0;
    rooms.forEach((r: any) => {
      const cell = getCellData(r, day);
      if (cell.type === "maintenance" || cell.type === "booking") occupied++;
    });

    const avail = rooms.length - occupied;
    if (avail === 0)
      return { color: "bg-red-500 text-white font-bold border-red-600", tooltip: "Fully Booked" };
    if (avail < rooms.length)
      return {
        color: "bg-yellow-400 text-white font-bold border-yellow-500",
        tooltip: `Limited (${avail} left)`,
      };
    return { color: "bg-green-500 text-white font-bold border-green-600", tooltip: "Available" };
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("resort_blocks" as any).insert({
      start_date: blockForm.start_date,
      end_date: blockForm.end_date,
      reason: blockForm.reason,
    });
    if (error) return toast.error("Failed to block dates");
    toast.success("Resort blocked for selected dates");
    setBlockModalOpen(false);
    refetch();
    qc.invalidateQueries({ queryKey: ["global-availability"] });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Calendar Control Header */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#B38728] font-bold text-[10px] uppercase tracking-wider border border-[#D4AF37]/30">
              Interactive Matrix
            </span>
            <span className="text-xs text-slate-400 font-medium">Real-Time Room Occupancy Grid</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight mt-1 flex items-center gap-3">
            {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <Button size="sm" variant="ghost" onClick={prevMonth} className="h-8 px-3 text-xs font-bold text-slate-700 hover:bg-white rounded-lg">
              ← Prev
            </Button>
            <Button size="sm" variant="ghost" onClick={nextMonth} className="h-8 px-3 text-xs font-bold text-slate-700 hover:bg-white rounded-lg">
              Next →
            </Button>
          </div>

          <Button 
            onClick={() => setBlockModalOpen(true)} 
            variant="destructive" 
            size="sm" 
            className="h-10 px-4 rounded-xl font-bold shadow-md cursor-pointer bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800"
          >
            Block Resort Dates
          </Button>
        </div>
      </div>

      {/* Availability Grid Container */}
      <div className="overflow-x-auto pb-4 rounded-2xl border border-slate-200/80 shadow-sm bg-white">
        <table className="w-full border-collapse min-w-[850px] text-sm">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200">
              <th className="p-3.5 text-left sticky left-0 z-20 bg-slate-100/90 backdrop-blur-md w-52 font-bold text-slate-700 text-xs uppercase tracking-wider border-r border-slate-200">
                Accommodation
              </th>
              {days.map((d) => (
                <th key={d} className="p-2 text-center w-9 min-w-9 font-bold text-slate-700 text-xs border-r border-slate-200/60">
                  {d}
                </th>
              ))}
            </tr>
            <tr className="bg-amber-500/5 border-b border-slate-200">
              <td className="p-3.5 font-bold text-slate-800 text-xs uppercase tracking-wider sticky left-0 bg-amber-50/90 backdrop-blur-md z-20 border-r border-slate-200">
                Overall Occupancy
              </td>
              {days.map((d) => {
                const cell = getGlobalCellData(d);
                return (
                  <td key={d} className="p-1 border-r border-slate-200/40" title={cell.tooltip}>
                    <div
                      className={`w-full h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-2xl transition-transform hover:scale-105 ${cell.color}`}
                    >
                      {cell.icon}
                    </div>
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rooms.map((r: any) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-sm">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-sm">{r.name}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {r.type === 'villa' ? 'Function Hall' : (r.type || "ROOM")}
                    </span>
                  </div>
                </td>
                {days.map((d) => {
                  const cell = getCellData(r, d);
                  return (
                    <td
                      key={d}
                      className={`p-1 border-r border-slate-100 ${cell.type === "booking" ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                      onClick={() => {
                        if (cell.type === "booking") setSelectedBooking(cell.booking);
                      }}
                    >
                      <div
                        className={`w-full h-8 rounded-lg ${cell.color} ${cell.type === "free" ? "opacity-25 hover:opacity-50" : ""} flex items-center justify-center text-white text-[11px] font-bold shadow-sm transition-all`}
                      >
                        {cell.text}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
        <span className="text-slate-400 uppercase text-[10px] tracking-widest font-bold">Grid Legend:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-md shadow-sm"></div> Available Stay
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded-md shadow-sm"></div> Reserved Booking
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-md shadow-sm"></div> Confirmed Reservation
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-slate-500 rounded-md shadow-sm"></div> Maintenance Closure
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-900 rounded-md shadow-sm flex items-center justify-center text-white text-[9px] font-extrabold">
            X
          </div>{" "}
          Resort Blocked Override
        </div>
      </div>

      {/* Block Dates Modal */}
      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-rose-700">Block Resort Dates</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBlockSubmit} className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold uppercase text-slate-600">Start Date</Label>
                <Input
                  type="date"
                  required
                  className="mt-1 rounded-xl text-xs"
                  value={blockForm.start_date}
                  onChange={(e) => setBlockForm({ ...blockForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase text-slate-600">End Date</Label>
                <Input
                  type="date"
                  required
                  className="mt-1 rounded-xl text-xs"
                  value={blockForm.end_date}
                  onChange={(e) => setBlockForm({ ...blockForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-600">Reason (Optional)</Label>
              <Input
                placeholder="e.g. Private Event, Maintenance, Weather"
                className="mt-1 rounded-xl text-xs"
                value={blockForm.reason}
                onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              />
            </div>
            <Button type="submit" variant="destructive" className="rounded-xl font-bold mt-2">
              Apply Block Override
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 mb-2">Active Override Blocks</h4>
            {blocks.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No active blocks configured</p>
            ) : (
              <ul className="space-y-2">
                {blocks.map((b: any) => (
                  <li
                    key={b.id}
                    className="flex justify-between items-center text-xs border p-2.5 rounded-xl bg-slate-50 font-medium"
                  >
                    <span>
                      <strong>{b.start_date}</strong> to <strong>{b.end_date}</strong> {b.reason && <span className="text-slate-500">({b.reason})</span>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50 h-7 px-2 font-bold"
                      onClick={async () => {
                        await supabase
                          .from("resort_blocks" as any)
                          .delete()
                          .eq("id", b.id);
                        refetch();
                        qc.invalidateQueries({ queryKey: ["global-availability"] });
                      }}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display">Reservation Quick View</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Guest Name</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedBooking.guest_name}</span>
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Contact</span>
                  <span className="font-semibold text-slate-900">{selectedBooking.guest_phone || selectedBooking.guest_email}</span>
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Accommodation</span>
                  <span className="font-semibold text-slate-900">{selectedBooking.room?.name || selectedBooking.room_id}</span>
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Booking Status</span>
                  <Badge variant="outline" className="capitalize font-semibold">
                    {selectedBooking.status}
                  </Badge>
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Check In</span>
                  <span className="font-semibold text-slate-800">{selectedBooking.check_in}</span>
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">Check Out</span>
                  <span className="font-semibold text-slate-800">{selectedBooking.check_out}</span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="font-bold uppercase tracking-wider text-slate-500">Total Price</span>
                  <span className="text-[#B38728] font-extrabold text-base font-display">
                    ₱{Number(selectedBooking.total_amount).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedBooking.status === "pending" && (
                <div className="flex gap-3 mt-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10"
                    onClick={async () => {
                      const { data: updatedBooking, error } = await supabase
                        .from("bookings")
                        .update({ status: "approved" })
                        .eq("id", selectedBooking.id)
                        .select("*, room:rooms(name, type)")
                        .single();
                      if (!error && updatedBooking) {
                        supabase.functions
                          .invoke("booking-emails", {
                            body: { emailType: "status_update", bookingData: updatedBooking },
                          })
                          .then((res: { error: Error | null }) => {
                            if (res.error) {
                              console.warn("Email notification failed:", res.error.message);
                              toast.warning("Booking updated, but email notification could not be sent.");
                            } else {
                              toast.success("Email sent successfully!");
                            }
                          })
                          .catch((err: Error) => {
                            console.warn("Email system error:", err.message);
                            toast.warning("Booking updated, but email notification could not be sent.");
                          });
                      }
                      toast.success("Booking confirmed");
                      setSelectedBooking(null);
                      refetch();
                      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
                      qc.invalidateQueries({ queryKey: ["admin-stats"] });
                    }}
                  >
                    Confirm Booking
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 font-bold rounded-xl h-10"
                    onClick={async () => {
                      const { data: updatedBooking, error } = await supabase
                        .from("bookings")
                        .update({ status: "rejected" })
                        .eq("id", selectedBooking.id)
                        .select("*, room:rooms(name, type)")
                        .single();
                      if (!error && updatedBooking) {
                        supabase.functions
                          .invoke("booking-emails", {
                            body: { emailType: "status_update", bookingData: updatedBooking },
                          })
                          .then((res: { error: Error | null }) => {
                            if (res.error) {
                              console.warn("Email notification failed:", res.error.message);
                              toast.warning("Booking updated, but email notification could not be sent.");
                            } else {
                              toast.success("Email sent successfully!");
                            }
                          })
                          .catch((err: Error) => {
                            console.warn("Email system error:", err.message);
                            toast.warning("Booking updated, but email notification could not be sent.");
                          });
                      }
                      toast.success("Booking cancelled");
                      setSelectedBooking(null);
                      refetch();
                      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
                      qc.invalidateQueries({ queryKey: ["admin-stats"] });
                    }}
                  >
                    Cancel Booking
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
