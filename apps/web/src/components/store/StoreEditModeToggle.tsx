'use client';

import { useStoreEditOptional } from '../../contexts/StoreEditContext';
import { useTranslations } from 'next-intl';

// Pencil icon
function PencilIcon({ className = 'w-5 h-5' }: { className?: string }) {
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

// Eye icon for view mode
function EyeIcon({ className = 'w-5 h-5' }: { className?: string }) {
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
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export function StoreEditModeToggle() {
  const storeEdit = useStoreEditOptional();
  const t = useTranslations('store');

  // Only show for store owners
  if (!storeEdit?.isStoreOwner) {
    return null;
  }

  return (
    <button
      onClick={storeEdit.toggleEditMode}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all transform hover:scale-105 ${
        storeEdit.isEditMode
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-zinc-700'
      }`}
      title={storeEdit.isEditMode ? t('exitEditMode') : t('enterEditMode')}
    >
      {storeEdit.isEditMode ? (
        <>
          <EyeIcon />
          <span className="font-medium">{t('exitEditMode') || 'Exit Edit Mode'}</span>
        </>
      ) : (
        <>
          <PencilIcon />
          <span className="font-medium">{t('editStore') || 'Edit Store'}</span>
        </>
      )}
    </button>
  );
}
