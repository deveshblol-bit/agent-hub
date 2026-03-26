import Link from "next/link";

interface AgentCardProps {
  slug: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  totalUses: number;
  pricePerMessage: number;
  featured?: boolean;
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

export default function AgentCard({
  slug,
  name,
  description,
  category,
  rating,
  totalUses,
  pricePerMessage,
  featured,
}: AgentCardProps) {
  return (
    <Link href={`/agents/${slug}`} className="group block">
      <div className="relative bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col">
        {featured && (
          <div className="absolute -top-2.5 right-4 bg-coral text-white text-xs font-semibold px-3 py-1 rounded-full">
            Featured
          </div>
        )}

        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral/10 to-purple/10 flex items-center justify-center text-2xl shrink-0">
            {categoryIcons[category] || "\uD83E\uDD16"}
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-lg group-hover:text-coral transition-colors">
              {name}
            </h3>
            <span className="text-xs text-muted font-medium">{category}</span>
          </div>
        </div>

        <p className="text-sm text-muted leading-relaxed mb-6 flex-1 line-clamp-3">
          {description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              <span className="text-yellow-500">&#9733;</span> {rating.toFixed(1)}
            </span>
            <span className="text-xs text-muted">
              {formatUses(totalUses)} uses
            </span>
          </div>
          <span className="text-sm font-semibold text-coral">
            ${pricePerMessage.toFixed(2)}/msg
          </span>
        </div>
      </div>
    </Link>
  );
}
