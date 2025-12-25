import { ReactNode, ComponentType } from 'react';
import { BrandPreview } from './BrandPreview';
import { CategoriesPreview } from './CategoriesPreview';
import { ProductsPreview } from './ProductsPreview';

interface StepCardProps {
  number: number;
  stepKey: string;
  title: string;
  description: string;
  icon: ComponentType;
  color: string;
  bgColor: string;
  isLast: boolean;
}

export function StepCard({
  number,
  title,
  description,
  icon: Icon,
  color,
  bgColor,
  isLast,
}: StepCardProps) {
  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="hidden md:block absolute top-16 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-200 to-gray-200" />
      )}

      <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
        {/* Step number badge */}
        <div
          className={`absolute -top-4 left-8 w-8 h-8 rounded-full bg-gradient-to-r ${color} text-white flex items-center justify-center font-bold text-sm shadow-lg`}
        >
          {number}
        </div>

        {/* Icon */}
        <div
          className={`w-16 h-16 ${bgColor} rounded-2xl flex items-center justify-center mb-6`}
        >
          <Icon />
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600">{description}</p>

        {/* Visual preview - mockup of the step */}
        <div className="mt-6 rounded-lg overflow-hidden border border-gray-200">
          <StepPreview stepNumber={number} />
        </div>
      </div>
    </div>
  );
}

function StepPreview({ stepNumber }: { stepNumber: number }) {
  switch (stepNumber) {
    case 1:
      return <BrandPreview />;
    case 2:
      return <CategoriesPreview />;
    case 3:
      return <ProductsPreview />;
    default:
      return null;
  }
}
