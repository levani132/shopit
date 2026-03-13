'use client';

import { StoreHeader } from '../../../components/store/StoreHeader';
import type { HeaderProps } from '../../types';

export default function DefaultHeader({ store }: HeaderProps) {
  return <StoreHeader store={store} />;
}
