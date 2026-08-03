import React, { useState, useEffect } from 'react';
import { FireExtinguisher, FireExtinguisherFormData } from '../../types';
import {
  DEFAULT_EXTINGUISHER_FORM_DATA,
  EXTINGUISHER_TYPES,
  EXTINGUISHER_CAPACITIES,
  EXTINGUISHER_CONDITIONS,
} from '../../constants';
import { buildExtinguisherKey } from '../../utils/fireExtinguisherImport';

interface FireExtinguisherFormProps {
  extinguisher: FireExtinguisher | null;
  onSave: (formData: FireExtinguisherFormData) => Promise<void>;
  onCancel: () => void;
}

const toFormData = (extinguisher: FireExtinguisher): FireExtinguisherFormData => ({
  area: extinguisher.area,
  location: extinguisher.location,
  extinguisherNo: extinguisher.extinguisherNo,
  type: extinguisher.type,
  capacity: extinguisher.capacity,
  pressure: extinguisher.pressure,
  inspectionTag: extinguisher.inspectionTag,
  safetyPin: extinguisher.safetyPin,
  refilledDate: extinguisher.refilledDate || '',
  refillingDueDate: extinguisher.refillingDueDate || '',
  remarks: extinguisher.remarks,
});

export const FireExtinguisherForm: React.FC<FireExtinguisherFormProps> = ({
  extinguisher,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<FireExtinguisherFormData>(() =>
    extinguisher ? toFormData(extinguisher) : DEFAULT_EXTINGUISHER_FORM_DATA
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(extinguisher ? toFormData(extinguisher) : DEFAULT_EXTINGUISHER_FORM_DATA);
  }, [extinguisher]);

  // Live preview of the ID the database will generate from the three key fields
  const previewKey = buildExtinguisherKey(
    formData.area,
    formData.location,
    formData.extinguisherNo
  );
  const keyChanged = extinguisher != null && previewKey !== extinguisher.uniqueKey;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.area.trim() || !formData.location.trim() || !formData.extinguisherNo.trim()) {
      setError('Area, Location and Extinguisher No are required');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the record');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof FireExtinguisherFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg w-full max-w-2xl my-8">
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-xl font-bold">
              {extinguisher ? 'Edit Fire Extinguisher' : 'Add Fire Extinguisher'}
            </h2>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-xs font-medium text-blue-900 mb-2">
                Unique ID (Area + Location + Extinguisher No)
              </div>
              <div className="font-mono text-sm text-blue-800 break-all">
                {previewKey === '||' ? '-' : previewKey}
              </div>
              {keyChanged && (
                <div className="text-xs text-amber-700 mt-2">
                  Changing these three fields re-keys the record. Its previous ID was{' '}
                  <span className="font-mono">{extinguisher?.uniqueKey}</span>.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Area *</label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={e => update('area', e.target.value)}
                  className={inputClass}
                  placeholder="BLOCK 1"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => update('location', e.target.value)}
                  className={inputClass}
                  placeholder="1 FLOOR"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Extinguisher No *</label>
                <input
                  type="text"
                  value={formData.extinguisherNo}
                  onChange={e => update('extinguisherNo', e.target.value)}
                  className={inputClass}
                  placeholder="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type</label>
                <input
                  type="text"
                  list="extinguisher-types"
                  value={formData.type}
                  onChange={e => update('type', e.target.value)}
                  className={inputClass}
                  placeholder="ABC"
                />
                <datalist id="extinguisher-types">
                  {EXTINGUISHER_TYPES.map(option => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelClass}>Capacity</label>
                <input
                  type="text"
                  list="extinguisher-capacities"
                  value={formData.capacity}
                  onChange={e => update('capacity', e.target.value)}
                  className={inputClass}
                  placeholder="4KG"
                />
                <datalist id="extinguisher-capacities">
                  {EXTINGUISHER_CAPACITIES.map(option => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                ['pressure', 'Pressure'],
                ['inspectionTag', 'Inspection Tag'],
                ['safetyPin', 'Safety Pin'],
              ] as [keyof FireExtinguisherFormData, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className={labelClass}>{label}</label>
                  <input
                    type="text"
                    list="extinguisher-conditions"
                    value={formData[field]}
                    onChange={e => update(field, e.target.value)}
                    className={inputClass}
                    placeholder="OK"
                  />
                </div>
              ))}
              <datalist id="extinguisher-conditions">
                {EXTINGUISHER_CONDITIONS.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Refilled Date</label>
                <input
                  type="date"
                  value={formData.refilledDate}
                  onChange={e => update('refilledDate', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Refilling Due Date</label>
                <input
                  type="date"
                  value={formData.refillingDueDate}
                  onChange={e => update('refillingDueDate', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={e => update('remarks', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>

          <div className="p-4 sm:p-6 border-t flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[44px] text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 min-h-[44px] text-sm font-medium"
            >
              {saving ? 'Saving...' : extinguisher ? 'Save Changes' : 'Add Extinguisher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
