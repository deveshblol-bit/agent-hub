import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { slug } = await params;

    const agent = await prisma.agent.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        avatar: true,
      },
    });

    if (!agent) {
      return new Response("Agent not found", { status: 404 });
    }

    return Response.json(agent);
  } catch (error) {
    console.error("Agent API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
