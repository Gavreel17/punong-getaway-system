import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/rooms")({
  component: RoomsTab,
});

function RoomsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const blank = {
    name: "",
    type: "room",
    description: "",
    price: 0,
    capacity: "1",
    image_url: "",
    is_available: true,
    status: "available",
    maintenance_start: "",
    maintenance_end: "",
  };
  const [form, setForm] = useState<any>(blank);

  const { data: rooms = [] } = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  function openNew() {
    setEdit(null);
    setForm(blank);
    setOpen(true);
  }
  function openEdit(r: any) {
    setEdit(r);
    setForm({ ...blank, ...r });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (Number(form.price) <= 0) {
      MySwal.fire({
        title: "Invalid Price!",
        text: "Price must be greater than 0. Please enter a valid price.",
        icon: "error",
        confirmButtonText: "OK",
      }).then(() => {
        setForm({ ...form, price: "" as any });
        setTimeout(() => document.getElementById("room-price-input")?.focus(), 100);
      });
      return;
    }
    const payload = {
      ...form,
      price: Number(form.price),
      capacity: form.capacity,
      maintenance_start:
        form.status === "maintenance" && form.maintenance_start ? form.maintenance_start : null,
      maintenance_end:
        form.status === "maintenance" && form.maintenance_end ? form.maintenance_end : null,
    };
    const { error } = edit
      ? await supabase.from("rooms").update(payload).eq("id", edit.id)
      : await supabase.from("rooms").insert(payload);
    if (error) return MySwal.fire("Error!", error.message, "error");

    MySwal.fire(
      "Success!",
      edit ? "Room updated successfully." : "Room added successfully.",
      "success",
    );
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-rooms"] });
    qc.invalidateQueries({ queryKey: ["rooms"] });
    qc.invalidateQueries({ queryKey: ["admin-availability-calendar"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, image_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  async function remove(id: string) {
    const result = await MySwal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return MySwal.fire("Error!", error.message, "error");

    MySwal.fire("Deleted!", "Room has been deleted.", "success");
    qc.invalidateQueries({ queryKey: ["admin-rooms"] });
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-4 flex justify-end">
        <Button onClick={openNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Room
        </Button>
      </div>
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="capitalize">{r.type === 'villa' ? 'Function Hall' : r.type}</TableCell>
                <TableCell>₱{Number(r.price).toLocaleString()}</TableCell>
                <TableCell>{r.capacity}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {r.status || "available"}
                  </Badge>
                  {r.status === "maintenance" && r.maintenance_start && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {r.maintenance_start} to {r.maintenance_end}
                    </div>
                  )}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? "Edit Room" : "Add Room"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="grid gap-3 py-2">
            <div>
              <Label>Name</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">Room</SelectItem>
                    <SelectItem value="cottage">Cottage</SelectItem>
                    <SelectItem value="villa">Function Hall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  required
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="room-price-input">Price (₱ / night)</Label>
              <Input
                id="room-price-input"
                type="number"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>

            <div className="border rounded-md p-3 bg-muted/30">
              <Label className="mb-2 block">Room Status & Availability</Label>
              <Select
                value={form.status || "available"}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger className="mb-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Under Maintenance</SelectItem>
                </SelectContent>
              </Select>

              {form.status === "maintenance" && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <Label className="text-xs">Maintenance Start</Label>
                    <Input
                      type="date"
                      required
                      value={form.maintenance_start || ""}
                      onChange={(e) => setForm({ ...form, maintenance_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Maintenance End</Label>
                    <Input
                      type="date"
                      required
                      value={form.maintenance_end || ""}
                      onChange={(e) => setForm({ ...form, maintenance_end: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Room Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
              {form.image_url && (
                <div className="mt-2">
                  <img
                    src={form.image_url}
                    alt="Room preview"
                    className="h-24 w-36 object-cover rounded-md border shadow-sm"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90 mt-2"
            >
              {edit ? "Save changes" : "Add room"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
