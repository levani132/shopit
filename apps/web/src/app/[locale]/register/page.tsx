'use client';

import {
  RegistrationProvider,
  useRegistration,
  BlurredStorePreview,
  MobileCta,
  Step1Brand,
  Step2Details,
  Step3Auth,
} from '../../../components/register';

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

