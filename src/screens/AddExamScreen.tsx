import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { ExamType, SubjectCategory } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import { getAvailableCategories, getCategoryColor, getCategoryName, getCategoryIcon } from '../utils/categoryHelpers';

type Props = NativeStackScreenProps<any, 'AddExam'>;

export default function AddExamScreen({ navigation, route }: Props) {
  const { theme, isDark } = useTheme();
  const { examId } = route.params || {};
  const { addExam, updateExam, getExamById, customCategories } = useStore();
  const insets = useSafeAreaInsets();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempHour, setTempHour] = useState(new Date().getHours());
  const [tempMinute, setTempMinute] = useState(new Date().getMinutes());
  const [tempAmPm, setTempAmPm] = useState<'AM' | 'PM'>(new Date().getHours() >= 12 ? 'PM' : 'AM');
  const [temp12Hour, setTemp12Hour] = useState(() => {
    const hour = new Date().getHours();
    return hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  });
  const [subjectCategory, setSubjectCategory] = useState<SubjectCategory>('Biology');
  const [examType, setExamType] = useState<ExamType>('Final');
  const [notes, setNotes] = useState('');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [showCustomSubjectModal, setShowCustomSubjectModal] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [customSubjectColor, setCustomSubjectColor] = useState('#19e65e');
  const [showCustomColorPicker, setShowCustomColorPicker] = useState(false);
  const [rgbR, setRgbR] = useState(25);
  const [rgbG, setRgbG] = useState(230);
  const [rgbB, setRgbB] = useState(94);
  const [currentCustomColor, setCurrentCustomColor] = useState<string | null>(null);

  const isEditing = !!examId;

  // Helper function to format reminders display
  const formatRemindersText = (reminders?: string[]): string => {
    if (!reminders || reminders.length === 0) {
      return 'No reminders set';
    }
    
    if (reminders.length === 1) {
      return formatSingleReminder(reminders[0]);
    }
    
    return `${reminders.length} reminders set`;
  };

  const formatSingleReminder = (reminderStr: string): string => {
    const daysMatch = reminderStr.match(/(\d+)d/);
    const hoursMatch = reminderStr.match(/(\d+)h/);
    const minutesMatch = reminderStr.match(/(\d+)m/);
    
    const parts: string[] = [];
    if (daysMatch) parts.push(`${daysMatch[1]} day${daysMatch[1] !== '1' ? 's' : ''}`);
    if (hoursMatch) parts.push(`${hoursMatch[1]} hour${hoursMatch[1] !== '1' ? 's' : ''}`);
    if (minutesMatch) parts.push(`${minutesMatch[1]} min${minutesMatch[1] !== '1' ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') + ' before' : 'No reminders set';
  };

  useEffect(() => {
    if (examId) {
      const exam = getExamById(examId);
      if (exam) {
        setTitle(exam.title);
        setDate(new Date(exam.date));
        setSubjectCategory(exam.subjectCategory);
        setExamType(exam.examType);
        setNotes(exam.notes || '');
        setCurrentCustomColor(exam.customColor || null);
      }
    }
  }, [examId]);

  // Refresh exam data when screen comes into focus (e.g., after returning from Reminders screen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (examId) {
        const exam = getExamById(examId);
        if (exam) {
          // Refresh the exam data to show updated reminders
          setTitle(exam.title);
          setDate(new Date(exam.date));
          setSubjectCategory(exam.subjectCategory);
          setExamType(exam.examType);
          setNotes(exam.notes || '');
          setCurrentCustomColor(exam.customColor || null);
        }
      }
    });

    return unsubscribe;
  }, [navigation, examId, getExamById]);

  const handleSave = () => {
    if (!title.trim()) {
      showAlert({
        title: 'Missing Information',
        message: 'Please enter an exam title',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    const examData = {
      title: title.trim(),
      date: date.toISOString(),
      subjectCategory,
      examType,
      notes: notes.trim(),
      customColor: currentCustomColor || undefined,
      reminders: [],
    };

    if (isEditing && examId) {
      updateExam(examId, examData);
    } else {
      addExam(examData);
    }

    navigation.goBack();
  };

  const formatDateTime = () => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSaveCustomSubject = () => {
    if (!customSubjectName.trim()) {
      showAlert({
        title: 'Missing Information',
        message: 'Please enter a subject name',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    setSubjectCategory(customSubjectName.trim() as SubjectCategory);
    setCurrentCustomColor(customSubjectColor);
    setShowCustomSubjectModal(false);
    setCustomSubjectName('');
  };

  const predefinedColors = [
    '#19e65e', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#06b6d4', '#6366f1', '#ef4444', '#14b8a6',
  ];

  // Helper function to convert RGB to Hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Helper function to convert Hex to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 25, g: 230, b: 94 };
  };

  // Open custom color picker and initialize RGB from current color
  const handleOpenCustomColorPicker = () => {
    const rgb = hexToRgb(customSubjectColor);
    setRgbR(rgb.r);
    setRgbG(rgb.g);
    setRgbB(rgb.b);
    // On iOS, temporarily hide the custom subject modal to allow color picker to open
    if (Platform.OS === 'ios') {
      setShowCustomSubjectModal(false);
      // Small delay to ensure modal closes before opening new one
      setTimeout(() => {
        setShowCustomColorPicker(true);
      }, 300);
    } else {
      setShowCustomColorPicker(true);
    }
  };

  // Save custom color from RGB picker
  const handleSaveCustomColor = () => {
    const hexColor = rgbToHex(rgbR, rgbG, rgbB);
    setCustomSubjectColor(hexColor);
    setCurrentCustomColor(hexColor);
    setShowCustomColorPicker(false);
    // On iOS, reopen the custom subject modal after closing color picker
    if (Platform.OS === 'ios' && customSubjectName.trim()) {
      setTimeout(() => {
        setShowCustomSubjectModal(true);
      }, 300);
    }
  };

  // Date picker handlers
  const handleOpenDatePicker = () => {
    setTempDate(date);
    const hours = date.getHours();
    setTempHour(hours);
    setTempMinute(date.getMinutes());
    setTempAmPm(hours >= 12 ? 'PM' : 'AM');
    setTemp12Hour(hours === 0 ? 12 : hours > 12 ? hours - 12 : hours);
    setShowCustomDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        setShowCustomDatePicker(false);
        // Open time picker after date is saved on Android
        const newDate = new Date(date);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setDate(newDate);
        setTimeout(() => {
          setTempHour(newDate.getHours());
          setTempMinute(newDate.getMinutes());
          setShowCustomTimePicker(true);
        }, 100);
      }
      // Update date for iOS in real-time
      if (Platform.OS === 'ios') {
        setTempDate(selectedDate);
      }
    } else if (Platform.OS === 'android') {
      setShowCustomDatePicker(false);
    }
  };

  const handleSaveDate = () => {
    const newDate = new Date(date);
    newDate.setFullYear(tempDate.getFullYear());
    newDate.setMonth(tempDate.getMonth());
    newDate.setDate(tempDate.getDate());

    // Convert 12-hour format to 24-hour for web
    if (Platform.OS === 'web') {
      let hour24 = temp12Hour;
      if (tempAmPm === 'PM' && temp12Hour !== 12) {
        hour24 = temp12Hour + 12;
      } else if (tempAmPm === 'AM' && temp12Hour === 12) {
        hour24 = 0;
      }
      newDate.setHours(hour24);
      newDate.setMinutes(tempMinute);
      setDate(newDate);
      setShowCustomDatePicker(false);
    } else {
      // For iOS/Android, close date picker and open time picker
      newDate.setHours(tempHour);
      newDate.setMinutes(tempMinute);
      setDate(newDate);
      setShowCustomDatePicker(false);

      // Open time picker after closing date picker
      setTimeout(() => {
        setTempHour(newDate.getHours());
        setTempMinute(newDate.getMinutes());
        setShowCustomTimePicker(true);
      }, 300);
    }
  };

  const handleDateSelect = (day: number) => {
    const newTempDate = new Date(tempDate);
    newTempDate.setDate(day);
    setTempDate(newTempDate);
  };

  const handleMonthChange = (increment: number) => {
    const newTempDate = new Date(tempDate);
    newTempDate.setMonth(tempDate.getMonth() + increment);
    setTempDate(newTempDate);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  // Time picker handlers
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempHour(selectedDate.getHours());
      setTempMinute(selectedDate.getMinutes());
      if (Platform.OS === 'android') {
        setShowCustomTimePicker(false);
        const newDate = new Date(date);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        setDate(newDate);
      }
    } else if (Platform.OS === 'android') {
      setShowCustomTimePicker(false);
    }
  };

  const handleSaveTime = () => {
    const newDate = new Date(date);
    newDate.setHours(tempHour);
    newDate.setMinutes(tempMinute);
    setDate(newDate);
    setShowCustomTimePicker(false);
  };

  // Get available categories from custom categories (enabled only)
  const availableCategories = getAvailableCategories(customCategories);
  
  const examTypes: ExamType[] = ['Final', 'Midterm', 'Quiz', 'Assignment', 'Lab'];

  // Get category color from custom categories or fallback
  const categoryInfo = availableCategories.find(c => c.id === subjectCategory);
  const subjectColor = currentCustomColor || (categoryInfo ? categoryInfo.color : theme.colors.subjects[subjectCategory] || theme.colors.subjects.Other);

  const handleDelete = () => {
    const { deleteExam } = useStore.getState();
    showAlert({
      title: 'Delete Exam',
      message: 'Are you sure you want to delete this exam? This action cannot be undone.',
      icon: 'trash',
      iconColor: '#FFB4A0',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (examId) {
              deleteExam(examId);
              navigation.goBack();
            }
          },
        },
      ],
    });
  };

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
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          {isEditing ? 'Edit Exam' : 'Add New Exam'}
        </Text>
        <Pressable onPress={handleSave} style={styles.saveTextButton}>
          <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
            Save
          </Text>
        </Pressable>
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
        contentContainerStyle={[
          styles.scrollContent,
          isEditing && { paddingBottom: 160 },
          Platform.OS === 'web' && { minHeight: '100%', paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Exam Title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
            Exam Title
          </Text>
          <TextInput
            style={[
              styles.titleInput,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text.primary,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Biology Chapter 5"
            placeholderTextColor={theme.colors.text.tertiary}
          />
        </View>

        {/* Grouped Card: Date & Time + Subject */}
        <View style={[styles.groupedCard, { backgroundColor: theme.colors.card }]}>
          {/* Date & Time */}
          <Pressable
            style={styles.groupedRow}
            onPress={handleOpenDatePicker}
          >
            <View style={styles.selectRowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.selectRowLabel, { color: theme.colors.text.primary }]}>
                Date & Time
              </Text>
            </View>
            <View style={styles.selectRowRight}>
              <Text
                style={[styles.selectRowValue, { color: theme.colors.text.secondary }]}
                numberOfLines={1}
              >
                {formatDateTime()}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
            </View>
          </Pressable>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          {/* Subject */}
          <Pressable
            style={styles.groupedRow}
            onPress={() => setShowSubjectPicker(!showSubjectPicker)}
          >
            <View style={styles.selectRowLeft}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="pricetag-outline" size={20} color={theme.colors.primary} />
              </View>
              <Text style={[styles.selectRowLabel, { color: theme.colors.text.primary }]}>
                Subject
              </Text>
            </View>
            <View style={styles.selectRowRight}>
              <View style={[styles.colorDot, { backgroundColor: subjectColor }]} />
              <Text
                style={[styles.selectRowValue, { color: theme.colors.text.primary }]}
                numberOfLines={1}
              >
                {getCategoryName(subjectCategory, customCategories)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
            </View>
          </Pressable>
        </View>


        {/* Subject Picker */}
        {showSubjectPicker && (
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card }]}>
            {availableCategories.map((category) => {
              const isSelected = subjectCategory === category.id;
              return (
                <Pressable
                  key={category.id}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    if (category.id === 'Other') {
                      setShowSubjectPicker(false);
                      setShowCustomSubjectModal(true);
                    } else {
                      setSubjectCategory(category.id as SubjectCategory);
                      setCurrentCustomColor(null);
                      setShowSubjectPicker(false);
                    }
                  }}
                >
                  <View style={styles.pickerItemLeft}>
                    <View style={[styles.colorDot, { backgroundColor: category.color }]} />
                    <Ionicons name={category.icon as any} size={18} color={category.color} style={{ marginRight: 8 }} />
                    <Text style={[styles.pickerItemText, { color: theme.colors.text.primary }]}>
                      {category.name}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Reminders */}
        <Pressable
          style={[
            styles.remindersButton,
            {
              backgroundColor: `${theme.colors.primary}1A`,
              borderColor: `${theme.colors.primary}80`,
            },
          ]}
          onPress={() => navigation.navigate('Reminders', { examId })}
        >
          <View style={styles.remindersLeft}>
            <View style={[styles.remindersIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="notifications-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.remindersTitle, { color: theme.colors.text.primary }]}>
                Reminders
              </Text>
              <Text style={[styles.remindersSubtitle, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                {examId ? formatRemindersText(getExamById(examId)?.reminders) : 'Tap to set reminders'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
        </Pressable>

        {/* Exam Type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
            Exam Type
          </Text>
          <View style={styles.pillsContainer}>
            {examTypes.map((type) => {
              const isActive = examType === type;
              return (
                <Pressable
                  key={type}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isActive ? theme.colors.primary : theme.colors.card,
                    },
                  ]}
                  onPress={() => setExamType(type)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: isActive ? theme.colors.text.inverse : theme.colors.text.secondary,
                        fontWeight: isActive ? '600' : '500',
                      },
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
            Notes
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: theme.colors.card,
                color: theme.colors.text.primary,
                borderColor: theme.colors.border,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes, location, or important topics..."
            placeholderTextColor={theme.colors.text.tertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <LinearGradient
        colors={[
          `${theme.colors.background}00`,
          theme.colors.background,
          theme.colors.background,
        ]}
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable onPress={handleSave} style={styles.saveButtonWrapper}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveButtonGradient}
          >
            <Text style={[styles.saveGradientButtonText, { color: theme.colors.text.inverse }]}>
              {isEditing ? 'Save Changes' : 'Add Exam'}
            </Text>
          </LinearGradient>
        </Pressable>
        
        {isEditing && (
          <Pressable onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.status.error} />
            <Text style={[styles.deleteButtonText, { color: theme.colors.status.error }]}>
              Delete Exam
            </Text>
          </Pressable>
        )}
      </LinearGradient>

      {/* Custom Subject Modal */}
      <Modal
        visible={showCustomSubjectModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomSubjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Add Custom Subject
            </Text>

            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text.secondary }]}>
                Subject Name
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text.primary,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={customSubjectName}
                onChangeText={setCustomSubjectName}
                placeholder="e.g., Music Theory"
                placeholderTextColor={theme.colors.text.tertiary}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: theme.colors.text.secondary }]}>
                Choose Color
              </Text>
              <View style={styles.colorGrid}>
                {predefinedColors.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      customSubjectColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setCustomSubjectColor(color)}
                  >
                    {customSubjectColor === color && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </Pressable>
                ))}

                {/* Custom Color Picker */}
                <Pressable
                  style={({ pressed }) => [
                    styles.colorOption,
                    styles.customColorOption,
                    {
                      backgroundColor: predefinedColors.includes(customSubjectColor)
                        ? theme.colors.card
                        : customSubjectColor,
                      borderColor: theme.colors.border,
                      borderWidth: 2,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleOpenCustomColorPicker}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Ionicons
                    name="color-palette"
                    size={24}
                    color={predefinedColors.includes(customSubjectColor) ? theme.colors.text.secondary : '#fff'}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                onPress={() => {
                  setShowCustomSubjectModal(false);
                  setCustomSubjectName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveCustomSubject}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.inverse }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Color Picker Modal */}
      <Modal
        visible={showCustomColorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomColorPicker(false)}
        presentationStyle="overFullScreen"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardAvoid}
        >
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}
            onPress={() => setShowCustomColorPicker(false)}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Custom Color Picker
            </Text>

            {/* Color Preview */}
            <View style={styles.colorPreviewSection}>
              <View
                style={[
                  styles.colorPreview,
                  { backgroundColor: rgbToHex(rgbR, rgbG, rgbB) },
                ]}
              />
              <Text style={[styles.colorHexText, { color: theme.colors.text.secondary }]}>
                {rgbToHex(rgbR, rgbG, rgbB).toUpperCase()}
              </Text>
            </View>

            {/* RGB Sliders */}
            <ScrollView 
              style={styles.slidersContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Red Slider */}
              <View style={styles.sliderSection}>
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
                  onValueChange={setRgbR}
                  minimumTrackTintColor="#ef4444"
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor="#ef4444"
                />
              </View>

              {/* Green Slider */}
              <View style={styles.sliderSection}>
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
                  onValueChange={setRgbG}
                  minimumTrackTintColor="#10b981"
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor="#10b981"
                />
              </View>

              {/* Blue Slider */}
              <View style={styles.sliderSection}>
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
                  onValueChange={setRgbB}
                  minimumTrackTintColor="#3b82f6"
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor="#3b82f6"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                onPress={() => {
                  setShowCustomColorPicker(false);
                  // On iOS, reopen the custom subject modal if it was open
                  if (Platform.OS === 'ios' && customSubjectName.trim()) {
                    setTimeout(() => {
                      setShowCustomSubjectModal(true);
                    }, 300);
                  }
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveCustomColor}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.inverse }]}>
                  Apply
                </Text>
              </Pressable>
            </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showCustomDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Select Date
            </Text>

            {Platform.OS !== 'web' ? (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                textColor={theme.colors.text.primary}
              />
            ) : (
              <View style={styles.webDatePicker}>
                {/* Calendar Header */}
                <View style={styles.calendarHeader}>
                  <Pressable onPress={() => handleMonthChange(-1)} style={styles.calendarNavButton}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
                  </Pressable>
                  <Text style={[styles.calendarMonth, { color: theme.colors.text.primary }]}>
                    {tempDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <Pressable onPress={() => handleMonthChange(1)} style={styles.calendarNavButton}>
                    <Ionicons name="chevron-forward" size={24} color={theme.colors.text.primary} />
                  </Pressable>
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {/* Day Headers */}
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <Text key={index} style={[styles.calendarDayHeader, { color: theme.colors.text.secondary }]}>
                      {day}
                    </Text>
                  ))}

                  {/* Calendar Days */}
                  {(() => {
                    const { firstDay, daysInMonth } = getDaysInMonth(tempDate);
                    const days = [];

                    // Empty cells for days before month starts
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
                    }

                    // Actual days
                    for (let day = 1; day <= daysInMonth; day++) {
                      const isSelected = day === tempDate.getDate();
                      days.push(
                        <Pressable
                          key={day}
                          onPress={() => handleDateSelect(day)}
                          style={[
                            styles.calendarDay,
                            isSelected && { backgroundColor: theme.colors.primary, borderRadius: 8 }
                          ]}
                        >
                          <Text style={[
                            styles.calendarDayText,
                            { color: isSelected ? theme.colors.text.inverse : theme.colors.text.primary }
                          ]}>
                            {day}
                          </Text>
                        </Pressable>
                      );
                    }

                    return days;
                  })()}
                </View>

                {/* Time Picker for Web - Simple Style */}
                <View style={[styles.webTimePicker, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.timePickerLabel, { color: theme.colors.text.secondary }]}>
                    Select Time
                  </Text>
                  
                  {/* Simple Row Layout */}
                  <View style={styles.simpleTimeRow}>
                    {/* Hour Input */}
                    <View style={styles.timeInputGroup}>
                      <Text style={[styles.timeInputLabel, { color: theme.colors.text.secondary }]}>Hour</Text>
                      <TextInput
                        style={[styles.simpleTimeInput, { 
                          backgroundColor: theme.colors.card, 
                          color: theme.colors.text.primary,
                          borderColor: theme.colors.border 
                        }]}
                        value={temp12Hour.toString()}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          setTemp12Hour(Math.min(12, Math.max(0, num)));
                        }}
                        onFocus={(e) => {
                          if (Platform.OS === 'web' && e.target && 'select' in e.target) {
                            (e.target as unknown as HTMLInputElement).select();
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="12"
                        placeholderTextColor={theme.colors.text.tertiary}
                      />
                    </View>

                    <Text style={[styles.simpleTimeSeparator, { color: theme.colors.text.primary }]}>:</Text>

                    {/* Minute Input */}
                    <View style={styles.timeInputGroup}>
                      <Text style={[styles.timeInputLabel, { color: theme.colors.text.secondary }]}>Minute</Text>
                      <TextInput
                        style={[styles.simpleTimeInput, { 
                          backgroundColor: theme.colors.card, 
                          color: theme.colors.text.primary,
                          borderColor: theme.colors.border 
                        }]}
                        value={tempMinute.toString()}
                        onChangeText={(text) => {
                          if (text === '') {
                            setTempMinute(0);
                            return;
                          }
                          const num = parseInt(text);
                          if (!isNaN(num)) {
                            setTempMinute(Math.min(59, Math.max(0, num)));
                          }
                        }}
                        onBlur={() => {
                          // Format with leading zero on blur if needed
                          if (tempMinute < 10) {
                            // Just trigger a re-render, the display stays as is
                          }
                        }}
                        onFocus={(e) => {
                          if (Platform.OS === 'web' && e.target && 'select' in e.target) {
                            (e.target as unknown as HTMLInputElement).select();
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                        placeholder="00"
                        placeholderTextColor={theme.colors.text.tertiary}
                      />
                    </View>

                    {/* AM/PM Selector */}
                    <View style={styles.timeInputGroup}>
                      <Text style={[styles.timeInputLabel, { color: theme.colors.text.secondary }]}>Period</Text>
                      <View style={styles.simpleAmPmButtons}>
                        <Pressable
                          style={[
                            styles.simpleAmPmButton,
                            { 
                              backgroundColor: tempAmPm === 'AM' ? theme.colors.primary : theme.colors.card,
                              borderColor: theme.colors.border 
                            }
                          ]}
                          onPress={() => setTempAmPm('AM')}
                        >
                          <Text style={[
                            styles.simpleAmPmButtonText,
                            { color: tempAmPm === 'AM' ? '#000' : theme.colors.text.primary }
                          ]}>
                            AM
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.simpleAmPmButton,
                            { 
                              backgroundColor: tempAmPm === 'PM' ? theme.colors.primary : theme.colors.card,
                              borderColor: theme.colors.border 
                            }
                          ]}
                          onPress={() => setTempAmPm('PM')}
                        >
                          <Text style={[
                            styles.simpleAmPmButtonText,
                            { color: tempAmPm === 'PM' ? '#000' : theme.colors.text.primary }
                          ]}>
                            PM
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                onPress={() => setShowCustomDatePicker(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveDate}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.inverse }]}>
                  {Platform.OS === 'web' ? 'Save' : 'Continue'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Time Picker Modal */}
      {Platform.OS !== 'web' && (
        <Modal
          visible={showCustomTimePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCustomTimePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Select Time
              </Text>

              <DateTimePicker
                value={new Date(date.getFullYear(), date.getMonth(), date.getDate(), tempHour, tempMinute)}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor={theme.colors.text.primary}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                  onPress={() => setShowCustomTimePicker(false)}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveTime}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text.inverse }]}>
                    Save
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Custom Alert */}
      {alertConfig && (
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left', // Left-align for consistency
    marginLeft: 8,
  },
  saveTextButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  // Title Input
  titleInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  // Grouped Card (Date & Time + Subject)
  groupedCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  groupedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  divider: {
    height: 1,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  selectRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginRight: 8,
    maxWidth: '40%',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectRowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  selectRowValue: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pickerContainer: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Reminders Button
  remindersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  remindersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  remindersIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remindersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  remindersSubtitle: {
    fontSize: 13,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  saveButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  saveButtonGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveGradientButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalKeyboardAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  customColorOption: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Custom Color Picker Styles
  colorPreviewSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  colorPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  colorHexText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  slidersContainer: {
    maxHeight: 300,
    marginBottom: 8,
  },
  sliderSection: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  // Web Calendar Styles
  webDatePicker: {
    width: '100%',
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  webTimePicker: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  simpleTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
  },
  timeInputGroup: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  timeInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  simpleTimeInput: {
    width: 60,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  simpleTimeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  simpleAmPmButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  simpleAmPmButton: {
    width: 45,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleAmPmButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
