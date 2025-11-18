import Features from '../components/Features';
import Hero from '../components/Hero';
import Philosophy from '../components/Philosophy';
import UsageGuide from '../components/UsageGuide';

export default function Page() {
  return (
    <div>
      <Hero />
      <Philosophy />
      <Features />
      <section id="usage" className="mx-auto max-w-7xl px-6 py-12 sm:py-16" aria-labelledby="usage-title">
        <div className="mx-auto max-w-5xl">
          <h2 id="usage-title" className="text-2xl font-semibold tracking-tight">
            Usage Guide
          </h2>
          <div className="mt-6">
            <UsageGuide />
          </div>
        </div>
      </section>
    </div>
  );
}
