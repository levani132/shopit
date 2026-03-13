import { registerTemplate } from '../../registry';
import type { TemplateDefinition } from '../../types';
import DefaultHomePage from './HomePage';
import DefaultProductsPage from './ProductsPage';
import DefaultProductDetailPage from './ProductDetailPage';
import DefaultAboutPage from './AboutPage';
import DefaultStoreLayoutWrapper from './StoreLayoutWrapper';
import DefaultHeader from './DefaultHeader';
import DefaultFooter from './DefaultFooter';
import { defaultAttributes, defaultAttributeValues } from './attributes';

const defaultTemplate: TemplateDefinition = {
  id: 'default',
  name: 'Default',
  description: 'The built-in ShopIt store template',
  version: '1.0.0',

  pages: {
    home: DefaultHomePage,
    products: DefaultProductsPage,
    productDetail: DefaultProductDetailPage,
    about: DefaultAboutPage,
  },

  layout: {
    wrapper: DefaultStoreLayoutWrapper,
    header: DefaultHeader,
    footer: DefaultFooter,
  },

  attributes: defaultAttributes,
  defaultAttributeValues,
};

registerTemplate(defaultTemplate);

export default defaultTemplate;
