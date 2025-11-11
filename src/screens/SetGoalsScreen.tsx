import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, TextInput, Modal, KeyboardAvoidingView, Dimensions, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import { Goals, SubjectGrade as StoreSubjectGrade } from '../types';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<any, 'SetGoals'>;

interface SubjectGrade {
  subject: string;
  gradeType: 'letter' | 'percentage';
  currentGrade: string; // Can be letter (A+) or percentage (90)
  targetGrade: string;  // Can be letter (A+) or percentage (95)
  progress: number;
}

const GRADE_OPTIONS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F+', 'F'];
const PERCENTAGE_OPTIONS = ['100', '95', '90', '85', '80', '75', '70', '65', '60', '55', '50', '45', '40', '35', '30'];

// Helper function to convert letter grade to percentage (for progress calculation)
const letterGradeToPercentage = (letter: string): number => {
  const gradeMap: { [key: string]: number } = {
    'A+': 97, 'A': 93, 'B+': 87, 'B': 83, 'C+': 77, 'C': 73,
    'D+': 67, 'D': 63, 'F+': 57, 'F': 50,
  };
  return gradeMap[letter] || 0;
};

// Helper to parse percentage string to number
const parsePercentage = (value: string): number => {
  const num = parseFloat(value.replace('%', '').trim());
  return isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
};

export default function SetGoalsScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { setGoals, getGoals } = useStore();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';
  const isSmallScreen = width < 375;
  
  const [goalType, setGoalType] = useState<'grades' | 'hours'>('grades');
  const [weeklyHours, setWeeklyHours] = useState(20);
  const [grades, setGrades] = useState<SubjectGrade[]>([
    { subject: 'Mathematics', gradeType: 'letter', currentGrade: '', targetGrade: '', progress: 0 },
    { subject: 'Physics', gradeType: 'letter', currentGrade: '', targetGrade: '', progress: 0 },
  ]);
  const [currentHoursLogged, setCurrentHoursLogged] = useState(8);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Load existing goals on mount
  useEffect(() => {
    const existingGoals = getGoals();
    if (existingGoals) {
      setGoalType(existingGoals.goalType || 'grades');
      setWeeklyHours(existingGoals.weeklyHours || 20);
      
      // Convert stored grades to display format
      if (existingGoals.grades && existingGoals.grades.length > 0) {
        const displayGrades: SubjectGrade[] = existingGoals.grades.map((g: StoreSubjectGrade) => {
          const gradeType = g.gradeType || 'letter';
          const currentPercent = g.currentGrade || 0;
          const targetPercent = g.targetGrade || 0;
          
          // Display based on grade type
          const currentDisplay = gradeType === 'letter' 
            ? (g.currentLetter || '') 
            : (currentPercent > 0 ? `${Math.round(currentPercent)}` : '');
          const targetDisplay = gradeType === 'letter'
            ? (g.targetLetter || '')
            : (targetPercent > 0 ? `${Math.round(targetPercent)}` : '');
          
          // Calculate progress based on current vs target
          const progress = targetPercent > 0 
            ? Math.min(100, Math.max(0, (currentPercent / targetPercent) * 100))
            : 0;
          
          return {
            subject: g.subject,
            gradeType: gradeType,
            currentGrade: currentDisplay,
            targetGrade: targetDisplay,
            progress: Math.round(progress),
          };
        });
        setGrades(displayGrades);
      } else {
        // Reset to default if no grades exist
        setGrades([
          { subject: 'Mathematics', gradeType: 'letter', currentGrade: '', targetGrade: '', progress: 0 },
          { subject: 'Physics', gradeType: 'letter', currentGrade: '', targetGrade: '', progress: 0 },
        ]);
      }
    }
  }, []);

  const hoursProgress = (currentHoursLogged / weeklyHours) * 100;

  const getGradeAsPercentage = (grade: string, gradeType: 'letter' | 'percentage'): number => {
    if (gradeType === 'letter') {
      return letterGradeToPercentage(grade);
    } else {
      return parsePercentage(grade);
    }
  };

  const handleGradeChange = (index: number, value: string) => {
    const newGrades = [...grades];
    newGrades[index].targetGrade = value;
    // Recalculate progress
    if (newGrades[index].currentGrade) {
      const currentPercent = getGradeAsPercentage(newGrades[index].currentGrade, newGrades[index].gradeType);
      const targetPercent = getGradeAsPercentage(value, newGrades[index].gradeType);
      newGrades[index].progress = targetPercent > 0 
        ? Math.round(Math.min(100, Math.max(0, (currentPercent / targetPercent) * 100)))
        : 0;
    }
    setGrades(newGrades);
  };

  const handleCurrentGradeChange = (index: number, value: string) => {
    const newGrades = [...grades];
    newGrades[index].currentGrade = value;
    // Recalculate progress
    if (newGrades[index].targetGrade) {
      const currentPercent = getGradeAsPercentage(value, newGrades[index].gradeType);
      const targetPercent = getGradeAsPercentage(newGrades[index].targetGrade, newGrades[index].gradeType);
      newGrades[index].progress = targetPercent > 0 
        ? Math.round(Math.min(100, Math.max(0, (currentPercent / targetPercent) * 100)))
        : 0;
    }
    setGrades(newGrades);
  };

  const handleGradeTypeChange = (index: number) => {
    const newGrades = [...grades];
    const oldType = newGrades[index].gradeType;
    const newType = oldType === 'letter' ? 'percentage' : 'letter';
    newGrades[index].gradeType = newType;
    
    // Convert existing grades when switching types
    if (oldType === 'letter' && newType === 'percentage') {
      // Convert letter to percentage
      if (newGrades[index].currentGrade) {
        newGrades[index].currentGrade = `${letterGradeToPercentage(newGrades[index].currentGrade)}`;
      }
      if (newGrades[index].targetGrade) {
        newGrades[index].targetGrade = `${letterGradeToPercentage(newGrades[index].targetGrade)}`;
      }
    } else if (oldType === 'percentage' && newType === 'letter') {
      // Convert percentage to letter (approximate)
      const currentPercent = parsePercentage(newGrades[index].currentGrade);
      const targetPercent = parsePercentage(newGrades[index].targetGrade);
      
      // Find closest letter grade
      const findClosestLetter = (percent: number): string => {
        const options = GRADE_OPTIONS.map(letter => ({
          letter,
          percent: letterGradeToPercentage(letter),
        }));
        const closest = options.reduce((prev, curr) => 
          Math.abs(curr.percent - percent) < Math.abs(prev.percent - percent) ? curr : prev
        );
        return closest.letter;
      };
      
      if (newGrades[index].currentGrade) {
        newGrades[index].currentGrade = findClosestLetter(currentPercent);
      }
      if (newGrades[index].targetGrade) {
        newGrades[index].targetGrade = findClosestLetter(targetPercent);
      }
    }
    
    setGrades(newGrades);
  };

  const selectGrade = (index: number, grade: string, isCurrent: boolean) => {
    if (isCurrent) {
      handleCurrentGradeChange(index, grade);
    } else {
      handleGradeChange(index, grade);
    }
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAddSubject = () => {
    if (newSubjectName.trim()) {
      const newSubject: SubjectGrade = {
        subject: newSubjectName.trim(),
        gradeType: 'letter',
        currentGrade: '',
        targetGrade: '',
        progress: 0,
      };
      setGrades([...grades, newSubject]);
      setNewSubjectName('');
      setShowAddSubjectModal(false);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleEditSubject = (index: number) => {
    setEditingSubjectIndex(index);
    setNewSubjectName(grades[index].subject);
    setShowEditSubjectModal(true);
  };

  const handleSaveEditSubject = () => {
    if (editingSubjectIndex !== null && newSubjectName.trim()) {
      const updatedGrades = [...grades];
      updatedGrades[editingSubjectIndex].subject = newSubjectName.trim();
      setGrades(updatedGrades);
      setNewSubjectName('');
      setEditingSubjectIndex(null);
      setShowEditSubjectModal(false);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleDeleteSubject = (index: number) => {
    showAlert({
      title: 'Delete Subject',
      message: `Are you sure you want to delete "${grades[index].subject}"? This action cannot be undone.`,
      icon: 'alert-circle',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedGrades = grades.filter((_, i) => i !== index);
            setGrades(updatedGrades);
            
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ],
    });
  };

  const handleSaveGoals = async () => {
    try {
      // Convert display grades to store format
      const storeGrades: StoreSubjectGrade[] = grades.map((g) => {
        const currentPercent = getGradeAsPercentage(g.currentGrade, g.gradeType);
        const targetPercent = getGradeAsPercentage(g.targetGrade, g.gradeType);
        
        return {
          subject: g.subject,
          gradeType: g.gradeType,
          currentGrade: currentPercent,
          targetGrade: targetPercent,
          currentLetter: g.gradeType === 'letter' ? g.currentGrade : '',
          targetLetter: g.gradeType === 'letter' ? g.targetGrade : '',
          progress: g.progress,
        };
      });

      const goalsData: Goals = {
        goalType,
        weeklyHours,
        studyDays: 7, // Default to 7 days per week
        grades: storeGrades,
        updatedAt: new Date().toISOString(),
      };

      await setGoals(goalsData);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      showAlert({
        title: 'Goals Saved',
        message: 'Your goals have been saved successfully!',
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK', style: 'default', onPress: () => navigation.goBack() }],
      });
    } catch (error) {
      console.error('Error saving goals:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to save goals. Please try again.',
        icon: 'alert-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[
        styles.header, 
        { borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
        isSmallScreen && { paddingHorizontal: 16, paddingVertical: 12 },
      ]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[
          styles.headerTitle, 
          { color: theme.colors.text.primary },
          isSmallScreen && { fontSize: 18 },
        ]}>
          Set Your Goals
        </Text>
        <View style={{ width: isSmallScreen ? 40 : 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          isSmallScreen && { paddingHorizontal: 16, paddingTop: 20 },
          isTablet && { paddingHorizontal: Math.min(width * 0.1, 80), maxWidth: 1200, alignSelf: 'center', width: '100%' },
          isWeb && { maxWidth: 800, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
        key={goalType}
      >
        {/* Segmented Control */}
        <View style={[
          styles.segmentedContainer,
          isSmallScreen && { marginBottom: 20 },
        ]}>
          <View style={[
            styles.segmentedControl, 
            { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            isSmallScreen && { height: 48, padding: 4 },
          ]}>
            <Pressable
              style={[
                styles.segmentButton,
                goalType === 'grades' && { 
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                },
              ]}
              onPress={() => setGoalType('grades')}
            >
              <Ionicons 
                name="school" 
                size={isSmallScreen ? 16 : 18} 
                color={goalType === 'grades' ? theme.colors.background : theme.colors.text.secondary}
                style={{ marginRight: isSmallScreen ? 4 : 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: goalType === 'grades' ? theme.colors.background : theme.colors.text.secondary },
                  isSmallScreen && { fontSize: 14 },
                ]}
              >
                Grades
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                goalType === 'hours' && { 
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                },
              ]}
              onPress={() => setGoalType('hours')}
            >
              <Ionicons 
                name="time" 
                size={isSmallScreen ? 16 : 18} 
                color={goalType === 'hours' ? theme.colors.background : theme.colors.text.secondary}
                style={{ marginRight: isSmallScreen ? 4 : 6 }}
              />
              <Text
                style={[
                  styles.segmentText,
                  { color: goalType === 'hours' ? theme.colors.background : theme.colors.text.secondary },
                  isSmallScreen && { fontSize: 14 },
                ]}
              >
                Study Hours
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Target Grades Section - Only show when Grades tab is selected */}
        {goalType === 'grades' && (
          <View key="grades-section" style={styles.section}>
            {/* Add Subject Button */}
            <Pressable
              style={[
                styles.addSubjectButton,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
                isSmallScreen && { padding: 18 },
              ]}
              onPress={() => {
                setNewSubjectName('');
                setShowAddSubjectModal(true);
              }}
            >
              <View style={[styles.addSubjectIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="add" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.addSubjectText, { color: theme.colors.text.primary }]}>
                Add Subject
              </Text>
            </Pressable>

            {grades.map((grade, index) => (
              <View 
                key={`grade-${index}-${grade.subject}`} 
                style={[
                  styles.gradeCard, 
                  { 
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  },
                  isTablet && { padding: 28 },
                  isSmallScreen && { padding: 18 },
                ]}
              >
                <View style={styles.gradeInputContainer}>
                  <View style={styles.gradeHeader}>
                    <View style={styles.subjectHeader}>
                      <View style={[styles.subjectIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                        <Ionicons name="book" size={20} color={theme.colors.primary} />
                      </View>
                      <Text style={[styles.gradeLabel, { color: theme.colors.text.primary }]}>
                        {grade.subject}
                      </Text>
                    </View>
                    
                    {/* Action Buttons */}
                    <View style={styles.subjectActions}>
                      <Pressable
                        style={[styles.actionButton, { backgroundColor: `${theme.colors.primary}20` }]}
                        onPress={() => handleEditSubject(index)}
                      >
                        <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                      </Pressable>
                      <Pressable
                        style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}
                        onPress={() => handleDeleteSubject(index)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  </View>
                  
                  {/* Grade Type Toggle Button */}
                  <View style={styles.gradeTypeToggleContainer}>
                    <Pressable
                      style={[
                        styles.gradeTypeButton,
                        { 
                          backgroundColor: grade.gradeType === 'percentage' 
                            ? theme.colors.primary 
                            : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          shadowColor: grade.gradeType === 'percentage' ? theme.colors.primary : 'transparent',
                          shadowOffset: grade.gradeType === 'percentage' ? { width: 0, height: 2 } : { width: 0, height: 0 },
                          shadowOpacity: grade.gradeType === 'percentage' ? 0.2 : 0,
                          shadowRadius: grade.gradeType === 'percentage' ? 4 : 0,
                          elevation: grade.gradeType === 'percentage' ? 2 : 0,
                        },
                      ]}
                      onPress={() => handleGradeTypeChange(index)}
                    >
                      <Text
                        style={[
                          styles.gradeTypeText,
                          { 
                            color: grade.gradeType === 'percentage' 
                              ? theme.colors.background 
                              : theme.colors.text.secondary 
                          },
                        ]}
                      >
                        {grade.gradeType === 'percentage' ? '%' : 'Letter'}
                      </Text>
                    </Pressable>
                  </View>
                  
                  {/* Current Grade Section */}
                  <View style={styles.gradeSection}>
                    <View style={styles.gradeSectionHeader}>
                      <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                      <Text style={[styles.gradeSectionLabel, { color: theme.colors.text.secondary }]}>
                        Current Grade
                      </Text>
                    </View>
                    
                    {grade.gradeType === 'letter' ? (
                      <>
                        <View style={styles.gradeDisplayContainer}>
                          <Text style={[styles.gradeDisplay, { color: theme.colors.text.primary }]}>
                            {grade.currentGrade || '—'}
                          </Text>
                        </View>
                        
                        {/* Letter Grade Grid */}
                        <View style={[
                          styles.gradeGrid,
                          { gap: isSmallScreen ? 8 : isTablet ? 12 : 10 },
                        ]}>
                          {GRADE_OPTIONS.map((option) => {
                            const isSelected = grade.currentGrade === option;
                            // Calculate width: (container width - gaps) / number of items per row
                            // For 10 items, we want 5 per row on mobile, 6-7 on tablet
                            const itemsPerRow = isSmallScreen ? 5 : isTablet ? 6 : 5;
                            const gapSize = isSmallScreen ? 8 : isTablet ? 12 : 10;
                            // Account for: screen padding (16-20) + card padding (18-24) + card border
                            const screenPadding = isSmallScreen ? 32 : isTablet ? 40 : 40;
                            const cardPadding = isSmallScreen ? 36 : isTablet ? 56 : 48;
                            const availableWidth = width - screenPadding - cardPadding;
                            const totalGaps = (itemsPerRow - 1) * gapSize;
                            const itemWidth = Math.max(40, (availableWidth - totalGaps) / itemsPerRow);
                            
                            return (
                              <Pressable
                                key={option}
                                style={[
                                  styles.gradeGridItem,
                                  { 
                                    width: itemWidth,
                                    height: itemWidth,
                                    backgroundColor: isSelected 
                                      ? theme.colors.primary 
                                      : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                                    borderColor: isSelected 
                                      ? theme.colors.primary 
                                      : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
                                    shadowColor: isSelected ? theme.colors.primary : 'transparent',
                                    shadowOffset: isSelected ? { width: 0, height: 2 } : { width: 0, height: 0 },
                                    shadowOpacity: isSelected ? 0.3 : 0,
                                    shadowRadius: isSelected ? 4 : 0,
                                    elevation: isSelected ? 3 : 0,
                                  },
                                ]}
                                onPress={() => selectGrade(index, option, true)}
                              >
                                <Text
                                  style={[
                                    styles.gradeGridItemText,
                                    { color: isSelected ? theme.colors.background : theme.colors.text.primary },
                                    isSmallScreen && { fontSize: 14 },
                                    isTablet && { fontSize: 18 },
                                  ]}
                                >
                                  {option}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.percentageHeader}>
                          <Text style={[styles.percentageValue, { color: theme.colors.primary }]}>
                            {grade.currentGrade ? `${grade.currentGrade}%` : '0%'}
                          </Text>
                        </View>
                        
                        {/* Percentage Slider */}
                        <View style={styles.sliderContainer}>
                          <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={100}
                            step={1}
                            value={grade.currentGrade ? parseFloat(grade.currentGrade) : 0}
                            onValueChange={(value) => selectGrade(index, `${Math.round(value)}`, true)}
                            minimumTrackTintColor={theme.colors.primary}
                            maximumTrackTintColor={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                            thumbTintColor={theme.colors.primary}
                          />
                          <View style={styles.sliderLabels}>
                            <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>0%</Text>
                            <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>100%</Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Target Grade Section */}
                  <View style={[styles.gradeSection, { marginTop: 24 }]}>
                    <View style={styles.gradeSectionHeader}>
                      <Ionicons name="flag" size={18} color={theme.colors.primary} />
                      <Text style={[styles.gradeSectionLabel, { color: theme.colors.text.secondary }]}>
                        Target Grade
                      </Text>
                    </View>
                    
                    {grade.gradeType === 'letter' ? (
                      <>
                        <View style={styles.gradeDisplayContainer}>
                          <Text style={[styles.gradeDisplay, { color: theme.colors.text.primary }]}>
                            {grade.targetGrade || '—'}
                          </Text>
                        </View>
                        
                        {/* Letter Grade Grid */}
                        <View style={[
                          styles.gradeGrid,
                          { gap: isSmallScreen ? 8 : isTablet ? 12 : 10 },
                        ]}>
                          {GRADE_OPTIONS.map((option) => {
                            const isSelected = grade.targetGrade === option;
                            // Calculate width: (container width - gaps) / number of items per row
                            // For 10 items, we want 5 per row on mobile, 6-7 on tablet
                            const itemsPerRow = isSmallScreen ? 5 : isTablet ? 6 : 5;
                            const gapSize = isSmallScreen ? 8 : isTablet ? 12 : 10;
                            // Account for: screen padding (16-20) + card padding (18-24) + card border
                            const screenPadding = isSmallScreen ? 32 : isTablet ? 40 : 40;
                            const cardPadding = isSmallScreen ? 36 : isTablet ? 56 : 48;
                            const availableWidth = width - screenPadding - cardPadding;
                            const totalGaps = (itemsPerRow - 1) * gapSize;
                            const itemWidth = Math.max(40, (availableWidth - totalGaps) / itemsPerRow);
                            
                            return (
                              <Pressable
                                key={option}
                                style={[
                                  styles.gradeGridItem,
                                  { 
                                    width: itemWidth,
                                    height: itemWidth,
                                    backgroundColor: isSelected 
                                      ? theme.colors.primary 
                                      : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                                    borderColor: isSelected 
                                      ? theme.colors.primary 
                                      : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'),
                                    shadowColor: isSelected ? theme.colors.primary : 'transparent',
                                    shadowOffset: isSelected ? { width: 0, height: 2 } : { width: 0, height: 0 },
                                    shadowOpacity: isSelected ? 0.3 : 0,
                                    shadowRadius: isSelected ? 4 : 0,
                                    elevation: isSelected ? 3 : 0,
                                  },
                                ]}
                                onPress={() => selectGrade(index, option, false)}
                              >
                                <Text
                                  style={[
                                    styles.gradeGridItemText,
                                    { color: isSelected ? theme.colors.background : theme.colors.text.primary },
                                    isSmallScreen && { fontSize: 14 },
                                    isTablet && { fontSize: 18 },
                                  ]}
                                >
                                  {option}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.percentageHeader}>
                          <Text style={[styles.percentageValue, { color: theme.colors.primary }]}>
                            {grade.targetGrade ? `${grade.targetGrade}%` : '0%'}
                          </Text>
                        </View>
                        
                        {/* Percentage Slider */}
                        <View style={styles.sliderContainer}>
                          <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={100}
                            step={1}
                            value={grade.targetGrade ? parseFloat(grade.targetGrade) : 0}
                            onValueChange={(value) => selectGrade(index, `${Math.round(value)}`, false)}
                            minimumTrackTintColor={theme.colors.primary}
                            maximumTrackTintColor={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                            thumbTintColor={theme.colors.primary}
                          />
                          <View style={styles.sliderLabels}>
                            <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>0%</Text>
                            <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>100%</Text>
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* Progress Section */}
                <View style={[styles.progressContainer, {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }]}>
                  <View style={styles.progressHeader}>
                    <View style={styles.progressHeaderLeft}>
                      <Ionicons name="trending-up" size={16} color={theme.colors.primary} />
                      <Text style={[styles.progressLabel, { color: theme.colors.text.secondary }]}>Progress</Text>
                    </View>
                    <Text style={[styles.progressValue, { color: theme.colors.primary }]}>
                      {grade.progress}%
                    </Text>
                  </View>
                  <View style={[styles.progressTrack, { 
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { 
                          backgroundColor: theme.colors.primary, 
                          width: `${grade.progress}%`,
                          shadowColor: theme.colors.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                          elevation: 2,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Weekly Study Hours Section - Only show when Study Hours tab is selected */}
        {goalType === 'hours' && (
          <View key="hours-section" style={styles.section}>
            <View style={[
              styles.hoursCard, 
              { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              },
              isTablet && { padding: 32 },
              isSmallScreen && { padding: 20 },
            ]}>
              <View style={styles.hoursHeader}>
                <View style={styles.hoursHeaderLeft}>
                  <View style={[
                    styles.hoursIconContainer, 
                    { backgroundColor: `${theme.colors.primary}20` },
                    isSmallScreen && { width: 52, height: 52, marginRight: 14 },
                  ]}>
                    <Ionicons name="time" size={isSmallScreen ? 20 : 24} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.hoursLabel, 
                      { color: theme.colors.text.primary },
                      isSmallScreen && { fontSize: 18 },
                    ]}>
                      Weekly Study Target
                    </Text>
                    <Text style={[
                      styles.hoursSubLabel, 
                      { color: theme.colors.text.secondary },
                      isSmallScreen && { fontSize: 13 },
                    ]}>
                      Set your weekly goal
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.hoursValueContainer, 
                  { backgroundColor: `${theme.colors.primary}20` },
                  isSmallScreen && { paddingHorizontal: 18, paddingVertical: 10, minWidth: 70 },
                ]}>
                  <Text style={[
                    styles.hoursValue, 
                    { color: theme.colors.primary },
                    isSmallScreen && { fontSize: 30 },
                  ]}>
                    {weeklyHours}
                  </Text>
                  <Text style={[
                    styles.hoursUnit, 
                    { color: theme.colors.text.secondary },
                    isSmallScreen && { fontSize: 13 },
                  ]}>
                    hrs
                  </Text>
                </View>
              </View>

              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={40}
                  step={1}
                  value={weeklyHours}
                  onValueChange={setWeeklyHours}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                  thumbTintColor={theme.colors.primary}
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>1 hr</Text>
                  <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>40 hrs</Text>
                </View>
              </View>

              <View style={[styles.progressContainer, {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              }]}>
                <View style={styles.progressHeader}>
                  <View style={styles.progressHeaderLeft}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                    <Text style={[styles.progressLabel, { color: theme.colors.text.secondary }]}>
                      Current: {currentHoursLogged} hrs logged
                    </Text>
                  </View>
                  <Text style={[styles.progressValue, { color: theme.colors.primary }]}>
                    {Math.round(hoursProgress)}%
                  </Text>
                </View>
                <View style={[styles.progressTrack, { 
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { 
                        backgroundColor: theme.colors.primary, 
                        width: `${hoursProgress}%`,
                        shadowColor: theme.colors.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        elevation: 2,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={[
        styles.actionButtonsContainer, 
        { 
          backgroundColor: theme.colors.background,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        isSmallScreen && { padding: 16, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
      ]}>
        <Pressable
          style={[
            styles.cancelButton, 
            { 
              borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            },
            isSmallScreen && { height: 52 },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[
            styles.cancelButtonText, 
            { color: theme.colors.text.secondary },
            isSmallScreen && { fontSize: 16 },
          ]}>
            Cancel
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.saveButton, 
            { backgroundColor: theme.colors.primary },
            isSmallScreen && { height: 52 },
          ]}
          onPress={handleSaveGoals}
        >
          <Text style={[
            styles.saveButtonText, 
            { color: theme.colors.background },
            isSmallScreen && { fontSize: 16 },
          ]}>
            Save Goals
          </Text>
        </Pressable>
      </View>

      <CustomAlert
        visible={visible}
        title={alertConfig?.title || ''}
        message={alertConfig?.message}
        icon={alertConfig?.icon}
        iconColor={alertConfig?.iconColor}
        buttons={alertConfig?.buttons}
        onDismiss={hideAlert}
      />

      {/* Add Subject Modal */}
      <Modal
        visible={showAddSubjectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddSubjectModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}
          onPress={() => setShowAddSubjectModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoid}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                  Add Subject
                </Text>
                <Pressable onPress={() => setShowAddSubjectModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                </Pressable>
              </View>
              
              <View style={styles.modalBody}>
                <Text style={[styles.modalLabel, { color: theme.colors.text.secondary }]}>
                  Subject Name
                </Text>
                <View style={[
                  styles.modalInputWrapper,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                  },
                ]}>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: theme.colors.text.primary,
                      },
                      Platform.OS === 'web' && {
                        outlineStyle: 'none',
                        outlineWidth: 0,
                      } as any,
                    ]}
                    placeholder="Enter subject name"
                    placeholderTextColor={theme.colors.text.secondary}
                    value={newSubjectName}
                    onChangeText={setNewSubjectName}
                    autoFocus={true}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={[
                    styles.modalCancelButton,
                    { borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' },
                  ]}
                  onPress={() => setShowAddSubjectModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSaveButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleAddSubject}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>
                    Add
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Edit Subject Modal */}
      <Modal
        visible={showEditSubjectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditSubjectModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}
          onPress={() => setShowEditSubjectModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardAvoid}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                  Edit Subject
                </Text>
                <Pressable onPress={() => setShowEditSubjectModal(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
                </Pressable>
              </View>
              
              <View style={styles.modalBody}>
                <Text style={[styles.modalLabel, { color: theme.colors.text.secondary }]}>
                  Subject Name
                </Text>
                <View style={[
                  styles.modalInputWrapper,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
                  },
                ]}>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        color: theme.colors.text.primary,
                      },
                      Platform.OS === 'web' && {
                        outlineStyle: 'none',
                        outlineWidth: 0,
                      } as any,
                    ]}
                    placeholder="Enter subject name"
                    placeholderTextColor={theme.colors.text.secondary}
                    value={newSubjectName}
                    onChangeText={setNewSubjectName}
                    autoFocus={true}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={[
                    styles.modalCancelButton,
                    { borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)' },
                  ]}
                  onPress={() => setShowEditSubjectModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSaveButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleSaveEditSubject}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>
                    Save
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        minHeight: 60,
      },
    }),
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
    ...Platform.select({
      web: {
        fontSize: 22,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 140,
    ...Platform.select({
      web: {
        minHeight: '100%',
      },
    }),
  },
  segmentedContainer: {
    marginBottom: 24,
  },
  segmentedControl: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 20,
    padding: 5,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 8,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  gradeCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  gradeInputContainer: {
    marginBottom: 12,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  subjectActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  gradeLabel: {
    fontSize: 19,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  gradeTypeToggleContainer: {
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  gradeTypeButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 10,
    height: 40,
    borderWidth: 1.5,
    minWidth: 90,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gradeTypeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  gradeSection: {
    marginTop: 24,
  },
  gradeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  gradeSectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  gradeDisplayContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
  },
  gradeDisplay: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: 1,
    ...Platform.select({
      web: {
        fontSize: 64,
      },
    }),
  },
  gradeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gradeGridItem: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gradeGridItemText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  percentageHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  percentageValue: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 1,
    ...Platform.select({
      web: {
        fontSize: 56,
      },
    }),
  },
  sliderContainer: {
    paddingVertical: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 12,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
  },
  hoursCard: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  hoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  hoursHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hoursIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  hoursLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  hoursSubLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  hoursValueContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    minWidth: 90,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  hoursValue: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hoursUnit: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  sliderContainer: {
    paddingVertical: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  motivationalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginTop: 24,
  },
  motivationalText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 14,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 38 : 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: {
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
      },
    }),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  cancelButton: {
    flex: 1,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveButton: {
    flex: 1,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  addSubjectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
    borderRadius: 22,
    marginBottom: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  addSubjectIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  addSubjectText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalKeyboardAvoid: {
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        maxWidth: 500,
      },
    }),
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 28,
    padding: 28,
    ...Platform.select({
      web: {
        maxWidth: 500,
        padding: 32,
      },
    }),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 24,
      },
      web: {
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInputWrapper: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
      },
    }),
  },
  modalInput: {
    height: 58,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
        borderWidth: 0,
      },
    }),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  modalSaveButton: {
    flex: 1,
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
