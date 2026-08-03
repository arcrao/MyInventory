import React, { useEffect, useState } from 'react';
import { FireExtinguisher, FireExtinguisherHistoryEntry } from '../../types';
import { StorageService } from '../../services/storage.service';

interface FireExtinguisherHistoryModalProps {
  extinguisher: FireExtinguisher;
  onClose: () => void;
}

const ACTION_LABELS: Record<FireExtinguisherHistoryEntry['action'], string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  imported: 'Imported',
};

const ACTION_CLASSES: Record<FireExtinguisherHistoryEntry['action'], string> = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  imported: 'bg-purple-100 text-purple-800',
};

export const FireExtinguisherHistoryModal: React.FC<FireExtinguisherHistoryModalProps> = ({
  extinguisher,
  onClose,
}) => {
  const [entries, setEntries] = useState<FireExtinguisherHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await StorageService.getFireExtinguisherHistory(extinguisher.id);
      setEntries(data);
      setLoading(false);
    };
    load();
  }, [extinguisher.id]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-2xl my-8">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-xl font-bold">Audit Trail</h2>
          <p className="text-sm text-gray-500 font-mono mt-1 break-all">
            {extinguisher.uniqueKey}
          </p>
        </div>

        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
          {loading && <div className="text-center py-8 text-gray-500">Loading history...</div>}

          {!loading && entries.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No history recorded for this extinguisher yet.
            </div>
          )}

          {!loading && entries.length > 0 && (
            <ul className="space-y-3">
              {entries.map(entry => (
                <li key={entry.id} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ACTION_CLASSES[entry.action]
                      }`}
                    >
                      {ACTION_LABELS[entry.action]}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {entry.changes && (
                    <p className="text-sm text-gray-700 mt-2 break-words">{entry.changes}</p>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-gray-500 mt-1 break-words">{entry.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px] text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
