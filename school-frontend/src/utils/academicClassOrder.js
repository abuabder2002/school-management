/**
 * Centralized Academic Class Order Utility
 * 
 * Provides consistent class configuration, ranking, and display labels across:
 * - Student Add & Edit Forms
 * - Student Directory (Summary, Breadcrumbs & Class Details)
 * - Class Filter Dropdowns
 * - Excel Bulk Uploads & Template Generation
 * - Billing & Fee Management (Summary, Details & Modals)
 * - Attendance, Marks, and Homework
 */

export const CLASS_CONFIG = [
  { internalValue: 'LKG', displayLabel: 'LKG', roman: 'LKG', sortOrder: 1 },
  { internalValue: 'UKG', displayLabel: 'UKG', roman: 'UKG', sortOrder: 2 },
  { internalValue: 'Class 1', displayLabel: 'Class I', roman: 'I', sortOrder: 3 },
  { internalValue: 'Class 2', displayLabel: 'Class II', roman: 'II', sortOrder: 4 },
  { internalValue: 'Class 3', displayLabel: 'Class III', roman: 'III', sortOrder: 5 },
  { internalValue: 'Class 4', displayLabel: 'Class IV', roman: 'IV', sortOrder: 6 },
  { internalValue: 'Class 5', displayLabel: 'Class V', roman: 'V', sortOrder: 7 },
  { internalValue: 'Class 6', displayLabel: 'Class VI', roman: 'VI', sortOrder: 8 },
  { internalValue: 'Class 7', displayLabel: 'Class VII', roman: 'VII', sortOrder: 9 },
  { internalValue: 'Class 8', displayLabel: 'Class VIII', roman: 'VIII', sortOrder: 10 },
  { internalValue: 'Class 9', displayLabel: 'Class IX', roman: 'IX', sortOrder: 11 },
  { internalValue: 'Class 10', displayLabel: 'Class X', roman: 'X', sortOrder: 12 },
  { internalValue: 'Class 11', displayLabel: 'Class XI', roman: 'XI', sortOrder: 13 },
  { internalValue: 'Class 12', displayLabel: 'Class XII', roman: 'XII', sortOrder: 14 },
];

export const ACADEMIC_CLASSES = CLASS_CONFIG.map((c) => c.internalValue);

export const DISPLAY_CLASSES = CLASS_CONFIG.map((c) => c.displayLabel);

export const getClassAcademicRank = (className) => {
  if (!className) return 999;
  const s = String(className).trim().toUpperCase();

  // Normalize prefix: CLASS, GRADE, STANDARD, STD
  const clean = s.replace(/^(CLASS|GRADE|STANDARD|STD)\s+/i, '').trim();

  // Pre-primary
  if (clean === 'PRE-KG' || clean === 'PREKG' || clean === 'NURSERY') return 0;
  if (clean === 'LKG' || clean === 'L.K.G' || clean === 'L.K.G.') return 1;
  if (clean === 'UKG' || clean === 'U.K.G' || clean === 'U.K.G.') return 2;

  // Roman numerals: I to XII
  if (clean === 'I') return 3;
  if (clean === 'II') return 4;
  if (clean === 'III') return 5;
  if (clean === 'IV') return 6;
  if (clean === 'V') return 7;
  if (clean === 'VI') return 8;
  if (clean === 'VII') return 9;
  if (clean === 'VIII') return 10;
  if (clean === 'IX') return 11;
  if (clean === 'X') return 12;
  if (clean === 'XI') return 13;
  if (clean === 'XII') return 14;

  // Numeric standards: 1 to 12 (whole value only — "2 Boys" or "Batch 2" are custom class names)
  const numMatch = clean.match(/^(\d+)(?:ST|ND|RD|TH)?$/);
  if (numMatch) {
    return 2 + parseInt(numMatch[1], 10);
  }

  return 100;
};

export const EXCEL_CLASSES = [
  'LKG',
  'UKG',
  'Class I',
  'Class II',
  'Class III',
  'Class IV',
  'Class V',
  'Class VI',
  'Class VII',
  'Class VIII',
  'Class IX',
  'Class X',
  'Class XI',
  'Class XII',
];

export const toExcelClassName = (className) => {
  if (!className) return '';
  const s = String(className).trim().toUpperCase();

  if (s === 'LKG' || s === 'L.K.G' || s === 'L.K.G.') return 'LKG';
  if (s === 'UKG' || s === 'U.K.G' || s === 'U.K.G.') return 'UKG';
  if (s === 'PRE-KG' || s === 'PREKG' || s === 'NURSERY') return 'LKG';

  const clean = s.replace(/^(CLASS|GRADE|STANDARD|STD)\s+/i, '').trim();

  if (clean === 'I') return 'I';
  if (clean === 'II') return 'II';
  if (clean === 'III') return 'III';
  if (clean === 'IV') return 'IV';
  if (clean === 'V') return 'V';
  if (clean === 'VI') return 'VI';
  if (clean === 'VII') return 'VII';
  if (clean === 'VIII') return 'VIII';
  if (clean === 'IX') return 'IX';
  if (clean === 'X') return 'X';
  if (clean === 'XI') return 'XI';
  if (clean === 'XII') return 'XII';

  const m = clean.match(/^(\d+)(?:ST|ND|RD|TH)?$/);
  if (m) {
    const num = parseInt(m[1], 10);
    const roman = {
      1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
      7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
    };
    if (roman[num]) return roman[num];
  }

  return className;
};

export const toApplicationClassName = (val) => {
  if (!val) return '';
  const s = String(val).trim().toUpperCase();

  if (s === 'LKG' || s === 'L.K.G' || s === 'L.K.G.') return 'LKG';
  if (s === 'UKG' || s === 'U.K.G' || s === 'U.K.G.') return 'UKG';
  if (s === 'PRE-KG' || s === 'PREKG' || s === 'NURSERY') return 'LKG';

  const clean = s.replace(/^(CLASS|GRADE|STANDARD|STD)\s+/i, '').trim();

  const romanMap = {
    'I': 'Class 1', 'II': 'Class 2', 'III': 'Class 3', 'IV': 'Class 4',
    'V': 'Class 5', 'VI': 'Class 6', 'VII': 'Class 7', 'VIII': 'Class 8',
    'IX': 'Class 9', 'X': 'Class 10', 'XI': 'Class 11', 'XII': 'Class 12'
  };
  if (romanMap[clean]) return romanMap[clean];

  const m = clean.match(/^(\d+)(?:ST|ND|RD|TH)?$/);
  if (m) {
    return `Class ${parseInt(m[1], 10)}`;
  }

  return val;
};

/**
 * Converts any class format (numeric, Roman, prefixed, or raw)
 * to the exact UI display format:
 * LKG, UKG, Class I, Class II, ..., Class XII
 */
export const toDisplayClassName = (className) => {
  if (!className) return '';
  const s = String(className).trim().toUpperCase();

  if (s === 'LKG' || s === 'L.K.G' || s === 'L.K.G.') return 'LKG';
  if (s === 'UKG' || s === 'U.K.G' || s === 'U.K.G.') return 'UKG';
  if (s === 'PRE-KG' || s === 'PREKG' || s === 'NURSERY') return 'LKG';

  const clean = s.replace(/^(CLASS|GRADE|STANDARD|STD)\s+/i, '').trim();

  const romanMap = {
    '1': 'Class I', '2': 'Class II', '3': 'Class III', '4': 'Class IV',
    '5': 'Class V', '6': 'Class VI', '7': 'Class VII', '8': 'Class VIII',
    '9': 'Class IX', '10': 'Class X', '11': 'Class XI', '12': 'Class XII',
    'I': 'Class I', 'II': 'Class II', 'III': 'Class III', 'IV': 'Class IV',
    'V': 'Class V', 'VI': 'Class VI', 'VII': 'Class VII', 'VIII': 'Class VIII',
    'IX': 'Class IX', 'X': 'Class X', 'XI': 'Class XI', 'XII': 'Class XII'
  };

  if (romanMap[clean]) return romanMap[clean];

  return className;
};

export const isClassMatch = (classA, classB) => {
  if (!classA || !classB) return false;
  return toApplicationClassName(classA).toLowerCase() === toApplicationClassName(classB).toLowerCase();
};

export const compareAcademicClasses = (a, b) => {
  const nameA = typeof a === 'string' ? a : (a?.className || '');
  const nameB = typeof b === 'string' ? b : (b?.className || '');
  const rankA = getClassAcademicRank(nameA);
  const rankB = getClassAcademicRank(nameB);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Backward compatibility PROMOTION_CLASSES alias for CLASS_CONFIG
 */
export const PROMOTION_CLASSES = CLASS_CONFIG.map((c) => ({
  roman: c.roman,
  label: c.displayLabel,
  appClass: c.internalValue,
  rank: c.sortOrder,
}));

/**
 * PROMOTION / EDIT RULE:
 * Returns the student's current class and all valid higher classes in academic order.
 * Lower classes are excluded.
 * 
 * Examples:
 * - Current = Class X  -> [Class X, Class XI, Class XII]
 * - Current = Class XI -> [Class XI, Class XII]
 * - Current = Class XII -> [Class XII]
 * - Current = Class IX -> [Class IX, Class X, Class XI, Class XII]
 * - Current = LKG      -> [LKG, UKG, Class I, ..., Class XII]
 */
export const getAvailableEditClasses = (currentClassName) => {
  if (!currentClassName) return CLASS_CONFIG;
  const currentApp = toApplicationClassName(currentClassName).toLowerCase();
  const currentRoman = toExcelClassName(currentClassName).toUpperCase();

  const currentIndex = CLASS_CONFIG.findIndex(
    (c) =>
      c.internalValue.toLowerCase() === currentApp ||
      c.roman.toUpperCase() === currentRoman ||
      c.displayLabel.toLowerCase() === currentApp ||
      c.displayLabel.toLowerCase() === `class ${currentRoman.toLowerCase()}`
  );

  if (currentIndex === -1) {
    const rank = getClassAcademicRank(currentClassName);
    return CLASS_CONFIG.filter((c) => getClassAcademicRank(c.internalValue) >= rank);
  }

  return CLASS_CONFIG.slice(currentIndex);
};

export const getAvailableHigherClasses = getAvailableEditClasses;



