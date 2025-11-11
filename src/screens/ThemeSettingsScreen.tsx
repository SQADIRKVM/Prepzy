import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import Slider from '@react-native-community/slider';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<any, 'ThemeSettings'>;

const DEFAULT_PRIMARY_COLOR = '#19e65e'; // Default green
const DEFAULT_SECONDARY_COLOR = '#10B981'; // Default dark green

const PREDEFINED_COLORS = [
  { name: 'Green', color: '#19e65e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#8b5cf6' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Orange', color: '#f59e0b' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Amber', color: '#fbbf24' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Rose', color: '#f43f5e' },
];

export default function ThemeSettingsScreen({ navigation }: Props) {
  const { theme, isDark, themeMode, customPrimaryColor, customSecondaryColor, setCustomColors } = useTheme();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  
  // Temporary colors (not saved until user clicks Apply)
  const [tempPrimaryColor, setTempPrimaryColor] = useState(customPrimaryColor || DEFAULT_PRIMARY_COLOR);
  const [tempSecondaryColor, setTempSecondaryColor] = useState(customSecondaryColor || DEFAULT_SECONDARY_COLOR);
  
  // RGB values for custom color picker
  const [primaryRgbR, setPrimaryRgbR] = useState(25);
  const [primaryRgbG, setPrimaryRgbG] = useState(230);
  const [primaryRgbB, setPrimaryRgbB] = useState(94);
  
  const [secondaryRgbR, setSecondaryRgbR] = useState(16);
  const [secondaryRgbG, setSecondaryRgbG] = useState(185);
  const [secondaryRgbB, setSecondaryRgbB] = useState(129);

  // Check if there are unsaved changes
  const hasUnsavedChanges = 
    tempPrimaryColor !== (customPrimaryColor || DEFAULT_PRIMARY_COLOR) ||
    tempSecondaryColor !== (customSecondaryColor || DEFAULT_SECONDARY_COLOR);

  useEffect(() => {
    // Initialize temp colors from saved values
    setTempPrimaryColor(customPrimaryColor || DEFAULT_PRIMARY_COLOR);
    setTempSecondaryColor(customSecondaryColor || DEFAULT_SECONDARY_COLOR);
  }, [customPrimaryColor, customSecondaryColor]);

  useEffect(() => {
    if (showPrimaryPicker) {
      const color = tempPrimaryColor;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      setPrimaryRgbR(r);
      setPrimaryRgbG(g);
      setPrimaryRgbB(b);
    }
  }, [showPrimaryPicker, tempPrimaryColor]);

  useEffect(() => {
    if (showSecondaryPicker) {
      const color = tempSecondaryColor;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      setSecondaryRgbR(r);
      setSecondaryRgbG(g);
      setSecondaryRgbB(b);
    }
  }, [showSecondaryPicker, tempSecondaryColor]);

  const handlePrimaryColorSelect = (color: string) => {
    setTempPrimaryColor(color);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSecondaryColorSelect = (color: string) => {
    setTempSecondaryColor(color);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleResetColors = () => {
    setTempPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setTempSecondaryColor(DEFAULT_SECONDARY_COLOR);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const handleSavePrimaryCustomColor = () => {
    const hexColor = rgbToHex(primaryRgbR, primaryRgbG, primaryRgbB);
    setTempPrimaryColor(hexColor);
    setShowPrimaryPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveSecondaryCustomColor = () => {
    const hexColor = rgbToHex(secondaryRgbR, secondaryRgbG, secondaryRgbB);
    setTempSecondaryColor(hexColor);
    setShowSecondaryPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleApplyChanges = async () => {
    const primaryToSave = tempPrimaryColor === DEFAULT_PRIMARY_COLOR ? null : tempPrimaryColor;
    const secondaryToSave = tempSecondaryColor === DEFAULT_SECONDARY_COLOR ? null : tempSecondaryColor;
    
    await setCustomColors(primaryToSave, secondaryToSave);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showAlert({
      title: 'Theme Applied',
      message: 'Your theme colors have been saved successfully!',
      icon: 'checkmark-circle',
      iconColor: theme.colors.primary, // Use theme primary color
      buttons: [{ text: 'OK', style: 'default' }],
    });
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      showAlert({
        title: 'Discard Changes?',
        message: 'You have unsaved changes. Are you sure you want to discard them?',
        icon: 'warning',
        iconColor: theme.colors.status.warning,
        buttons: [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setTempPrimaryColor(customPrimaryColor || DEFAULT_PRIMARY_COLOR);
              setTempSecondaryColor(customSecondaryColor || DEFAULT_SECONDARY_COLOR);
            },
          },
        ],
      });
    } else {
      navigation.goBack();
    }
  };

  const currentPrimaryColor = tempPrimaryColor;
  const currentSecondaryColor = tempSecondaryColor;

  // Create preview theme for display
  const previewTheme = customPrimaryColor 
    ? require('../constants/modernTheme').createCustomTheme(
        isDark ? require('../constants/modernTheme').DarkTheme : require('../constants/modernTheme').LightTheme,
        tempPrimaryColor,
        tempSecondaryColor,
        isDark
      )
    : theme;

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
        <Pressable onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Theme Settings
        </Text>
        <View style={{ width: 48 }} />
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
        {/* Theme Mode Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            APPEARANCE
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${theme.colors.primary}20` },
                  ]}
                >
                  <Ionicons name={isDark ? 'moon' : 'sunny'} size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>
                    Dark Mode
                  </Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.text.secondary }]}>
                    {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
                  </Text>
                </View>
              </View>
              <ThemeToggle />
            </View>
          </View>
        </View>

        {/* Primary Color Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            PRIMARY COLOR
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {/* Current Color Display */}
            <View style={styles.currentColorSection}>
              <View style={styles.currentColorInfo}>
                <View
                  style={[
                    styles.colorPreviewLarge,
                    { backgroundColor: currentPrimaryColor },
                  ]}
                />
                <View style={styles.currentColorText}>
                  <Text style={[styles.currentColorLabel, { color: theme.colors.text.primary }]}>
                    Primary Color
                  </Text>
                  <Text style={[styles.currentColorHex, { color: theme.colors.text.secondary }]}>
                    {currentPrimaryColor.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Predefined Colors */}
            <View style={styles.predefinedSection}>
              <Text style={[styles.subsectionTitle, { color: theme.colors.text.secondary }]}>
                Preset Colors
              </Text>
              <View style={styles.predefinedColorsGrid}>
                {PREDEFINED_COLORS.map((item) => (
                  <Pressable
                    key={item.color}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: item.color,
                        borderColor: currentPrimaryColor === item.color ? theme.colors.text.primary : 'transparent',
                        borderWidth: currentPrimaryColor === item.color ? 3 : 0,
                      },
                    ]}
                    onPress={() => handlePrimaryColorSelect(item.color)}
                  >
                    {currentPrimaryColor === item.color && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Custom Color Picker */}
            <Pressable
              style={[
                styles.customColorButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowPrimaryPicker(true)}
            >
              <View style={[styles.colorPreview, { backgroundColor: currentPrimaryColor }]} />
              <Text style={[styles.customColorText, { color: theme.colors.text.primary }]}>
                Custom Color
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        {/* Secondary Color Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            SECONDARY COLOR
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {/* Current Color Display */}
            <View style={styles.currentColorSection}>
              <View style={styles.currentColorInfo}>
                <View
                  style={[
                    styles.colorPreviewLarge,
                    { backgroundColor: currentSecondaryColor },
                  ]}
                />
                <View style={styles.currentColorText}>
                  <Text style={[styles.currentColorLabel, { color: theme.colors.text.primary }]}>
                    Secondary Color
                  </Text>
                  <Text style={[styles.currentColorHex, { color: theme.colors.text.secondary }]}>
                    {currentSecondaryColor.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Predefined Colors */}
            <View style={styles.predefinedSection}>
              <Text style={[styles.subsectionTitle, { color: theme.colors.text.secondary }]}>
                Preset Colors
              </Text>
              <View style={styles.predefinedColorsGrid}>
                {PREDEFINED_COLORS.map((item) => (
                  <Pressable
                    key={`secondary-${item.color}`}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: item.color,
                        borderColor: currentSecondaryColor === item.color ? theme.colors.text.primary : 'transparent',
                        borderWidth: currentSecondaryColor === item.color ? 3 : 0,
                      },
                    ]}
                    onPress={() => handleSecondaryColorSelect(item.color)}
                  >
                    {currentSecondaryColor === item.color && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Custom Color Picker */}
            <Pressable
              style={[
                styles.customColorButton,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={() => setShowSecondaryPicker(true)}
            >
              <View style={[styles.colorPreview, { backgroundColor: currentSecondaryColor }]} />
              <Text style={[styles.customColorText, { color: theme.colors.text.primary }]}>
                Custom Color
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        {/* Reset Button */}
        {(tempPrimaryColor !== DEFAULT_PRIMARY_COLOR || tempSecondaryColor !== DEFAULT_SECONDARY_COLOR) && (
          <View style={styles.section}>
            <Pressable
              style={[styles.resetButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              onPress={handleResetColors}
            >
              <Ionicons name="refresh" size={20} color={theme.colors.text.secondary} />
              <Text style={[styles.resetButtonText, { color: theme.colors.text.secondary }]}>
                Reset to Default Colors
              </Text>
            </Pressable>
          </View>
        )}

        {/* Theme Preview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            PREVIEW
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: previewTheme.colors.primary,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.previewTitle, { color: previewTheme.colors.text.inverse }]}>
                  Sample Card
                </Text>
                <Text style={[styles.previewText, { color: previewTheme.colors.text.inverse }]}>
                  This is how your app looks with {themeMode} theme
                  {(tempPrimaryColor !== DEFAULT_PRIMARY_COLOR || tempSecondaryColor !== DEFAULT_SECONDARY_COLOR) && ' and custom colors'}
                </Text>
                <View style={[styles.previewSecondary, { backgroundColor: previewTheme.colors.secondary }]}>
                  <Text style={[styles.previewSecondaryText, { color: previewTheme.colors.text.inverse }]}>
                    Secondary Color Preview
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={[styles.infoCard, { backgroundColor: `${theme.colors.primary}15` }]}>
            <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
              {hasUnsavedChanges 
                ? 'You have unsaved changes. Tap "Apply Changes" to save your theme.'
                : 'Tap "Apply Changes" to save your theme preferences.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Apply Changes Button */}
      {hasUnsavedChanges && (
        <View style={[styles.applyButtonContainer, { backgroundColor: theme.colors.background }]}>
          <Pressable
            style={[styles.applyButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleApplyChanges}
          >
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.text.inverse} />
            <Text style={[styles.applyButtonText, { color: theme.colors.text.inverse }]}>
              Apply Changes
            </Text>
          </Pressable>
        </View>
      )}

      {/* Primary Color Picker Modal */}
      <Modal
        visible={showPrimaryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrimaryPicker(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Custom Primary Color
              </Text>
              <Pressable onPress={() => setShowPrimaryPicker(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.colorPreviewSection}>
                <View style={[styles.colorPreviewBox, { backgroundColor: rgbToHex(primaryRgbR, primaryRgbG, primaryRgbB) }]} />
                <Text style={[styles.hexText, { color: theme.colors.text.primary }]}>
                  {rgbToHex(primaryRgbR, primaryRgbG, primaryRgbB).toUpperCase()}
                </Text>
              </View>
              <View style={styles.sliderSection}>
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                    Red: {Math.round(primaryRgbR)}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={primaryRgbR}
                    onValueChange={setPrimaryRgbR}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.primary}
                  />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                    Green: {Math.round(primaryRgbG)}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={primaryRgbG}
                    onValueChange={setPrimaryRgbG}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.primary}
                  />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                    Blue: {Math.round(primaryRgbB)}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={primaryRgbB}
                    onValueChange={setPrimaryRgbB}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.primary}
                  />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setShowPrimaryPicker(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSavePrimaryCustomColor}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.inverse }]}>
                  Apply
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Secondary Color Picker Modal */}
      <Modal
        visible={showSecondaryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSecondaryPicker(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Custom Secondary Color
              </Text>
              <Pressable onPress={() => setShowSecondaryPicker(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.colorPreviewSection}>
                <View style={[styles.colorPreviewBox, { backgroundColor: rgbToHex(secondaryRgbR, secondaryRgbG, secondaryRgbB) }]} />
                <Text style={[styles.hexText, { color: theme.colors.text.primary }]}>
                  {rgbToHex(secondaryRgbR, secondaryRgbG, secondaryRgbB).toUpperCase()}
                </Text>
              </View>
              <View style={styles.sliderSection}>
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                    Red: {Math.round(secondaryRgbR)}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={secondaryRgbR}
                    onValueChange={setSecondaryRgbR}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.primary}
                  />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                    Green: {Math.round(secondaryRgbG)}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={secondaryRgbG}
                    onValueChange={setSecondaryRgbG}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.primary}
                  />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={[styles.sliderLabel, { color: theme.colors.text.secondary }]}>
                    Blue: {Math.round(secondaryRgbB)}
                  </Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={255}
                    value={secondaryRgbB}
                    onValueChange={setSecondaryRgbB}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.border}
                    thumbTintColor={theme.colors.primary}
                  />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setShowSecondaryPicker(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSaveSecondaryCustomColor}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.inverse }]}>
                  Apply
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  currentColorSection: {
    marginBottom: 20,
  },
  currentColorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorPreviewLarge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  currentColorText: {
    flex: 1,
  },
  currentColorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentColorHex: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  predefinedSection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  predefinedColorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customColorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  customColorText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewCard: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 12,
  },
  previewSecondary: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  previewSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  applyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    maxHeight: 500,
    padding: 20,
  },
  colorPreviewSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  colorPreviewBox: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  hexText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sliderSection: {
    gap: 20,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  saveButton: {
    backgroundColor: '#19e65e',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
