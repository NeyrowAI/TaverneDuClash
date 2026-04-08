import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, donorName } = req.body;

  if (!amount || amount < 1) {
    return res.status(400).json({ error: 'Le montant minimum est de 1€.' });
  }

  if (!donorName || donorName.trim().length === 0) {
    return res.status(400).json({ error: 'Un pseudo est requis.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Don pour TaverneDuClash`,
              description: `Don de ${donorName.trim()}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        donorName: donorName.trim(),
      },
      success_url: `https://${req.headers.host}/landing.html?donation=success&name=${encodeURIComponent(donorName.trim())}`,
      cancel_url: `https://${req.headers.host}/landing.html?donation=cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la création du paiement.' });
  }
}
