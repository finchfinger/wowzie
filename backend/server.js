import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const app = express();

// 🔐 Check secret key
const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("❌ Missing STRIPE_SECRET_KEY in backend .env");
  process.exit(1);
}

// Just for sanity in the logs (should say sk_test...)
console.log("Stripe secret key prefix (backend):", secretKey.slice(0, 7));

// ✅ Allow any localhost origin in dev (5173, 5202, etc.)
app.use(
  cors({
    origin: true, // reflect the request origin
  })
);

app.use(express.json());

const stripe = new Stripe(secretKey, {
  apiVersion: "2023-10-16",
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Wowzie backend running" });
});

// Create Payment Intent – CARD ONLY
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency = "usd", campId } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required." });
    }

    console.log("▶ Creating payment intent:", { amount, currency, campId });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { campId },
      // 👇 Force card-only
      payment_method_types: ["card"],
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({
      error: "Failed to create payment intent",
      details: err?.message,
    });
  }
});

const PORT = process.env.PORT || 4242;

app.listen(PORT, () => {
  console.log(`🚀 Wowzie backend running on http://localhost:${PORT}`);
});
