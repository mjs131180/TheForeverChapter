import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
 
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
 
export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();
 
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
 
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const giftId = session.metadata?.gift_id;
 
    if (giftId) {
      const { error } = await supabase
        .from("gifts")
        .update({ status: "paid" })
        .eq("id", giftId);
 
      if (error) {
        console.error("Failed to mark gift as paid:", error);
        return Response.json({ error: "Database update failed" }, { status: 500 });
      }
    }
  }
 
  return Response.json({ received: true });
}
