# Our Wedding Site

A personal wedding website: guest RSVPs via personal codes, an admin planning
panel (checklist, budget, vendors, timeline), a photo gallery, and Stripe-powered
gift payments.

## 1. Supabase setup
1. Create a project at supabase.com.
2. Go to SQL Editor -> New query, paste in `supabase/schema.sql`, and run it.
3. Go to Project Settings -> API and copy the **Project URL** and **anon public key**.

## 2. Stripe setup
1. Create an account at stripe.com (use Test mode while developing).
2. Go to Developers -> API keys, copy the **Secret key** and **Publishable key**.
3. Go to Developers -> Webhooks -> Add endpoint.
   - Endpoint URL: `https://YOUR-DEPLOYED-URL/api/webhook` (you'll get this after deploying to Vercel)
   - Event to send: `checkout.session.completed`
   - Copy the **Signing secret** (starts with `whsec_`)

## 3. Environment variables
Copy `.env.local.example` to `.env.local` and fill in the values from steps 1 & 2.
When you deploy to Vercel, add the same variables under
Project Settings -> Environment Variables.

## 4. Local development (optional)
```
npm install
npm run dev
```
Visit http://localhost:3000

## 5. Deploy to Vercel
1. Push this project to a GitHub repo.
2. Go to vercel.com -> Add New Project -> import the repo.
3. Add the environment variables from `.env.local`.
4. Deploy. Vercel gives you a live URL immediately.
5. Go back to Stripe's webhook settings and update the endpoint URL to your
   real Vercel URL (e.g. `https://your-site.vercel.app/api/webhook`).
6. Optional: attach a custom domain under Vercel -> Settings -> Domains.

## Logging in
- Guests log in with their personal code (added via the admin Guests tab).
- You log in with the admin code (default `ADMIN2027` — change this immediately
  in the admin Content tab).

## Notes
- Photos are added as links to images already hosted elsewhere (Google Photos,
  Imgur, etc) — there's no file upload built in.
- Stripe is in test mode until you switch your API keys to live keys and verify
  your Stripe account for real payouts.
- This is built for a single couple's use, not a multi-tenant product — Row
  Level Security is wide open for simplicity, fine in this context, but not
  safe to reuse if you ever sell this as a product to multiple couples.
