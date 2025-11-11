export interface CustomSubjectCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  enabled: boolean;
  order: number;
  isDefaultOverride?: boolean; // If true, this overrides a default category
  defaultCategoryId?: string; // Reference to the default category being overridden
}

export type ExamType = 'Final' | 'Midterm' | 'Quiz' | 'Assignment' | 'Lab';

export type SubjectCategory =
  | 'Mathematics'
  | 'Science'
  | 'English'
  | 'History'
  | 'Computer Science'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Economics'
  | 'Psychology'
  | 'Engineering'
  | 'Business'
  | 'Arts'
  | 'Other';

export type ResourceType = 'youtube' | 'pdf' | 'link' | 'note' | 'file';

export interface Exam {
  id: string;
  title: string;
  date: string; // ISO string
  subjectCategory: SubjectCategory;
  examType: ExamType;
  notes?: string;
  customColor?: string; // Custom color for custom subjects
  reminders?: string[]; // e.g., ['1week', '1day', '1hour', '30min']
  notificationIds?: string[]; // Track scheduled notification IDs for cleanup
  notificationSound?: string; // Custom notification sound name
  createdAt: string;
  updatedAt: string;
}

export interface Resource {
  id: string;
  examId: string;
  type: ResourceType;
  title: string;
  url?: string;
  filePath?: string;
  notes?: string;
  order: number;
  createdAt: string;
}

export interface FocusSession {
  id: string;
  examId: string;
  startTime: string;
  endTime?: string;
  duration: number; // in seconds
  completedResources: string[]; // Resource IDs
  notes?: string;
}

export type ViewFilter = 'upcoming' | 'past' | 'all';
export type SortOption = 'date' | 'subject' | 'title';

export interface SubjectGrade {
  subject: string;
  gradeType: 'percentage' | 'letter';
  currentGrade: number; // 0-100 for percentage
  targetGrade: number;   // 0-100 for percentage
  currentLetter: string; // For display (A+, B, etc)
  targetLetter: string;  // For display
  progress: number;
}

export interface NotificationState {
  id: string;
  pinned: boolean;
  deleted: boolean;
  deletedAt?: string;
}

export interface Goals {
  goalType: 'grades' | 'hours';
  weeklyHours: number;
  studyDays: number;
  grades: SubjectGrade[];
  updatedAt: string;
}
