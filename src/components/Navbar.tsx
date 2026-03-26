import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <span className="font-heading text-xl font-bold tracking-tight">
            Agentroad
          </span>
        </Link>

        <div className="flex items-center gap-8">
          <Link
            href="/agents"
            className="text-sm font-medium text-muted hover:text-nearblack transition-colors"
          >
            Explore Agents
          </Link>
          <Link
            href="/agents"
            className="text-sm font-medium bg-nearblack text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
