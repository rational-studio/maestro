import { conditionalEdge, step, workflow, type CurrentStep } from '@motif-ts/core';
import { devtools } from '@motif-ts/middleware';
import { useWorkflow } from '@motif-ts/react';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import { type StateCreator } from 'zustand/vanilla';

// Step definitions
type InputStore = {
  autoIncrement: boolean;
  toggleAutoIncrement: () => void;
  value: number;
  setValue: (v: number) => void;
};

const inputStoreCreator: StateCreator<InputStore> = (set) => ({
  autoIncrement: false,
  value: 0,
  setValue: (v: number) => set(() => ({ value: v })),
  toggleAutoIncrement: () => {
    set((state) => ({ autoIncrement: !state.autoIncrement }));
  },
});

const InputCreator = step(
  {
    kind: 'Input',
    outputSchema: z.object({ value: z.number() }),
    createStore: inputStoreCreator,
  },
  ({ store: { value, autoIncrement, toggleAutoIncrement, setValue }, effect, next }) => {
    effect(() => {
      if (autoIncrement) {
        const handle = setInterval(() => {
          setValue(value + 1);
        }, 1000);
        return () => clearInterval(handle);
      }
    }, [autoIncrement, value]);

    return {
      value,
      autoIncrement,
      setValue,
      toggleAutoIncrement,
      submit() {
        next({ value });
      },
    };
  },
);

const ConfirmCreator = step(
  {
    kind: 'Confirm',
    inputSchema: z.object({ value: z.number() }),
    outputSchema: z.object({ confirmed: z.boolean(), value: z.number() }),
  },
  ({ input, next }) => {
    return {
      value: input.value,
      confirm() {
        next({ confirmed: true, value: input.value });
      },
      reject() {
        next({ confirmed: false, value: input.value });
      },
    };
  },
);

const DoneCreator = step(
  {
    kind: 'Done',
    inputSchema: z.object({ value: z.number() }),
  },
  ({ input }) => {
    return { result: input };
  },
);

export default function StepsDemo() {
  const [flow] = useState(() => {
    const input = InputCreator('输入');
    const confirm = ConfirmCreator('确认');
    const done = DoneCreator('完成');
    return devtools(
      workflow([InputCreator, ConfirmCreator, DoneCreator])
        .register([input, confirm, done])
        .connect(input, confirm)
        .connect(conditionalEdge(confirm, done, 'out.confirmed === true'))
        .connect(conditionalEdge(confirm, input, 'out.confirmed === false'))
        .start(input),
    );
  });

  const current = useWorkflow(flow);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">步骤与工作流</h2>
        <p className="text-slate-600">在下方交互式示例中体验步骤定义、工作流启动与前进/后退。</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <h3 className="mb-3 font-medium text-slate-800">工作流流程图</h3>
            <WorkflowChart current={current} />
          </div>

          <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <h3 className="font-medium text-slate-800">交互区</h3>
            {current.status === 'ready' && current.kind === 'Input' && (
              <InputPanel
                value={current.state.value}
                setValue={current.state.setValue}
                submit={current.state.submit}
                autoIncrement={current.state.autoIncrement}
                toggleAutoIncrement={current.state.toggleAutoIncrement}
              />
            )}
            {current.status === 'ready' && current.kind === 'Confirm' && (
              <ConfirmPanel value={current.state.value} confirm={current.state.confirm} reject={current.state.reject} />
            )}
            {current.status === 'ready' && current.kind === 'Done' && (
              <DonePanel value={current.state.result.value} back={() => flow.back()} />
            )}
            <div className="flex gap-2 pt-2">
              <button
                className="inline-flex items-center rounded-lg bg-slate-900 px-3.5 py-2 text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
                onClick={() => flow.back()}
                disabled={current.status === 'notStarted'}
              >
                后退
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InputPanel({
  value,
  setValue,
  submit,
  toggleAutoIncrement,
  autoIncrement,
}: {
  value: number;
  setValue: (v: number) => void;
  submit: () => void;
  toggleAutoIncrement: () => void;
  autoIncrement: boolean;
}) {
  return (
    <div className="space-y-3">
      <label className="block text-sm text-slate-700">输入一个数字：</label>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-48 rounded-lg border border-slate-300 px-3 py-2 shadow-sm focus:border-brand focus:ring-2 focus:ring-brand/50 focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={autoIncrement} onChange={() => toggleAutoIncrement()} />
          自动递增
        </label>
        <button
          className="inline-flex items-center rounded-lg bg-brand px-3.5 py-2 text-white shadow-sm transition-colors hover:bg-indigo-600"
          onClick={() => submit()}
        >
          提交并前进
        </button>
      </div>
    </div>
  );
}

function ConfirmPanel({ value, confirm, reject }: { value: number; confirm: () => void; reject: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-slate-800">是否确认前一步的输入值 {value}？</p>
      <div className="flex gap-3">
        <button
          className="inline-flex items-center rounded-lg bg-green-600 px-3.5 py-2 text-white shadow-sm transition-colors hover:bg-green-500"
          onClick={() => confirm()}
        >
          确认
        </button>
        <button
          className="inline-flex items-center rounded-lg bg-red-600 px-3.5 py-2 text-white shadow-sm transition-colors hover:bg-red-500"
          onClick={() => reject()}
        >
          拒绝
        </button>
      </div>
    </div>
  );
}

function DonePanel({ value, back }: { value: number; back: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-slate-800">已完成：确认值={value}</p>
      <button
        className="inline-flex items-center rounded-lg bg-slate-200 px-3.5 py-2 text-slate-900 shadow-sm transition-colors hover:bg-slate-300"
        onClick={back}
      >
        返回上一环节
      </button>
    </div>
  );
}

// --- Workflow Visualization ---
function WorkflowChart({
  current,
}: {
  current: CurrentStep<readonly [typeof InputCreator, typeof ConfirmCreator, typeof DoneCreator]>;
}) {
  const status = current.status;
  const isActive = (id: string) => current.status === 'ready' && current.kind === id;
  const isCompleted = (id: string) => {
    if (current.status === 'notStarted') {
      return false;
    }
    if (id === 'Input') {
      return current.status === 'ready' ? current.kind !== 'Input' : true;
    }
    if (id === 'Confirm') {
      return current.status === 'ready' && current.kind === 'Done';
    }
    return false;
  };

  return (
    <div>
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <FlowNode
            label="输入"
            active={isActive('Input')}
            completed={isCompleted('Input')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M15.232 5.232a2.5 2.5 0 1 1 3.536 3.536l-9.192 9.192a4 4 0 0 1-1.414.943l-3.06 1.09a.75.75 0 0 1-.96-.96l1.09-3.06a4 4 0 0 1 .943-1.414l9.192-9.192Z" />
              </svg>
            }
          />
          <FlowConnector active={isActive('Confirm') || isCompleted('Input')} />
          <FlowNode
            label="确认"
            active={isActive('Confirm')}
            completed={isCompleted('Confirm')}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M9 11.5 11.5 14l4.5-4.5a1 1 0 1 0-1.414-1.414L11.5 11.172 10.414 10.086A1 1 0 0 0 9 11.5Z" />
                <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z" fillOpacity=".1" />
              </svg>
            }
          />
          <FlowConnector active={isActive('Done') || isCompleted('Confirm')} />
          <FlowNode
            label="完成"
            active={isActive('Done')}
            completed={false}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M5 3a1 1 0 0 0-1 1v16.5a.5.5 0 0 0 .8.4l4.4-3.3a2 2 0 0 1 2.4 0l4.4 3.3a.5.5 0 0 0 .8-.4V5a1 1 0 0 0-1-1H5Z" />
              </svg>
            }
          />
        </div>

        {/* Legend for conditional edges */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-slate-600">
            拒绝 → 返回输入
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-700">
            确认 → 前往完成
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
          状态：{status}
        </span>
        {status === 'ready' && (
          <span className="text-xs text-slate-600">
            当前：{current.kind}（{current.name}）
          </span>
        )}
      </div>
    </div>
  );
}

function FlowNode({
  label,
  active,
  completed,
  icon,
}: {
  label: string;
  active?: boolean;
  completed?: boolean;
  icon?: ReactNode;
}) {
  const base = 'relative z-10 inline-flex items-center gap-2 rounded-xl px-3 py-2 border shadow-sm transition-colors';
  const stateCls = completed
    ? 'border-green-500 bg-green-50 text-green-700'
    : active
      ? 'border-brand bg-gradient-to-br from-indigo-50 to-white ring-2 ring-brand/40 text-brand'
      : 'border-slate-200 bg-white text-slate-800';

  return (
    <div className={`${base} ${stateCls}`}>
      <span className={`h-2 w-2 rounded-full ${completed ? 'bg-green-500' : active ? 'bg-brand' : 'bg-slate-300'}`} />
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        {icon}
        {label}
      </span>
    </div>
  );
}

function FlowConnector({ active }: { active?: boolean }) {
  return (
    <div className="flex w-12 items-center">
      <div className={`h-px w-full ${active ? 'bg-brand' : 'bg-slate-200'}`} />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={`ml-1 h-4 w-4 ${active ? 'text-brand' : 'text-slate-300'}`}
        fill="currentColor"
      >
        <path d="M9.293 4.293a1 1 0 0 1 1.414 0l6 6a1 1 0 0 1 0 1.414l-6 6a1 1 0 0 1-1.414-1.414L14.586 12 9.293 6.707a1 1 0 0 1 0-1.414Z" />
      </svg>
    </div>
  );
}
