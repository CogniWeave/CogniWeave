import Link from "next/link";

export function Footer() {
    return (
        <footer className="py-16 border-t border-white/10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <Link href="/" className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                </svg>
                            </div>
                            <span className="text-xl font-bold">AutoPattern</span>
                        </Link>
                        <p className="text-gray-400 max-w-md">
                            Automate your browser tasks with AI. Record once, replay forever.
                            Built with browser-use and powered by Gemini AI.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Product</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li>
                                <Link href="#features" className="hover:text-white transition-colors">
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link href="#how-it-works" className="hover:text-white transition-colors">
                                    How It Works
                                </Link>
                            </li>
                            <li>
                                <Link href="#demo" className="hover:text-white transition-colors">
                                    Demo
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="chrome-extension://oigefdjfcokhefifcockgnpjfgefomdd/src/ui/dashboard.html"
                                    className="hover:text-white transition-colors"
                                >
                                    Dashboard
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Resources</h4>
                        <ul className="space-y-2 text-gray-400">
                            <li>
                                <a
                                    href="https://github.com/autopattern/autopattern"
                                    target="_blank"
                                    className="hover:text-white transition-colors"
                                >
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://github.com/autopattern/autopattern/issues"
                                    target="_blank"
                                    className="hover:text-white transition-colors"
                                >
                                    Report Bug
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://browser-use.com"
                                    target="_blank"
                                    className="hover:text-white transition-colors"
                                >
                                    Browser Use
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 gap-4">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} AutoPattern. Open source under MIT
                        License.
                    </p>
                    <div className="flex items-center gap-6">
                        <a
                            href="https://github.com/autopattern/autopattern"
                            target="_blank"
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path
                                    fillRule="evenodd"
                                    clipRule="evenodd"
                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                />
                            </svg>
                        </a>
                        <a
                            href="https://twitter.com"
                            target="_blank"
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
