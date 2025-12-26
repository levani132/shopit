'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
import { Link } from '../../i18n/routing';

const slides = [
  {
    key: 'sell',
    image: '/images/hero/sell.jpg',
    gradient: 'from-indigo-600 to-purple-600',
  },
  {
    key: 'grow',
    image: '/images/hero/grow.jpg',
    gradient: 'from-purple-600 to-pink-600',
  },
  {
    key: 'manage',
    image: '/images/hero/manage.jpg',
    gradient: 'from-pink-600 to-orange-500',
  },
];

export function Hero() {
  const t = useTranslations('hero');
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextSlide, 4000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100 dark:bg-indigo-900 rounded-full opacity-50 dark:opacity-20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 dark:bg-purple-900 rounded-full opacity-50 dark:opacity-20 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              {t('title')}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0">
              {t('subtitle')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/"
                className="px-8 py-4 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all font-semibold text-lg shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 hover:shadow-xl hover:shadow-indigo-300 dark:hover:shadow-indigo-800/50 hover:-translate-y-0.5"
              >
                {t('cta')}
              </Link>
              <a
                href="#how-it-works"
                className="px-8 py-4 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all font-semibold text-lg border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
              >
                {t('secondaryCta')}
              </a>
            </div>
          </div>

          {/* Right side - Slideshow */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              {/* Slide images placeholder - using gradient backgrounds */}
              {slides.map((slide, index) => (
                <div
                  key={slide.key}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    index === currentSlide ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div
                    className={`w-full h-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center`}
                  >
                    {/* Placeholder illustration */}
                    <div className="text-white text-center p-8">
                      <SlideIcon slideKey={slide.key} />
                      <p className="mt-4 text-2xl font-semibold">
                        {t(`slides.${slide.key}`)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Slide indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentSlide
                        ? 'bg-white w-6'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Floating elements decoration */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-400 dark:bg-yellow-500 rounded-xl rotate-12 opacity-80 dark:opacity-60" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-indigo-400 dark:bg-indigo-500 rounded-lg -rotate-12 opacity-80 dark:opacity-60" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SlideIcon({ slideKey }: { slideKey: string }) {
  switch (slideKey) {
    case 'sell':
      return (
        <svg
          className="w-24 h-24 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      );
    case 'grow':
      return (
        <svg
          className="w-24 h-24 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      );
    case 'manage':
      return (
        <svg
          className="w-24 h-24 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      );
    default:
      return null;
  }
}
