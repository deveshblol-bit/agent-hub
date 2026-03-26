import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const agent = await prisma.agent.findUnique({
    where: { slug },
  });

  if (!agent) return { title: "Agent Not Found" };

  return {
    title: `${agent.name} — Agentroad`,
    description: agent.description,
  };
}

function formatUses(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

const categoryIcons: Record<string, string> = {
  Writing: "\u270F\uFE0F",
  Marketing: "\uD83D\uDCE3",
  Travel: "\u2708\uFE0F",
  Code: "\uD83D\uDCBB",
  Design: "\uD83C\uDFA8",
};

export default async function AgentDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const agent = await prisma.agent.findUnique({
    where: { slug },
    include: { category: true },
  });

  if (!agent) notFound();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted mb-8">
        <Link href="/agents" className="hover:text-nearblack transition-colors">
          Agents
        </Link>
        <span>/</span>
        <Link
          href={`/agents?category=${agent.category.slug}`}
          className="hover:text-nearblack transition-colors"
        >
          {agent.category.name}
        </Link>
        <span>/</span>
        <span className="text-nearblack">{agent.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="flex items-start gap-5 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coral/10 to-purple/10 flex items-center justify-center text-3xl shrink-0">
              {categoryIcons[agent.category.name] || "\uD83E\uDD16"}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-heading text-3xl md:text-4xl font-black">
                  {agent.name}
                </h1>
                {agent.featured && (
                  <span className="bg-coral text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted">
                <span className="font-medium text-nearblack">
                  <span className="text-yellow-500">&#9733;</span>{" "}
                  {agent.rating.toFixed(1)}
                </span>
                <span>{formatUses(agent.totalUses)} uses</span>
                <span>{agent.category.name}</span>
              </div>
            </div>
          </div>

          <p className="text-lg text-muted leading-relaxed mb-8">
            {agent.description}
          </p>

          {agent.longDescription && (
            <div className="prose prose-gray max-w-none mb-8">
              <h2 className="font-heading text-xl font-bold mb-4">About this agent</h2>
              <p className="text-muted leading-relaxed whitespace-pre-line">
                {agent.longDescription}
              </p>
            </div>
          )}

          <div className="bg-offwhite rounded-2xl p-6">
            <h2 className="font-heading text-xl font-bold mb-4">
              Capabilities
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                "Instant responses",
                "Context-aware conversations",
                "Multiple output formats",
                "Expert-level knowledge",
              ].map((cap) => (
                <div key={cap} className="flex items-center gap-2 text-sm text-muted">
                  <svg className="w-4 h-4 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {cap}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
            <div>
              <div className="text-3xl font-heading font-black mb-1">
                ${agent.pricePerMessage.toFixed(2)}
                <span className="text-base font-normal text-muted">
                  {" "}/ message
                </span>
              </div>
              <p className="text-sm text-muted">
                or ${agent.pricePerSession.toFixed(2)} per session
              </p>
            </div>

            <Link 
              href={`/chat/${agent.slug}`}
              className="block w-full bg-coral text-white font-semibold py-3.5 rounded-xl hover:bg-coral-dark transition-colors text-base text-center"
            >
              Start Chatting
            </Link>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Model</span>
                <span className="font-medium">{agent.model}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Category</span>
                <span className="font-medium">{agent.category.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Rating</span>
                <span className="font-medium">
                  <span className="text-yellow-500">&#9733;</span>{" "}
                  {agent.rating.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Total uses</span>
                <span className="font-medium">
                  {agent.totalUses.toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted text-center">
              Free plan includes 10 messages/day
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
