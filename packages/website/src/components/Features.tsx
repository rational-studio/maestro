import WorkflowShowcase from './WorkflowShowcase';

export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-12 sm:py-16" aria-labelledby="features-title">
      <div className="mx-auto max-w-5xl">
        <h2 id="features-title" className="text-2xl font-semibold tracking-tight">
          Features
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
            <h3 className="text-lg font-medium">Workflow Orchestrator</h3>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Compose steps with typed transitions, back navigation, lifecycle control, and middleware hooks.
            </p>
          </div>
          <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
            <h3 className="text-lg font-medium">DevTools & Persist</h3>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Use Redux DevTools time travel, export/import workflow snapshots, and restore states safely.
            </p>
          </div>
          <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
            <h3 className="text-lg font-medium">Framework Adapters</h3>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Use adapters to integrate with your UI of choice. React is supported, and the core works with any
              framework.
            </p>
          </div>
          <div className="rounded-xl border border-black/10 p-6 dark:border-white/15">
            <h3 className="text-lg font-medium">Expression Engine</h3>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Modern JS features including optional chaining, template literals, and object spread.
            </p>
          </div>
        </div>
        <div className="mt-8">
          <WorkflowShowcase />
        </div>
      </div>
    </section>
  );
}
