import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Upload,
  Download,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  FireExtinguisher,
  FireExtinguisherFilters,
  FireExtinguisherFormData,
  FireExtinguisherImportResult,
  FireExtinguisherSort,
  FireExtinguisherSummary as SummaryData,
  ExtinguisherStatus,
  ExtinguisherSortField,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { EXTINGUISHER_TYPES } from '../../constants';
import {
  getDueBounds,
  getExtinguisherStatus,
  formatExtinguisherDate,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
} from '../../utils/extinguisherStatus';
import { importFireExtinguishersFromFiles } from '../../utils/fireExtinguisherImport';
import { downloadFireExtinguishersCSV } from '../../utils/fireExtinguisherExport';
import { StorageService } from '../../services/storage.service';
import { FireExtinguisherSummary } from './FireExtinguisherSummary';
import { FireExtinguisherForm } from './FireExtinguisherForm';
import { ImportSummaryModal } from './ImportSummaryModal';
import { FireExtinguisherHistoryModal } from './FireExtinguisherHistoryModal';

interface FireExtinguishersListProps {
  extinguishers: FireExtinguisher[];
  summary: SummaryData;
  areas: string[];
  filters: FireExtinguisherFilters;
  sort: FireExtinguisherSort;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  loading: boolean;
  onFilterChange: (filters: FireExtinguisherFilters) => void;
  onSortChange: (field: ExtinguisherSortField) => void;
  onPageChange: (page: number) => void;
  onAdd: (formData: FireExtinguisherFormData) => Promise<void>;
  onUpdate: (id: number, formData: FireExtinguisherFormData) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReload: () => Promise<void>;
}

export const FireExtinguishersList: React.FC<FireExtinguishersListProps> = ({
  extinguishers,
  summary,
  areas,
  filters,
  sort,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  loading,
  onFilterChange,
  onSortChange,
  onPageChange,
  onAdd,
  onUpdate,
  onDelete,
  onReload,
}) => {
  const { isAdmin, loading: adminLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchInput, setSearchInput] = useState(filters.searchTerm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FireExtinguisher | null>(null);
  const [viewingHistory, setViewingHistory] = useState<FireExtinguisher | null>(null);
  const [importResult, setImportResult] = useState<FireExtinguisherImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Keep the local search box in step when filters are reset elsewhere
  useEffect(() => {
    setSearchInput(filters.searchTerm);
  }, [filters.searchTerm]);

  const { today, dueSoonDate } = getDueBounds();

  const hasActiveFilters =
    Boolean(filters.searchTerm) ||
    Boolean(filters.area) ||
    Boolean(filters.type) ||
    filters.status !== 'all';

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onFilterChange({ ...filters, searchTerm: searchInput.trim() });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    onFilterChange({ searchTerm: '', area: '', type: '', status: 'all' });
  };

  const handleSelectStatus = (status: ExtinguisherStatus) => {
    onFilterChange({ ...filters, status });
  };

  const handleExport = async () => {
    setActionError(null);
    try {
      // Export everything matching the current filters and sort, not just the
      // 50 rows on screen
      const rows = await StorageService.getAllFireExtinguishers(
        filters,
        sort,
        today,
        dueSoonDate
      );
      downloadFireExtinguishersCSV(rows);
    } catch (error) {
      setActionError(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setActionError(null);
    setImporting(true);
    try {
      const result = await importFireExtinguishersFromFiles(files);
      setImportResult(result);
      if (result.totalInserted + result.totalUpdated > 0) {
        await onReload();
      }
    } catch (error) {
      setActionError(
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (formData: FireExtinguisherFormData) => {
    if (editing) {
      await onUpdate(editing.id, formData);
    } else {
      await onAdd(formData);
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (extinguisher: FireExtinguisher) => {
    if (
      !window.confirm(
        `Delete fire extinguisher ${extinguisher.uniqueKey}?\n\nThe audit trail for this record is preserved.`
      )
    ) {
      return;
    }

    setActionError(null);
    try {
      await onDelete(extinguisher.id);
    } catch (error) {
      // Deletion is restricted to super admins at the database level, so a
      // regular admin lands here with the server's message.
      setActionError(
        `Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const SortHeader: React.FC<{ field: ExtinguisherSortField; label: string }> = ({
    field,
    label,
  }) => (
    <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
      <button
        onClick={() => onSortChange(field)}
        className="flex items-center gap-1 hover:text-gray-900"
        title={`Sort by ${label}`}
      >
        {label}
        {sort.field === field &&
          (sort.ascending ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          ))}
      </button>
    </th>
  );

  const selectClass =
    'border border-gray-300 rounded px-3 py-2 text-sm min-h-[44px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">Fire Extinguishers</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2 text-sm min-h-[44px]"
            title="Export the current view to CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {!adminLoading && isAdmin && (
            <>
              <button
                onClick={handleImportClick}
                disabled={importing}
                className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2 text-sm min-h-[44px]"
                title="Select every sheet's CSV at once"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {importing ? 'Importing...' : 'Import Sheets'}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                onChange={handleImport}
                style={{ display: 'none' }}
              />
              <button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2 text-sm min-h-[44px] font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!adminLoading && isAdmin && (
        <p className="text-xs text-gray-500 mb-3">
          Multiple sheets: in Excel use <span className="font-medium">Save As &rarr; CSV</span> for
          each sheet, then select all of the .csv files together in the Import dialog. Rows are
          matched on Area + Location + Extinguisher No, so re-importing a corrected sheet updates
          existing records instead of duplicating them.
        </p>
      )}

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {actionError}
        </div>
      )}

      <FireExtinguisherSummary
        summary={summary}
        activeStatus={filters.status}
        onSelectStatus={handleSelectStatus}
      />

      {/* Filters */}
      <div className="bg-white rounded-lg p-3 mb-4 flex flex-wrap gap-2 items-center">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search area, location, no. or remarks"
              className="w-full border border-gray-300 rounded pl-9 pr-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-800 text-sm min-h-[44px]"
          >
            Search
          </button>
        </form>

        <select
          value={filters.area}
          onChange={e => onFilterChange({ ...filters, area: e.target.value })}
          className={selectClass}
        >
          <option value="">All Areas</option>
          {areas.map(area => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={e => onFilterChange({ ...filters, type: e.target.value })}
          className={selectClass}
        >
          <option value="">All Types</option>
          {EXTINGUISHER_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={e =>
            onFilterChange({ ...filters, status: e.target.value as ExtinguisherStatus })
          }
          className={selectClass}
        >
          <option value="all">All Statuses</option>
          <option value="overdue">Overdue</option>
          <option value="due_soon">Expiring Soon</option>
          <option value="ok">OK</option>
          <option value="no_date">No Due Date</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-3 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm min-h-[44px] flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
                  Unique ID
                </th>
                <SortHeader field="area" label="Area" />
                <SortHeader field="location" label="Location" />
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
                  Ext No
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Capacity</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Pressure</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
                  Insp. Tag
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
                  Safety Pin
                </th>
                <SortHeader field="refilled_date" label="Refilled" />
                <SortHeader field="refilling_due_date" label="Due" />
                <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Remarks</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {extinguishers.map(item => {
                const status = getExtinguisherStatus(item.refillingDueDate, today, dueSoonDate);
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {item.uniqueKey}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.area}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.location}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.extinguisherNo}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.type || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.capacity || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.pressure || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.inspectionTag || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{item.safetyPin || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatExtinguisherDate(item.refilledDate)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatExtinguisherDate(item.refillingDueDate)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_CLASSES[status]}`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate" title={item.remarks}>
                      {item.remarks || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingHistory(item)}
                          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                          title="View audit trail"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {!adminLoading && isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setEditing(item);
                                setShowForm(true);
                              }}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-center py-12 text-gray-500">Loading fire extinguishers...</div>
        )}

        {!loading && extinguishers.length === 0 && hasActiveFilters && (
          <div className="text-center py-12 text-gray-500">
            No fire extinguishers match your filters. Try adjusting your search criteria.
          </div>
        )}

        {!loading && extinguishers.length === 0 && !hasActiveFilters && (
          <div className="text-center py-12 text-gray-500">
            No fire extinguishers yet. Use "Import Sheets" to load your register, or "Add" to
            create a record.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-gray-600">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} extinguishers
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className={`px-3 py-1 rounded flex items-center gap-1 ${
                currentPage === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (currentPage < 3) {
                  pageNum = i;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border hover:bg-gray-50'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className={`px-3 py-1 rounded flex items-center gap-1 ${
                currentPage >= totalPages - 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <FireExtinguisherForm
          extinguisher={editing}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {importResult && (
        <ImportSummaryModal result={importResult} onClose={() => setImportResult(null)} />
      )}

      {viewingHistory && (
        <FireExtinguisherHistoryModal
          extinguisher={viewingHistory}
          onClose={() => setViewingHistory(null)}
        />
      )}
    </div>
  );
};
