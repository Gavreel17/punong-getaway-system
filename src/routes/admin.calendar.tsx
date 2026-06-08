import { createFileRoute } from '@tanstack/react-router'
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

export const Route = createFileRoute('/admin/calendar')({
  component: AvailabilityCalendarTab,
})

function AvailabilityCalendarTab() {
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ start_date: '', end_date: '', reason: '' });
  
  const { data, refetch } = useQuery({
    queryKey: ["admin-availability-calendar"],
    queryFn: async () => {
      const [roomsRes, bookingsRes, blocksRes] = await Promise.all([
        supabase.from("rooms").select("*"),
        supabase.from("bookings").select("*, room:rooms(name), profile:profiles!bookings_user_id_fkey(fullname,email)"),
        (async () => {
          try {
            const { data } = await supabase.from("resort_blocks" as any).select("*");
            return { data: data || [] };
          } catch (e) {
            console.error("Failed to fetch resort blocks:", e);
            return { data: [] };
          }
        })()
      ]);
      return { 
        rooms: roomsRes.data || [], 
        bookings: bookingsRes.data || [],
        blocks: blocksRes.data || []
      };
    }
  });

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const rooms = data?.rooms || [];
  const bookings = data?.bookings || [];
  const blocks = (data?.blocks || []) as any[];

  const getCellData = (room: any, day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    let isBlocked = false;
    for (const block of blocks) {
       if (dateStr >= block.start_date && dateStr <= block.end_date) {
         isBlocked = true;
       }
    }
    if (isBlocked) return { color: "bg-red-900", type: "blocked", text: "X" };

    if (room.status === 'maintenance' || (room.maintenance_start && room.maintenance_end)) {
      if (!room.maintenance_start || (dateStr >= room.maintenance_start && dateStr < room.maintenance_end)) {
        return { color: "bg-slate-500", type: "maintenance" };
      }
    }

    const dailyBookings = bookings.filter((b: any) => b.room_id === room.id && b.status !== "rejected" && b.status !== "cancelled" && b.status !== "completed");
    
    for (const b of dailyBookings) {
       if (dateStr >= b.check_in && dateStr < b.check_out) {
          if (b.status === "approved") return { color: "bg-red-500", type: "booking", booking: b };
          if (b.status === "pending") return { color: "bg-yellow-500", type: "booking", booking: b };
       }
    }
    
    return { color: "bg-green-100", type: "free" };
  };

  const getGlobalCellData = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    let isBlocked = false;
    for (const block of blocks) {
       if (dateStr >= block.start_date && dateStr <= block.end_date) {
         isBlocked = true;
       }
    }
    if (isBlocked) return { color: "bg-red-900 border-red-900 text-white font-bold", tooltip: "Resort Blocked", icon: "X" };

    if (rooms.length === 0) return { color: "bg-muted", tooltip: "No rooms" };

    let occupied = 0;
    rooms.forEach((r: any) => {
       const cell = getCellData(r, day);
       if (cell.type === 'maintenance' || cell.type === 'booking') occupied++;
    });

    const avail = rooms.length - occupied;
    if (avail === 0) return { color: "bg-red-500 text-white font-bold border-red-600", tooltip: "Fully Booked" };
    if (avail < rooms.length) return { color: "bg-yellow-400 text-white font-bold border-yellow-500", tooltip: `Limited (${avail} left)` };
    return { color: "bg-green-500 text-white font-bold border-green-600", tooltip: "Available" };
  };

  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("resort_blocks" as any).insert({
      start_date: blockForm.start_date,
      end_date: blockForm.end_date,
      reason: blockForm.reason
    });
    if (error) return toast.error("Failed to block dates");
    toast.success("Resort blocked for selected dates");
    setBlockModalOpen(false);
    refetch();
    qc.invalidateQueries({ queryKey: ["global-availability"] });
  };

  return (
    <Card className="p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-4">
           <h2 className="text-xl font-bold">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
           <div className="space-x-1">
             <Button size="sm" variant="outline" onClick={prevMonth}>Prev</Button>
             <Button size="sm" variant="outline" onClick={nextMonth}>Next</Button>
           </div>
         </div>
         <Button onClick={() => setBlockModalOpen(true)} variant="destructive" size="sm">
           Block Resort Dates
         </Button>
       </div>

       <div className="overflow-x-auto pb-4">
         <table className="w-full border-collapse border min-w-[800px] text-sm">
           <thead>
             <tr>
               <th className="border p-2 bg-muted text-left sticky left-0 z-10 w-48">Room</th>
               {days.map(d => (
                 <th key={d} className="border p-2 bg-muted text-center w-8 min-w-8">{d}</th>
               ))}
             </tr>
             <tr className="bg-secondary/30">
               <td className="border p-2 font-bold sticky left-0 bg-secondary/50 z-10">Global Status</td>
               {days.map(d => {
                 const cell = getGlobalCellData(d);
                 return (
                   <td key={d} className="border p-1" title={cell.tooltip}>
                     <div className={`w-full h-8 rounded flex items-center justify-center text-xs border shadow-sm ${cell.color}`}>
                       {cell.icon}
                     </div>
                   </td>
                 );
               })}
             </tr>
           </thead>
           <tbody>
             {rooms.map((r: any) => (
               <tr key={r.id}>
                 <td className="border p-2 font-medium sticky left-0 bg-background z-10 truncate">{r.name}</td>
                 {days.map(d => {
                   const cell = getCellData(r, d);
                   return (
                     <td 
                       key={d} 
                       className={`border p-0.5 ${cell.type === 'booking' ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                       onClick={() => {
                         if (cell.type === "booking") setSelectedBooking(cell.booking);
                       }}
                     >
                       <div className={`w-full h-8 rounded-sm ${cell.color} ${cell.type === 'free' ? 'opacity-30' : ''} flex items-center justify-center text-white/80 font-bold`}>
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

       <div className="mt-6 flex flex-wrap gap-4 text-sm">
         <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded-sm"></div> Available</div>
         <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400 rounded-sm"></div> Limited / Pending</div>
         <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded-sm"></div> Fully Booked</div>
         <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-500 rounded-sm"></div> Maintenance</div>
         <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-900 rounded-sm flex items-center justify-center text-white text-[10px] font-bold">X</div> Blocked Override</div>
       </div>

       <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
         <DialogContent>
           <DialogHeader><DialogTitle>Block Resort Dates</DialogTitle></DialogHeader>
           <form onSubmit={handleBlockSubmit} className="grid gap-4 py-4">
             <div className="grid grid-cols-2 gap-4">
               <div><Label>Start Date</Label><Input type="date" required value={blockForm.start_date} onChange={e => setBlockForm({...blockForm, start_date: e.target.value})} /></div>
               <div><Label>End Date</Label><Input type="date" required value={blockForm.end_date} onChange={e => setBlockForm({...blockForm, end_date: e.target.value})} /></div>
             </div>
             <div>
               <Label>Reason (Optional)</Label>
               <Input placeholder="e.g. Severe Weather, Private Event" value={blockForm.reason} onChange={e => setBlockForm({...blockForm, reason: e.target.value})} />
             </div>
             <Button type="submit" variant="destructive">Apply Block</Button>
           </form>
           
           <div className="mt-4">
             <h4 className="font-semibold text-sm mb-2">Active Blocks</h4>
             {blocks.length === 0 ? <p className="text-xs text-muted-foreground">No active blocks</p> : (
               <ul className="space-y-2">
                 {blocks.map((b: any) => (
                   <li key={b.id} className="flex justify-between items-center text-sm border p-2 rounded bg-muted/50">
                     <span>{b.start_date} to {b.end_date} {b.reason && `(${b.reason})`}</span>
                     <Button size="sm" variant="ghost" className="text-destructive h-6 px-2" onClick={async () => {
                       await supabase.from("resort_blocks" as any).delete().eq("id", b.id);
                       refetch();
                       qc.invalidateQueries({ queryKey: ["global-availability"] });
                     }}>Remove</Button>
                   </li>
                 ))}
               </ul>
             )}
           </div>
         </DialogContent>
       </Dialog>

       <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
         <DialogContent>
           <DialogHeader><DialogTitle>Booking Details</DialogTitle></DialogHeader>
           {selectedBooking && (
             <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold block text-muted-foreground">Guest Name</span>
                    {selectedBooking.guest_name}
                  </div>
                  <div>
                    <span className="font-semibold block text-muted-foreground">Contact</span>
                    {selectedBooking.guest_phone}
                  </div>
                  <div>
                    <span className="font-semibold block text-muted-foreground">Room</span>
                    {selectedBooking.room?.name || selectedBooking.room_id}
                  </div>
                  <div>
                    <span className="font-semibold block text-muted-foreground">Status</span>
                    <Badge variant="outline" className="capitalize">{selectedBooking.status}</Badge>
                  </div>
                  <div>
                    <span className="font-semibold block text-muted-foreground">Check In</span>
                    {selectedBooking.check_in}
                  </div>
                  <div>
                    <span className="font-semibold block text-muted-foreground">Check Out</span>
                    {selectedBooking.check_out}
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold block text-muted-foreground">Total Amount</span>
                    <span className="text-primary font-bold text-lg">₱{Number(selectedBooking.total_amount).toLocaleString()}</span>
                  </div>
                </div>

                {selectedBooking.status === "pending" && (
                  <div className="flex gap-3 mt-4">
                     <Button 
                       className="flex-1 bg-palm hover:bg-palm/90 text-white" 
                       onClick={async () => {
                         await supabase.from("bookings").update({ status: "approved" }).eq("id", selectedBooking.id);
                         toast.success("Booking approved");
                         setSelectedBooking(null);
                         refetch();
                         qc.invalidateQueries({ queryKey: ["admin-bookings"] });
                         qc.invalidateQueries({ queryKey: ["admin-stats"] });
                       }}
                     >
                       Approve Booking
                     </Button>
                     <Button 
                       variant="destructive" 
                       className="flex-1"
                       onClick={async () => {
                         await supabase.from("bookings").update({ status: "rejected" }).eq("id", selectedBooking.id);
                         toast.success("Booking rejected");
                         setSelectedBooking(null);
                         refetch();
                         qc.invalidateQueries({ queryKey: ["admin-bookings"] });
                         qc.invalidateQueries({ queryKey: ["admin-stats"] });
                       }}
                     >
                       Reject
                     </Button>
                  </div>
                )}
             </div>
           )}
         </DialogContent>
       </Dialog>
    </Card>
  );
}
