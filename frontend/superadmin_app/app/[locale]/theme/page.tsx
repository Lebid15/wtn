import { SectionHeading } from "@/components/section-heading";
import { getTranslations } from "next-intl/server";

export default async function ThemePage() {
  const t = await getTranslations("pages.theme");

  return (
    <div className="space-y-6">
      <SectionHeading title={t("title")} />
    </div>
  );
}
