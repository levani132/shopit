'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

interface AttributeValue {
  _id: string;
  value: string;
  valueLocalized?: { ka?: string; en?: string };
  slug: string;
  colorHex?: string;
  order: number;
}

interface Attribute {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
  type: 'text' | 'color';
  requiresImage: boolean;
  values: AttributeValue[];
  order: number;
  isActive: boolean;
}

export default function AttributesPage() {
  const t = useTranslations('dashboard');
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch attributes
  const fetchAttributes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `${API_URL}/api/v1/attributes/my-store?includeInactive=true`,
        {
          credentials: 'include',
        },
      );

      if (!res.ok) {
        throw new Error('Failed to fetch attributes');
      }

      const data = await res.json();
      setAttributes(data);
    } catch (err) {
      console.error('Error fetching attributes:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load attributes',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  // Delete attribute
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/attributes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to delete attribute');
      }

      setAttributes(attributes.filter((a) => a._id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting attribute:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete attribute',
      );
    }
  };

  // Open edit modal
  const handleEdit = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    setShowModal(true);
  };

  // Open create modal
  const handleCreate = () => {
    setEditingAttribute(null);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded w-48 mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-64 mb-8" />
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-200 dark:bg-zinc-800 rounded"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {t('attributes')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('manageAttributes')}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t('addAttribute')}
        </button>
      </div>

      {/* Empty State */}
      {attributes.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/30 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[var(--accent-600)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('noAttributesYet')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
              {t('noAttributesDescription')}
            </p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {t('addFirstAttribute')}
            </button>
          </div>
        </div>
      ) : (
        /* Attributes List */
        <div className="space-y-4">
          {attributes.map((attribute) => (
            <div
              key={attribute._id}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {attribute.nameLocalized?.en || attribute.name}
                    </h3>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        attribute.type === 'color'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}
                    >
                      {attribute.type === 'color'
                        ? t('colorType')
                        : t('textType')}
                    </span>
                    {attribute.requiresImage && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {t('requiresImage')}
                      </span>
                    )}
                    {!attribute.isActive && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-400">
                        {t('draft')}
                      </span>
                    )}
                  </div>

                  {/* Values */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {attribute.values.length === 0 ? (
                      <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                        {t('noValuesYet')}
                      </span>
                    ) : (
                      attribute.values.map((value) => (
                        <div
                          key={value._id}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                            attribute.type === 'color'
                              ? 'bg-gray-100 dark:bg-zinc-800'
                              : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {attribute.type === 'color' && value.colorHex && (
                            <span
                              className="w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-600"
                              style={{ backgroundColor: value.colorHex }}
                            />
                          )}
                          <span className="text-gray-700 dark:text-gray-300">
                            {value.valueLocalized?.en || value.value}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(attribute)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(attribute._id)}
                    className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('deleteProduct')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('deleteAttributeConfirm')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <AttributeModal
          attribute={editingAttribute}
          onClose={() => {
            setShowModal(false);
            setEditingAttribute(null);
          }}
          onSaved={() => {
            fetchAttributes();
            setShowModal(false);
            setEditingAttribute(null);
          }}
        />
      )}
    </div>
  );
}

interface AttributeModalProps {
  attribute: Attribute | null;
  onClose: () => void;
  onSaved: () => void;
}

// Predefined color palette with English and Georgian names
const PREDEFINED_COLORS = [
  // Row 1 - Neutrals
  { hex: '#000000', en: 'Black', ka: 'შავი' },
  { hex: '#FFFFFF', en: 'White', ka: 'თეთრი' },
  { hex: '#808080', en: 'Gray', ka: 'ნაცრისფერი' },
  { hex: '#C0C0C0', en: 'Silver', ka: 'ვერცხლისფერი' },
  { hex: '#8B4513', en: 'Brown', ka: 'ყავისფერი' },
  { hex: '#F5F5DC', en: 'Beige', ka: 'ბეჟი' },
  // Row 2 - Reds/Oranges
  { hex: '#FF0000', en: 'Red', ka: 'წითელი' },
  { hex: '#DC143C', en: 'Crimson', ka: 'ჟოლოსფერი' },
  { hex: '#FF6347', en: 'Tomato', ka: 'პამიდვრისფერი' },
  { hex: '#FF4500', en: 'Orange Red', ka: 'ნარინჯისფერ-წითელი' },
  { hex: '#FFA500', en: 'Orange', ka: 'ნარინჯისფერი' },
  { hex: '#FFD700', en: 'Gold', ka: 'ოქროსფერი' },
  // Row 3 - Yellows/Greens
  { hex: '#FFFF00', en: 'Yellow', ka: 'ყვითელი' },
  { hex: '#9ACD32', en: 'Yellow Green', ka: 'ყვითელ-მწვანე' },
  { hex: '#32CD32', en: 'Lime Green', ka: 'ლაიმისფერი' },
  { hex: '#008000', en: 'Green', ka: 'მწვანე' },
  { hex: '#006400', en: 'Dark Green', ka: 'მუქი მწვანე' },
  { hex: '#20B2AA', en: 'Teal', ka: 'ზურმუხტისფერი' },
  // Row 4 - Blues/Purples
  { hex: '#00FFFF', en: 'Cyan', ka: 'ციანი' },
  { hex: '#00BFFF', en: 'Sky Blue', ka: 'ცისფერი' },
  { hex: '#0000FF', en: 'Blue', ka: 'ლურჯი' },
  { hex: '#000080', en: 'Navy', ka: 'მუქი ლურჯი' },
  { hex: '#800080', en: 'Purple', ka: 'იასამნისფერი' },
  { hex: '#FF69B4', en: 'Pink', ka: 'ვარდისფერი' },
];

function AttributeModal({ attribute, onClose, onSaved }: AttributeModalProps) {
  const t = useTranslations('dashboard');
  const [formData, setFormData] = useState({
    name: attribute?.name || '',
    nameKa: attribute?.nameLocalized?.ka || '',
    nameEn: attribute?.nameLocalized?.en || attribute?.name || '',
    type: attribute?.type || ('text' as 'text' | 'color'),
    requiresImage: attribute?.requiresImage || false,
  });
  const [values, setValues] = useState<AttributeValue[]>(
    attribute?.values || [],
  );
  const [newValue, setNewValue] = useState({ value: '', colorHex: '#000000' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showCustomColor, setShowCustomColor] = useState(false);

  const API_URL_MODAL = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  )
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/$/, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const payload = {
        name: formData.nameEn || formData.name,
        nameLocalized: {
          ka: formData.nameKa,
          en: formData.nameEn || formData.name,
        },
        type: formData.type,
        requiresImage: formData.requiresImage,
        values: values.map((v, idx) => {
          // Don't send _id for new values (those with temp- prefix)
          const isNewValue = v._id.startsWith('temp-');
          return {
            ...(isNewValue ? {} : { _id: v._id }),
            value: v.value,
            valueLocalized: v.valueLocalized,
            slug: v.slug,
            colorHex: v.colorHex,
            order: idx,
          };
        }),
      };

      const url = attribute
        ? `${API_URL_MODAL}/api/v1/attributes/${attribute._id}`
        : `${API_URL_MODAL}/api/v1/attributes`;

      const res = await fetch(url, {
        method: attribute ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save attribute');
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // Select a predefined color and auto-fill the name
  const selectPredefinedColor = (color: (typeof PREDEFINED_COLORS)[0]) => {
    // Check if this color is already added
    const alreadyExists = values.some(
      (v) => v.colorHex?.toLowerCase() === color.hex.toLowerCase(),
    );

    if (alreadyExists) {
      // Just select the color in the input without adding
      setNewValue({ value: color.en, colorHex: color.hex });
      return;
    }

    // Add the color directly
    const slug = color.en
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setValues([
      ...values,
      {
        _id: `temp-${Date.now()}`,
        value: color.en,
        valueLocalized: { en: color.en, ka: color.ka },
        slug,
        colorHex: color.hex,
        order: values.length,
      },
    ]);
  };

  const addValue = () => {
    if (!newValue.value.trim()) return;

    const slug = newValue.value
      .toLowerCase()
      .replace(/[^a-z0-9\u10D0-\u10FF]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if this color already exists
    if (formData.type === 'color') {
      const alreadyExists = values.some(
        (v) => v.colorHex?.toLowerCase() === newValue.colorHex.toLowerCase(),
      );
      if (alreadyExists) {
        setError(t('colorAlreadyExists'));
        return;
      }
    }

    setValues([
      ...values,
      {
        _id: `temp-${Date.now()}`,
        value: newValue.value,
        valueLocalized: { en: newValue.value },
        slug,
        colorHex: formData.type === 'color' ? newValue.colorHex : undefined,
        order: values.length,
      },
    ]);
    setNewValue({ value: '', colorHex: '#000000' });
    setShowCustomColor(false);
  };

  const removeValue = (id: string) => {
    setValues(values.filter((v) => v._id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {attribute ? t('editAttribute') : t('addAttribute')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Name Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('attributeName')} (Georgian)
              </label>
              <input
                type="text"
                value={formData.nameKa}
                onChange={(e) =>
                  setFormData({ ...formData, nameKa: e.target.value })
                }
                placeholder="მაგ: ზომა, ფერი"
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('attributeName')} (English) *
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) =>
                  setFormData({ ...formData, nameEn: e.target.value })
                }
                placeholder="e.g., Size, Color"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('attributeType')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="text"
                  checked={formData.type === 'text'}
                  onChange={() => setFormData({ ...formData, type: 'text' })}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('textType')}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="color"
                  checked={formData.type === 'color'}
                  onChange={() => setFormData({ ...formData, type: 'color' })}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--accent-500)' }}
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {t('colorType')}
                </span>
              </label>
            </div>
          </div>

          {/* Requires Image */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requiresImage}
                onChange={(e) =>
                  setFormData({ ...formData, requiresImage: e.target.checked })
                }
                className="w-5 h-5 mt-0.5 rounded border-gray-300 dark:border-zinc-600"
                style={{ accentColor: 'var(--accent-500)' }}
              />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('requiresImage')}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {t('requiresImageDescription')}
                </p>
              </div>
            </label>
          </div>

          {/* Values */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('attributeValues')}
            </label>

            {/* Existing values */}
            <div className="space-y-2 mb-4">
              {values.map((value) => (
                <div
                  key={value._id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg"
                >
                  {formData.type === 'color' && value.colorHex && (
                    <span
                      className="w-6 h-6 rounded-full border border-gray-300 dark:border-zinc-500 flex-shrink-0"
                      style={{ backgroundColor: value.colorHex }}
                    />
                  )}
                  <span className="flex-1 text-gray-700 dark:text-gray-300">
                    {value.value}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeValue(value._id)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add new value */}
            {formData.type === 'color' ? (
              <div className="space-y-3">
                {/* Two buttons: Predefined Palette and Custom Color */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPalette(!showPalette);
                      setShowCustomColor(false);
                    }}
                    className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      showPalette
                        ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-700)] dark:text-[var(--accent-400)]'
                        : 'border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-zinc-500'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
                    {t('selectFromPalette')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomColor(!showCustomColor);
                      setShowPalette(false);
                    }}
                    className={`flex-1 px-4 py-2.5 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                      showCustomColor
                        ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-700)] dark:text-[var(--accent-400)]'
                        : 'border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-zinc-500'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('addCustomColor')}
                  </button>
                </div>

                {/* Predefined Color Palette - Compact circles */}
                {showPalette && (
                  <div className="p-3 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {PREDEFINED_COLORS.map((color) => {
                        const isAdded = values.some(
                          (v) =>
                            v.colorHex?.toLowerCase() === color.hex.toLowerCase(),
                        );
                        return (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => selectPredefinedColor(color)}
                            disabled={isAdded}
                            className={`group relative w-7 h-7 rounded-full border-2 transition-all ${
                              isAdded
                                ? 'border-green-500 cursor-default opacity-60'
                                : 'border-transparent hover:border-[var(--accent-500)] hover:scale-110'
                            } ${color.hex === '#FFFFFF' ? 'border-gray-300 dark:border-zinc-500' : ''}`}
                            style={{ backgroundColor: color.hex }}
                            title={`${color.en} / ${color.ka}`}
                          >
                            {isAdded && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <svg
                                  className="w-3.5 h-3.5 text-white drop-shadow-md"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      {t('clickToAdd')}
                    </p>
                  </div>
                )}

                {/* Custom Color Input */}
                {showCustomColor && (
                  <div className="p-3 border border-gray-200 dark:border-zinc-700 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={newValue.colorHex}
                        onChange={(e) =>
                          setNewValue({ ...newValue, colorHex: e.target.value })
                        }
                        className="w-12 h-10 p-1 rounded border border-gray-300 dark:border-zinc-600 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newValue.value}
                        onChange={(e) =>
                          setNewValue({ ...newValue, value: e.target.value })
                        }
                        placeholder={t('colorName')}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addValue();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={addValue}
                        className="px-4 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors"
                      >
                        {t('add')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newValue.value}
                  onChange={(e) =>
                    setNewValue({ ...newValue, value: e.target.value })
                  }
                  placeholder={t('valueName')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValue();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addValue}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
                >
                  {t('addValue')}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-[var(--accent-600)] text-white rounded-lg hover:bg-[var(--accent-700)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t('saving')}
                </>
              ) : (
                t('saveChanges')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
