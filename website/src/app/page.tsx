import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Demo } from "@/components/Demo";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <div className="grid-pattern fixed inset-0 pointer-events-none opacity-50" />
      <Navbar />
      <main className="relative">
        <Hero />
        <Features />
        <HowItWorks />
        <Demo />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
