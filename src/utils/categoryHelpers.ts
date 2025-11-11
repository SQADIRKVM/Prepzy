import { SubjectCategory, CustomSubjectCategory } from '../types';
import { Colors } from '../constants/theme';

const DEFAULT_CATEGORIES: { category: SubjectCategory; icon: string; color: string }[] = [
  { category: 'Mathematics', icon: 'calculator', color: Colors.lavender },
  { category: 'Science', icon: 'flask', color: Colors.sky },
  { category: 'English', icon: 'book', color: Colors.peach },
  { category: 'History', icon: 'library', color: Colors.sand },
  { category: 'Computer Science', icon: 'code-slash', color: Colors.sage },
  { category: 'Physics', icon: 'nuclear', color: Colors.sky },
  { category: 'Chemistry', icon: 'flask-outline', color: Colors.lavender },
  { category: 'Biology', icon: 'leaf', color: Colors.sage },
  { category: 'Economics', icon: 'trending-up', color: Colors.sand },
  { category: 'Psychology', icon: 'people', color: Colors.peach },
  { category: 'Engineering', icon: 'construct', color: Colors.skyDark },
  { category: 'Business', icon: 'briefcase', color: Colors.sand },
  { category: 'Arts', icon: 'color-palette', color: Colors.peach },
  { category: 'Other', icon: 'ellipse', color: '#E8E8E8' },
];

export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  enabled: boolean;
  order: number;
}

/**
 * Get all available categories (enabled only) with their colors and icons
 * This respects custom categories and overrides
 */
export const getAvailableCategories = (customCategories: CustomSubjectCategory[]): CategoryInfo[] => {
  const defaultItems: CategoryInfo[] = DEFAULT_CATEGORIES.map((item, index) => {
    const override = customCategories.find(c => c.defaultCategoryId === item.category);
    
    return {
      id: item.category,
      name: override?.name || item.category,
      color: override?.color || item.color,
      icon: override?.icon || item.icon,
      isDefault: true,
      enabled: override?.enabled !== undefined ? override.enabled : true,
      order: override?.order !== undefined ? override.order : index,
    };
  });

  const customItems: CategoryInfo[] = customCategories
    .filter(c => !c.isDefaultOverride)
    .map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      isDefault: false,
      enabled: c.enabled !== undefined ? c.enabled : true,
      order: c.order !== undefined ? c.order : 1000 + customCategories.indexOf(c),
    }));

  return [...defaultItems, ...customItems]
    .filter(c => c.enabled) // Only return enabled categories
    .sort((a, b) => a.order - b.order);
};

/**
 * Get category info by ID (for SubjectCategory type or custom category ID)
 */
export const getCategoryInfo = (
  categoryId: string,
  customCategories: CustomSubjectCategory[]
): CategoryInfo | null => {
  // Check if it's a default category
  const defaultCategory = DEFAULT_CATEGORIES.find(d => d.category === categoryId);
  if (defaultCategory) {
    const override = customCategories.find(c => c.defaultCategoryId === categoryId);
    return {
      id: defaultCategory.category,
      name: override?.name || defaultCategory.category,
      color: override?.color || defaultCategory.color,
      icon: override?.icon || defaultCategory.icon,
      isDefault: true,
      enabled: override?.enabled !== undefined ? override.enabled : true,
      order: override?.order !== undefined ? override.order : DEFAULT_CATEGORIES.indexOf(defaultCategory),
    };
  }

  // Check if it's a custom category
  const customCategory = customCategories.find(c => c.id === categoryId && !c.isDefaultOverride);
  if (customCategory) {
    return {
      id: customCategory.id,
      name: customCategory.name,
      color: customCategory.color,
      icon: customCategory.icon,
      isDefault: false,
      enabled: customCategory.enabled !== undefined ? customCategory.enabled : true,
      order: customCategory.order !== undefined ? customCategory.order : 1000,
    };
  }

  return null;
};

/**
 * Get category color by ID
 */
export const getCategoryColor = (
  categoryId: string,
  customCategories: CustomSubjectCategory[],
  fallbackColor?: string
): string => {
  const info = getCategoryInfo(categoryId, customCategories);
  if (info && info.enabled) {
    return info.color;
  }
  return fallbackColor || Colors.lavender;
};

/**
 * Get category icon by ID
 */
export const getCategoryIcon = (
  categoryId: string,
  customCategories: CustomSubjectCategory[]
): string => {
  const info = getCategoryInfo(categoryId, customCategories);
  if (info) {
    return info.icon;
  }
  return 'ellipse';
};

/**
 * Get category name by ID
 */
export const getCategoryName = (
  categoryId: string,
  customCategories: CustomSubjectCategory[]
): string => {
  const info = getCategoryInfo(categoryId, customCategories);
  if (info) {
    return info.name;
  }
  return categoryId;
};

