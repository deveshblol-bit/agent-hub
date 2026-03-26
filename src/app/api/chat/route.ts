import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { buildTravelContext } from "@/lib/travel-tools";

export const maxDuration = 120;

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessageCount = await prisma.message.count({
      where: {
        conversation: { userId: user.id },
        createdAt: { gte: today },
      },
    });

    if (user.plan === "free" && todayMessageCount >= 100) {
      return new Response(
        JSON.stringify({ error: "Daily free message limit reached" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { slug: agentSlug },
    });
    if (!agent) {
      return new Response("Agent not found", { status: 404 });
    }

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    }
    if (!conversation) {
      const firstUserMessage = messages.find((m) => m.role === "user");
      const title = getTextContent(firstUserMessage).substring(0, 50) || "New Conversation";

      conversation = await prisma.conversation.create({
        data: { userId: user.id, agentId: agent.id, title },
      });
    }

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

    // Build system prompt with pre-fetched context for travel planner
    let systemPrompt = agent.systemPrompt;

    if (agentSlug === "travel-planner") {
      const plainMessages = messages.map((m) => ({
        role: m.role,
        content: getTextContent(m),
      }));
      const travelContext = await buildTravelContext(plainMessages);
      if (travelContext) {
        systemPrompt += `\n\n---\n## LIVE DATA (use this in your response)\n\n${travelContext}`;
      }
    }

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: getTextContent(m),
      })),
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
    response.headers.set("X-Conversation-Id", conversation.id);
    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
