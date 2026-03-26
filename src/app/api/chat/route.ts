import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

// Extract text from a message (handles both content string and parts array)
function getTextContent(msg: { content?: string; parts?: Array<{ type: string; text?: string }> } | undefined): string {
  if (!msg) return "";
  if (typeof msg.content === "string" && msg.content) return msg.content;
  if (msg.parts) {
    return msg.parts
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("");
  }
  return "";
}

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
    const body = await req.json();
    const { messages, agentSlug, conversationId } = body as {
      messages: Array<{ role: string; content: string; parts?: Array<{ type: string; text?: string }> }>;
      agentSlug: string;
      conversationId?: string;
    };

    if (!messages || !agentSlug) {
      return new Response("Missing required fields", { status: 400 });
    }

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
      });
    }
    if (!conversation) {
      const firstUserMessage = messages.find((m) => m.role === "user");
      const msgText = getTextContent(firstUserMessage);
      const title = msgText ? msgText.substring(0, 50) : "New Conversation";

      conversation = await prisma.conversation.create({
        data: { userId: user.id, agentId: agent.id, title },
      });
    }

    // Save the latest user message to DB
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user") {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: getTextContent(lastUserMsg),
        },
      });
    }

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: agent.systemPrompt,
      messages: messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: getTextContent(m) })),
      async onFinish({ text, usage }) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: text,
            tokensUsed: usage.totalTokens,
          },
        });
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            tokenCount: { increment: usage.totalTokens || 0 },
            cost: { increment: (usage.totalTokens || 0) * 0.00001 },
            updatedAt: new Date(),
          },
        });
        await prisma.agent.update({
          where: { id: agent.id },
          data: { totalUses: { increment: 1 } },
        });
      },
    });

    const response = result.toTextStreamResponse();

    // Append conversation ID header
    response.headers.set("X-Conversation-Id", conversation.id);

    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
