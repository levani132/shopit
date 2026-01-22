'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RegistrationProvider,
  useRegistration,
  BlurredStorePreview,
  MobileCta,
  Step1Brand,
  Step2Details,
  Step3Auth,
} from '../../../components/register';
import { getStoreSubdomain } from '../../../utils/subdomain';

function RegistrationSteps() {
  const { step, showMobileCta } = useRegistration();

  // On mobile, when CTA is shown, hide the form steps
  if (showMobileCta) {
    return null;
  }

  return (
    <>
      {step === 1 && <Step1Brand />}
      {step === 2 && <Step2Details />}
      {step === 3 && <Step3Auth />}
    </>
  );
}

function MobileCtaWrapper() {
  const { showMobileCta } = useRegistration();

  if (!showMobileCta) {
    return null;
  }

  return <MobileCta />;
}

export default function RegisterPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // Check if on store subdomain and redirect to buyer registration
  useEffect(() => {
    const subdomain = getStoreSubdomain();
    if (subdomain) {
      // On store subdomain, redirect to buyer registration
      router.replace('/register/buyer');
    } else {
      setIsChecking(false);
    }
  }, [router]);

  // Show loading while checking subdomain
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <div className="w-8 h-8 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RegistrationProvider>
      {/* Blurred store preview as background */}
      <BlurredStorePreview />

      {/* Registration steps overlay */}
      <RegistrationSteps />

      {/* Mobile CTA overlay (shown between step 2 and 3 on mobile) */}
      <MobileCtaWrapper />
    </RegistrationProvider>
  );
}
