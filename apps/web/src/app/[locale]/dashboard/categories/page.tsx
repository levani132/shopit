'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '../../../../lib/api';

interface Subcategory {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
  order: number;
  categoryId: string;
}

interface Category {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
  order: number;
  storeId: string;
  subcategories: Subcategory[];
}

export default function CategoriesPage() {
  const t = useTranslations('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);

  // New category form
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    nameKa: '',
    nameEn: '',
  });

  // New subcategory form
  const [showNewSubcategoryForm, setShowNewSubcategoryForm] = useState<string | null>(null);
  const [newSubcategory, setNewSubcategory] = useState({
    name: '',
    nameKa: '',
    nameEn: '',
  });

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await api.get<Category[]>('/api/v1/categories/my-store');
      setCategories(data);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const created = await api.post<Category>('/api/v1/categories', {
        name: newCategory.nameEn || newCategory.name,
        nameLocalized: {
          ka: newCategory.nameKa,
          en: newCategory.nameEn || newCategory.name,
        },
      });

      setCategories([...categories, created]);
      setNewCategory({ name: '', nameKa: '', nameEn: '' });
      setShowNewCategoryForm(false);
      setSuccess(t('categoryCreated'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreateCategory'));
    }
  };

  // Update category
  const handleUpdateCategory = async (category: Category) => {
    setError(null);

    try {
      const updated = await api.patch<Category>(`/api/v1/categories/${category._id}`, {
        name: category.nameLocalized?.en || category.name,
        nameLocalized: category.nameLocalized,
      });

      setCategories(categories.map((c) => (c._id === updated._id ? updated : c)));
      setEditingCategory(null);
      setSuccess(t('categoryUpdated'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(t('failedToUpdateCategory'));
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm(t('deleteCategoryConfirm'))) return;

    try {
      await api.delete(`/api/v1/categories/${categoryId}`);

      setCategories(categories.filter((c) => c._id !== categoryId));
      setSuccess(t('categoryDeleted'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(t('failedToDeleteCategory'));
    }
  };

  // Create subcategory
  const handleCreateSubcategory = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    setError(null);

    try {
      await api.post('/api/v1/categories/subcategory', {
        name: newSubcategory.nameEn || newSubcategory.name,
        nameLocalized: {
          ka: newSubcategory.nameKa,
          en: newSubcategory.nameEn || newSubcategory.name,
        },
        categoryId,
      });

      await fetchCategories(); // Refresh to get updated structure
      setNewSubcategory({ name: '', nameKa: '', nameEn: '' });
      setShowNewSubcategoryForm(null);
      setSuccess(t('subcategoryCreated'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreateSubcategory'));
    }
  };

  // Update subcategory
  const handleUpdateSubcategory = async (subcategory: Subcategory) => {
    setError(null);

    try {
      await api.patch(`/api/v1/categories/subcategory/${subcategory._id}`, {
        name: subcategory.nameLocalized?.en || subcategory.name,
        nameLocalized: subcategory.nameLocalized,
      });

      await fetchCategories();
      setEditingSubcategory(null);
      setSuccess(t('subcategoryUpdated'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(t('failedToUpdateSubcategory'));
    }
  };

  // Delete subcategory
  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!confirm(t('deleteSubcategoryConfirm'))) return;

    try {
      await api.delete(`/api/v1/categories/subcategory/${subcategoryId}`);

      await fetchCategories();
      setSuccess(t('subcategoryDeleted'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(t('failedToDeleteSubcategory'));
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-zinc-700 rounded"></div>
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
            {t('categories')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('categoriesDescription')}
          </p>
        </div>
        <button
          onClick={() => setShowNewCategoryForm(true)}
          className="px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2"
          style={{ backgroundColor: 'var(--accent-500)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addCategory')}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {/* New Category Form */}
      {showNewCategoryForm && (
        <div className="mb-6 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('newCategory')}
          </h3>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('nameGeorgian')}
                </label>
                <input
                  type="text"
                  value={newCategory.nameKa}
                  onChange={(e) => setNewCategory({ ...newCategory, nameKa: e.target.value })}
                  placeholder={t('categoryPlaceholderKa')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('nameEnglish')} *
                </label>
                <input
                  type="text"
                  value={newCategory.nameEn}
                  onChange={(e) => setNewCategory({ ...newCategory, nameEn: e.target.value })}
                  placeholder={t('categoryPlaceholderEn')}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewCategoryForm(false);
                  setNewCategory({ name: '', nameKa: '', nameEn: '' });
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--accent-500)' }}
              >
                {t('createCategory')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 && !showNewCategoryForm ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('noCategoriesYet')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('createCategoriesToOrganize')}
          </p>
          <button
            onClick={() => setShowNewCategoryForm(true)}
            className="px-4 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--accent-500)' }}
          >
            {t('addYourFirstCategory')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <div
              key={category._id}
              className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 overflow-hidden"
            >
              {/* Category Header */}
              <div className="p-4 flex items-center justify-between">
                {editingCategory?._id === category._id ? (
                  <div className="flex-1 grid md:grid-cols-2 gap-4 mr-4">
                    <input
                      type="text"
                      value={editingCategory.nameLocalized?.ka || ''}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          nameLocalized: { ...editingCategory.nameLocalized, ka: e.target.value },
                        })
                      }
                      placeholder={t('georgianName')}
                      className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      value={editingCategory.nameLocalized?.en || editingCategory.name}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          name: e.target.value,
                          nameLocalized: { ...editingCategory.nameLocalized, en: e.target.value },
                        })
                      }
                      placeholder={t('englishName')}
                      className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: 'var(--accent-500)' }}
                    >
                      {(category.nameLocalized?.en || category.name).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {category.nameLocalized?.en || category.name}
                      </h3>
                      {category.nameLocalized?.ka && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {category.nameLocalized.ka}
                        </p>
                      )}
                    </div>
                    <span className="ml-2 text-xs text-gray-400 bg-gray-100 dark:bg-zinc-700 px-2 py-1 rounded">
                      {category.subcategories.length} {t('subcategories')}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {editingCategory?._id === category._id ? (
                    <>
                      <button
                        onClick={() => handleUpdateCategory(editingCategory)}
                        className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowNewSubcategoryForm(category._id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg"
                        title="Add subcategory"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setEditingCategory(category)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg"
                        title="Edit category"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category._id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Delete category"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* New Subcategory Form */}
              {showNewSubcategoryForm === category._id && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-zinc-700 pt-4">
                  <form onSubmit={(e) => handleCreateSubcategory(e, category._id)} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        value={newSubcategory.nameKa}
                        onChange={(e) => setNewSubcategory({ ...newSubcategory, nameKa: e.target.value })}
                        placeholder={t('subcategoryGeorgian')}
                        className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={newSubcategory.nameEn}
                        onChange={(e) => setNewSubcategory({ ...newSubcategory, nameEn: e.target.value })}
                        placeholder={t('subcategoryEnglish')}
                        required
                        className="px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewSubcategoryForm(null);
                          setNewSubcategory({ name: '', nameKa: '', nameEn: '' });
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-sm text-white rounded"
                        style={{ backgroundColor: 'var(--accent-500)' }}
                      >
                        {t('addSubcategory')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Subcategories */}
              {category.subcategories.length > 0 && (
                <div className="border-t border-gray-100 dark:border-zinc-700">
                  {category.subcategories.map((sub) => (
                    <div
                      key={sub._id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-700/50 border-b border-gray-100 dark:border-zinc-700 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 pl-8">
                        <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-zinc-600"></div>
                        {editingSubcategory?._id === sub._id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingSubcategory.nameLocalized?.ka || ''}
                              onChange={(e) =>
                                setEditingSubcategory({
                                  ...editingSubcategory,
                                  nameLocalized: { ...editingSubcategory.nameLocalized, ka: e.target.value },
                                })
                              }
                              placeholder={t('georgianName')}
                              className="px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                            />
                            <input
                              type="text"
                              value={editingSubcategory.nameLocalized?.en || editingSubcategory.name}
                              onChange={(e) =>
                                setEditingSubcategory({
                                  ...editingSubcategory,
                                  name: e.target.value,
                                  nameLocalized: { ...editingSubcategory.nameLocalized, en: e.target.value },
                                })
                              }
                              placeholder={t('englishName')}
                              className="px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        ) : (
                          <div>
                            <span className="text-gray-900 dark:text-white">
                              {sub.nameLocalized?.en || sub.name}
                            </span>
                            {sub.nameLocalized?.ka && (
                              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                                ({sub.nameLocalized.ka})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {editingSubcategory?._id === sub._id ? (
                          <>
                            <button
                              onClick={() => handleUpdateSubcategory(editingSubcategory)}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => setEditingSubcategory(null)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingSubcategory(sub)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteSubcategory(sub._id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


