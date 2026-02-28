export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 animated-gradient opacity-30" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 shimmer">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm text-gray-300">
                        Powered by AI • Browser Automation Made Easy
                    </span>
                </div>

                {/* Main Heading */}
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-tight mb-8">
                    <span className="block">Automate Your</span>
                    <span className="gradient-text">Browser Tasks</span>
                    <span className="block">With AI</span>
                </h1>

                {/* Subtitle */}
                <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                    Record once, replay forever. AutoPattern learns your browser workflows
                    and automates them using cutting-edge AI. Say goodbye to repetitive
                    tasks.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                    <a
                        href="chrome-extension://oigefdjfcokhefifcockgnpjfgefomdd/src/ui/dashboard.html"
                        className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 font-semibold text-lg hover:scale-105 transition-all pulse-glow"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Open Dashboard
                            <svg
                                className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                            </svg>
                        </span>
                    </a>
                    <a
                        href="#demo"
                        className="px-8 py-4 rounded-full border border-white/20 font-semibold text-lg hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        Watch Demo
                    </a>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                    {[
                        { value: "10x", label: "Faster Workflows" },
                        { value: "100%", label: "No Code Required" },
                        { value: "∞", label: "Automations" },
                    ].map((stat, i) => (
                        <div key={i} className="text-center">
                            <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
                                {stat.value}
                            </div>
                            <div className="text-gray-400 text-sm">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Floating Browser Mockup */}
                <div className="mt-20 relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl blur-xl opacity-30" />
                    <div className="relative glass rounded-2xl p-2 glow-purple float">
                        <div className="bg-[#1a1a2e] rounded-xl overflow-hidden">
                            {/* Browser Header */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#0f0f1a] border-b border-white/10">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="bg-white/10 rounded-lg px-4 py-1.5 text-sm text-gray-400 text-center">
                                        AutoPattern Dashboard
                                    </div>
                                </div>
                            </div>
                            {/* Dashboard Preview */}
                            <div className="h-64 md:h-96 flex items-center justify-center p-8">
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mb-6">
                                        <svg
                                            className="w-10 h-10 text-white"
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
                                    <h3 className="text-2xl font-bold mb-2">Your Workflows</h3>
                                    <p className="text-gray-400">
                                        Record, manage, and run automations
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400 animate-bounce">
                <span className="text-sm">Scroll to explore</span>
                <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                </svg>
            </div>
        </section>
    );
}
