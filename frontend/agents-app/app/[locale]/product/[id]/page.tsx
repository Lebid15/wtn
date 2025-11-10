'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useParams } from 'next/navigation';

interface Package {
  id: string;
  name: string;
  price: string;
}

export default function ProductDetailPage() {
  const t = useTranslations('ProductDetail');
  const params = useParams();
  const productId = params.id as string;

  // بيانات تجريبية - في المستقبل ستأتي من API
  const products: Record<string, { name: string; nameAr: string; image: string; packages: Package[] }> = {
    '1': {
      name: 'PUBG Mobile',
      nameAr: 'ببجي موبايل',
      image: '/images/pubg.jpg',
      packages: [
        { id: '1', name: 'ببجي 60 شدة', price: '1' },
        { id: '2', name: 'ببجي 325 شدة', price: '4' },
        { id: '3', name: 'ببجي 660 شدة', price: '8' },
        { id: '4', name: 'ببجي 1800 شدة', price: '20' },
        { id: '5', name: 'ببجي 3850 شدة', price: '40' },
        { id: '6', name: 'ببجي 8100 شدة', price: '80' },
      ]
    },
    '2': {
      name: 'Free Fire',
      nameAr: 'فري فاير',
      image: '/images/freefire.png',
      packages: [
        { id: '1', name: 'فري فاير 100 جوهرة', price: '2' },
        { id: '2', name: 'فري فاير 310 جوهرة', price: '5' },
        { id: '3', name: 'فري فاير 520 جوهرة', price: '10' },
        { id: '4', name: 'فري فاير 1060 جوهرة', price: '18' },
      ]
    },
  };

  const product = products[productId] || products['1'];

  return (
    <div className="space-y-6">
      {/* Product Header - Image and Name (No Card) */}
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden shadow-md flex-shrink-0">
          <Image
            src={product.image}
            alt={product.nameAr}
            fill
            className="object-cover"
          />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gold">
          {product.nameAr}
        </h1>
      </div>

      {/* Packages List */}
      <div className="space-y-3">
        {product.packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4 hover:border-gold transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              {/* Package Name */}
              <h3 className="text-base md:text-lg font-semibold">
                {pkg.name}
              </h3>
              
              {/* Price */}
              <p className="text-lg md:text-xl font-bold text-green-500">
                {pkg.price}$
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
