import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

// Helper to get or create demo user
async function getDemoUser() {
  let user = await prisma.user.findUnique({
    where: { email: "demo@agentroad.com" },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "demo@agentroad.com",
        name: "Demo User",
        credits: 10.0,
        plan: "free",
      },
    });
  }

  return user;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default async function DashboardPage() {
  const user = await getDemoUser();

  // Get user's conversations with agent details and message count
  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    include: {
      agent: {
        select: {
          slug: true,
          name: true,
          avatar: true,
          category: { select: { name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          role: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get today's message count
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayMessageCount = await prisma.message.count({
    where: {
      conversation: { userId: user.id },
      createdAt: { gte: today },
    },
  });

  // Group conversations by agent
  const conversationsByAgent = conversations.reduce((acc, conv) => {
    const agentName = conv.agent.name;
    if (!acc[agentName]) {
      acc[agentName] = [];
    }
    acc[agentName].push(conv);
    return acc;
  }, {} as Record<string, typeof conversations>);

  const categoryIcons: Record<string, string> = {
    Writing: "✏️",
    Marketing: "📣",
    Travel: "✈️",
    Code: "💻",
    Design: "🎨",
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-black mb-2">Dashboard</h1>
        <p className="text-muted">
          Manage your conversations and track your usage
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-3xl font-heading font-black text-coral mb-1">
            {conversations.length}
          </div>
          <p className="text-sm text-muted">Total Conversations</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-3xl font-heading font-black text-coral mb-1">
            {todayMessageCount} / 10
          </div>
          <p className="text-sm text-muted">Messages Today (Free Plan)</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-3xl font-heading font-black text-coral mb-1">
            {user.credits.toFixed(1)}
          </div>
          <p className="text-sm text-muted">Credits Remaining</p>
        </div>
      </div>

      {/* Conversations */}
      <div className="space-y-8">
        {conversations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coral/10 to-purple/10 flex items-center justify-center text-3xl mx-auto mb-4">
              💬
            </div>
            <h2 className="font-heading text-xl font-bold mb-2">
              No conversations yet
            </h2>
            <p className="text-muted mb-6">
              Start chatting with an agent to see your conversations here
            </p>
            <Link
              href="/agents"
              className="inline-block bg-coral text-white font-semibold px-6 py-3 rounded-xl hover:bg-coral-dark transition-colors"
            >
              Browse Agents
            </Link>
          </div>
        ) : (
          Object.entries(conversationsByAgent).map(
            ([agentName, agentConversations]) => {
              const firstConv = agentConversations[0];
              const agent = firstConv.agent;

              return (
                <div key={agentName}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral/20 to-purple/20 flex items-center justify-center text-lg">
                      {categoryIcons[agent.category.name] || "🤖"}
                    </div>
                    <div>
                      <h2 className="font-heading text-xl font-bold">
                        {agentName}
                      </h2>
                      <p className="text-sm text-muted">
                        {agentConversations.length} conversation
                        {agentConversations.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {agentConversations.map((conversation) => {
                      const lastMessage = conversation.messages[0];
                      const preview = lastMessage
                        ? lastMessage.content.substring(0, 100) +
                          (lastMessage.content.length > 100 ? "..." : "")
                        : "No messages yet";

                      return (
                        <Link
                          key={conversation.id}
                          href={`/chat/${agent.slug}?conversationId=${conversation.id}`}
                          className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-coral hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="font-semibold text-nearblack line-clamp-1">
                              {conversation.title}
                            </h3>
                            <span className="text-xs text-muted shrink-0">
                              {formatDate(
                                lastMessage?.createdAt || conversation.createdAt
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-muted line-clamp-2">
                            {lastMessage?.role === "user" ? "You: " : ""}
                            {preview}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                            <span>
                              {conversation.tokenCount.toLocaleString()} tokens
                            </span>
                            <span>·</span>
                            <span>${conversation.cost.toFixed(4)} cost</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }
          )
        )}
      </div>
    </div>
  );
}
