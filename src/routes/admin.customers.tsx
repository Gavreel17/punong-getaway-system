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
import { Search } from "lucide-react";
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search customers by name, email, or phone..."
            className="pl-9 h-10 bg-slate-50 border-slate-200 focus-visible:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Card className="overflow-x-auto shadow-sm border-slate-200">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold text-slate-700">Name</TableHead>
              <TableHead className="font-bold text-slate-700">Email</TableHead>
              <TableHead className="font-bold text-slate-700">Phone</TableHead>
              <TableHead className="font-bold text-slate-700">Joined</TableHead>
              <TableHead className="font-bold text-slate-700">No-Shows</TableHead>
              <TableHead className="font-bold text-slate-700">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No customers found matching your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-slate-900">{c.fullname}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-orange-600">
                      {c.bookings?.filter((b: any) => b.status === "no-show").length || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" onClick={() => deleteCustomer(c.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
