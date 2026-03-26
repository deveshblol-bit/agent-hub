import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-coral flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-heading text-xl font-bold tracking-tight">
                Agentroad
              </span>
            </div>
            <p className="text-sm text-muted max-w-xs">
              Discover and use specialized AI agents for any task. The
              marketplace for AI-powered productivity.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/agents" className="text-sm text-muted hover:text-nearblack transition-colors">
                  Explore Agents
                </Link>
              </li>
              <li>
                <Link href="/agents" className="text-sm text-muted hover:text-nearblack transition-colors">
                  Categories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-sm mb-4">Company</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm text-muted hover:text-nearblack transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/" className="text-sm text-muted hover:text-nearblack transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-8 text-center">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Agentroad. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
