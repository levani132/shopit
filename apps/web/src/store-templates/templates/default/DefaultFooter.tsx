'use client';

import { StoreFooter } from '../../../components/store/StoreFooter';
import type { FooterProps } from '../../types';

export default function DefaultFooter({ store, locale }: FooterProps) {
  return <StoreFooter store={store} locale={locale} />;
}
