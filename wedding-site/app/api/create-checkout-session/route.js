import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { amountPounds, guestCode, guestName } = await req.json();

    const amount = Number(amountPounds);
    if (!amount || amount <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }

    const amountPence = Math.round(amount * 100);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Create a pending gift record first, so we have something to update via webhook
    const { data: giftRow, error: insertError } = await supabase
      .from("gifts")
      .insert({
        guest_code: guestCode || null,
        guest_name: guestName || "Anonymous",
        amount_pence: amountPence,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return Response.json({ error: "Could not create gift record" }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Wedding Gift",
              description: `From ${guestName || "a guest"}`,
            },
            unit_amount: amountPence,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/?gift=success`,
      cancel_url: `${siteUrl}/?gift=cancelled`,
      metadata: {
        gift_id: giftRow.id,
        guest_code: guestCode || "",
        guest_name: guestName || "",
      },
    });

    // Store the Stripe session id against the pending gift row
    await supabase.from("gifts").update({ stripe_session_id: session.id }).eq("id", giftRow.id);

    return Response.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return Response.json({ error: "Something went wrong creating checkout" }, { status: 500 });
  }
}
