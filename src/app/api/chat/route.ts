import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120;

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

// Travel Planner Tools
const travelPlannerTools = {
  searchWeb: tool({
    description: "Search the web for current information about places, reviews, opening hours, and prices",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
    }),
    execute: async (input) => {
      try {
        // Try Brave API first if key is available
        if (process.env.BRAVE_API_KEY) {
          const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input.query)}`,
            {
              headers: {
                "Accept": "application/json",
                "X-Subscription-Token": process.env.BRAVE_API_KEY,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const results = data.web?.results?.slice(0, 5).map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.description,
            })) || [];
            return { results, source: "Brave Search" };
          }
        }

        // Fallback to DuckDuckGo lite (scraping)
        const response = await fetch(
          `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(input.query)}`
        );
        const html = await response.text();

        // Simple parsing of DuckDuckGo lite results
        const results: { title: string; url: string; snippet: string }[] = [];
        const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
        const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([^<]+)</g;

        let linkMatch;
        let snippetMatch;
        const links = [];
        const snippets = [];

        while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 5) {
          if (linkMatch[1].startsWith("http")) {
            links.push({ url: linkMatch[1], title: linkMatch[2] });
          }
        }

        while ((snippetMatch = snippetRegex.exec(html)) !== null && snippets.length < 5) {
          snippets.push(snippetMatch[1].trim());
        }

        for (let i = 0; i < Math.min(links.length, 5); i++) {
          results.push({
            title: links[i].title,
            url: links[i].url,
            snippet: snippets[i] || "",
          });
        }

        return { results, source: "DuckDuckGo" };
      } catch (error) {
        return { results: [], error: "Search failed", source: "error" };
      }
    },
  }),

  getGoogleMapsLink: tool({
    description: "Generate a Google Maps search link for a specific place in a city",
    inputSchema: z.object({
      place: z.string().describe("The name of the place (restaurant, hotel, attraction)"),
      city: z.string().describe("The city where the place is located"),
    }),
    execute: async (input) => {
      const searchQuery = `${input.place} ${input.city}`;
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      return { url, searchQuery };
    },
  }),

  getWeather: tool({
    description: "Get current weather and 3-day forecast for a city",
    inputSchema: z.object({
      city: z.string().describe("The city name"),
    }),
    execute: async (input) => {
      try {
        const response = await fetch(
          `https://wttr.in/${encodeURIComponent(input.city)}?format=j1`
        );
        
        if (!response.ok) {
          return { error: "Weather data not available" };
        }

        const data = await response.json();
        const current = data.current_condition[0];
        const forecast = data.weather.slice(0, 3);

        return {
          current: {
            temp_c: current.temp_C,
            temp_f: current.temp_F,
            condition: current.weatherDesc[0].value,
            feelslike_c: current.FeelsLikeC,
            feelslike_f: current.FeelsLikeF,
            humidity: current.humidity,
          },
          forecast: forecast.map((day: any) => ({
            date: day.date,
            max_temp_c: day.maxtempC,
            max_temp_f: day.maxtempF,
            min_temp_c: day.mintempC,
            min_temp_f: day.mintempF,
            condition: day.hourly[0].weatherDesc[0].value,
          })),
        };
      } catch (error) {
        return { error: "Failed to fetch weather data" };
      }
    },
  }),

  searchAccommodation: tool({
    description: "Generate Booking.com search URL and provide accommodation search tips",
    inputSchema: z.object({
      destination: z.string().describe("The destination city or area"),
      budget: z.enum(["budget", "mid", "luxury"]).describe("Budget level"),
    }),
    execute: async (input) => {
      const url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(input.destination)}`;
      
      const tips = {
        budget: "Look for hostels, guesthouses, or budget hotels. Filter by price and check reviews for cleanliness.",
        mid: "3-star hotels or well-rated boutique options. Look for free breakfast and good location.",
        luxury: "4-5 star hotels with premium amenities. Check for spa, pool, and concierge services.",
      };

      return {
        url,
        budget: input.budget,
        tips: tips[input.budget],
        additionalTip: "Book in advance for better rates, and check cancellation policies.",
      };
    },
  }),

  searchActivities: tool({
    description: "Generate search URLs for activities and tours on multiple platforms",
    inputSchema: z.object({
      destination: z.string().describe("The destination city or area"),
      activityType: z.string().optional().describe("Type of activity (tours, food, adventure, etc.)"),
    }),
    execute: async (input) => {
      const query = input.activityType ? `${input.destination} ${input.activityType}` : input.destination;
      
      return {
        platforms: [
          {
            name: "GetYourGuide",
            url: `https://www.getyourguide.com/s/?q=${encodeURIComponent(query)}`,
          },
          {
            name: "Klook",
            url: `https://www.klook.com/search/?query=${encodeURIComponent(query)}`,
          },
          {
            name: "Viator",
            url: `https://www.viator.com/search?text=${encodeURIComponent(query)}`,
          },
        ],
        tip: "Compare prices across platforms and read recent reviews. Book skip-the-line tickets for popular attractions.",
      };
    },
  }),

  currencyConvert: tool({
    description: "Convert currency amounts using current exchange rates",
    inputSchema: z.object({
      amount: z.number().describe("The amount to convert"),
      from: z.string().describe("Source currency code (e.g., USD, EUR, GBP)"),
      to: z.string().describe("Target currency code"),
    }),
    execute: async (input) => {
      try {
        const response = await fetch(
          `https://open.er-api.com/v6/latest/${input.from.toUpperCase()}`
        );

        if (!response.ok) {
          return { error: "Currency conversion failed" };
        }

        const data = await response.json();
        const rate = data.rates[input.to.toUpperCase()];

        if (!rate) {
          return { error: `Currency ${input.to} not found` };
        }

        const converted = input.amount * rate;

        return {
          amount: input.amount,
          from: input.from.toUpperCase(),
          to: input.to.toUpperCase(),
          rate,
          converted: Math.round(converted * 100) / 100,
          formatted: `${input.amount} ${input.from.toUpperCase()} = ${Math.round(converted * 100) / 100} ${input.to.toUpperCase()}`,
        };
      } catch (error) {
        return { error: "Failed to fetch exchange rates" };
      }
    },
  }),
};

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

    if (user.plan === "free" && todayMessageCount >= 100) {
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

    // Conditionally add tools for travel-planner agent
    const streamConfig: any = {
      model: openai("gpt-4o-mini"),
      system: agent.systemPrompt,
      messages: messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: getTextContent(m) })),
      async onFinish({ text, usage }: { text: string; usage: any }) {
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
    };

    // Add tools only for travel-planner
    if (agentSlug === "travel-planner") {
      streamConfig.tools = travelPlannerTools;
      streamConfig.maxSteps = 5;
    }

    const result = streamText(streamConfig);

    const response = result.toTextStreamResponse();

    // Append conversation ID header
    response.headers.set("X-Conversation-Id", conversation.id);

    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
