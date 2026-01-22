export function Demo() {
    return (
        <section id="demo" className="py-32 relative">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />

            <div className="relative max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        See It In <span className="gradient-text">Action</span>
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Watch how CogniWeave transforms manual browser tasks into automated
                        workflows.
                    </p>
                </div>

                {/* Demo Container */}
                <div className="relative max-w-5xl mx-auto">
                    {/* Glow Effect */}
                    <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500 rounded-3xl blur-2xl opacity-20" />

                    {/* Browser Window */}
                    <div className="relative glass rounded-2xl overflow-hidden">
                        {/* Browser Header */}
                        <div className="flex items-center gap-4 px-6 py-4 bg-[#0f0f1a] border-b border-white/10">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                            </div>
                            <div className="flex-1">
                                <div className="w-full max-w-md mx-auto bg-white/10 rounded-lg px-4 py-2 text-sm text-gray-400 flex items-center gap-2">
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                        />
                                    </svg>
                                    <span>chrome-extension://autopattern/dashboard</span>
                                </div>
                            </div>
                        </div>

                        {/* Dashboard Preview */}
                        <div className="p-8 bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e]">
                            {/* Sidebar + Content Layout */}
                            <div className="flex gap-6 min-h-[400px]">
                                {/* Sidebar */}
                                <div className="w-48 glass rounded-xl p-4 space-y-2">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/20 text-purple-400">
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
                                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                                            />
                                        </svg>
                                        <span className="text-sm font-medium">Workflows</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
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
                                        </svg>
                                        <span className="text-sm">Run Task</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg text-gray-400 hover:bg-white/5 transition-colors">
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
                                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                            />
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                            />
                                        </svg>
                                        <span className="text-sm">Settings</span>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 space-y-4">
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-semibold">Your Workflows</h3>
                                        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-sm font-medium flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                                />
                                            </svg>
                                            New Recording
                                        </button>
                                    </div>

                                    {/* Workflow Cards */}
                                    <div className="space-y-3">
                                        {[
                                            {
                                                name: "Login to Dashboard",
                                                steps: 5,
                                                date: "2 hours ago",
                                            },
                                            { name: "Export Sales Report", steps: 8, date: "1 day ago" },
                                            { name: "Submit Weekly Form", steps: 12, date: "3 days ago" },
                                        ].map((workflow, i) => (
                                            <div
                                                key={i}
                                                className="glass rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                        <svg
                                                            className="w-5 h-5 text-purple-400"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                            />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{workflow.name}</div>
                                                        <div className="text-sm text-gray-400">
                                                            {workflow.steps} steps • {workflow.date}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                                    <svg
                                                        className="w-4 h-4"
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
                                                    </svg>
                                                    Run
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Try It Button */}
                <div className="text-center mt-12">
                    <a
                        href="chrome-extension://oigefdjfcokhefifcockgnpjfgefomdd/src/ui/dashboard.html"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 transition-all hover:scale-105 font-semibold"
                    >
                        Try CogniWeave Now
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
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                        </svg>
                    </a>
                </div>
            </div>
        </section>
    );
}
