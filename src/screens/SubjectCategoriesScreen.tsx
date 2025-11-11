import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput, Modal, Switch, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { SubjectCategory, CustomSubjectCategory } from '../types';
import { Colors } from '../constants/theme';
import { useStore } from '../store';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<any, 'SubjectCategories'>;

interface CategoryItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  enabled: boolean;
  order: number;
  customCategoryId?: string;
}

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

const AVAILABLE_ICONS = [
  'book', 'calculator', 'flask', 'library', 'code-slash', 'nuclear', 'flask-outline',
  'leaf', 'trending-up', 'people', 'construct', 'briefcase', 'color-palette',
  'school', 'pencil', 'musical-notes', 'basketball', 'football', 'game-controller',
  'camera', 'film', 'tv', 'headset', 'phone-portrait', 'laptop', 'tablet-portrait',
];

export default function SubjectCategoriesScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  const { customCategories, setCustomCategories } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#19e65e');
  const [selectedIcon, setSelectedIcon] = useState('book');
  const [categoryEnabled, setCategoryEnabled] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [rgbR, setRgbR] = useState(25);
  const [rgbG, setRgbG] = useState(230);
  const [rgbB, setRgbB] = useState(94);
  const [isReorderMode, setIsReorderMode] = useState(false);

  useEffect(() => {
    if (showAddModal || showEditModal) {
      const hex = categoryColor;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      setRgbR(r);
      setRgbG(g);
      setRgbB(b);
    }
  }, [categoryColor, showAddModal, showEditModal]);

  const getAllCategories = (): CategoryItem[] => {
    const defaultItems: CategoryItem[] = DEFAULT_CATEGORIES.map((item, index) => {
      const override = customCategories.find(c => c.defaultCategoryId === item.category);
      
      return {
        id: item.category,
        name: override?.name || item.category,
        color: override?.color || item.color,
        icon: override?.icon || item.icon,
        isDefault: true,
        enabled: override?.enabled !== undefined ? override.enabled : true,
        order: override?.order !== undefined ? override.order : index,
        customCategoryId: override?.id,
      };
    });

    const customItems: CategoryItem[] = customCategories
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

    return [...defaultItems, ...customItems].sort((a, b) => a.order - b.order);
  };

  const allCategories = getAllCategories();

  const handleAddCategory = () => {
    setCategoryName('');
    setCategoryColor('#19e65e');
    setSelectedIcon('book');
    setCategoryEnabled(true);
    setShowAddModal(true);
  };

  const handleEditCategory = (category: CategoryItem) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.color);
    setSelectedIcon(category.icon);
    setCategoryEnabled(category.enabled);
    setShowEditModal(true);
  };

  const handleToggleEnabled = async (category: CategoryItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (category.isDefault) {
      const existingOverride = customCategories.find(c => c.defaultCategoryId === category.id);
      
      if (existingOverride) {
        const updated = customCategories.map(c =>
          c.id === existingOverride.id
            ? { ...c, enabled: !category.enabled }
            : c
        );
        await setCustomCategories(updated);
      } else {
        const defaultCategory = DEFAULT_CATEGORIES.find(d => d.category === category.id);
        const newOverride: CustomSubjectCategory = {
          id: `override-${category.id}-${Date.now()}`,
          name: defaultCategory!.category,
          color: defaultCategory!.color,
          icon: defaultCategory!.icon,
          enabled: !category.enabled,
          order: category.order,
          isDefaultOverride: true,
          defaultCategoryId: category.id,
        };
        await setCustomCategories([...customCategories, newOverride]);
      }
    } else {
      const updated = customCategories.map(c =>
        c.id === category.id
          ? { ...c, enabled: !category.enabled }
          : c
      );
      await setCustomCategories(updated);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    showAlert({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? Exams using this category will keep their data.',
      icon: 'trash',
      iconColor: theme.colors.status.error,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = customCategories.filter(c => c.id !== categoryId && c.defaultCategoryId !== categoryId);
            await setCustomCategories(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    });
  };

  const handleMoveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const category = allCategories.find(c => c.id === categoryId);
    if (!category) return;

    const currentIndex = allCategories.indexOf(category);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= allCategories.length) return;

    const targetCategory = allCategories[newIndex];
    const newOrder = targetCategory.order;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (category.isDefault) {
      const existingOverride = customCategories.find(c => c.defaultCategoryId === category.id);
      
      if (existingOverride) {
        const updated = customCategories.map(c =>
          c.id === existingOverride.id
            ? { ...c, order: newOrder }
            : c
        );
        await setCustomCategories(updated);
      } else {
        const defaultCategory = DEFAULT_CATEGORIES.find(d => d.category === category.id);
        const newOverride: CustomSubjectCategory = {
          id: `override-${category.id}-${Date.now()}`,
          name: defaultCategory!.category,
          color: defaultCategory!.color,
          icon: defaultCategory!.icon,
          enabled: true,
          order: newOrder,
          isDefaultOverride: true,
          defaultCategoryId: category.id,
        };
        await setCustomCategories([...customCategories, newOverride]);
      }
    } else {
      const updated = customCategories.map(c =>
        c.id === category.id
          ? { ...c, order: newOrder }
          : c
      );
      await setCustomCategories(updated);
    }

    if (targetCategory.isDefault) {
      const existingOverride = customCategories.find(c => c.defaultCategoryId === targetCategory.id);
      if (existingOverride) {
        const updated = customCategories.map(c =>
          c.id === existingOverride.id
            ? { ...c, order: category.order }
            : c
        );
        await setCustomCategories(updated);
      } else {
        const defaultCategory = DEFAULT_CATEGORIES.find(d => d.category === targetCategory.id);
        const newOverride: CustomSubjectCategory = {
          id: `override-${targetCategory.id}-${Date.now()}`,
          name: defaultCategory!.category,
          color: defaultCategory!.color,
          icon: defaultCategory!.icon,
          enabled: true,
          order: category.order,
          isDefaultOverride: true,
          defaultCategoryId: targetCategory.id,
        };
        await setCustomCategories([...customCategories, newOverride]);
      }
    } else {
      const updated = customCategories.map(c =>
        c.id === targetCategory.id
          ? { ...c, order: category.order }
          : c
      );
      await setCustomCategories(updated);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      showAlert({
        title: 'Missing Information',
        message: 'Please enter a category name',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    if (showEditModal && editingCategory) {
      if (editingCategory.isDefault) {
        const existingOverride = customCategories.find(c => c.defaultCategoryId === editingCategory.id);
        
        if (existingOverride) {
          const updated = customCategories.map(c =>
            c.id === existingOverride.id
              ? { ...c, name: categoryName.trim(), color: categoryColor, icon: selectedIcon, enabled: categoryEnabled }
              : c
          );
          await setCustomCategories(updated);
        } else {
          const newOverride: CustomSubjectCategory = {
            id: `override-${editingCategory.id}-${Date.now()}`,
            name: categoryName.trim(),
            color: categoryColor,
            icon: selectedIcon,
            enabled: categoryEnabled,
            order: editingCategory.order,
            isDefaultOverride: true,
            defaultCategoryId: editingCategory.id,
          };
          await setCustomCategories([...customCategories, newOverride]);
        }
      } else {
        const updated = customCategories.map(c =>
          c.id === editingCategory.id
            ? { ...c, name: categoryName.trim(), color: categoryColor, icon: selectedIcon, enabled: categoryEnabled }
            : c
        );
        await setCustomCategories(updated);
      }
      setShowEditModal(false);
      setEditingCategory(null);
    } else {
      const maxOrder = Math.max(...allCategories.map(c => c.order), 0);
      const newCategory: CustomSubjectCategory = {
        id: `custom-${Date.now()}`,
        name: categoryName.trim(),
        color: categoryColor,
        icon: selectedIcon,
        enabled: categoryEnabled,
        order: maxOrder + 1,
      };
      await setCustomCategories([...customCategories, newCategory]);
      setShowAddModal(false);
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCategoryName('');
    setCategoryColor('#19e65e');
    setSelectedIcon('book');
    setCategoryEnabled(true);
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const predefinedColors = [
    '#19e65e', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#06b6d4', '#6366f1', '#ef4444', '#14b8a6',
    '#f97316', '#84cc16', '#a855f7', '#e11d48', '#0ea5e9',
  ];

  const renderCategoryCard = (category: CategoryItem, index: number) => (
    <Pressable
      key={category.id}
      style={({ pressed }) => [
        styles.categoryCard,
        {
          backgroundColor: category.enabled 
            ? `${theme.colors.card}FF` 
            : `${theme.colors.card}80`,
          borderColor: category.enabled ? `${category.color}40` : theme.colors.border,
          opacity: pressed ? 0.8 : category.enabled ? 1 : 0.6,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        !category.enabled && styles.categoryCardDisabled,
      ]}
      onPress={() => {
        if (isReorderMode) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handleEditCategory(category);
      }}
      onLongPress={() => {
        if (!isReorderMode) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          handleEditCategory(category);
        }
      }}
    >
      {/* Reorder Controls */}
      {isReorderMode && (
        <View style={styles.reorderControls}>
          <Pressable
            style={({ pressed }) => [
              styles.reorderButton,
              {
                backgroundColor: index === 0 
                  ? `${theme.colors.border}80` 
                  : `${theme.colors.primary}FF`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => handleMoveCategory(category.id, 'up')}
            disabled={index === 0}
          >
            <Ionicons 
              name="chevron-up" 
              size={18} 
              color={index === 0 ? theme.colors.text.tertiary : theme.colors.text.inverse} 
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.reorderButton,
              {
                backgroundColor: index === allCategories.length - 1
                  ? `${theme.colors.border}80`
                  : `${theme.colors.primary}FF`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={() => handleMoveCategory(category.id, 'down')}
            disabled={index === allCategories.length - 1}
          >
            <Ionicons 
              name="chevron-down" 
              size={18} 
              color={index === allCategories.length - 1 ? theme.colors.text.tertiary : theme.colors.text.inverse} 
            />
          </Pressable>
        </View>
      )}

      {/* Delete Button */}
      {!category.isDefault && !isReorderMode && (
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteCategory(category.id);
          }}
        >
          <View style={[styles.deleteButtonBg, { backgroundColor: `${theme.colors.status.error}20` }]}>
            <Ionicons name="trash-outline" size={16} color={theme.colors.status.error} />
          </View>
        </Pressable>
      )}

      {/* Category Icon */}
      <View
        style={[
          styles.categoryIconContainer,
          { 
            backgroundColor: category.enabled 
              ? `${category.color}20` 
              : `${category.color}10`,
          },
        ]}
      >
        <Ionicons 
          name={category.icon as any} 
          size={32} 
          color={category.enabled ? category.color : `${category.color}80`} 
        />
      </View>

      {/* Category Name */}
      <Text 
        style={[
          styles.categoryName, 
          { 
            color: category.enabled 
              ? theme.colors.text.primary 
              : theme.colors.text.tertiary 
          }
        ]} 
        numberOfLines={2}
      >
        {category.name}
      </Text>

      {/* Color Indicator */}
      <View
        style={[
          styles.colorIndicator,
          { 
            backgroundColor: category.color,
            opacity: category.enabled ? 1 : 0.5,
          },
        ]}
      />

      {/* Disabled Badge */}
      {!category.enabled && (
        <View style={[styles.disabledBadge, { backgroundColor: theme.colors.border }]}>
          <Ionicons name="eye-off-outline" size={12} color={theme.colors.text.tertiary} />
        </View>
      )}
    </Pressable>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && ({ height: '100vh', overflow: 'hidden' } as any)
      ]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: `${theme.colors.background}CC` }]}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Subject Categories
        </Text>
        <View style={styles.headerRight}>
          {allCategories.length > 0 && (
            <Pressable 
              onPress={() => {
                setIsReorderMode(!isReorderMode);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }} 
              style={({ pressed }) => [
                styles.reorderModeButton,
                {
                  backgroundColor: isReorderMode 
                    ? `${theme.colors.primary}20` 
                    : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons 
                name={isReorderMode ? "checkmark-circle" : "swap-vertical"} 
                size={22} 
                color={isReorderMode ? theme.colors.primary : theme.colors.text.secondary} 
              />
            </Pressable>
          )}
          <Pressable 
            onPress={handleAddCategory} 
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: `${theme.colors.primary}20`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="add" size={22} color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && ({
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          } as any)
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View style={styles.section}>
          <View style={[
            styles.infoCard, 
            { 
              backgroundColor: `${theme.colors.primary}15`,
              borderLeftWidth: 3,
              borderLeftColor: theme.colors.primary,
            }
          ]}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
              {isReorderMode 
                ? 'Use arrows to reorder. Tap ✓ to finish.'
                : 'Tap to edit • Long press for quick edit • Toggle to enable/disable'}
            </Text>
          </View>
        </View>

        {/* Categories Grid */}
        {allCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
                {isReorderMode ? 'REORDER MODE' : 'CATEGORIES'}
              </Text>
              <Text style={[styles.categoryCount, { color: theme.colors.text.tertiary }]}>
                {allCategories.filter(c => c.enabled).length} enabled
              </Text>
            </View>
            <View style={styles.categoriesGrid}>
              {allCategories.map((category, index) => renderCategoryCard(category, index))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {allCategories.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="book-outline" size={48} color={theme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              No Categories Yet
            </Text>
            <Text style={[styles.emptyMessage, { color: theme.colors.text.secondary }]}>
              Create your first custom category to get started
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.emptyButton,
                {
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={handleAddCategory}
            >
              <Ionicons name="add" size={20} color={theme.colors.text.inverse} />
              <Text style={[styles.emptyButtonText, { color: theme.colors.text.inverse }]}>
                Add Category
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Category Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingCategory(null);
        }}
      >
        <SafeAreaView
          style={[
            styles.modalFullScreen,
            { backgroundColor: theme.colors.background },
          ]}
          edges={['top', 'bottom']}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoid}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Modal Header */}
            <View style={[
              styles.modalHeader,
              { 
                borderBottomColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                  <Ionicons 
                    name={showEditModal ? "create-outline" : "add-circle-outline"} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                  {showEditModal ? 'Edit Category' : 'New Category'}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingCategory(null);
                  setCategoryName('');
                  setCategoryColor('#19e65e');
                  setSelectedIcon('book');
                  setCategoryEnabled(true);
                }}
                style={({ pressed }) => [
                  styles.closeButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.modalBodyContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {/* Category Name */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                  Category Name
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text.primary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  value={categoryName}
                  onChangeText={setCategoryName}
                  placeholder="e.g., Mathematics, Science..."
                  placeholderTextColor={theme.colors.text.tertiary}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
              </View>

              {/* Icon Selection */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                  Icon
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.iconScroll}
                  contentContainerStyle={styles.iconScrollContent}
                >
                  {AVAILABLE_ICONS.map((icon) => (
                    <Pressable
                      key={icon}
                      style={({ pressed }) => [
                        styles.iconOption,
                        {
                          backgroundColor: selectedIcon === icon 
                            ? `${theme.colors.primary}20` 
                            : theme.colors.card,
                          borderColor: selectedIcon === icon 
                            ? theme.colors.primary 
                            : theme.colors.border,
                          borderWidth: selectedIcon === icon ? 2 : 1,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                      onPress={() => {
                        setSelectedIcon(icon);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Ionicons
                        name={icon as any}
                        size={22}
                        color={selectedIcon === icon ? theme.colors.primary : theme.colors.text.secondary}
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Color Selection */}
              <View style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                  Color
                </Text>
                
                {/* Predefined Colors */}
                <View style={styles.predefinedColorsContainer}>
                  {predefinedColors.map((color) => (
                    <Pressable
                      key={color}
                      style={({ pressed }) => [
                        styles.colorOption,
                        {
                          backgroundColor: color,
                          borderColor: categoryColor === color 
                            ? theme.colors.text.primary 
                            : 'transparent',
                          borderWidth: categoryColor === color ? 3 : 2,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                      onPress={() => {
                        setCategoryColor(color);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      {categoryColor === color && (
                        <View style={styles.colorSelectedIndicator}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>

                {/* Custom Color Picker */}
                <Pressable
                  style={({ pressed }) => [
                    styles.colorPickerButton,
                    {
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => setShowColorPicker(!showColorPicker)}
                >
                  <View style={[styles.colorPreview, { backgroundColor: categoryColor }]} />
                  <Text style={[styles.colorPickerText, { color: theme.colors.text.primary }]}>
                    Custom Color
                  </Text>
                  <Ionicons
                    name={showColorPicker ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.text.secondary}
                  />
                </Pressable>

                {showColorPicker && (
                  <View style={[
                    styles.colorPickerContainer, 
                    { 
                      backgroundColor: theme.colors.card,
                      borderColor: theme.colors.border,
                    }
                  ]}>
                    <View style={styles.colorPreviewLarge}>
                      <View style={[
                        styles.colorPreviewBox, 
                        { 
                          backgroundColor: categoryColor,
                          borderColor: theme.colors.border,
                        }
                      ]} />
                      <Text style={[styles.hexText, { color: theme.colors.text.primary }]}>
                        {categoryColor.toUpperCase()}
                      </Text>
                    </View>
                    
                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderHeader}>
                        <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                          Red
                        </Text>
                        <Text style={[styles.sliderValue, { color: theme.colors.text.primary }]}>
                          {Math.round(rgbR)}
                        </Text>
                      </View>
                      <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={255}
                        value={rgbR}
                        onValueChange={(value) => {
                          setRgbR(value);
                          setCategoryColor(rgbToHex(value, rgbG, rgbB));
                        }}
                        minimumTrackTintColor={theme.colors.primary}
                        maximumTrackTintColor={theme.colors.border}
                        thumbTintColor={theme.colors.primary}
                      />
                    </View>

                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderHeader}>
                        <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                          Green
                        </Text>
                        <Text style={[styles.sliderValue, { color: theme.colors.text.primary }]}>
                          {Math.round(rgbG)}
                        </Text>
                      </View>
                      <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={255}
                        value={rgbG}
                        onValueChange={(value) => {
                          setRgbG(value);
                          setCategoryColor(rgbToHex(rgbR, value, rgbB));
                        }}
                        minimumTrackTintColor={theme.colors.primary}
                        maximumTrackTintColor={theme.colors.border}
                        thumbTintColor={theme.colors.primary}
                      />
                    </View>

                    <View style={styles.sliderContainer}>
                      <View style={styles.sliderHeader}>
                        <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                          Blue
                        </Text>
                        <Text style={[styles.sliderValue, { color: theme.colors.text.primary }]}>
                          {Math.round(rgbB)}
                        </Text>
                      </View>
                      <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={255}
                        value={rgbB}
                        onValueChange={(value) => {
                          setRgbB(value);
                          setCategoryColor(rgbToHex(rgbR, rgbG, value));
                        }}
                        minimumTrackTintColor={theme.colors.primary}
                        maximumTrackTintColor={theme.colors.border}
                        thumbTintColor={theme.colors.primary}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Enable/Disable Toggle */}
              <View style={styles.inputSection}>
                <View style={[
                  styles.toggleSection,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  }
                ]}>
                  <View style={styles.toggleLeft}>
                    <Ionicons 
                      name={categoryEnabled ? "eye-outline" : "eye-off-outline"} 
                      size={20} 
                      color={categoryEnabled ? theme.colors.primary : theme.colors.text.tertiary} 
                    />
                    <View style={styles.toggleTextContainer}>
                      <Text style={[styles.toggleLabel, { color: theme.colors.text.primary }]}>
                        Enable Category
                      </Text>
                      <Text style={[styles.toggleDescription, { color: theme.colors.text.secondary }]}>
                        {categoryEnabled 
                          ? 'Category will be available for selection' 
                          : 'Category will be hidden from selection'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={categoryEnabled}
                    onValueChange={(value) => {
                      setCategoryEnabled(value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.text.inverse}
                    ios_backgroundColor={theme.colors.border}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[
              styles.modalFooter,
              { 
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton, 
                  styles.cancelButton, 
                  { 
                    backgroundColor: theme.colors.card,
                    opacity: pressed ? 0.7 : 1,
                  }
                ]}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingCategory(null);
                  setCategoryName('');
                  setCategoryColor('#19e65e');
                  setSelectedIcon('book');
                  setCategoryEnabled(true);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton, 
                  styles.saveButton, 
                  { 
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  }
                ]}
                onPress={handleSaveCategory}
              >
                <Ionicons name="checkmark" size={18} color={theme.colors.text.inverse} />
                <Text style={[styles.modalButtonText, { color: theme.colors.text.inverse }]}>
                  {showEditModal ? 'Save' : 'Create'}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Alert */}
      {visible && alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          icon={alertConfig.icon as any}
          iconColor={alertConfig.iconColor}
          buttons={alertConfig.buttons}
          onDismiss={hideAlert}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  categoryCard: {
    width: '47%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    position: 'relative',
    minHeight: 160,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  categoryCardDisabled: {
    borderStyle: 'dashed',
  },
  reorderControls: {
    position: 'absolute',
    left: 12,
    top: 12,
    flexDirection: 'column',
    gap: 6,
    zIndex: 10,
  },
  reorderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  toggleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  deleteButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
  },
  deleteButtonBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
    lineHeight: 20,
  },
  colorIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  disabledBadge: {
    position: 'absolute',
    bottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalFullScreen: {
    flex: 1,
  },
  modalKeyboardAvoid: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 24,
    paddingBottom: 24,
  },
  inputSection: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  textInput: {
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    borderWidth: 1.5,
    fontWeight: '500',
  },
  iconScroll: {
    marginTop: 8,
  },
  iconScrollContent: {
    paddingRight: 20,
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  predefinedColorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  colorPreview: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  colorPickerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  colorPickerContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  colorPreviewLarge: {
    alignItems: 'center',
    marginBottom: 24,
  },
  colorPreviewBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  hexText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#19e65e',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
