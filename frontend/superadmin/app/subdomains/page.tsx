'use client';

import { useState } from 'react';
import {
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiGlobe,
  FiCalendar,
  FiDollarSign,
  FiX,
  FiUpload,
  FiImage,
} from 'react-icons/fi';

interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  status: 'active' | 'suspended' | 'expired';
  plan: string;
  createdAt: string;
  expiresAt: string;
  revenue: string;
}

export default function SubdomainsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    displayName: '',
    countryCode: '+963',
    phone: '',
    subdomain: '',
    taxNumber: '',
    address: '',
  });
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  
  const [tenants, setTenants] = useState<Tenant[]>([
    {
      id: '1',
      subdomain: 'shop1',
      name: 'المتجر الأول',
      status: 'active',
      plan: 'Pro',
      createdAt: '2024-01-15',
      expiresAt: '2025-01-15',
      revenue: '$2,400',
    },
    {
      id: '2',
      subdomain: 'store2',
      name: 'متجر التقنية',
      status: 'active',
      plan: 'Business',
      createdAt: '2024-02-20',
      expiresAt: '2025-02-20',
      revenue: '$5,800',
    },
    {
      id: '3',
      subdomain: 'gaming',
      name: 'متجر الألعاب',
      status: 'suspended',
      plan: 'Starter',
      createdAt: '2024-03-10',
      expiresAt: '2024-12-10',
      revenue: '$890',
    },
  ]);

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.subdomain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-500/10 text-green-500 border-green-500/20',
      suspended: 'bg-red-500/10 text-red-500 border-red-500/20',
      expired: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    };
    const labels = {
      active: 'نشط',
      suspended: 'معلق',
      expired: 'منتهي',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (uploadedImages.length + files.length <= 3) {
      setUploadedImages([...uploadedImages, ...files]);
    } else {
      alert('يمكنك رفع 3 صور كحد أقصى');
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: إضافة المنطق لإرسال البيانات للـ Backend
    console.log('Form Data:', formData);
    console.log('Images:', uploadedImages);
    setShowAddModal(false);
    // إعادة تعيين النموذج
    setFormData({
      username: '',
      password: '',
      fullName: '',
      displayName: '',
      countryCode: '+963',
      phone: '',
      subdomain: '',
      taxNumber: '',
      address: '',
    });
    setUploadedImages([]);
  };

  const countries = [
    { code: '+963', name: 'سوريا', flag: '🇸🇾' },
    { code: '+966', name: 'السعودية', flag: '🇸🇦' },
    { code: '+971', name: 'الإمارات', flag: '🇦🇪' },
    { code: '+20', name: 'مصر', flag: '🇪🇬' },
    { code: '+962', name: 'الأردن', flag: '🇯🇴' },
    { code: '+961', name: 'لبنان', flag: '🇱🇧' },
    { code: '+970', name: 'فلسطين', flag: '🇵🇸' },
    { code: '+964', name: 'العراق', flag: '🇮🇶' },
    { code: '+965', name: 'الكويت', flag: '🇰🇼' },
    { code: '+968', name: 'عمان', flag: '🇴🇲' },
    { code: '+974', name: 'قطر', flag: '🇶🇦' },
    { code: '+973', name: 'البحرين', flag: '🇧🇭' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            إدارة المستأجرين
          </h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 transition-all font-medium cursor-pointer"
        >
          <FiPlus size={20} />
          إضافة مستأجر
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">إجمالي المستأجرين</p>
              <p className="text-3xl font-bold text-text-primary mt-1">{tenants.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500/10">
              <FiGlobe className="text-blue-500" size={28} />
            </div>
          </div>
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">المستأجرون النشطون</p>
              <p className="text-3xl font-bold text-text-primary mt-1">
                {tenants.filter((t) => t.status === 'active').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10">
              <FiCheckCircle className="text-green-500" size={28} />
            </div>
          </div>
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">إجمالي الإيرادات</p>
              <p className="text-3xl font-bold text-text-primary mt-1">
                $
                {tenants
                  .reduce((sum, t) => sum + parseFloat(t.revenue.replace('$', '').replace(',', '')), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500/10">
              <FiDollarSign className="text-purple-500" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
            <input
              type="text"
              placeholder="ابحث عن مستأجر..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
            />
          </div>
          <select className="px-4 py-3 bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary">
            <option>جميع الحالات</option>
            <option>نشط</option>
            <option>معلق</option>
            <option>منتهي</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-surface-alt border-b border-border">
              <tr>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">Subdomain</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">الاسم</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">الباقة</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">تاريخ الإنشاء</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">الإيرادات</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-bg-surface-hover transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FiGlobe className="text-primary" />
                      <span className="font-mono text-sm text-text-primary">{tenant.subdomain}.watan.com</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-primary font-medium">{tenant.name}</td>
                  <td className="px-6 py-4">{getStatusBadge(tenant.status)}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-secondary text-sm">
                    <div className="flex items-center gap-1">
                      <FiCalendar size={14} />
                      {tenant.createdAt}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-primary font-medium">{tenant.revenue}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors"
                        title="تعديل"
                      >
                        <FiEdit2 size={18} />
                      </button>
                      <button
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                        title="حذف"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-text-primary">إضافة مستأجر جديد</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-bg-surface-hover transition-colors"
              >
                <FiX size={20} className="text-text-secondary" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6 space-y-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    اسم المستخدم
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
                    placeholder="أدخل اسم المستخدم"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    كلمة السر
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
                    placeholder="أدخل كلمة السر"
                  />
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
                    placeholder="أدخل الاسم الكامل"
                  />
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    الاسم الظاهر
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
                    placeholder="أدخل الاسم الظاهر"
                  />
                </div>

                {/* Phone with Country Code */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    رقم الجوال
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.countryCode}
                      onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                      className="w-32 px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
                    >
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
                      placeholder="123456789"
                    />
                  </div>
                </div>

                {/* Subdomain */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    رابط الساب دومين
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
                      placeholder="mystore"
                    />
                    <span className="text-sm text-text-secondary">.watan.store</span>
                  </div>
                </div>

                {/* Tax Number */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    الرقم الضريبي
                  </label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary"
                    placeholder="أدخل الرقم الضريبي (اختياري)"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    العنوان الكامل
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-bg-base border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-text-primary resize-none"
                    placeholder="أدخل العنوان الكامل"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    إضافة صور (حد أقصى 3)
                  </label>
                  <div className="space-y-3">
                    {/* Upload Button */}
                    {uploadedImages.length < 3 && (
                      <label className="flex items-center justify-center gap-2 px-4 py-3 bg-bg-base border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors cursor-pointer">
                        <FiUpload size={20} className="text-text-secondary" />
                        <span className="text-sm text-text-secondary">اضغط لرفع صورة</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          multiple
                        />
                      </label>
                    )}

                    {/* Preview Images */}
                    {uploadedImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {uploadedImages.map((file, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square bg-bg-base border border-border rounded-lg overflow-hidden">
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-2 -left-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center gap-3 p-4 border-t border-border bg-bg-surface-alt">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white px-4 py-2.5 text-sm rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  إنشاء
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-bg-base text-text-primary px-4 py-2.5 text-sm rounded-lg hover:bg-bg-surface-hover transition-colors font-medium border border-border"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
