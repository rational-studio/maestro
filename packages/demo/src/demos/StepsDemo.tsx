import { useState } from "react";
import { z } from "zod";
import { step, workflow, conditionalEdge } from "@motif-ts/core";
import { type StateCreator } from "zustand/vanilla";
import { useWorkflow } from "@motif-ts/react";

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
    kind: "Input",
    outputSchema: z.object({ value: z.number() }),
    createStore: inputStoreCreator,
  },
  ({
    store: { value, autoIncrement, toggleAutoIncrement, setValue },
    effect,
    next,
  }) => {
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
  }
);

const ConfirmCreator = step(
  {
    kind: "Confirm",
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
  }
);

const DoneCreator = step(
  {
    kind: "Done",
    inputSchema: z.object({ value: z.number() }),
  },
  ({ input }) => {
    return { result: input };
  }
);

export default function StepsDemo() {
  const [flow] = useState(() => {
    const input = InputCreator("输入");
    const confirm = ConfirmCreator("确认");
    const done = DoneCreator("完成");
    return workflow([InputCreator, ConfirmCreator, DoneCreator])
      .register([input, confirm, done])
      .connect(input, confirm)
      .connect(conditionalEdge(confirm, done, "out.confirmed === true"))
      .connect(conditionalEdge(confirm, input, "out.confirmed === false"))
      .start(input);
  });

  const current = useWorkflow(flow);

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold">步骤与工作流</h2>
      <p>在下方交互式示例中体验步骤定义、工作流启动与前进/后退。</p>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="rounded border bg-white p-4">
            <h3 className="font-medium mb-3">当前状态</h3>
            <div className="text-sm">status: {current.status}</div>
            {current.status !== "notStarted" && (
              <div className="text-sm">
                current: {current.kind}（{current.name}）
              </div>
            )}
          </div>

          <div className="rounded border bg-white p-4 space-y-3">
            <h3 className="font-medium">交互区</h3>
            {current.status === "ready" && current.kind === "Input" && (
              <InputPanel
                value={current.state.value}
                setValue={current.state.setValue}
                submit={current.state.submit}
                autoIncrement={current.state.autoIncrement}
                toggleAutoIncrement={current.state.toggleAutoIncrement}
              />
            )}
            {current.status === "ready" && current.kind === "Confirm" && (
              <ConfirmPanel
                value={current.state.value}
                confirm={current.state.confirm}
                reject={current.state.reject}
              />
            )}
            {current.status === "ready" && current.kind === "Done" && (
              <DonePanel
                value={current.state.result.value}
                back={() => flow.back()}
              />
            )}
            <div className="flex gap-2 pt-2">
              <button
                className="px-3 py-1 rounded bg-slate-900 text-white disabled:opacity-50"
                onClick={() => flow.back()}
                disabled={current.status === "notStarted"}
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
    <div className="space-y-2">
      <label className="block text-sm">输入一个数字：</label>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="border rounded px-2 py-1 w-40"
      />
      <div className="flex gap-2">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={autoIncrement}
            onChange={() => toggleAutoIncrement()}
          />
          自动递增
        </label>
        <button
          className="px-3 py-1 rounded bg-slate-900 text-white"
          onClick={() => submit()}
        >
          提交并前进
        </button>
      </div>
    </div>
  );
}

function ConfirmPanel({
  value,
  confirm,
  reject,
}: {
  value: number;
  confirm: () => void;
  reject: () => void;
}) {
  return (
    <div className="space-y-2">
      <p>是否确认前一步的输入值 {value}？</p>
      <div className="flex gap-2">
        <button
          className="px-3 py-1 rounded bg-green-600 text-white"
          onClick={() => confirm()}
        >
          确认
        </button>
        <button
          className="px-3 py-1 rounded bg-red-600 text-white"
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
    <div className="space-y-2">
      <p>已完成：确认值={value}</p>
      <button className="px-3 py-1 rounded bg-slate-200" onClick={back}>
        返回上一环节
      </button>
    </div>
  );
}
