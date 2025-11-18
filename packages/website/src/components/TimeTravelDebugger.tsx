'use client';

import { useEffect, useRef, useState } from 'react';

export default function TimeTravelDebugger({ workflow }: { workflow: any }) {
  const [snaps, setSnaps] = useState<any[]>([]);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const snapshot = () => {
    if (!workflow.exportWorkflow) return;
    const s = workflow.exportWorkflow('full');
    setSnaps((arr) => [...arr, s]);
  };

  const play = () => {
    if (playing) return;
    if (!workflow.importWorkflow) return;
    if (snaps.length === 0) return;
    let i = 0;
    setPlaying(true);
    timer.current = setInterval(() => {
      const s = snaps[i];
      workflow.importWorkflow?.('full', s);
      i += 1;
      if (i >= snaps.length) {
        if (timer.current) clearInterval(timer.current);
        setPlaying(false);
      }
    }, 800);
  };

  return (
    <div className="flex items-center gap-3">
      <button className="px-3 py-2 rounded bg-slate-800 text-white" onClick={snapshot}>
        Snapshot
      </button>
      <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={play} disabled={playing}>
        Play
      </button>
      <span className="text-sm text-slate-600">Snapshots: {snaps.length}</span>
    </div>
  );
}
