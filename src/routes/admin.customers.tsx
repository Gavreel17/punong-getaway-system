import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute('/admin/customers')({
  component: CustomersTab,
})

function CustomersTab() {
  const { data: customers = [] } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return (
    <Card className="overflow-x-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
        <TableBody>
          {customers.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.fullname}</TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.phone ?? "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
