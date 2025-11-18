export default function Philosophy() {
  return (
    <section id="philosophy" className="mx-auto max-w-7xl px-6 py-12 sm:py-16" aria-labelledby="philosophy-title">
      <div className="mx-auto max-w-5xl">
        <h2 id="philosophy-title" className="text-2xl font-semibold tracking-tight">
          Design Philosophy
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
            <h3 className="text-lg font-medium">Workflows as graphs</h3>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Build logic with explicit steps and edges. Each transition is deterministic and type-checked, making
              complex flows understandable and testable.
            </p>
          </div>
          <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
            <h3 className="text-lg font-medium">Type-safety end to end</h3>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Strong TypeScript APIs ensure inputs, states, and transitions are safe. Optional Zod integration adds
              runtime validation without compromising ergonomics.
            </p>
          </div>
          <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
            <h3 className="text-lg font-medium">Framework-agnostic core</h3>
            <p className="mt-2 text-black/70 dark:text-white/70">
              The core is UI-agnostic and works in any framework or runtime. Optional adapters integrate with different
              UIs (React included) without coupling.
            </p>
          </div>
          <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
            <h3 className="text-lg font-medium">Fast expression engine</h3>
            <p className="mt-2 text-black/70 dark:text-white/70">
              A compact JS expression parser powers dynamic rules and templates, supporting modern language features
              with competitive performance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
