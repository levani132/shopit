'use client';

import {
  RegistrationProvider,
  useRegistration,
  BlurredStorePreview,
  Step1Brand,
  Step2Details,
  Step3Auth,
} from '../../../components/register';

function RegistrationSteps() {
  const { step } = useRegistration();

  return (
    <>
      {step === 1 && <Step1Brand />}
      {step === 2 && <Step2Details />}
      {step === 3 && <Step3Auth />}
    </>
  );
}

export default function RegisterPage() {
  return (
    <RegistrationProvider>
      {/* Blurred store preview as background */}
      <BlurredStorePreview />

      {/* Registration steps overlay */}
      <RegistrationSteps />
    </RegistrationProvider>
  );
}

