import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { ResourceType } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';

type Props = NativeStackScreenProps<any, 'AddResource'>;

export default function AddResourceScreen({ navigation, route }: Props) {
  const { theme, isDark } = useTheme();
  const { examId, resourceId } = route.params || {};
  const { addResource, updateResource, deleteResource, getResourcesByExamId } = useStore();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();

  const [type, setType] = useState<ResourceType>('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const isEditing = !!resourceId;

  useEffect(() => {
    if (resourceId) {
      const resources = getResourcesByExamId(examId);
      const resource = resources.find((r) => r.id === resourceId);
      if (resource) {
        setType(resource.type);
        setTitle(resource.title);
        setUrl(resource.url || '');
        setNotes(resource.notes || '');
      }
    }
  }, [resourceId, examId]);

  const handleSave = () => {
    if (!title.trim()) {
      showAlert({
        title: 'Validation Error',
        message: 'Please enter a title',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    const resourceData = {
      examId,
      type,
      title: title.trim(),
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
      order: isEditing ? 0 : getResourcesByExamId(examId).length,
    };

    if (isEditing && resourceId) {
      updateResource(resourceId, resourceData);
    } else {
      addResource(resourceData);
    }

    navigation.goBack();
  };

  const handleDelete = () => {
    if (resourceId) {
      deleteResource(resourceId);
      navigation.goBack();
    }
  };

  const confirmDelete = () => {
    showAlert({
      title: 'Delete Resource',
      message: 'Are you sure you want to delete this resource?',
      icon: 'trash',
      iconColor: '#FFB4A0',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDelete,
        },
      ],
    });
  };

  const resourceTypes: { type: ResourceType; label: string; icon: string }[] = [
    { type: 'link', label: 'Link', icon: 'link' },
    { type: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
    { type: 'pdf', label: 'PDF', icon: 'document-text' },
    { type: 'note', label: 'Note', icon: 'create' },
    { type: 'file', label: 'File', icon: 'folder' },
  ];

  const getResourceDescription = () => {
    switch (type) {
      case 'youtube':
        return 'Perfect for video lectures and tutorials';
      case 'pdf':
        return 'Great for textbooks and lecture slides';
      case 'link':
        return 'Useful for articles and online resources';
      case 'note':
        return 'Quick notes and study tips';
      case 'file':
        return 'Add file URL or path (local file upload coming soon)';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && ({ height: '100vh' as any, overflow: 'hidden' as any })
      ]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
            {isEditing ? 'Update your study material' : 'Add study materials to this exam'}
          </Text>
          {isEditing && (
            <Pressable
              style={styles.deleteButton}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.status.error} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && ({
            flex: 1,
            overflowY: 'auto' as any,
            overflowX: 'hidden' as any,
            WebkitOverflowScrolling: 'touch' as any,
          } as any)
        ]}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'web' && { minHeight: '100%', paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Resource Type
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
            {getResourceDescription()}
          </Text>
        </View>

        {/* Resource Type Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typePillsContainer}
          style={styles.typePillsScroll}
        >
          {resourceTypes.map((item) => (
            <Pressable
              key={item.type}
              style={[
                styles.typePill,
                {
                  backgroundColor: type === item.type
                    ? theme.colors.primary
                    : theme.colors.card,
                  borderColor: type === item.type ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setType(item.type)}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={type === item.type ? theme.colors.text.inverse : theme.colors.text.secondary}
              />
              <Text
                style={[
                  styles.typePillText,
                  {
                    color: type === item.type
                      ? theme.colors.text.inverse
                      : theme.colors.text.secondary,
                  },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Resource Details
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* Title Field */}
          <View style={styles.formField}>
            <View style={styles.fieldHeader}>
              <Ionicons name="text-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.fieldLabel, { color: theme.colors.text.primary }]}>
                Title
              </Text>
            </View>
            <TextInput
              style={[
                styles.fieldInput,
                {
                  backgroundColor: isDark ? theme.colors.surface : theme.colors.background,
                  color: theme.colors.text.primary,
                  borderColor: theme.colors.border,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Lecture Notes Chapter 5"
              placeholderTextColor={theme.colors.text.tertiary}
            />
          </View>

          {/* URL Field (conditional) */}
          {(type === 'link' || type === 'youtube' || type === 'pdf') && (
            <View style={[styles.formField, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
              <View style={styles.fieldHeader}>
                <Ionicons name="link-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.fieldLabel, { color: theme.colors.text.primary }]}>
                  URL
                </Text>
              </View>
              <TextInput
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: isDark ? theme.colors.surface : theme.colors.background,
                    color: theme.colors.text.primary,
                    borderColor: theme.colors.border,
                  },
                ]}
                value={url}
                onChangeText={setUrl}
                placeholder={
                  type === 'youtube'
                    ? 'https://youtube.com/watch?v=...'
                    : type === 'pdf'
                    ? 'https://example.com/document.pdf'
                    : 'https://example.com'
                }
                placeholderTextColor={theme.colors.text.tertiary}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Notes Field */}
          <View style={[styles.formField, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <View style={styles.fieldHeader}>
              <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.fieldLabel, { color: theme.colors.text.primary }]}>
                Notes
              </Text>
              <Text style={[styles.fieldOptional, { color: theme.colors.text.tertiary }]}>
                (Optional)
              </Text>
            </View>
            <TextInput
              style={[
                styles.fieldTextArea,
                {
                  backgroundColor: isDark ? theme.colors.surface : theme.colors.background,
                  color: theme.colors.text.primary,
                  borderColor: theme.colors.border,
                },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this resource..."
              placeholderTextColor={theme.colors.text.tertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Info Banner for File Type */}
        {type === 'file' && (
          <View style={[styles.infoBanner, { backgroundColor: `${theme.colors.status.info}10`, borderColor: theme.colors.status.info }]}>
            <Ionicons name="information-circle" size={18} color={theme.colors.status.info} />
            <Text style={[styles.infoBannerText, { color: theme.colors.text.secondary }]}>
              You can add file URLs or paths. Local file upload will be available in a future update.
            </Text>
          </View>
        )}

        {/* Quick Tips Card */}
        <View style={[styles.tipsCard, { backgroundColor: `${theme.colors.primary}08`, borderColor: `${theme.colors.primary}20` }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.tipsTitle, { color: theme.colors.primary }]}>
              Quick Tips
            </Text>
          </View>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
                Use descriptive titles to find resources quickly
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
                Add notes to remember why this resource is important
              </Text>
            </View>
            <View style={styles.tipItem}>
              <View style={[styles.tipBullet, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
                Group similar resources together for better organization
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer Save Button */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.background,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <Pressable onPress={handleSave} style={styles.saveButtonWrapper}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.saveButton, theme.shadows.md]}
          >
            <Text style={[styles.saveButtonText, { color: theme.colors.text.inverse }]}>
              {isEditing ? 'Update Resource' : 'Save Resource'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  headerSubtitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  // Section Headers
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  sectionDescription: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    opacity: 0.8,
  },
  // Type Pills
  typePillsScroll: {
    marginBottom: 24,
  },
  typePillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Form Card
  formCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formField: {
    padding: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  fieldOptional: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  fieldInput: {
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  fieldTextArea: {
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 120,
  },
  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  // Tips Card
  tipsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  saveButtonWrapper: {
    width: '100%',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
