# Agentroad - Agents as a Service

## Vision
A marketplace where users can discover and use specialized AI agents for specific tasks. Think "Gumroad for AI agents" — clean, minimal, focused on the product.

---

## Design System (Gumroad-Inspired)

### Typography
- **Headings**: Mabry Pro / ABC Diatype (Gumroad uses custom fonts). Fallback: **Inter** or **DM Sans**
- **Body**: System UI stack or Inter
- **Monospace**: JetBrains Mono (for code agents)
- **Style**: Bold, large headings. Clean body text. High contrast.

### Colors
- **Background**: White (#FFFFFF) / Off-white (#FAFAFA)
- **Text**: Near-black (#1A1A1A)
- **Accent**: Coral/Pink (#FF6B6B) — Gumroad's signature
- **Secondary**: Soft purple (#7C3AED) for AI vibe
- **Success**: Green (#10B981)
- **Cards**: White with subtle shadow, rounded corners (12-16px)

### Layout
- **Grid**: Clean card grid for agent marketplace
- **Spacing**: Generous whitespace (Gumroad DNA)
- **Navigation**: Minimal top nav, no sidebar clutter
- **Mobile-first**: Responsive, works great on phone

---

## Architecture

### Tech Stack
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14+ (App Router) | SSR, API routes, Vercel-native |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Fast, Gumroad-like utility styling |
| Database | PostgreSQL (Neon/Supabase) | Relational data, user accounts |
| ORM | Prisma | Type-safe DB queries |
| Auth | NextAuth.js v5 | Google, GitHub, email login |
| AI Runtime | Anthropic Claude API + OpenAI API | Power the agents |
| Streaming | Vercel AI SDK | Stream agent responses |
| Payments | Stripe | Per-use credits or subscription |
| Deployment | Vercel | Zero-config, edge functions |
| Storage | Vercel Blob / S3 | Agent avatars, assets |
| Real-time | Server-Sent Events | Chat streaming |

### Agent Runtime (The Hard Part)

**Approach: API-First (No running processes)**

Each "agent" is NOT a running process. It's a **configuration**:
```json
{
  "id": "copywriter-pro",
  "name": "CopyWriter Pro",
  "systemPrompt": "You are an expert copywriter specializing in...",
  "model": "claude-sonnet-4-5",
  "tools": ["web_search", "generate_variations"],
  "temperature": 0.7,
  "maxTokens": 4096,
  "category": "Writing",
  "price": { "perMessage": 0.01, "perSession": 0.50 }
}
```

When a user chats with an agent:
1. Load agent config from DB
2. Build system prompt + tools
3. Call LLM API (Claude/OpenAI) with streaming
4. Stream response back to user via SSE
5. Store conversation in DB
6. Deduct credits from user balance

**Why this works:**
- No infrastructure to manage (no Docker, no VMs)
- Scales automatically via Vercel serverless
- Each request is stateless (conversation stored in DB)
- Can add tools/capabilities per agent easily
- Cost = LLM API costs + small margin

**Future scaling:**
- Add tool execution (web scraping, image gen, code execution)
- Add agent memory (vector DB for long-term context)
- Add agent-to-agent collaboration
- Add custom agent creation by users

---

## Data Model

### Core Entities

```
User
├── id, email, name, avatar
├── credits (balance)
├── plan (free/pro/unlimited)
└── created_at

Agent
├── id, slug, name, avatar
├── description, long_description
├── system_prompt
├── model (claude-sonnet-4-5, gpt-4o, etc.)
├── tools[] (available capabilities)
├── category (Writing, Design, Travel, Code, etc.)
├── pricing { per_message, per_session }
├── creator_id (FK → User, for user-created agents)
├── rating, total_uses
├── featured, published
└── created_at

Conversation
├── id, user_id, agent_id
├── title
├── messages[] (JSON)
├── token_count
├── cost
└── created_at, updated_at

Message
├── id, conversation_id
├── role (user/assistant/system)
├── content
├── tool_calls[] (JSON)
├── tokens_used
└── created_at

Transaction
├── id, user_id
├── type (credit_purchase, usage, refund)
├── amount
├── stripe_id
└── created_at

Category
├── id, name, slug, icon, description
└── agent_count
```

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Hero, featured agents, categories, CTA |
| `/agents` | Marketplace | Browse/search all agents with filters |
| `/agents/[slug]` | Agent Detail | Description, reviews, "Start Chat" CTA |
| `/chat/[conversationId]` | Chat | Full-screen chat with agent |
| `/dashboard` | User Dashboard | Usage, conversations, credits |
| `/dashboard/billing` | Billing | Buy credits, payment history |
| `/create` | Create Agent | Build your own agent (Pro feature) |
| `/login` | Auth | Sign in / Sign up |
| `/api/chat` | API | Chat endpoint (streaming) |
| `/api/agents` | API | CRUD agents |
| `/api/credits` | API | Purchase/check credits |

---

## Agent Categories (Launch)

1. ✍️ **CopyWriter** — Marketing copy, product descriptions, email campaigns
2. 🎨 **Design Reviewer** — UI/UX feedback, design critique, accessibility checks
3. ✈️ **Travel Planner** — Itineraries, local tips, budget planning
4. 💻 **Code Reviewer** — Code review, bug detection, refactoring suggestions
5. 📊 **Data Analyst** — Data interpretation, visualization suggestions, insights
6. 📝 **Content Strategist** — Blog ideas, SEO, content calendars
7. 🎯 **Marketing Advisor** — Campaign strategy, audience targeting, funnel optimization
8. 📧 **Email Writer** — Cold outreach, newsletters, follow-ups
9. 🧠 **Research Assistant** — Deep research, summarization, competitive analysis
10. ⚖️ **Legal Advisor** — Contract review, compliance checks, terms drafting

---

## MVP Scope (Phase 1)

### Must Have
- [ ] Landing page (Gumroad-style)
- [ ] Agent marketplace (browse, search, filter by category)
- [ ] Agent detail page (description, rating, "Start Chat")
- [ ] Chat interface (streaming responses)
- [ ] 5 pre-built agents with polished prompts
- [ ] User auth (Google + GitHub + email)
- [ ] Free tier (10 messages/day)
- [ ] Responsive design (mobile + desktop)
- [ ] Deploy on Vercel

### Nice to Have (Phase 2)
- [ ] Stripe payments (buy credits)
- [ ] Conversation history
- [ ] Agent ratings & reviews
- [ ] Create your own agent
- [ ] Agent sharing (public links)
- [ ] API access for developers

### Future (Phase 3)
- [ ] Agent tools (web search, code execution, image gen)
- [ ] Agent memory (remember past conversations)
- [ ] Agent marketplace (users sell their agents)
- [ ] Team workspaces
- [ ] Usage analytics dashboard

---

## Task Breakdown

### Sprint 1: Foundation (Day 1-2)
1. Init Next.js project with TypeScript + Tailwind
2. Set up Prisma + PostgreSQL schema
3. Design system: colors, typography, components
4. Auth setup (NextAuth v5)
5. Basic layout (nav, footer)
6. Push to GitHub

### Sprint 2: Marketplace (Day 2-3)
7. Seed database with 5 agents
8. Agent card component (Gumroad-style)
9. Marketplace page (/agents) with grid + filters
10. Agent detail page (/agents/[slug])
11. Category pages
12. Search functionality

### Sprint 3: Chat (Day 3-4)
13. Chat UI component (full-screen, streaming)
14. `/api/chat` endpoint (Vercel AI SDK + Claude)
15. Conversation storage (DB)
16. Message history in chat
17. Agent system prompt injection
18. Token counting + usage tracking

### Sprint 4: User Features (Day 4-5)
19. User dashboard
20. Conversation list/history
21. Free tier limits (10 msgs/day)
22. Credits system
23. Basic billing page

### Sprint 5: Polish & Deploy (Day 5-6)
24. Landing page (hero, features, testimonials)
25. Responsive design pass
26. SEO (meta tags, OG images)
27. Error handling + loading states
28. Vercel deployment + domain
29. Final QA

---

## Environment Variables Needed

```env
# Database
DATABASE_URL=postgresql://...

# Auth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_ID=...
GITHUB_SECRET=...

# AI
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# Stripe (Phase 2)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Vercel
VERCEL_URL=...
```

---

## Infrastructure Requirements

For MVP, we need:
1. **PostgreSQL database** — Neon (free tier) or Supabase
2. **Anthropic API key** — Already have one
3. **OpenAI API key** — Already have one
4. **Vercel account** — Already have one
5. **GitHub repo** — Will create

That's it. No Redis, no Docker, no VMs. The beauty of the API-first approach is that all "agents" run via LLM API calls — no persistent processes needed.

---

## Open Questions for Devesh

1. **Project name?** AgentHub? AgentStore? AgentMarket? Something else?
2. **Domain?** Do you have one in mind?
3. **Notion access?** Need API token for task management
4. **Google OAuth credentials?** For NextAuth (we have the JSON but may need to add redirect URIs)
5. **Budget for LLM APIs?** How much per month for agent inference?
6. **Priority agents?** Which 5 agents to build first?
