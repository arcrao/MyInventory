import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { FireExtinguisherImportResult } from '../../types';

interface ImportSummaryModalProps {
  result: FireExtinguisherImportResult;
  onClose: () => void;
}

/**
 * Results of a multi-file import.
 *
 * A single "imported N rows" line is not enough here: when several sheets are
 * uploaded at once the user needs to know WHICH sheet failed and why, while the
 * others still went through.
 */
export const ImportSummaryModal: React.FC<ImportSummaryModalProps> = ({ result, onClose }) => {
  const totalChanged = result.totalInserted + result.totalUpdated;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-2xl my-8">
        <div className="p-4 sm:p-6 border-b flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          )}
          <h2 className="text-xl font-bold">
            {result.success ? 'Import complete' : 'Import completed with issues'}
          </h2>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-xs font-medium text-green-800">Added</div>
              <div className="text-2xl font-bold text-green-700">{result.totalInserted}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-xs font-medium text-blue-800">Updated</div>
              <div className="text-2xl font-bold text-blue-700">{result.totalUpdated}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-3">
              <div className="text-xs font-medium text-slate-700">Total changed</div>
              <div className="text-2xl font-bold text-slate-800">{totalChanged}</div>
            </div>
          </div>

          {result.files.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Sheets processed</h3>
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">File</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Rows read</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-600">Rejected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.files.map(file => (
                      <tr key={file.fileName} className="border-t border-gray-100">
                        <td className="px-3 py-2 break-all">{file.fileName}</td>
                        <td className="px-3 py-2 text-right">{file.parsed}</td>
                        <td
                          className={`px-3 py-2 text-right ${
                            file.skipped > 0 ? 'text-red-600 font-medium' : 'text-gray-400'
                          }`}
                        >
                          {file.skipped}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Errors ({result.errors.length})
              </h3>
              <ul className="bg-red-50 border border-red-200 rounded p-3 space-y-1 text-sm text-red-800">
                {result.errors.map((message, index) => (
                  <li key={index} className="break-words">
                    {message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Warnings ({result.warnings.length})
              </h3>
              <ul className="bg-amber-50 border border-amber-200 rounded p-3 space-y-1 text-sm text-amber-800">
                {result.warnings.map((message, index) => (
                  <li key={index} className="break-words">
                    {message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
