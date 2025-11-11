import { differenceInDays, differenceInHours, format, isPast, isToday, isTomorrow } from 'date-fns';

export const getCountdownText = (examDate: string): string => {
  const now = new Date();
  const exam = new Date(examDate);

  if (isPast(exam)) {
    return 'Past';
  }

  if (isToday(exam)) {
    return 'Today!';
  }

  if (isTomorrow(exam)) {
    return 'Tomorrow';
  }

  const days = differenceInDays(exam, now);

  if (days === 0) {
    const hours = differenceInHours(exam, now);
    return `${hours}h`;
  }

  return `${days}d`;
};

export const getCountdownDetails = (examDate: string): string => {
  const now = new Date();
  const exam = new Date(examDate);

  if (isPast(exam)) {
    const daysPast = differenceInDays(now, exam);
    return `${daysPast} day${daysPast === 1 ? '' : 's'} ago`;
  }

  if (isToday(exam)) {
    const hours = differenceInHours(exam, now);
    return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  }

  if (isTomorrow(exam)) {
    return 'Tomorrow at ' + format(exam, 'h:mm a');
  }

  const days = differenceInDays(exam, now);
  return `in ${days} day${days === 1 ? '' : 's'}`;
};

export const formatExamDate = (examDate: string): string => {
  return format(new Date(examDate), 'EEE, MMM d, yyyy');
};

export const formatExamDateTime = (examDate: string): string => {
  return format(new Date(examDate), 'EEE, MMM d, yyyy • h:mm a');
};

export const isUpcoming = (examDate: string): boolean => {
  return !isPast(new Date(examDate));
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
