"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PackagesFormLabels = {
  add: string;
  name: string;
  displayName: string;
  reference: string;
  price: string;
  cancel: string;
  save: string;
  update: string;
  empty: string;
};

type PackagesCardLabels = {
  displayName: string;
  reference: string;
  price: string;
  edit: string;
  delete: string;
};

type ProductDetailTabsProps = {
  packagesTitle: string;
  settingsTitle: string;
  settingsDescription: string;
  packagesForm: PackagesFormLabels;
  packagesCard: PackagesCardLabels;
};

type PackageItem = {
  id: string;
  name: string;
  displayName: string;
  reference: string;
  price: string;
};

type PackageDraft = Omit<PackageItem, "id">;

const createEmptyPackage = (): PackageDraft => ({
  name: "",
  displayName: "",
  reference: "",
  price: "",
});

const createPackageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const createDefaultPackage = (): PackageItem => ({
  id: createPackageId(),
  name: "pubg 60 UC",
  displayName: "ببجي 60 شدة",
  reference: "60",
  price: "1 $",
});

export function ProductDetailTabs({
  packagesTitle,
  settingsTitle,
  settingsDescription,
  packagesForm,
  packagesCard,
}: ProductDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<"packages" | "settings">("packages");
  const [packages, setPackages] = useState<PackageItem[]>(() => [createDefaultPackage()]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<PackageDraft>(createEmptyPackage());

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const handleStartCreate = () => {
    setShowForm(true);
    setEditingId(null);
    setFormState(createEmptyPackage());
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormState(createEmptyPackage());
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      return;
    }

    if (isEditing && editingId) {
      setPackages((prev) =>
        prev.map((pkg) =>
          pkg.id === editingId
            ? {
                ...pkg,
                name: trimmedName,
                displayName: formState.displayName.trim(),
                reference: formState.reference.trim(),
                price: formState.price.trim(),
              }
            : pkg
        )
      );
    } else {
      setPackages((prev) => [
        ...prev,
        {
          id: createPackageId(),
          name: trimmedName,
          displayName: formState.displayName.trim(),
          reference: formState.reference.trim(),
          price: formState.price.trim(),
        },
      ]);
    }

    handleCancel();
  };

  const handleEdit = (id: string) => {
    const pkg = packages.find((item) => item.id === id);
    if (!pkg) return;
    setFormState({
      name: pkg.name,
      displayName: pkg.displayName,
      reference: pkg.reference,
      price: pkg.price,
    });
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
    if (editingId === id) {
      handleCancel();
    }
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full border border-gold/30 bg-background/80 p-1 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab("packages")}
          className={`rounded-full px-5 py-2 transition-colors ${
            activeTab === "packages"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          {packagesTitle}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`rounded-full px-5 py-2 transition-colors ${
            activeTab === "settings"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          {settingsTitle}
        </button>
      </div>

      <div className="rounded-3xl border border-gold/25 bg-background/80 p-6 shadow-sm">
        {activeTab === "packages" ? (
          <div className="space-y-6">
            {!showForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleStartCreate}
                className="inline-flex items-center gap-2 rounded-full border-gold/40 px-4 py-2 text-sm text-primary hover:border-gold hover:bg-primary/10"
              >
                <Plus className="size-4" />
                {packagesForm.add}
              </Button>
            ) : (
              <form className="space-y-5 rounded-3xl border border-gold/20 bg-background/70 p-5" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="package-name">
                      {packagesForm.name}
                    </label>
                    <input
                      id="package-name"
                      value={formState.name}
                      onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-2xl border border-gold/30 bg-background/90 px-4 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="package-display">
                      {packagesForm.displayName}
                    </label>
                    <input
                      id="package-display"
                      value={formState.displayName}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, displayName: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-gold/30 bg-background/90 px-4 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="package-reference">
                      {packagesForm.reference}
                    </label>
                    <input
                      id="package-reference"
                      value={formState.reference}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, reference: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-gold/30 bg-background/90 px-4 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground" htmlFor="package-price">
                      {packagesForm.price}
                    </label>
                    <input
                      id="package-price"
                      value={formState.price}
                      onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
                      className="w-full rounded-2xl border border-gold/30 bg-background/90 px-4 py-2 text-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={handleCancel} className="rounded-full px-4 py-2 text-sm">
                    {packagesForm.cancel}
                  </Button>
                  <Button type="submit" className="rounded-full px-4 py-2 text-sm">
                    {isEditing ? packagesForm.update : packagesForm.save}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {packages.length === 0 ? (
                <p className="rounded-3xl border border-dashed border-gold/30 bg-background/60 px-5 py-8 text-center text-sm text-muted-foreground">
                  {packagesForm.empty}
                </p>
              ) : (
                packages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex flex-col gap-4 rounded-3xl border border-gold/20 bg-background/70 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-2 text-sm">
                      <h3 className="text-base font-semibold text-primary">{pkg.name}</h3>
                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3 sm:gap-4">
                        <span>
                          <span className="font-semibold text-foreground">{packagesCard.displayName}:</span> {pkg.displayName || "-"}
                        </span>
                        <span>
                          <span className="font-semibold text-foreground">{packagesCard.reference}:</span> {pkg.reference || "-"}
                        </span>
                        <span>
                          <span className="font-semibold text-foreground">{packagesCard.price}:</span> {pkg.price || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(pkg.id)}
                        className="inline-flex items-center gap-2 rounded-full"
                      >
                        <PenLine className="size-4" />
                        {packagesCard.edit}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(pkg.id)}
                        className="inline-flex items-center gap-2 rounded-full"
                      >
                        <Trash2 className="size-4" />
                        {packagesCard.delete}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {settingsDescription}
          </p>
        )}
      </div>
    </div>
  );
}
