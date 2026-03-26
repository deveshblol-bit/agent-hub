import Link from "next/link";
import { prisma } from "@/lib/prisma";
import AgentCard from "@/components/AgentCard";

export default async function HomePage() {
  const featuredAgents = await prisma.agent.findMany({
    where: { featured: true, published: true },
    include: { category: true },
    take: 6,
  });

  const categories = await prisma.category.findMany();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-coral/5 via-white to-purple/5" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="font-heading text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6">
              AI agents that{" "}
              <span className="text-coral">actually work.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted leading-relaxed mb-10 max-w-xl">
              Discover specialized AI agents for copywriting, marketing, travel
              planning, and more. Start chatting in seconds.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 bg-coral text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-coral-dark transition-colors text-base"
              >
                Explore Agents
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/agents"
                className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-nearblack font-semibold px-8 py-3.5 rounded-xl hover:border-gray-300 transition-colors text-base"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="font-heading text-3xl font-bold mb-8">
          Browse by category
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const icons: Record<string, string> = {
              writing: "\u270F\uFE0F",
              marketing: "\uD83D\uDCE3",
              travel: "\u2708\uFE0F",
            };
            return (
              <Link
                key={cat.id}
                href={`/agents?category=${cat.slug}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-coral/30 hover:bg-coral/5 transition-all"
              >
                <span className="text-2xl">{icons[cat.slug] || "\uD83E\uDD16"}</span>
                <div>
                  <p className="font-heading font-semibold">{cat.name}</p>
                  <p className="text-xs text-muted">{cat.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Agents */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-heading text-3xl font-bold">Featured Agents</h2>
          <Link
            href="/agents"
            className="text-sm font-medium text-coral hover:text-coral-dark transition-colors"
          >
            View all &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              slug={agent.slug}
              name={agent.name}
              description={agent.description}
              category={agent.category.name}
              rating={agent.rating}
              totalUses={agent.totalUses}
              pricePerMessage={agent.pricePerMessage}
              featured={agent.featured}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-nearblack to-gray-800 rounded-3xl p-12 md:p-16 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to supercharge your workflow?
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Get started for free. No credit card required. 10 messages per day
            on the free plan.
          </p>
          <Link
            href="/agents"
            className="inline-flex items-center gap-2 bg-coral text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-coral-dark transition-colors"
          >
            Start for free
          </Link>
        </div>
      </section>
    </div>
  );
}
