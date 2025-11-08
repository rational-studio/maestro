import { type StepCreatorAny, type WorkflowAPI } from '@motif-ts/core';

export type LoggerOptions = {
  prefix?: string;
  showPayload?: boolean;
  palette?: Partial<
    Record<'Workflow' | 'Register' | 'Start' | 'Back' | 'TransitionIn' | 'Ready' | 'TransitionOut' | 'Error', string>
  >;
};

const defaultPalette = {
  Workflow: '#0ea5e9',
  Register: '#3b82f6',
  Start: '#22c55e',
  Back: '#64748b',
  TransitionIn: '#f59e0b',
  Ready: '#10b981',
  TransitionOut: '#ef4444',
  Error: '#ef4444',
} as const;

function styleFor(label: keyof typeof defaultPalette, palette?: LoggerOptions['palette']) {
  const bg = (palette && palette[label]) || defaultPalette[label];
  return `padding:2px 6px; border-radius:4px; color:#fff; background:${bg}; font-weight:bold;`;
}

export default function loggerMiddleware<const Creators extends readonly StepCreatorAny[]>(
  workflow: WorkflowAPI<Creators>,
  options: LoggerOptions = {},
): WorkflowAPI<Creators> {
  const { connect, getCurrentStep, subscribe, back, $$INTERNAL } = workflow;

  const prefix = options.prefix ?? '[motif] ';
  const palette = options.palette;
  const showPayload = options.showPayload ?? true;

  const log = (label: keyof typeof defaultPalette, ...args: any[]) => {
    console.log(`%c${prefix}${label}`, styleFor(label, palette), ...(showPayload ? args : []));
  };

  subscribe((currentStep) => {
    const category: keyof typeof defaultPalette =
      currentStep.status === 'transitionIn'
        ? 'TransitionIn'
        : currentStep.status === 'ready'
          ? 'Ready'
          : 'TransitionOut';
    log(category, `${currentStep.kind}:${currentStep.name}`, { status: currentStep.status });
  });

  return {
    register(nodesArg: ReturnType<Creators[number]> | readonly ReturnType<Creators[number]>[]) {
      const list = Array.isArray(nodesArg) ? nodesArg : [nodesArg];
      log(
        'Register',
        list.map((n) => ({ id: n.id, kind: n.kind, name: n.name })),
      );
      return workflow.register(nodesArg);
    },
    // Preserve connect typing by forwarding the original implementation
    connect,
    start(node) {
      log('Start', { id: node.id, kind: node.kind, name: node.name });
      return workflow.start(node);
    },
    getCurrentStep,
    subscribe,
    back() {
      log('Back');
      return back();
    },
    $$INTERNAL,
  } satisfies WorkflowAPI<Creators>;
}
