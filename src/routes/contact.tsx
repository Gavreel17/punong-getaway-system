import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact — Punong Resort" }, { name: "description", content: "Get in touch with Punong Resort." }] }),
  component: Contact,
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Thanks! We'll be in touch soon.");
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="bg-[image:var(--gradient-hero)] py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold">Contact Us</h1>
          <p className="mt-3 text-white/90">We'd love to hear from you</p>
        </div>
      </section>
      <section className="container mx-auto grid max-w-5xl gap-8 px-4 py-16 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-start gap-3"><MapPin className="mt-1 h-5 w-5 text-accent" /><div><p className="font-semibold">Address</p><p className="text-sm text-muted-foreground">Coastal Road, Palawan, Philippines</p></div></div>
          <div className="flex items-start gap-3"><Phone className="mt-1 h-5 w-5 text-accent" /><div><p className="font-semibold">Phone</p><p className="text-sm text-muted-foreground">+63 917 123 4567</p></div></div>
          <div className="flex items-start gap-3"><Mail className="mt-1 h-5 w-5 text-accent" /><div><p className="font-semibold">Email</p><p className="text-sm text-muted-foreground">hello@punongresort.com</p></div></div>
        </div>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>Name</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={5} required value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">Send Message</Button>
          </form>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
