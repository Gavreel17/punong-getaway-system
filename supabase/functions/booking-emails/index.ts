// @ts-expect-error: deno land import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
// Fallback to a default sender email if not provided in secrets
const SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "noreply@punongspringresort.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  emailType: "confirmation" | "status_update";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bookingData: any;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { emailType, bookingData }: EmailPayload = await req.json();

    if (!BREVO_API_KEY) {
      throw new Error("Missing BREVO_API_KEY environment variable");
    }

    let subject = "";
    let htmlContent = "";

    const formatCurrency = (amount: number) => {
      return `₱${amount.toLocaleString()}`;
    };

    if (emailType === "confirmation") {
      subject = "Booking Confirmation - Punong Spring Resort";
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #047857;">Booking Received</h2>
          <p>Hi ${bookingData.guest_name},</p>
          <p>Thank you for choosing Punong Spring Resort! Your booking request has been received and is currently <strong>${bookingData.status}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Reservation Details</h3>
            <p><strong>Reference Number:</strong> ${String(bookingData.id).split("-")[0].toUpperCase()}</p>
            <p><strong>Accommodation:</strong> ${bookingData.room?.name || "Unknown"} (${bookingData.room?.type || "Room"})</p>
            <p><strong>Check-in Date:</strong> ${bookingData.check_in}</p>
            <p><strong>Check-out Date:</strong> ${bookingData.check_out}</p>
            <p><strong>Status:</strong> ${bookingData.status.toUpperCase()}</p>
          </div>

          <p>We will review your request and update you once it's confirmed. If you have any questions, feel free to contact us.</p>
          <p>Best regards,<br>Punong Spring Resort Team</p>
        </div>
      `;
    } else if (emailType === "status_update") {
      subject = `Booking Update: ${bookingData.status.toUpperCase()} - Punong Spring Resort`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h2 style="color: #047857;">Reservation Status Update</h2>
          <p>Hi ${bookingData.guest_name},</p>
          <p>The status of your reservation has been updated.</p>
          
          <div style="background-color: #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937;">Booking Details</h3>
            <p><strong>Reference Number:</strong> ${String(bookingData.id).split("-")[0].toUpperCase()}</p>
            <p><strong>Accommodation:</strong> ${bookingData.room?.name || "Unknown"} (${bookingData.room?.type || "Room"})</p>
            <p><strong>Check-in Date:</strong> ${bookingData.check_in}</p>
            <p><strong>Check-out Date:</strong> ${bookingData.check_out}</p>
            <p><strong>Status:</strong> <span style="font-weight: bold; color: #047857;">${bookingData.status.toUpperCase()}</span></p>
          </div>

          <p>If you have any questions about this update, please contact our support team.</p>
          <p>Best regards,<br>Punong Spring Resort Team</p>
        </div>
      `;
    } else {
      throw new Error("Invalid emailType provided.");
    }

    // Call Brevo API to send the email
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "Punong Spring Resort",
          email: SENDER_EMAIL,
        },
        to: [
          {
            email: bookingData.guest_email,
            name: bookingData.guest_name,
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Brevo API error:", data);
      throw new Error(`Failed to send email via Brevo: ${data.message || JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ success: true, messageId: data.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
