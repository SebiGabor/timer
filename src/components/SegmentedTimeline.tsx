import React from 'react';
import type { RecipeSection } from '../types';
import { CATEGORIES } from '../utils/categories';

interface SegmentedTimelineProps {
  sections: RecipeSection[];
  currentIndex: number;
  currentProgressPct: number; // 0..100+
  isOvertime: boolean;
  onSelectSection?: (index: number) => void;
}

export const SegmentedTimeline: React.FC<SegmentedTimelineProps> = ({
  sections,
  currentIndex,
  currentProgressPct,
  isOvertime,
  onSelectSection,
}) => {
  return (
    <div className="w-full" aria-label="Progres general pe secțiuni">
      <div className="flex w-full items-center gap-1">
        {sections.map((sec, idx) => {
          const isPast = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const meta = CATEGORIES[sec.category] ?? CATEGORIES.theory;
          const fillPct = isPast
            ? 100
            : isCurrent
              ? Math.min(100, Math.max(0, currentProgressPct))
              : 0;

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelectSection?.(idx)}
              title={`${idx + 1}. ${sec.title}`}
              style={{ flexGrow: Math.max(1, sec.durationSeconds) }}
              className={`group relative h-2.5 min-w-[8px] overflow-hidden rounded-full transition-all ${
                isCurrent ? 'ring-1 ring-white/40' : ''
              } bg-zinc-800/90`}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  isCurrent && isOvertime ? 'bg-red-500 animate-pulse' : ''
                }`}
                style={{
                  width: `${fillPct}%`,
                  backgroundColor:
                    isCurrent && isOvertime
                      ? undefined
                      : isPast
                        ? '#3f3f46'
                        : meta.hex,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
