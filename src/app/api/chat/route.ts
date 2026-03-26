import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

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

export async function POST(req: Request) {
  try {
    const { messages, agentSlug, conversationId } = await req.json();

    if (!messages || !agentSlug) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Get demo user (in production, use NextAuth session)
    const user = await getDemoUser();

    // Check free tier limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessageCount = await prisma.message.count({
      where: {
        conversation: { userId: user.id },
        createdAt: { gte: today },
      },
    });

    if (user.plan === "free" && todayMessageCount >= 10) {
      return new Response(
        JSON.stringify({ error: "Daily free message limit reached (10/day)" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get agent
    const agent = await prisma.agent.findUnique({
      where: { slug: agentSlug },
    });

    if (!agent) {
      return new Response("Agent not found", { status: 404 });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    if (!conversation) {
      // Create new conversation with a title from first message
      const firstUserMessage = messages.find((m: any) => m.role === "user");
      const title = firstUserMessage?.content
        ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
        : "New Conversation";

      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          agentId: agent.id,
          title,
        },
        include: { messages: true },
      });
    }

    // Save user message
    const userMessage = messages[messages.length - 1];
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: userMessage.content,
      },
    });

    // Load full conversation history for context
    const allMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
    });

    // Build messages array with system prompt and history
    const messageHistory = allMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Initialize Anthropic
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Stream response
    const result = streamText({
      model: anthropic(agent.model),
      system: agent.systemPrompt,
      messages: messageHistory,
      async onFinish({ text, usage }) {
        // Save assistant message
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: text,
            tokensUsed: usage.totalTokens,
          },
        });

        // Update conversation stats
        const totalTokens = usage.totalTokens || 0;
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            tokenCount: { increment: totalTokens },
            cost: { increment: totalTokens * 0.00001 }, // Example cost calculation
            updatedAt: new Date(),
          },
        });

        // Increment agent usage
        await prisma.agent.update({
          where: { id: agent.id },
          data: { totalUses: { increment: 1 } },
        });
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "X-Conversation-Id": conversation.id,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
