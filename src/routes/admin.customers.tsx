import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search, Mail, Phone, Calendar, AlertTriangle, Trash2, Users } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export const Route = createFileRoute("/admin/customers")({
  component: CustomersTab,
});

function CustomersTab() {
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, bookings(status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredCustomers = customers.filter((c: any) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.fullname || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  });

  async function deleteCustomer(id: string) {
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: "This will permanently delete the customer and all associated data!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return MySwal.fire("Error!", error.message, "error");

    MySwal.fire("Deleted!", "Customer has been deleted.", "success");
    qc.invalidateQueries({ queryKey: ["admin-customers"] });
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#B38728] font-bold text-[10px] uppercase tracking-wider border border-[#D4AF37]/30">
              Guest Directory
            </span>
            <span className="text-xs text-slate-400 font-medium">({filteredCustomers.length} Profile{filteredCustomers.length === 1 ? '' : 's'})</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight mt-1">
            Registered Customers & CRM
          </h2>
          <p className="text-sm text-slate-500">View customer profiles, contact info, registration dates, and stay records.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by name, email, or phone..."
            className="pl-9 h-10 border-slate-200 focus-visible:ring-[#D4AF37] focus-visible:border-[#D4AF37] bg-slate-50/50 rounded-xl transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="border-b border-slate-200/80">
              <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] py-4">Customer Name</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] py-4">Contact Details</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] py-4">Joined Date</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] py-4">No-Show Log</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[11px] py-4 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Users className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium">No customer profiles found matching your search query.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c: any) => {
                const initial = c.fullname ? c.fullname[0].toUpperCase() : "U";
                const noShowCount = c.bookings?.filter((b: any) => b.status === "no-show").length || 0;

                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 text-[#D4AF37] flex items-center justify-center font-bold text-sm shrink-0 ring-2 ring-[#D4AF37]/30 shadow-md">
                          {initial}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm font-display">{c.fullname || "Unnamed Guest"}</div>
                          <div className="text-xs text-slate-400 font-mono">User ID: {c.id.split("-")[0]}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-700 flex items-center gap-1.5 font-medium">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {c.email}
                        </div>
                        {c.phone && (
                          <div className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {c.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {new Date(c.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      {noShowCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-xs">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {noShowCount} No-Show{noShowCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Clean Record</span>
                      )}
                    </TableCell>

                    <TableCell className="py-4 text-right pr-6">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => deleteCustomer(c.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

