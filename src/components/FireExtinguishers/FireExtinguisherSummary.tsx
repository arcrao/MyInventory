import React from 'react';
import { AlertTriangle, Clock, CheckCircle, HelpCircle, LayoutGrid } from 'lucide-react';
import { ExtinguisherStatus, FireExtinguisherSummary as SummaryData } from '../../types';
import { DUE_SOON_DAYS } from '../../constants';

interface FireExtinguisherSummaryProps {
  summary: SummaryData;
  activeStatus: ExtinguisherStatus;
  onSelectStatus: (status: ExtinguisherStatus) => void;
}

interface CardConfig {
  status: ExtinguisherStatus;
  label: string;
  value: number;
  icon: React.ReactNode;
  activeClasses: string;
  idleClasses: string;
  valueClasses: string;
}

/**
 * Clickable stat cards above the register.
 *
 * Counts come from the server-side summary, so they describe the whole register
 * rather than the 50 rows on the current page. Clicking a card sets the status
 * filter (and clicking the active one clears it), so it composes with the
 * search, area and sort controls instead of replacing them.
 */
export const FireExtinguisherSummary: React.FC<FireExtinguisherSummaryProps> = ({
  summary,
  activeStatus,
  onSelectStatus,
}) => {
  const cards: CardConfig[] = [
    {
      status: 'all',
      label: 'Total',
      value: summary.total,
      icon: <LayoutGrid className="w-4 h-4" />,
      activeClasses: 'bg-slate-700 text-white border-slate-700',
      idleClasses: 'bg-white text-slate-700 border-gray-200 hover:bg-slate-50',
      valueClasses: 'text-slate-900',
    },
    {
      status: 'overdue',
      label: 'Overdue',
      value: summary.overdue,
      icon: <AlertTriangle className="w-4 h-4" />,
      activeClasses: 'bg-red-600 text-white border-red-600',
      idleClasses: 'bg-white text-red-700 border-gray-200 hover:bg-red-50',
      valueClasses: 'text-red-600',
    },
    {
      status: 'due_soon',
      label: `Expiring Soon (${DUE_SOON_DAYS}d)`,
      value: summary.dueSoon,
      icon: <Clock className="w-4 h-4" />,
      activeClasses: 'bg-amber-500 text-white border-amber-500',
      idleClasses: 'bg-white text-amber-700 border-gray-200 hover:bg-amber-50',
      valueClasses: 'text-amber-600',
    },
    {
      status: 'ok',
      label: 'OK',
      value: summary.ok,
      icon: <CheckCircle className="w-4 h-4" />,
      activeClasses: 'bg-green-600 text-white border-green-600',
      idleClasses: 'bg-white text-green-700 border-gray-200 hover:bg-green-50',
      valueClasses: 'text-green-600',
    },
    {
      status: 'no_date',
      label: 'No Due Date',
      value: summary.noDate,
      icon: <HelpCircle className="w-4 h-4" />,
      activeClasses: 'bg-gray-600 text-white border-gray-600',
      idleClasses: 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
      valueClasses: 'text-gray-600',
    },
  ];

  const handleClick = (status: ExtinguisherStatus) => {
    // Clicking the active card clears the filter back to everything
    onSelectStatus(activeStatus === status ? 'all' : status);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
      {cards.map(card => {
        const isActive =
          activeStatus === card.status || (card.status === 'all' && activeStatus === 'all');

        return (
          <button
            key={card.status}
            onClick={() => handleClick(card.status)}
            aria-pressed={isActive}
            title={`Show ${card.label}`}
            className={`text-left border rounded-lg p-3 min-h-[44px] transition-colors ${
              isActive ? card.activeClasses : card.idleClasses
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
              {card.icon}
              <span className="truncate">{card.label}</span>
            </div>
            <div
              className={`text-2xl font-bold mt-1 ${isActive ? 'text-white' : card.valueClasses}`}
            >
              {card.value}
            </div>
          </button>
        );
      })}
    </div>
  );
};
