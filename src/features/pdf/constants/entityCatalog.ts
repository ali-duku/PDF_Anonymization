import { normalizePotentialMojibakeText } from "../utils/textEncoding";

export type EntityCatalogLanguage = "ar" | "en";

export interface EntityCatalogEntry {
  id: string;
  label: string;
  language: EntityCatalogLanguage;
}

export const DEFAULT_ENTITY_CATALOG: readonly EntityCatalogEntry[] = [
  { id: "ar-001", label: "اسم المدعى عليه", language: "ar" },
  { id: "ar-002", label: "اسم المدّعي", language: "ar" },
  { id: "ar-003", label: "اسم المحامي", language: "ar" },
  { id: "ar-004", label: "رقم البطاقة الشخصية للمدّعي", language: "ar" },
  { id: "ar-005", label: "رقم جوال المدّعي", language: "ar" },
  { id: "ar-006", label: "الرقم الوظيفي للمدّعي", language: "ar" },
  { id: "ar-007", label: "اسم موظف الجهة المدعى عليها", language: "ar" },
  { id: "ar-008", label: "رقم المنشأة/المؤسسة للمدعى عليها", language: "ar" },
  { id: "ar-009", label: "رقم الحساب البنكي للمدّعي", language: "ar" },
  { id: "ar-010", label: "البريد الإلكتروني للمدّعي", language: "ar" },
  { id: "ar-011", label: "عنوان المدّعي", language: "ar" },
  { id: "ar-012", label: "البريد الإلكتروني للمحامي", language: "ar" },
  { id: "ar-013", label: "عنوان المحامي", language: "ar" },
  { id: "ar-014", label: "رقم هاتف المحامي", language: "ar" },
  { id: "ar-015", label: "رقم منشأة المحامي", language: "ar" },
  { id: "ar-016", label: "رقم هاتف المدعى عليه", language: "ar" },
  { id: "ar-017", label: "البريد الإلكتروني للمدعى عليه", language: "ar" },
  { id: "ar-018", label: "عنوان المدعى عليه", language: "ar" },
  { id: "ar-019", label: "رقم منشأة المدعى عليه", language: "ar" },
  { id: "ar-020", label: "الرقم الشخصي للمحامي", language: "ar" },
  { id: "ar-021", label: "اسم كاتب العدل", language: "ar" },
  { id: "ar-022", label: "اسم الموظف الحكومي", language: "ar" },
  { id: "ar-023", label: "اسم القاضي", language: "ar" },
  { id: "ar-024", label: "اسم أمين سر المحكمة", language: "ar" },
  { id: "ar-025", label: "اسم موظف قضايا الدولة", language: "ar" },
  { id: "ar-026", label: "تاريخ ميلاد المدّعي", language: "ar" },
  { id: "ar-027", label: "رقم جواز سفر المدّعي", language: "ar" },
  { id: "ar-028", label: "صورة جواز سفر المدّعي", language: "ar" },
  { id: "ar-029", label: "رقم الآيبان (IBAN) للمدّعي", language: "ar" },
  { id: "ar-030", label: "رقم الحساب البنكي للمدّعي", language: "ar" },
  { id: "en-patient-name", label: "Patient Name", language: "en" },
  { id: "en-qatar-id", label: "Qatar ID", language: "en" },
  { id: "en-hc-number", label: "HC Number", language: "en" },
  { id: "en-fin", label: "Fin", language: "en" },
  { id: "en-physician-id", label: "Physician ID", language: "en" },
  { id: "en-physician-name", label: "Physician Name", language: "en" },
  { id: "en-phone-number", label: "Phone Number", language: "en" }
] as const;

export function getDefaultEntityLabels(): string[] {
  return DEFAULT_ENTITY_CATALOG.map((entity) => normalizePotentialMojibakeText(entity.label));
}
