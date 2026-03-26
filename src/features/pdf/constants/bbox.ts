export const BBOX_MIN_SIZE = Object.freeze({
  width: 3,
  height: 3
});

export const BBOX_DEFAULT_SIZE = Object.freeze({
  width: 120,
  height: 56
});

export const BBOX_HANDLE_SIZE = 10;
export const BBOX_BORDER_WIDTH = 1;
export const BBOX_FILL_COLOR = "#ffffff";
export const BBOX_BORDER_COLOR = "#000000";
export const BBOX_TEXT_COLOR = "#000000";
export const BBOX_DELETE_BUTTON_SIZE = 22;
export const BBOX_DELETE_BUTTON_OFFSET_X = 4;
export const BBOX_DELETE_BUTTON_OFFSET_Y = 4;
export const BBOX_LAYER_Z_INDEX = 4;
export const BBOX_LABEL_EDITOR_Z_INDEX = 6;
export const BBOX_EDITOR_MIN_WIDTH = 230;
export const BBOX_CREATE_DRAG_THRESHOLD_PX = 6;
export const BBOX_LABEL_PADDING = 2;
export const BBOX_LABEL_FIT_SAFETY_INSET = 0.75;
export const BBOX_LABEL_MIN_FONT_SIZE = 0.05;
export const BBOX_LABEL_MAX_FONT_SIZE = 240;
export const BBOX_LABEL_LINE_HEIGHT = 1.08;
export const BBOX_LABEL_FONT_WEIGHT = 600;
export const BBOX_LABEL_FONT_FAMILY = "\"Space Grotesk\", \"Segoe UI\", \"Tahoma\", sans-serif";
export const BBOX_COMBOBOX_MAX_OPTIONS = 8;
export const BBOX_LABEL_SEPARATOR = " ";

export const DEFAULT_ARABIC_ENTITY_LABELS = [
  "اسم المدعى عليه",
  "اسم المدّعي",
  "اسم المحامي",
  "رقم البطاقة الشخصية للمدّعي",
  "رقم جوال المدّعي",
  "الرقم الوظيفي للمدّعي",
  "اسم موظف الجهة المدعى عليها",
  "رقم المنشأة/المؤسسة للمدعى عليها",
  "رقم الحساب البنكي للمدّعي",
  "البريد الإلكتروني للمدّعي",
  "عنوان المدّعي",
  "البريد الإلكتروني للمحامي",
  "عنوان المحامي",
  "رقم هاتف المحامي",
  "رقم منشأة المحامي",
  "رقم هاتف المدعى عليه",
  "البريد الإلكتروني للمدعى عليه",
  "عنوان المدعى عليه",
  "رقم منشأة المدعى عليه",
  "الرقم الشخصي للمحامي",
  "اسم كاتب العدل",
  "اسم الموظف الحكومي",
  "اسم القاضي",
  "اسم أمين سر المحكمة",
  "اسم موظف قضايا الدولة",
  "تاريخ ميلاد المدّعي",
  "رقم جواز سفر المدّعي",
  "صورة جواز سفر المدّعي",
  "رقم الآيبان (IBAN) للمدّعي",
  "رقم الحساب البنكي للمدّعي"
] as const;

export const DEFAULT_BBOX_ENTITY_LABEL = DEFAULT_ARABIC_ENTITY_LABELS[0];
