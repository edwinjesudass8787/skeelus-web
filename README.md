# Skeelus Web

A fully web-based version of the Skeelus accreditation platform for real-world skills.

## Features

- **AI-Generated Curriculum**: Describe what you want to learn, and our AI builds a personalized course
- **5-Stage Learning Journey**:
  - Orient: Socratic chat tutor to demonstrate understanding
  - Understand: Video presentation explaining concepts
  - Practise: Case study scenarios
  - Prove: Action plan creation
  - Articulate: Reflection and certification
- **Verified Certificates**: Shareable portfolio with unique certificate ID
- **Cross-Device Sync**: Continue your learning anywhere

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (Auth, Database, Edge Functions)
- **AI**: OpenRouter (GPT-4o-mini, Perplexity Sonar, ByteDance Seed)
- **Payments**: Stripe
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- OpenRouter account
- Stripe account

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

## Supabase Setup

1. Create a new Supabase project
2. Run the SQL migrations in `supabase/migrations/`
3. Enable Email/Password authentication
4. Deploy Edge Functions (create-checkout-session, stripe-webhook, openrouter-proxy)

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup instructions.

## Stripe Setup

1. Create a Stripe account
2. Get your API keys
3. Configure webhook endpoint in Supabase

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Supabase Functions

```bash
supabase functions deploy openrouter-proxy --no-verify-jwt
supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
```

## License

MIT