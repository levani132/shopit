'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStoreEditOptional } from '../../contexts/StoreEditContext';
import { useTranslations } from 'next-intl';

// Pencil icon component
function PencilIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

// Check icon for save
function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// X icon for cancel
function XIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Spinner icon
function SpinnerIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

interface EditableTextProps {
  // The field name to update (e.g., 'name', 'description')
  field: string;
  // Current value
  value: string;
  // Localized field? (will update nameLocalized.ka/en based on locale)
  localized?: boolean;
  // Current locale (required if localized)
  locale?: string;
  // Placeholder when empty
  placeholder?: string;
  // Is this a multiline field?
  multiline?: boolean;
  // Custom className for the text
  className?: string;
  // Custom styles
  style?: React.CSSProperties;
  // Element type to render (default: span)
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
  // Called after successful save
  onSaved?: (newValue: string) => void;
  // Max length for input
  maxLength?: number;
}

export function EditableText({
  field,
  value,
  localized = false,
  locale = 'en',
  placeholder = '',
  multiline = false,
  className = '',
  style,
  as: Component = 'span',
  onSaved,
  maxLength,
}: EditableTextProps) {
  const storeEdit = useStoreEditOptional();
  const t = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update editValue when value changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle click outside to cancel
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (!storeEdit?.isStoreOwner) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  }, [storeEdit?.isStoreOwner, value]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  }, [value]);

  const handleSave = useCallback(async () => {
    if (!storeEdit?.isStoreOwner || editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Determine the field to update
      const updateField = localized ? `${field}Localized.${locale}` : field;
      await storeEdit.updateStoreField(updateField, editValue);
      
      setIsEditing(false);
      onSaved?.(editValue);
    } catch (err) {
      setError(t('saveFailed') || 'Failed to save');
      console.error('Failed to save:', err);
    } finally {
      setIsSaving(false);
    }
  }, [storeEdit, editValue, value, localized, field, locale, onSaved, t]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault();
      handleSave();
    }
  }, [handleCancel, handleSave, multiline]);

  // If not store owner or no context, just render the text
  if (!storeEdit?.isStoreOwner) {
    return (
      <Component className={className} style={style}>
        {value || placeholder}
      </Component>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div ref={containerRef} className="relative inline-flex items-center gap-2 w-full">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            className="flex-1 bg-white dark:bg-zinc-800 border border-blue-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none text-base font-normal"
            style={{ minHeight: '80px' }}
            disabled={isSaving}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={maxLength}
            className="flex-1 bg-white dark:bg-zinc-800 border border-blue-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-base font-normal"
            disabled={isSaving}
          />
        )}
        
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
            title={t('save') || 'Save'}
          >
            {isSaving ? <SpinnerIcon /> : <CheckIcon />}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
            title={t('cancel') || 'Cancel'}
          >
            <XIcon />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="absolute -bottom-6 left-0 text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // View mode with edit button
  return (
    <div className="group relative inline-flex items-center gap-2">
      <Component className={className} style={style}>
        {value || <span className="opacity-50 italic">{placeholder}</span>}
      </Component>
      
      {/* Edit button - visible on hover */}
      <button
        onClick={handleStartEdit}
        className="opacity-0 group-hover:opacity-100 p-1.5 bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-lg shadow-lg transition-all border border-gray-200 dark:border-zinc-600"
        title={t('edit') || 'Edit'}
      >
        <PencilIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Image editing component
interface EditableImageProps {
  field: string;
  value?: string;
  placeholder?: React.ReactNode;
  className?: string;
  imageClassName?: string;
  alt?: string;
  onSaved?: (newValue: string) => void;
}

export function EditableImage({
  field,
  value,
  placeholder,
  className = '',
  imageClassName = '',
  alt = '',
  onSaved,
}: EditableImageProps) {
  const storeEdit = useStoreEditOptional();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = useCallback(() => {
    if (!storeEdit?.isStoreOwner) return;
    fileInputRef.current?.click();
  }, [storeEdit?.isStoreOwner]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeEdit?.isStoreOwner) return;

    setIsUploading(true);
    try {
      // Upload the file
      const formData = new FormData();
      formData.append('file', file);
      
      // TODO: Implement file upload API
      // const response = await api.uploadFile(formData);
      // await storeEdit.updateStoreField(field, response.url);
      // onSaved?.(response.url);
      
      console.log('File upload not yet implemented');
    } catch (error) {
      console.error('Failed to upload image:', error);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [storeEdit, field, onSaved]);

  if (!storeEdit?.isStoreOwner) {
    return value ? (
      <img src={value} alt={alt} className={imageClassName} />
    ) : (
      <>{placeholder}</>
    );
  }

  return (
    <div className={`group relative ${className}`}>
      {value ? (
        <img src={value} alt={alt} className={imageClassName} />
      ) : (
        placeholder
      )}

      {/* Edit overlay */}
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors cursor-pointer"
      >
        <div className="opacity-0 group-hover:opacity-100 p-3 bg-white/90 dark:bg-zinc-800/90 rounded-full shadow-lg transition-all">
          {isUploading ? (
            <SpinnerIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <PencilIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

// Color picker component
interface EditableColorProps {
  field: string;
  value: string;
  colors: Array<{ name: string; hex: string }>;
  className?: string;
  onSaved?: (newValue: string) => void;
}

export function EditableColor({
  field,
  value,
  colors,
  className = '',
  onSaved,
}: EditableColorProps) {
  const storeEdit = useStoreEditOptional();
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleColorSelect = useCallback(async (colorName: string) => {
    if (!storeEdit?.isStoreOwner || colorName === value) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await storeEdit.updateStoreField(field, colorName);
      setIsOpen(false);
      onSaved?.(colorName);
    } catch (error) {
      console.error('Failed to update color:', error);
    } finally {
      setIsSaving(false);
    }
  }, [storeEdit, field, value, onSaved]);

  if (!storeEdit?.isStoreOwner) {
    return null;
  }

  const currentColor = colors.find(c => c.name === value);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSaving}
        className="group flex items-center gap-2 p-2 bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 rounded-lg shadow-lg transition-all border border-gray-200 dark:border-zinc-600"
        title={t('changeColor') || 'Change color'}
      >
        <div
          className="w-5 h-5 rounded-full border-2 border-white shadow"
          style={{ backgroundColor: currentColor?.hex }}
        />
        <PencilIcon className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Color picker dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 z-50">
          <div className="grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <button
                key={color.name}
                onClick={() => handleColorSelect(color.name)}
                disabled={isSaving}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                  color.name === value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
