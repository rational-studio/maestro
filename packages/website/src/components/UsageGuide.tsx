import CodeHighlight from './CodeHighlight';
import CommandTabs from './CommandTabs';

export default async function UsageGuide() {
  const minimal = `import { step, workflow } from '@motif-ts/core'\nimport { z } from 'zod'\n\nconst Input = step({ kind: 'Input', outputSchema: z.object({ name: z.string() }) }, ({ next }) => ({ submit(name) { next({ name }) } }))\nconst Greet = step({ kind: 'Greet', inputSchema: z.object({ name: z.string() }), outputSchema: z.object({ message: z.string() }) }, ({ input, next }) => ({ finish() { next({ message: 'Hello ' + input.name }) } }))\nconst Done = step({ kind: 'Done', inputSchema: z.object({ message: z.string() }) }, ({ input }) => ({ result: input }))\n\nconst o = workflow([Input, Greet, Done])\nconst a = Input('Input'); const b = Greet('Greet'); const c = Done('Done')\nconst wf = o.register([a, b, c]).connect(a, b).connect(b, c).start(a)`;
  const react = `import { useWorkflow } from '@motif-ts/react'\n\nexport function Widget({ wf }) {\n  const current = useWorkflow(wf)\n  return <button onClick={() => current.kind === 'Input' ? current.state.submit('Ada') : current.kind === 'Greet' ? current.state.finish() : void 0}>Step: {current.kind}</button>\n}`;
  const bash = `pnpm add @motif-ts/core @motif-ts/react`;
  return (
    <div className="space-y-8">
      <div className="space-y-3" aria-labelledby="install-title">
        <h3 id="install-title" className="text-lg font-semibold">
          Install
        </h3>
        <CommandTabs commands={{ pnpm: bash, npm: bash.replace('pnpm', 'npm'), yarn: bash.replace('pnpm', 'yarn') }} />
      </div>

      <div className="space-y-3" aria-labelledby="minimal-title">
        <h3 id="minimal-title" className="text-lg font-semibold">
          Minimal workflow
        </h3>
        <CodeHighlight code={minimal} lang="ts" ariaLabel="Minimal workflow example" />
      </div>

      <div className="space-y-3" aria-labelledby="react-title">
        <h3 id="react-title" className="text-lg font-semibold">
          Optional React adapter
        </h3>
        <p className="text-black/70 dark:text-white/70">
          Adapters integrate Motif-ts with frameworks. React is available today, and the core remains
          framework-agnostic.
        </p>
        <CodeHighlight code={react} lang="tsx" ariaLabel="React adapter example" />
      </div>

      <div className="space-y-2" aria-labelledby="patterns-title">
        <h3 id="patterns-title" className="text-lg font-semibold">
          Common patterns
        </h3>
        <ul className="list-disc pl-6 text-black/80 dark:text-white/80">
          <li>Model flows as graphs with explicit, typed transitions</li>
          <li>Use middleware for logging, persistence, and DevTools integration</li>
          <li>Validate inputs with Zod where runtime guarantees are needed</li>
          <li>Keep core logic framework-agnostic; add adapters at the edge</li>
        </ul>
        <p className="mt-3 text-black/70 dark:text-white/70">
          Explore comprehensive documentation on GitHub for advanced topics, adapters, and best practices.
        </p>
        <a
          href="https://github.com/rational-studio/motif-ts#readme"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center justify-center rounded-md border border-black/10 px-4 text-sm font-medium text-black transition-colors hover:bg-black/5 dark:border-white/20 dark:text-white dark:hover:bg-white/10"
          aria-label="Open Motif-ts Documentation"
        >
          Documentation
        </a>
      </div>
    </div>
  );
}
