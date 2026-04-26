import type { Request, Response } from "express";
import { PaymentStatus } from "../../enums/paymentStatus.enum";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";

type StripePaymentIntentEvent = {
    type: string;
    data: {
        object: {
            id: string;
        };
    };
};

const updateBookingPaymentStatus = async (
    paymentIntent: { id: string },
    paymentStatus: PaymentStatus
) => {
    const updateResult = await prisma.booking.updateMany({
        where: {
            stripePaymentIntentId: paymentIntent.id,
        },
        data: {
            paymentStatus,
        },
    });

    if (updateResult.count === 0) {
        console.error("[stripe-webhook] Booking payment update failed", {
            paymentIntentId: paymentIntent.id,
            paymentStatus,
            reason: "No booking matched stripePaymentIntentId",
        });
        throw new Error(`No booking found for PaymentIntent ${paymentIntent.id}`);
    }

    console.info("[stripe-webhook] Booking payment update succeeded", {
        paymentIntentId: paymentIntent.id,
        paymentStatus,
        updatedBookings: updateResult.count,
    });
};

const handleStripeWebhook = async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return res.status(500).json({
            success: false,
            message: "Stripe webhook secret is not configured",
        });
    }

    if (!signature || Array.isArray(signature)) {
        return res.status(400).json({
            success: false,
            message: "Missing Stripe signature",
        });
    }

    let event: StripePaymentIntentEvent;

    try {
        event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret) as StripePaymentIntentEvent;
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    console.info("[stripe-webhook] Received event", {
        eventType: event.type,
    });

    try {
        if (event.type === "payment_intent.succeeded") {
            const paymentIntent = event.data.object;
            console.info("[stripe-webhook] Processing PaymentIntent", {
                eventType: event.type,
                paymentIntentId: paymentIntent.id,
            });

            await updateBookingPaymentStatus(
                paymentIntent,
                PaymentStatus.PAID
            );
        }

        if (event.type === "payment_intent.payment_failed") {
            const paymentIntent = event.data.object;
            console.info("[stripe-webhook] Processing PaymentIntent", {
                eventType: event.type,
                paymentIntentId: paymentIntent.id,
            });

            await updateBookingPaymentStatus(
                paymentIntent,
                PaymentStatus.FAILED
            );
        }

        return res.status(200).json({ received: true });
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error("[stripe-webhook] Failed to process event", {
            eventType: event.type,
            message: error.message,
        });

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process Stripe webhook",
        });
    }
};

export const stripeWebhookController = {
    handleStripeWebhook,
};
