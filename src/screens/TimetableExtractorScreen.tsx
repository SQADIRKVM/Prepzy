import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { ExamType, SubjectCategory } from '../types';
import { useTheme } from '../context/ThemeContext';
import { extractExamsFromImage } from '../services/geminiService';
import * as Haptics from 'expo-haptics';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';

type Props = NativeStackScreenProps<any, 'TimetableExtractor'>;

interface ExtractedExam {
  title: string;
  date: string;
  time?: string;
  subjectCategory: SubjectCategory;
  examType: ExamType;
  confidence?: number;
}

export default function TimetableExtractorScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { addExam } = useStore();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedExams, setExtractedExams] = useState<ExtractedExam[]>([]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: 'Permission Required',
        message: 'Camera permission is needed to take photos of your timetable.',
        icon: 'camera',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const extracted = await extractExamsFromImage(uri);

      if (extracted.length === 0) {
        setIsProcessing(false);
        showAlert({
          title: 'No Exams Found',
          message: 'Could not find any exam information in the image. Please try with a clearer image or ensure the timetable is clearly visible.',
          icon: 'search',
          buttons: [
            { text: 'Try Again', onPress: () => setImageUri(null), style: 'default' },
            { text: 'Cancel', style: 'cancel' },
          ],
        });
        return;
      }

      setExtractedExams(extracted.map(exam => ({
        ...exam,
        time: exam.time || '09:00 AM',
      })));
      setIsProcessing(false);
    } catch (error: any) {
      console.error('Error processing image:', error);
      setIsProcessing(false);

      const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
      const isNetworkError = 
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('timeout');

      const isAPIKeyError = errorMessage.includes('API key') || errorMessage.includes('API_KEY');

      if (isAPIKeyError) {
        showAlert({
          title: 'API Key Required',
          message: 'Gemini API key not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your environment variables to use this feature.',
          icon: 'key',
          buttons: [
            { text: 'OK', onPress: () => setImageUri(null), style: 'default' },
          ],
        });
      } else if (isNetworkError) {
        showAlert({
          title: 'Network Error',
          message: 'Unable to connect to the AI service. Please check your internet connection and try again.',
          icon: 'wifi-outline',
          buttons: [
            { text: 'Cancel', onPress: () => setImageUri(null), style: 'cancel' },
            {
              text: 'Try Again',
              onPress: () => {
                // Keep the image URI and retry
                setTimeout(() => processImage(uri), 500);
              },
              style: 'default',
            },
          ],
        });
      } else {
        showAlert({
          title: 'Extraction Failed',
          message: 'Failed to extract exam data from the image. Please try again with a clearer image.',
          icon: 'close-circle',
          buttons: [
            { text: 'Cancel', onPress: () => setImageUri(null), style: 'cancel' },
            {
              text: 'Try Again',
              onPress: () => {
                // Keep the image URI and retry
                setTimeout(() => processImage(uri), 500);
              },
              style: 'default',
            },
          ],
        });
      }
    }
  };

  const updateExam = (index: number, field: keyof ExtractedExam, value: string) => {
    const newExams = [...extractedExams];
    newExams[index] = { ...newExams[index], [field]: value };
    setExtractedExams(newExams);
  };

  const handleAddAnother = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newExam: ExtractedExam = {
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '09:00 AM',
      subjectCategory: 'Science',
      examType: 'Midterm',
    };
    setExtractedExams([...extractedExams, newExam]);
  };

  const handleDeleteExam = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showAlert({
      title: 'Delete Exam',
      message: 'Are you sure you want to remove this exam from the list?',
      icon: 'trash',
      iconColor: '#FFB4A0',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newExams = extractedExams.filter((_, i) => i !== index);
            setExtractedExams(newExams);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    });
  };

  const handleImportExams = () => {
    if (extractedExams.length === 0) {
      showAlert({
        title: 'No Exams',
        message: 'Please add at least one exam to import.',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    extractedExams.forEach((exam) => {
      if (exam.title.trim()) {
        addExam({
          title: exam.title,
          date: exam.date,
          subjectCategory: exam.subjectCategory,
          examType: exam.examType,
        });
      }
    });

    showAlert({
      title: 'Success',
      message: `${extractedExams.filter(e => e.title.trim()).length} exam${extractedExams.length === 1 ? '' : 's'} imported successfully!`,
      icon: 'checkmark-circle',
      buttons: [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
          style: 'default',
        },
      ],
    });
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          AI Timetable Extractor
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && {
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'web' && { minHeight: '100%', paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
          Upload or scan your exam timetable to automatically add it to your schedule.
        </Text>

        {/* Button Group */}
        <View style={styles.buttonGroup}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.colors.card }]}
            onPress={handleTakePhoto}
          >
            <Ionicons name="camera" size={24} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
              Scan
            </Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: theme.colors.card }]}
            onPress={handlePickImage}
          >
            <Ionicons name="images" size={24} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
              Upload
            </Text>
          </Pressable>
        </View>

        {/* Image Preview Area */}
        {!imageUri ? (
          <View style={[styles.imagePreviewEmpty, { borderColor: theme.colors.border }]}>
            <Ionicons name="image-outline" size={48} color={theme.colors.text.tertiary} />
            <View style={styles.emptyPreviewText}>
              <Text style={[styles.emptyPreviewTitle, { color: theme.colors.text.primary }]}>
                Image Preview
              </Text>
              <Text style={[styles.emptyPreviewSubtitle, { color: theme.colors.text.tertiary }]}>
                Select an image to see a preview here
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.imagePreviewFilled, { borderColor: `${theme.colors.primary}80` }]}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            {isProcessing && (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.analyzingText, { color: theme.colors.primary }]}>
                  Analyzing image...
                </Text>
              </View>
            )}
          </View>
        )}

        {/* How it Works Section */}
        {!imageUri && extractedExams.length === 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              How It Works
            </Text>

            <View style={[styles.stepsContainer, { backgroundColor: theme.colors.card }]}>
              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.text.inverse }]}>
                    1
                  </Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                    Capture or Upload
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                    Take a photo or select an image of your exam timetable
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.text.inverse }]}>
                    2
                  </Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                    AI Extraction
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                    Our AI automatically extracts exam details from your image
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.text.inverse }]}>
                    3
                  </Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                    Review & Edit
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                    Review extracted data and make any necessary adjustments
                  </Text>
                </View>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[styles.stepNumberText, { color: theme.colors.text.inverse }]}>
                    4
                  </Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.colors.text.primary }]}>
                    Import
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.text.secondary }]}>
                    Import all exams to your schedule with one tap
                  </Text>
                </View>
              </View>
            </View>

            {/* Tips Section */}
            <View style={[styles.tipsCard, { backgroundColor: `${theme.colors.status.info}10`, borderColor: `${theme.colors.status.info}30` }]}>
              <View style={styles.tipsHeader}>
                <Ionicons name="bulb" size={20} color={theme.colors.status.info} />
                <Text style={[styles.tipsTitle, { color: theme.colors.status.info }]}>
                  Pro Tips
                </Text>
              </View>
              <View style={styles.tipsList}>
                <View style={styles.tipRow}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.status.info} />
                  <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
                    Ensure good lighting for best results
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.status.info} />
                  <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
                    Keep the timetable flat and in focus
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.status.info} />
                  <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
                    You can edit any extracted information before importing
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Extracted Exam Details Section */}
        {!isProcessing && extractedExams.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Extracted Exam Details
            </Text>

            <View style={styles.examsContainer}>
              {extractedExams.map((exam, index) => (
                <View
                  key={index}
                  style={[styles.examCard, { backgroundColor: theme.colors.card }]}
                >
                  {/* Card Header with Delete Button */}
                  <View style={styles.examCardHeader}>
                    <Text style={[styles.examCardTitle, { color: theme.colors.text.primary }]}>
                      Exam {index + 1}
                    </Text>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDeleteExam(index)}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.status.error} />
                    </Pressable>
                  </View>

                  {/* Subject Name */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text.tertiary }]}>
                      Subject Name
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text.primary,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      value={exam.title}
                      onChangeText={(value) => updateExam(index, 'title', value)}
                      placeholder="Enter subject name"
                      placeholderTextColor={theme.colors.text.tertiary}
                    />
                  </View>

                  {/* Date and Time Row */}
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text.tertiary }]}>
                        Exam Date
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.text.primary,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        value={new Date(exam.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        placeholder="Dec 12, 2024"
                        placeholderTextColor={theme.colors.text.tertiary}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text.tertiary }]}>
                        Time
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            backgroundColor: theme.colors.surface,
                            color: theme.colors.text.primary,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        value={exam.time || '09:00 AM'}
                        onChangeText={(value) => updateExam(index, 'time', value)}
                        placeholder="09:00 AM"
                        placeholderTextColor={theme.colors.text.tertiary}
                      />
                    </View>
                  </View>
                </View>
              ))}

              {/* Add Another Exam Button */}
              <Pressable
                style={[
                  styles.addAnotherButton,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={handleAddAnother}
              >
                <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
                <Text style={[styles.addAnotherText, { color: theme.colors.primary }]}>
                  Add Another Exam
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Spacer for floating button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating CTA Button */}
      {extractedExams.length > 0 && !isProcessing && (
        <View style={[styles.floatingFooter, { backgroundColor: `${theme.colors.background}CC` }]}>
          <Pressable
            style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleImportExams}
          >
            <Text style={[styles.ctaButtonText, { color: theme.colors.text.inverse }]}>
              Import {extractedExams.filter(e => e.title.trim()).length} Exam{extractedExams.filter(e => e.title.trim()).length === 1 ? '' : 's'}
            </Text>
          </Pressable>
        </View>
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  imagePreviewEmpty: {
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  emptyPreviewText: {
    alignItems: 'center',
    gap: 4,
  },
  emptyPreviewTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyPreviewSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  imagePreviewFilled: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 8,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  analyzingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  analyzingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 16,
  },
  examsContainer: {
    gap: 16,
  },
  examCard: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  examCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  examCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
  },
  addAnotherText: {
    fontSize: 16,
    fontWeight: '700',
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  ctaButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepsContainer: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipsCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  tipsList: {
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
