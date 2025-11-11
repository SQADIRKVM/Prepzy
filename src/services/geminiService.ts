import { GoogleGenerativeAI } from '@google/generative-ai';
import * as FileSystem from 'expo-file-system/legacy';
import { SubjectCategory, ExamType } from '../types';

// Initialize Gemini AI
// Get your API key from: https://makersuite.google.com/app/apikey
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

export interface ExtractedExamData {
  title: string;
  date: string; // ISO string
  subjectCategory: SubjectCategory;
  examType: ExamType;
  confidence: number; // 0-1
}

/**
 * Extract exam information from a timetable image using Google Gemini AI
 */
export const extractExamsFromImage = async (
  imageUri: string
): Promise<ExtractedExamData[]> => {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'Gemini API key not found. Please add EXPO_PUBLIC_GEMINI_API_KEY to your environment variables.'
    );
  }

  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Use gemini-2.5-pro for best OCR and vision capabilities
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

    // Read image as base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // Create the prompt for Gemini
    const prompt = `You are an AI assistant that extracts exam information from timetable images.

Analyze this exam timetable image and extract ALL exams you can find.

For each exam, provide:
1. **title**: The exam name (e.g., "Data Structures Final", "Calculus II Midterm")
2. **date**: The exam date in ISO format (YYYY-MM-DD). If time is visible, include it.
3. **subjectCategory**: Choose from: Mathematics, Science, English, History, Computer Science, Physics, Chemistry, Biology, Economics, Psychology, Engineering, Business, Arts, Other
4. **examType**: Choose from: Final, Midterm, Quiz, Assignment, Project, Other
5. **confidence**: How confident you are (0.0 to 1.0)

Return ONLY a valid JSON array with this exact structure:
[
  {
    "title": "string",
    "date": "YYYY-MM-DDTHH:mm:ss.000Z",
    "subjectCategory": "Computer Science",
    "examType": "Final",
    "confidence": 0.95
  }
]

Important rules:
- If the year is not visible, use the current year or next year if the month has passed
- If time is not visible, use 09:00:00 as default
- Be conservative with confidence scores
- Return empty array [] if no exams are found
- Ensure all dates are valid ISO strings
- Make educated guesses for subject category based on exam titles

Return ONLY the JSON array, no additional text.`;

    // Generate content with image
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    try {
      // Clean the response (remove markdown code blocks if present)
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\n?/g, '');
      }

      const extractedExams: ExtractedExamData[] = JSON.parse(cleanedText);

      // Validate and filter results
      return extractedExams
        .filter((exam) => {
          // Basic validation
          return (
            exam.title &&
            exam.date &&
            exam.subjectCategory &&
            exam.examType &&
            exam.confidence > 0.3 // Only keep high-confidence results
          );
        })
        .map((exam) => ({
          ...exam,
          // Ensure date is valid ISO string
          date: new Date(exam.date).toISOString(),
        }));
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      throw new Error('Failed to parse exam data from image. Please try a clearer image.');
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error);

    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorString = errorMessage.toLowerCase();

    // Check for API key errors
    if (errorString.includes('api key') || errorString.includes('api_key') || errorString.includes('invalid api key')) {
      throw new Error('API key not configured or invalid. Please check your Gemini API key.');
    }

    // Check for network errors
    if (
      errorString.includes('network request failed') ||
      errorString.includes('network') ||
      errorString.includes('fetch') ||
      errorString.includes('failed to fetch') ||
      errorString.includes('econnrefused') ||
      errorString.includes('timeout') ||
      errorString.includes('connection') ||
      errorString.includes('offline')
    ) {
      throw new Error('Network request failed. Please check your internet connection and try again.');
    }

    // Check for quota/rate limit errors
    if (errorString.includes('quota') || errorString.includes('rate limit') || errorString.includes('429')) {
      throw new Error('API quota exceeded. Please try again later.');
    }

    // Check for authentication errors
    if (errorString.includes('401') || errorString.includes('unauthorized') || errorString.includes('authentication')) {
      throw new Error('Authentication failed. Please check your API key.');
    }

    // Check for server errors
    if (errorString.includes('500') || errorString.includes('503') || errorString.includes('server error')) {
      throw new Error('Server error. Please try again later.');
    }

    // Generic error with original message
    throw new Error(`Failed to extract exams: ${errorMessage}`);
  }
};

/**
 * Fallback: Use mock data for testing when API key is not available
 */
export const getMockExtractedExams = (): ExtractedExamData[] => {
  return [
    {
      title: 'Data Structures Final',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      subjectCategory: 'Computer Science',
      examType: 'Final',
      confidence: 0.95,
    },
    {
      title: 'Calculus II Midterm',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      subjectCategory: 'Mathematics',
      examType: 'Midterm',
      confidence: 0.92,
    },
    {
      title: 'Physics Lab Quiz',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      subjectCategory: 'Physics',
      examType: 'Quiz',
      confidence: 0.88,
    },
  ];
};
