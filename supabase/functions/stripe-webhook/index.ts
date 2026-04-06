import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  const body = await req.text();

  try {
    if (webhookSecret) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } else {
      // Fallback: parse without verification (for development)
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const depositAmount = parseFloat(session.metadata?.deposit_amount || "0");

    if (!userId || depositAmount <= 0) {
      console.error("Missing user_id or invalid amount in metadata");
      return new Response("Invalid metadata", { status: 400 });
    }

    console.log(`Processing deposit: ${depositAmount} BRL for user ${userId}`);

    // Get current balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("User not found:", profileError);
      return new Response("User not found", { status: 404 });
    }

    const newBalance = parseFloat(profile.balance) + depositAmount;

    // Update balance
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to update balance:", updateError);
      return new Response("Balance update failed", { status: 500 });
    }

    // Mark transaction as completed
    await supabase
      .from("transactions")
      .update({ status: "completed", reviewed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("type", "deposit")
      .eq("payment_method", "stripe")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    console.log(`Deposit successful: +${depositAmount} BRL for user ${userId}. New balance: ${newBalance}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
