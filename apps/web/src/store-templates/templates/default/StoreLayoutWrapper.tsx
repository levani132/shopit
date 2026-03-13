'use client';

import { StoreLayoutContent } from '../../../components/store/StoreLayoutContent';
import type { LayoutWrapperProps } from '../../types';

export default function DefaultStoreLayoutWrapper({
  store,
  accentColors,
  locale,
  children,
}: LayoutWrapperProps) {
  return (
    <StoreLayoutContent
      store={store}
      accentColors={accentColors}
      locale={locale}
    >
      {children}
    </StoreLayoutContent>
  );
}
