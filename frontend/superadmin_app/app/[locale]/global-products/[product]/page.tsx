import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { globalProducts } from "@/lib/global-products";
import { ProductDetailTabs } from "@/components/global-products/product-detail-tabs";

type ProductDetailPageProps = {
  params: Promise<{ product: string }>;
};

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { product } = await params;
  const entry = globalProducts.find((item) => item.key === product);

  if (!entry) {
    notFound();
  }

  const t = await getTranslations("pages.globalProducts");

  const productName = t(`products.${entry.key}.name`);
  const backLabel = t("detail.back");
  const packagesTitle = t("detail.tabs.packages");
  const settingsTitle = t("detail.tabs.settings");
  const settingsDescription = t("detail.settingsDescription");
  const packagesForm = {
    add: t("detail.packagesForm.add"),
    name: t("detail.packagesForm.name"),
    displayName: t("detail.packagesForm.displayName"),
    reference: t("detail.packagesForm.reference"),
    price: t("detail.packagesForm.price"),
    cancel: t("detail.packagesForm.cancel"),
    save: t("detail.packagesForm.save"),
    update: t("detail.packagesForm.update"),
    empty: t("detail.packagesForm.empty"),
  };
  const packagesCard = {
    displayName: t("detail.packagesCard.displayName"),
    reference: t("detail.packagesCard.reference"),
    price: t("detail.packagesCard.price"),
    edit: t("detail.packagesCard.edit"),
    delete: t("detail.packagesCard.delete"),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative size-12 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 shadow-sm">
            <Image
              src={entry.image}
              alt={productName}
              fill
              sizes="48px"
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <SectionHeading title={productName} className="border-none pb-0" />
        </div>

        <Link href="/global-products">
          <Button
            type="button"
            variant="ghost"
            className="inline-flex items-center gap-2 rounded-full border border-gold/20 px-4 py-2 text-sm text-primary hover:border-gold hover:bg-primary/10"
          >
            {backLabel}
          </Button>
        </Link>
      </div>

      <ProductDetailTabs
        packagesTitle={packagesTitle}
        settingsTitle={settingsTitle}
        settingsDescription={settingsDescription}
        packagesForm={packagesForm}
        packagesCard={packagesCard}
      />
    </div>
  );
}
