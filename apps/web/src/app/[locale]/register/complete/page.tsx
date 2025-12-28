'use client';

import { RegistrationProvider, ProfileCompletion } from '../../../../components/register';

export default function RegisterCompletePage() {
  return (
    <RegistrationProvider>
      <ProfileCompletion />
    </RegistrationProvider>
  );
}

