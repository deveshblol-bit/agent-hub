export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AgentCard from "@/components/AgentCard";
import Link from "next/link";

export const metadata = {
  title: "Explore Agents — Agentroad",
  description: "Browse our marketplace of specialized AI agents.",
};

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params.category;

  const agents = await prisma.agent.findMany({
    where: {
      published: true,
      ...(selectedCategory
        ? { category: { slug: selectedCategory } }
        : {}),
    },
    include: { category: true },
    orderBy: { totalUses: "desc" },
  });

  const categories = await prisma.category.findMany();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-heading text-4xl md:text-5xl font-black tracking-tight mb-3">
          Explore Agents
        </h1>
        <p className="text-muted text-lg">
          Find the perfect AI agent for your task.
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/agents"
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            !selectedCategory
              ? "bg-nearblack text-white border-nearblack"
              : "bg-white text-muted border-gray-200 hover:border-gray-300"
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/agents?category=${cat.slug}`}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              selectedCategory === cat.slug
                ? "bg-nearblack text-white border-nearblack"
                : "bg-white text-muted border-gray-200 hover:border-gray-300"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Agent Grid */}
      {agents.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted text-lg">No agents found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
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
      )}
    </div>
  );
}
