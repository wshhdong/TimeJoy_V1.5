
import React, { useMemo } from 'react';

interface Props {
  startTime: string;
  endTime: string;
  occupiedRanges?: { start: string, end: string, color?: string }[];
}

// Convert "HH:MM" to 0-48 index (for 30 min blocks)
const timeToIdx = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 2 + (m === 30 ? 1 : 0);
};

// Convert index back to HH:MM for display
const idxToTime = (idx: number) => {
  const h = Math.floor(idx / 2);
  const m = (idx % 2) * 30;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const TimeRangeSlider: React.FC<Props> = ({ startTime, endTime, occupiedRanges = [] }) => {
  const startIdx = timeToIdx(startTime);
  const endIdx = timeToIdx(endTime);
  const totalBlocks = 48;

  // Calculate gaps (unoccupied ranges)
  const gaps = useMemo(() => {
    const sorted = [...occupiedRanges].sort((a, b) => timeToIdx(a.start) - timeToIdx(b.start));
    const result: { startIdx: number, endIdx: number, label: string }[] = [];
    let currentIdx = 0;

    sorted.forEach(range => {
        const rStart = timeToIdx(range.start);
        const rEnd = timeToIdx(range.end);
        
        if (currentIdx < rStart) {
            result.push({
                startIdx: currentIdx,
                endIdx: rStart,
                label: `${idxToTime(currentIdx)} - ${idxToTime(rStart)}`
            });
        }
        currentIdx = Math.max(currentIdx, rEnd);
    });

    if (currentIdx < 48) {
        result.push({
            startIdx: currentIdx,
            endIdx: 48,
            label: `${idxToTime(currentIdx)} - 24:00`
        });
    }
    return result;
  }, [occupiedRanges]);

  return (
    <div className="w-full py-4 select-none">
      <div className="relative h-8 bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
        {/* Ticks */}
        <div className="absolute w-full h-full flex justify-between px-2 pointer-events-none z-0">
            {[0, 6, 12, 18, 24].map(h => (
                <div key={h} className="h-full border-r border-gray-300 last:border-0 opacity-50" style={{left: `${(h/24)*100}%`}}></div>
            ))}
        </div>

        {/* Occupied blocks */}
        {occupiedRanges.map((range, i) => {
            const s = timeToIdx(range.start);
            const e = timeToIdx(range.end);
            const width = ((e - s) / totalBlocks) * 100;
            const left = (s / totalBlocks) * 100;
            return (
                <div key={i} 
                    className="absolute h-full opacity-60 z-10"
                    style={{ 
                        left: `${left}%`, 
                        width: `${width}%`,
                        backgroundColor: range.color || '#FCA5A5' // Fallback to light red if no color
                    }}
                    title="Occupied"
                />
            )
        })}

        {/* Selected Range Bar */}
        <div 
            className="absolute h-full bg-primary/80 z-20"
            style={{
                left: `${(startIdx / totalBlocks) * 100}%`,
                width: `${((endIdx - startIdx) / totalBlocks) * 100}%`
            }}
        />

        {/* Gap Indicators (Interactive Hover Zones) */}
        {gaps.map((gap, i) => {
             const width = ((gap.endIdx - gap.startIdx) / totalBlocks) * 100;
             const left = (gap.startIdx / totalBlocks) * 100;
             return (
                 <div 
                    key={`gap-${i}`}
                    className="absolute h-full z-30 group hover:bg-gray-500/10 cursor-pointer transition-colors"
                    style={{ left: `${left}%`, width: `${width}%` }}
                 >
                     {/* Tooltip */}
                     <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap shadow-lg pointer-events-none">
                         Empty: {gap.label}
                     </div>
                 </div>
             );
        })}

      </div>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400 px-1">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
      </div>
    </div>
  );
};

export default TimeRangeSlider;
