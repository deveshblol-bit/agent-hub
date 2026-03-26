// Travel Planner helper functions — pre-fetch context data before LLM call

export function getGoogleMapsLink(place: string, city: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(place + " " + city)}`;
}

export function getBookingLink(destination: string): string {
  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}`;
}

export function getActivityLinks(destination: string) {
  return {
    getYourGuide: `https://www.getyourguide.com/s/?q=${encodeURIComponent(destination)}`,
    klook: `https://www.klook.com/search/?query=${encodeURIComponent(destination)}`,
    viator: `https://www.viator.com/search/${encodeURIComponent(destination)}`,
  };
}

export async function getWeather(city: string): Promise<string> {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "Weather data unavailable.";
    const data = await res.json();
    const current = data.current_condition?.[0];
    const forecast = data.weather?.slice(0, 3);

    let result = `Current: ${current?.temp_C}°C, ${current?.weatherDesc?.[0]?.value}. `;
    if (forecast) {
      result += "3-day forecast: ";
      result += forecast
        .map(
          (d: any) =>
            `${d.date}: ${d.mintempC}-${d.maxtempC}°C, ${d.hourly?.[4]?.weatherDesc?.[0]?.value || "N/A"}`
        )
        .join("; ");
    }
    return result;
  } catch {
    return "Weather data unavailable.";
  }
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<string> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${from.toUpperCase()}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return `Could not convert ${from} to ${to}.`;
    const data = await res.json();
    const rate = data.rates?.[to.toUpperCase()];
    if (!rate) return `Exchange rate for ${to} not found.`;
    const converted = (amount * rate).toFixed(2);
    return `${amount} ${from.toUpperCase()} = ${converted} ${to.toUpperCase()} (rate: ${rate.toFixed(4)})`;
  } catch {
    return `Currency conversion unavailable.`;
  }
}

import { getDestinationGuide } from "./destination-guides";

// Analyze user messages to extract travel context and pre-fetch relevant data
export async function buildTravelContext(messages: Array<{ role: string; content: string }>): Promise<string> {
  const allText = messages.map((m) => m.content).join(" ").toLowerCase();

  // Extract destination
  const destinations = extractDestinations(allText);
  if (destinations.length === 0) return "";

  const dest = destinations[0];
  const contextParts: string[] = [];

  // Inject curated destination guide (most important!)
  const guide = getDestinationGuide(dest);
  if (guide) {
    contextParts.push(guide);
  }

  // Fetch weather
  const weather = await getWeather(dest);
  contextParts.push(`## Weather for ${dest}\n${weather}`);

  // Currency detection and conversion
  const currencyMatch = allText.match(/(\d[\d,]*)\s*(inr|usd|eur|gbp|aud|cad|sgd|thb|idr|myr|php|vnd)/i);
  if (currencyMatch) {
    const amount = parseFloat(currencyMatch[1].replace(/,/g, ""));
    const fromCurrency = currencyMatch[2].toUpperCase();
    // Convert to likely destination currency
    const destCurrency = getDestinationCurrency(dest);
    if (destCurrency && destCurrency !== fromCurrency) {
      const conversion = await convertCurrency(amount, fromCurrency, destCurrency);
      contextParts.push(`## Currency Conversion\n${conversion}`);
    }
  }

  // Generate useful links
  const bookingLink = getBookingLink(dest);
  const activityLinks = getActivityLinks(dest);
  contextParts.push(`## Booking Links
- Accommodation: [Booking.com](${bookingLink})
- Activities: [GetYourGuide](${activityLinks.getYourGuide}) | [Klook](${activityLinks.klook}) | [Viator](${activityLinks.viator})`);

  // Generate map link
  contextParts.push(`## Map
- [📍 View ${dest} on Google Maps](${getGoogleMapsLink(dest, "")})`);

  return contextParts.join("\n\n");
}

function extractDestinations(text: string): string[] {
  const destinations: string[] = [];
  const known = [
    "bali", "tokyo", "paris", "london", "new york", "bangkok", "singapore",
    "dubai", "rome", "barcelona", "amsterdam", "istanbul", "prague",
    "lisbon", "berlin", "vienna", "budapest", "athens", "santorini",
    "maldives", "phuket", "chiang mai", "hanoi", "ho chi minh",
    "kuala lumpur", "seoul", "osaka", "kyoto", "taipei",
    "goa", "jaipur", "delhi", "mumbai", "kerala", "manali", "shimla",
    "rishikesh", "varanasi", "udaipur", "ladakh", "andaman",
    "sri lanka", "nepal", "bhutan", "vietnam", "cambodia", "laos",
    "bora bora", "fiji", "hawaii", "cancun", "tulum", "costa rica",
    "morocco", "egypt", "cape town", "zanzibar", "nairobi",
    "sydney", "melbourne", "new zealand", "queenstown",
    "switzerland", "iceland", "norway", "scotland", "ireland",
    "croatia", "montenegro", "greece", "italy", "spain", "portugal",
    "mexico city", "colombia", "peru", "argentina", "brazil", "chile",
  ];
  for (const d of known) {
    if (text.includes(d)) {
      destinations.push(d.charAt(0).toUpperCase() + d.slice(1));
    }
  }
  return destinations;
}

function getDestinationCurrency(destination: string): string | null {
  const map: Record<string, string> = {
    bali: "IDR", tokyo: "JPY", osaka: "JPY", kyoto: "JPY",
    paris: "EUR", rome: "EUR", barcelona: "EUR", amsterdam: "EUR",
    berlin: "EUR", vienna: "EUR", lisbon: "EUR", athens: "EUR", santorini: "EUR",
    london: "GBP", scotland: "GBP", ireland: "EUR",
    bangkok: "THB", phuket: "THB", "chiang mai": "THB",
    singapore: "SGD", dubai: "AED",
    "kuala lumpur": "MYR", seoul: "KRW", taipei: "TWD",
    hanoi: "VND", "ho chi minh": "VND", vietnam: "VND",
    maldives: "USD", hawaii: "USD", "new york": "USD", cancun: "MXN",
    goa: "INR", jaipur: "INR", delhi: "INR", mumbai: "INR", kerala: "INR",
    manali: "INR", shimla: "INR", rishikesh: "INR", varanasi: "INR",
    udaipur: "INR", ladakh: "INR", andaman: "INR",
    sydney: "AUD", melbourne: "AUD", "new zealand": "NZD",
    morocco: "MAD", egypt: "EGP", "cape town": "ZAR",
    iceland: "ISK", norway: "NOK", switzerland: "CHF",
    prague: "CZK", budapest: "HUF", croatia: "EUR",
    "sri lanka": "LKR", nepal: "NPR", cambodia: "KHR",
  };
  return map[destination.toLowerCase()] || null;
}
