'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Banner {
  id: string;
  gradient: string;
  text: string;
  emoji: string;
  link?: string;
  order: number;
}

// بانرات وهمية - استخدام CSS gradients
const MOCK_BANNERS: Banner[] = [
  {
    id: '1',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    text: 'عرض خاص على بطاقات الألعاب',
    emoji: '🎮',
    link: '#',
    order: 1,
  },
  {
    id: '2',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
    text: 'خصم 20% على اشتراكات البث',
    emoji: '🎬',
    link: '#',
    order: 2,
  },
  {
    id: '3',
    gradient: 'linear-gradient(135deg, #2563EB 0%, #0891B2 100%)',
    text: 'احصل على مكافآت إضافية',
    emoji: '🎁',
    link: '#',
    order: 3,
  },
];

export default function BannerSlider() {
  const [banners] = useState<Banner[]>(MOCK_BANNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // محاكاة التحميل
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // التبديل التلقائي كل 5 ثوانٍ
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // إذا لم تكن هناك صور، لا تعرض أي شيء
  if (loading || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full px-4 sm:px-6 md:px-8 lg:px-12" dir="rtl">
      <div className="relative w-full rounded-lg overflow-hidden">
        {/* البانر الحالي */}
        <div 
          className="relative w-full h-40 sm:h-44 md:h-48 lg:h-52 xl:h-56 flex items-center justify-center text-white"
          style={{ background: currentBanner.gradient }}
        >
          {currentBanner.link ? (
            <Link href={currentBanner.link} className="w-full h-full flex items-center justify-center">
              <div className="text-center px-6">
                <div className="text-4xl sm:text-5xl md:text-6xl mb-4">{currentBanner.emoji}</div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">{currentBanner.text}</h2>
              </div>
            </Link>
          ) : (
            <div className="text-center px-6">
              <div className="text-4xl sm:text-5xl md:text-6xl mb-4">{currentBanner.emoji}</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">{currentBanner.text}</h2>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
