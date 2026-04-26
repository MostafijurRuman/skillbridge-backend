import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-12-18.acacia" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
});
