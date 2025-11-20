'use client';

import { Database } from 'lucide-react';
import { memo } from 'react';
import { Handle, NodeProps } from 'reactflow';

export type MotifStepData = {
  label: string;
  inputSchema?: string;
  outputSchema?: string;
  status?: 'idle' | 'transitionIn' | 'ready' | 'transitionOut';
  hasStore?: boolean;
};

const MotifStepNode = ({ data, sourcePosition, targetPosition }: NodeProps<MotifStepData>) => {
  const getStatusColor = (s?: string) => {
    switch (s) {
      case 'transitionIn':
        return 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
      case 'ready':
        return 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      case 'transitionOut':
        return 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
      default:
        return 'border-gray-700';
    }
  };

  const getStatusLabel = (s?: string) => {
    switch (s) {
      case 'transitionIn':
        return 'Transition In';
      case 'ready':
        return 'Running';
      case 'transitionOut':
        return 'Transition Out';
      default:
        return 'Idle';
    }
  };

  return (
    <div
      className={`min-w-[200px] bg-[#0a0a0a] rounded-xl border-2 transition-all duration-300 ${getStatusColor(data.status)}`}
    >
      {targetPosition ? <Handle type="target" position={targetPosition} className="!bg-gray-500 !w-3 !h-3" /> : null}

      {/* Header */}
      <div className="bg-gray-900/50 p-3 rounded-t-xl border-b border-gray-800 flex justify-between items-center">
        <span className="font-bold text-gray-200">{data.label}</span>
        {data.hasStore && <Database className="w-4 h-4 text-purple-400" />}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {data.inputSchema && (
          <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
            <span className="text-blue-400">In:</span> {data.inputSchema}
          </div>
        )}
        {data.outputSchema && (
          <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
            <span className="text-green-400">Out:</span> {data.outputSchema}
          </div>
        )}

        {/* Status Badge */}
        <div
          className={`mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full w-fit
          ${data.status === 'idle' ? 'bg-gray-800 text-gray-500' : ''}
          ${data.status === 'transitionIn' ? 'bg-yellow-500/20 text-yellow-400' : ''}
          ${data.status === 'ready' ? 'bg-green-500/20 text-green-400' : ''}
          ${data.status === 'transitionOut' ? 'bg-blue-500/20 text-blue-400' : ''}
        `}
        >
          {getStatusLabel(data.status)}
        </div>
      </div>
      {sourcePosition ? <Handle type="source" position={sourcePosition} className="!bg-gray-500 !w-3 !h-3" /> : null}
    </div>
  );
};

export default memo(MotifStepNode);
