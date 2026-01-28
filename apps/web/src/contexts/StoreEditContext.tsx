'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { Role, hasRole } from '@shopit/constants';
import { api } from '../lib/api';

interface StoreEditContextType {
  // Is the current user the owner of this store?
  isStoreOwner: boolean;
  // Is edit mode enabled?
  isEditMode: boolean;
  // Toggle edit mode
  toggleEditMode: () => void;
  // Current store ID being viewed
  storeId: string | null;
  // Set the store being viewed
  setViewingStore: (storeId: string | null, subdomain: string | null) => void;
  // Subdomain of the store being viewed
  viewingSubdomain: string | null;
  // Update store field
  updateStoreField: <T>(field: string, value: T) => Promise<void>;
  // Is currently saving?
  isSaving: boolean;
  // Refresh store data callback
  onStoreUpdated?: () => void;
  setOnStoreUpdated: (callback: () => void) => void;
}

const StoreEditContext = createContext<StoreEditContextType | null>(null);

export function StoreEditProvider({ children }: { children: React.ReactNode }) {
  const { user, store: userStore } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewingStoreId, setViewingStoreId] = useState<string | null>(null);
  const [viewingSubdomain, setViewingSubdomain] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [onStoreUpdatedCallback, setOnStoreUpdatedCallback] = useState<(() => void) | undefined>();

  // Check if user is a seller and owns this store
  const isStoreOwner = useMemo(() => {
    if (!user || !userStore || !viewingStoreId) return false;
    
    // User must be a seller
    if (!hasRole(user.role, Role.SELLER)) return false;
    
    // User's store must match the viewing store
    return userStore.id === viewingStoreId;
  }, [user, userStore, viewingStoreId]);

  const toggleEditMode = useCallback(() => {
    if (isStoreOwner) {
      setIsEditMode(prev => !prev);
    }
  }, [isStoreOwner]);

  const setViewingStore = useCallback((storeId: string | null, subdomain: string | null) => {
    setViewingStoreId(storeId);
    setViewingSubdomain(subdomain);
  }, []);

  const updateStoreField = useCallback(async <T,>(field: string, value: T) => {
    if (!viewingStoreId || !isStoreOwner) return;
    
    setIsSaving(true);
    try {
      // Handle nested fields like "nameLocalized.ka"
      const data = field.includes('.') 
        ? field.split('.').reduceRight((acc, key) => ({ [key]: acc }), value as unknown)
        : { [field]: value };
      
      await api.patch('/stores/my-store', data);
      // Call the refresh callback if set
      if (onStoreUpdatedCallback) {
        onStoreUpdatedCallback();
      }
    } catch (error) {
      console.error('Failed to update store field:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [viewingStoreId, isStoreOwner, onStoreUpdatedCallback]);

  const setOnStoreUpdated = useCallback((callback: () => void) => {
    setOnStoreUpdatedCallback(() => callback);
  }, []);

  const value = useMemo(() => ({
    isStoreOwner,
    isEditMode,
    toggleEditMode,
    storeId: viewingStoreId,
    setViewingStore,
    viewingSubdomain,
    updateStoreField,
    isSaving,
    onStoreUpdated: onStoreUpdatedCallback,
    setOnStoreUpdated,
  }), [
    isStoreOwner,
    isEditMode,
    toggleEditMode,
    viewingStoreId,
    setViewingStore,
    viewingSubdomain,
    updateStoreField,
    isSaving,
    onStoreUpdatedCallback,
    setOnStoreUpdated,
  ]);

  return (
    <StoreEditContext.Provider value={value}>
      {children}
    </StoreEditContext.Provider>
  );
}

export function useStoreEdit() {
  const context = useContext(StoreEditContext);
  if (!context) {
    throw new Error('useStoreEdit must be used within StoreEditProvider');
  }
  return context;
}

// Hook that returns null if not in provider (for optional usage)
export function useStoreEditOptional() {
  return useContext(StoreEditContext);
}
