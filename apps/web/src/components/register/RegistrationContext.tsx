'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface RegistrationData {
  // Step 1: Brand
  storeName: string;
  brandColor: string;
  useInitialAsLogo: boolean;
  logoFile: File | null;
  logoPreview: string | null;

  // Step 2: Store Details
  description: string;
  authorName: string;
  showAuthorName: boolean;

  // Step 3: Auth
  email: string;
  password: string;
  authMethod: 'email' | 'google' | null;

  // Step 4: Profile Completion (after signup)
  ownerFirstName: string;
  ownerLastName: string;
  phoneNumber: string;
  identificationNumber: string;
  accountNumber: string;
  beneficiaryBankCode: string;
}

interface RegistrationContextType {
  step: number;
  data: RegistrationData;
  unblurredSections: ('header' | 'hero' | 'categories' | 'products' | 'footer')[];
  setStep: (step: number) => void;
  updateData: (updates: Partial<RegistrationData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  setUnblurredSections: (sections: typeof unblurredSections) => void;
}

const initialData: RegistrationData = {
  storeName: '',
  brandColor: 'indigo',
  useInitialAsLogo: false,
  logoFile: null,
  logoPreview: null,
  description: '',
  authorName: '',
  showAuthorName: true,
  email: '',
  password: '',
  authMethod: null,
  ownerFirstName: '',
  ownerLastName: '',
  phoneNumber: '',
  identificationNumber: '',
  accountNumber: '',
  beneficiaryBankCode: '',
};

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>(initialData);
  const [unblurredSections, setUnblurredSections] = useState<
    ('header' | 'hero' | 'categories' | 'products' | 'footer')[]
  >([]);

  const updateData = useCallback((updates: Partial<RegistrationData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, 4));
  }, []);

  const prevStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 1));
  }, []);

  return (
    <RegistrationContext.Provider
      value={{
        step,
        data,
        unblurredSections,
        setStep,
        updateData,
        nextStep,
        prevStep,
        setUnblurredSections,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
}

