import Features from '../components/Features';
import InteractiveHero from '../components/InteractiveHero';
import InteractiveShowcase from '../components/InteractiveShowcase';
import Philosophy from '../components/Philosophy';
import UsageGuide from '../components/UsageGuide';

export default function Page() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <InteractiveHero />

      <div className="relative z-10">
        <Philosophy />
        <InteractiveShowcase />
        <Features />

        <section id="usage" className="mx-auto max-w-7xl px-6 py-12 sm:py-16" aria-labelledby="usage-title">
          <div className="mx-auto max-w-5xl">
            <h2 id="usage-title" className="text-2xl font-semibold tracking-tight mb-8">
              Detailed Usage Guide
            </h2>
            <div className="glass-panel rounded-xl p-6 md:p-10">
              <UsageGuide />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
