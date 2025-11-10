"use client";

import { createPortal } from "react-dom";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export type TenantLabels = {
  heading: string;
  tabs: {
    list: string;
    subscriptions: string;
    create: string;
  };
  list: {
    empty: string;
    subdomain: string;
    email: string;
    phone: string;
    taxNumber: string;
    address: string;
    subscription: string;
    documents: string;
    noValue: string;
    createdAt: string;
  };
  form: {
    firstName: string;
    lastName: string;
    username: string;
    password: string;
    displayName: string;
    subdomain: string;
    email: string;
    phoneCode: string;
    phoneNumber: string;
    taxNumber: string;
    address: string;
    subscriptionGroup: string;
    documents: string;
    uploadHint: string;
    optional: string;
    requiredNote: string;
    submit: string;
    success: string;
    errors: {
      required: string;
      filesLimit: string;
    };
    removeFile: string;
  };
  subscriptions: {
    title: string;
    description: string;
    addPlan: string;
    empty: string;
    success: string;
    table: {
      planName: string;
      initialPayment: string;
      monthlyPrice: string;
      annualPrice: string;
      discountRate: string;
      createdAt: string;
    };
    modal: {
      title: string;
      planName: string;
      initialPayment: string;
      monthlyPrice: string;
      annualPrice: string;
      discountRate: string;
      save: string;
      cancel: string;
    };
  };
};

type Tenant = {
  id: number;
  firstName?: string;
  lastName?: string;
  username: string;
  password: string;
  displayName?: string;
  subdomain: string;
  email: string;
  phoneCode?: string;
  phoneNumber?: string;
  taxNumber?: string;
  address?: string;
  subscriptionGroup?: string;
  documents: string[];
  createdAt: string;
};

type TenantsFormState = {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  displayName: string;
  subdomain: string;
  email: string;
  phoneCode: string;
  phoneNumber: string;
  taxNumber: string;
  address: string;
  subscriptionGroup: string;
  documents: File[];
};

type TenantsPageProps = {
  labels: TenantLabels;
};

type ActiveTab = "list" | "subscriptions" | "create";

type SubscriptionPlan = {
  id: number;
  name: string;
  initialPayment: string;
  monthlyPrice: string;
  annualPrice: string;
  discountRate: string;
  createdAt: string;
};

type SubscriptionPlanFormState = {
  name: string;
  initialPayment: string;
  monthlyPrice: string;
  annualPrice: string;
  discountRate: string;
};

const initialFormState: TenantsFormState = {
  firstName: "",
  lastName: "",
  username: "",
  password: "",
  displayName: "",
  subdomain: "",
  email: "",
  phoneCode: "",
  phoneNumber: "",
  taxNumber: "",
  address: "",
  subscriptionGroup: "",
  documents: [],
};

const initialTenants: Tenant[] = [
  {
    id: 1021,
    firstName: "Lina",
    lastName: "Mahmoud",
    username: "linam",
    password: "********",
    displayName: "متجر ليـنا",
    subdomain: "lina-shop",
    email: "lina@example.com",
    phoneCode: "+971",
    phoneNumber: "501234567",
    taxNumber: "AE-99871",
    address: "دبي - الخليج التجاري",
    subscriptionGroup: "Premium",
    documents: ["cr-lina.pdf", "vat-certificate.png"],
    createdAt: "2024-08-21T09:35:00.000Z",
  },
  {
    id: 1020,
    firstName: "Selim",
    lastName: "Yılmaz",
    username: "selim.y",
    password: "********",
    displayName: "Selim Market",
    subdomain: "selim-market",
    email: "selim@market.com",
    phoneCode: "+90",
    phoneNumber: "5329981122",
    taxNumber: "TR-448120",
    address: "İstanbul - Kadıköy",
    subscriptionGroup: "Standard",
    documents: ["trade-license.pdf"],
    createdAt: "2024-07-04T14:12:00.000Z",
  },
];

const initialPlans: SubscriptionPlan[] = [
  {
    id: 301,
    name: "Launch Plus",
    initialPayment: "1500",
    monthlyPrice: "299",
    annualPrice: "2899",
    discountRate: "15%",
    createdAt: "2024-07-12T08:45:00.000Z",
  },
  {
    id: 298,
    name: "Growth Edge",
    initialPayment: "900",
    monthlyPrice: "199",
    annualPrice: "1890",
    discountRate: "10%",
    createdAt: "2024-05-03T11:10:00.000Z",
  },
];

const initialPlanFormState: SubscriptionPlanFormState = {
  name: "",
  initialPayment: "",
  monthlyPrice: "",
  annualPrice: "",
  discountRate: "",
};

export function TenantsPageClient({ labels }: TenantsPageProps) {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<ActiveTab>("list");
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [formState, setFormState] = useState<TenantsFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans);
  const [planFormState, setPlanFormState] = useState<SubscriptionPlanFormState>(initialPlanFormState);
  const [planFormErrors, setPlanFormErrors] = useState<Record<string, string>>({});
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planModalError, setPlanModalError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const orderedTenants = useMemo(
    () =>
      [...tenants].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [tenants]
  );

  const orderedPlans = useMemo(
    () =>
      [...plans].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [plans]
  );

  const tabs: Array<{ key: ActiveTab; label: string }> = [
    { key: "list", label: labels.tabs.list },
    { key: "subscriptions", label: labels.tabs.subscriptions },
    { key: "create", label: labels.tabs.create },
  ];

  const resetForm = () => {
    setFormState(initialFormState);
    setFormErrors({});
    setFileInputKey((prev) => prev + 1);
  };

  const resetPlanForm = () => {
    setPlanFormState(initialPlanFormState);
    setPlanFormErrors({});
    setPlanModalError(null);
  };

  const openPlanModal = () => {
    setFeedback(null);
    resetPlanForm();
    setIsPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setIsPlanModalOpen(false);
    resetPlanForm();
  };

  const handleInputChange = (
    field: keyof TenantsFormState
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlanInputChange = (
    field: keyof SubscriptionPlanFormState
  ) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { value } = event.target;
    setPlanFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) {
      return;
    }

    setFormErrors((prev) => ({ ...prev, documents: "" }));

    setFormState((prev) => {
      const nextFiles = [...prev.documents, ...files];
      if (nextFiles.length > 3) {
        setFeedback({ type: "error", text: labels.form.errors.filesLimit });
        return prev;
      }
      return { ...prev, documents: nextFiles };
    });

    event.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setFormState((prev) => {
      const next = prev.documents.filter((_, idx) => idx !== index);
      return { ...prev, documents: next };
    });
  };

  const planRequiredFields: Array<keyof SubscriptionPlanFormState> = [
    "name",
    "initialPayment",
    "monthlyPrice",
    "annualPrice",
    "discountRate",
  ];

  const requiredFields: Array<keyof TenantsFormState> = [
    "username",
    "password",
    "email",
    "subdomain",
  ];

  const handlePlanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};

    planRequiredFields.forEach((field) => {
      const value = planFormState[field].trim();
      if (!value) {
        errors[field] = labels.form.errors.required;
      }
    });

    if (Object.keys(errors).length) {
      setPlanFormErrors(errors);
      setPlanModalError(labels.form.errors.required);
      return;
    }

    const now = new Date();
    const discountValue = planFormState.discountRate.trim();
    const newPlan: SubscriptionPlan = {
      id: Number(now.getTime().toString().slice(-6)),
      name: planFormState.name.trim(),
      initialPayment: planFormState.initialPayment.trim(),
      monthlyPrice: planFormState.monthlyPrice.trim(),
      annualPrice: planFormState.annualPrice.trim(),
      discountRate: discountValue.endsWith("%") ? discountValue : `${discountValue}%`,
      createdAt: now.toISOString(),
    };

    setPlanFormErrors({});
    setPlanModalError(null);
    setPlans((prev) => [newPlan, ...prev]);
    setFeedback({ type: "success", text: labels.subscriptions.success });
    closePlanModal();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Record<string, string> = {};

    requiredFields.forEach((field) => {
      const value = formState[field];
      if (typeof value !== "string" || !value.trim()) {
        errors[field] = labels.form.errors.required;
      }
    });

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      setFeedback({ type: "error", text: labels.form.errors.required });
      return;
    }

    const now = new Date();
    const newTenant: Tenant = {
      id: Number(now.getTime().toString().slice(-7)),
      firstName: formState.firstName.trim() || undefined,
      lastName: formState.lastName.trim() || undefined,
      username: formState.username.trim(),
      password: formState.password,
      displayName: formState.displayName.trim() || undefined,
      subdomain: formState.subdomain.trim(),
      email: formState.email.trim(),
      phoneCode: formState.phoneCode.trim() || undefined,
      phoneNumber: formState.phoneNumber.trim() || undefined,
      taxNumber: formState.taxNumber.trim() || undefined,
      address: formState.address.trim() || undefined,
      subscriptionGroup: formState.subscriptionGroup.trim() || undefined,
      documents: formState.documents.map((file) => file.name),
      createdAt: now.toISOString(),
    };

    setTenants((prev) => [newTenant, ...prev]);
    setFeedback({ type: "success", text: labels.form.success });
    resetForm();
    setActiveTab("list");
  };

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));

  const renderValue = (value?: string) => value && value.trim() ? value : labels.list.noValue;

  return (
    <>
      <div className="space-y-6">
        <SectionHeading title={labels.heading} />

        <div className="rounded-xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setActiveTab(key);
                setFeedback(null);
                if (key !== "subscriptions") {
                  setIsPlanModalOpen(false);
                }
              }}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition",
                activeTab === key
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
          </div>

          <div className="p-4 sm:p-6">
            {feedback && (
              <div
                className={cn(
                  "mb-4 rounded-md border px-4 py-3 text-sm",
                  feedback.type === "success"
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                    : "border-destructive/50 bg-destructive/10 text-destructive"
                )}
              >
                {feedback.text}
              </div>
            )}

            {activeTab === "list" ? (
            <div className="space-y-4">
              {orderedTenants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
                  {labels.list.empty}
                </div>
              ) : (
                orderedTenants.map((tenant) => {
                  const fullName = tenant.displayName || [tenant.firstName, tenant.lastName].filter(Boolean).join(" ") || tenant.username;
                  const phone = tenant.phoneNumber
                    ? tenant.phoneCode
                      ? `${tenant.phoneCode} ${tenant.phoneNumber}`
                      : tenant.phoneNumber
                    : undefined;

                  return (
                    <Card key={tenant.id} className="gap-0 border-border/70">
                      <CardHeader className="flex flex-col gap-1 border-border/40 border-b bg-card/80">
                        <CardTitle className="text-base font-semibold text-primary">
                          {fullName}
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          {tenant.subdomain}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 py-4 text-sm sm:grid-cols-2">
                        <InfoRow label={labels.list.email} value={tenant.email} />
                        <InfoRow label={labels.list.phone} value={renderValue(phone)} />
                        <InfoRow label={labels.list.subscription} value={renderValue(tenant.subscriptionGroup)} />
                        <InfoRow label={labels.list.taxNumber} value={renderValue(tenant.taxNumber)} />
                        <InfoRow label={labels.list.address} value={renderValue(tenant.address)} className="sm:col-span-2" />
                        <InfoRow
                          label={labels.list.documents}
                          value={tenant.documents.length ? tenant.documents.join(", ") : labels.list.noValue}
                          className="sm:col-span-2"
                        />
                      </CardContent>
                      <CardFooter className="border-t border-border/40 text-xs text-muted-foreground">
                        {labels.list.createdAt}: {formatDate(tenant.createdAt)}
                      </CardFooter>
                    </Card>
                  );
                })
              )}
            </div>
          ) : activeTab === "subscriptions" ? (
            <Card className="border-border/70">
              <CardHeader className="border-b border-border/40 bg-card/80">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-primary">
                      {labels.subscriptions.title}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      {labels.subscriptions.description}
                    </CardDescription>
                  </div>
                  <Button onClick={openPlanModal} size="sm" className="gap-1.5">
                    <Plus className="size-4" />
                    {labels.subscriptions.addPlan}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 py-5">
                {orderedPlans.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
                    {labels.subscriptions.empty}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px] overflow-hidden rounded-lg border border-border/60">
                      <div className="grid grid-cols-6 bg-muted/70 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <span>{labels.subscriptions.table.planName}</span>
                        <span>{labels.subscriptions.table.initialPayment}</span>
                        <span>{labels.subscriptions.table.monthlyPrice}</span>
                        <span>{labels.subscriptions.table.annualPrice}</span>
                        <span>{labels.subscriptions.table.discountRate}</span>
                        <span>{labels.subscriptions.table.createdAt}</span>
                      </div>
                      {orderedPlans.map((plan, index) => (
                        <div
                          key={plan.id}
                          className={cn(
                            "grid grid-cols-6 px-4 py-4 text-sm text-foreground/90",
                            index % 2 === 1 && "bg-card/60"
                          )}
                        >
                          <span className="font-medium text-primary">{plan.name}</span>
                          <span>{plan.initialPayment}</span>
                          <span>{plan.monthlyPrice}</span>
                          <span>{plan.annualPrice}</span>
                          <span>{plan.discountRate}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(plan.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <p className="text-xs text-muted-foreground">{labels.form.requiredNote}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={labels.form.firstName}
                  optionalLabel={labels.form.optional}
                  value={formState.firstName}
                  onChange={handleInputChange("firstName")}
                />
                <Field
                  label={labels.form.lastName}
                  optionalLabel={labels.form.optional}
                  value={formState.lastName}
                  onChange={handleInputChange("lastName")}
                />
                <Field
                  label={`${labels.form.username} *`}
                  value={formState.username}
                  onChange={handleInputChange("username")}
                  error={formErrors.username}
                />
                <Field
                  label={`${labels.form.password} *`}
                  value={formState.password}
                  onChange={handleInputChange("password")}
                  error={formErrors.password}
                  type="password"
                />
                <Field
                  label={labels.form.displayName}
                  optionalLabel={labels.form.optional}
                  value={formState.displayName}
                  onChange={handleInputChange("displayName")}
                />
                <Field
                  label={`${labels.form.subdomain} *`}
                  value={formState.subdomain}
                  onChange={handleInputChange("subdomain")}
                  error={formErrors.subdomain}
                />
                <Field
                  label={`${labels.form.email} *`}
                  value={formState.email}
                  onChange={handleInputChange("email")}
                  error={formErrors.email}
                  type="email"
                />
                <div className="grid grid-cols-[1fr_2fr] gap-3">
                  <Field
                    label={labels.form.phoneCode}
                    optionalLabel={labels.form.optional}
                    value={formState.phoneCode}
                    onChange={handleInputChange("phoneCode")}
                    placeholder="+966"
                  />
                  <Field
                    label={labels.form.phoneNumber}
                    optionalLabel={labels.form.optional}
                    value={formState.phoneNumber}
                    onChange={handleInputChange("phoneNumber")}
                    placeholder="555123456"
                  />
                </div>
                <Field
                  label={labels.form.taxNumber}
                  optionalLabel={labels.form.optional}
                  value={formState.taxNumber}
                  onChange={handleInputChange("taxNumber")}
                />
                <Field
                  label={labels.form.subscriptionGroup}
                  optionalLabel={labels.form.optional}
                  value={formState.subscriptionGroup}
                  onChange={handleInputChange("subscriptionGroup")}
                />
                <Field
                  label={labels.form.address}
                  optionalLabel={labels.form.optional}
                  value={formState.address}
                  onChange={handleInputChange("address")}
                  className="sm:col-span-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {labels.form.documents}
                </label>
                <input
                  key={fileInputKey}
                  type="file"
                  onChange={handleFilesChange}
                  multiple
                  accept=".pdf,image/*"
                  className="w-full cursor-pointer rounded-md border border-border/60 bg-background/70 px-4 py-3 text-sm text-foreground shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted-foreground">{labels.form.uploadHint}</p>
                {formState.documents.length > 0 && (
                  <ul className="space-y-2 rounded-lg border border-dashed border-border/60 bg-background/60 p-3 text-xs">
                    {formState.documents.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3">
                        <span className="truncate font-medium text-foreground/90">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveFile(index)}
                        >
                          {labels.form.removeFile}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="min-w-[140px]">
                  {labels.form.submit}
                </Button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>

      {isMounted && isPlanModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={closePlanModal} />
            <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <h2 className="text-base font-semibold text-primary">
                  {labels.subscriptions.modal.title}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={closePlanModal}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <form className="space-y-5 px-6 py-5" onSubmit={handlePlanSubmit}>
                {planModalError && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    {planModalError}
                  </div>
                )}

                <Field
                  label={`${labels.subscriptions.modal.planName} *`}
                  value={planFormState.name}
                  onChange={handlePlanInputChange("name")}
                  error={planFormErrors.name}
                  placeholder="Starter Plan"
                />
                <Field
                  label={`${labels.subscriptions.modal.initialPayment} *`}
                  value={planFormState.initialPayment}
                  onChange={handlePlanInputChange("initialPayment")}
                  error={planFormErrors.initialPayment}
                  placeholder="1500"
                />
                <Field
                  label={`${labels.subscriptions.modal.monthlyPrice} *`}
                  value={planFormState.monthlyPrice}
                  onChange={handlePlanInputChange("monthlyPrice")}
                  error={planFormErrors.monthlyPrice}
                  placeholder="299"
                />
                <Field
                  label={`${labels.subscriptions.modal.annualPrice} *`}
                  value={planFormState.annualPrice}
                  onChange={handlePlanInputChange("annualPrice")}
                  error={planFormErrors.annualPrice}
                  placeholder="2899"
                />
                <Field
                  label={`${labels.subscriptions.modal.discountRate} *`}
                  value={planFormState.discountRate}
                  onChange={handlePlanInputChange("discountRate")}
                  error={planFormErrors.discountRate}
                  placeholder="10"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={closePlanModal}>
                    {labels.subscriptions.modal.cancel}
                  </Button>
                  <Button type="submit" className="min-w-[130px]">
                    {labels.subscriptions.modal.save}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

type FieldProps = {
  label: string;
  optionalLabel?: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  className?: string;
};

function Field({
  label,
  optionalLabel,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  className,
}: FieldProps) {
  const isTextArea = type === "textarea";
  const InputComponent = isTextArea ? "textarea" : "input";

  return (
    <label className={cn("flex flex-col gap-2 text-sm", className)}>
      <span className="font-medium text-muted-foreground">
        {label}
        {optionalLabel && !label.includes("*") && (
          <span className="ml-2 text-xs font-normal text-muted-foreground/70">({optionalLabel})</span>
        )}
      </span>
      <InputComponent
        value={value}
        onChange={onChange}
        required={label.includes("*")}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-border/60 bg-background/70 px-4 py-3 text-foreground shadow-inner outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30",
          error && "border-destructive focus:border-destructive focus:ring-destructive/30"
        )}
        {...(isTextArea ? { rows: 4 } : { type })}
      />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  className?: string;
};

function InfoRow({ label, value, className }: InfoRowProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground/90">
        {value}
      </span>
    </div>
  );
}
