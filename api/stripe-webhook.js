import Stripe from 'stripe';
import { kv } from '@vercel/kv';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Signature invalide.' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const donorName = session.metadata?.donorName || 'Anonyme';
    const amount = (session.amount_total || 0) / 100;

    try {
      const KV_KEY = 'donations';
      const donations = (await kv.get(KV_KEY)) || [];
      donations.unshift({
        name: donorName,
        amount,
        date: new Date().toISOString(),
      });
      await kv.set(KV_KEY, donations);
      console.log(`Donation recorded: ${donorName} - ${amount}€`);
    } catch (err) {
      console.error('KV write error in webhook:', err.message);
    }
  }

  return res.status(200).json({ received: true });
}
