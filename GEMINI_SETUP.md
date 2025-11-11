# Google Gemini AI Setup Guide

## Overview

The app now uses **Google Gemini AI** to extract exam information from timetable images! This replaces the mock OCR with real AI-powered vision and text extraction.

## Features

- 🤖 AI-powered exam extraction from photos
- 📸 Analyzes timetable images using Gemini Vision
- 📅 Automatically extracts: title, date, subject, exam type
- ✨ Smart categorization based on exam names
- 🎯 Confidence scoring for each extraction
- 🔄 Fallback to mock data if API unavailable

---

## Quick Setup (5 minutes)

### Step 1: Get Your Free Gemini API Key

1. Visit: **https://makersuite.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key (it looks like: `AIzaSy...`)

### Step 2: Add API Key to Your Project

#### Option A: Using .env file (Recommended)

1. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API key:
```bash
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyYourActualKeyHere
```

3. Restart the Expo dev server:
```bash
npm start
```

#### Option B: Hardcode (For Testing Only)

Edit `src/services/geminiService.ts`:
```typescript
const GEMINI_API_KEY = 'AIzaSyYourActualKeyHere';
```

⚠️ **Warning**: Don't commit hardcoded API keys to Git!

### Step 3: Test It!

1. Run the app: `npm start`
2. Tap **"Import Timetable"**
3. Take a photo of a timetable (or select an image)
4. Watch Gemini AI extract the exam details!

---

## How It Works

### 1. Image Analysis

When you upload a timetable image, the app:
- Reads the image as base64
- Sends it to Gemini 1.5 Flash model
- Uses a specialized prompt for exam extraction

### 2. AI Prompt

The AI is instructed to:
- Find ALL exams in the timetable
- Extract title, date, subject, type
- Categorize subjects intelligently
- Assign confidence scores
- Return structured JSON

### 3. Result Processing

The app:
- Validates extracted data
- Filters low-confidence results (< 30%)
- Lets you review before importing
- Shows confidence scores (optional)

---

## API Usage & Limits

### Free Tier

- **60 requests per minute** (RPM)
- **1500 requests per day** (RPD)
- **Free forever** for personal use

Perfect for this app since you're only extracting timetables occasionally.

### Pricing

Gemini 1.5 Flash is **free** for:
- Up to 1,500 requests/day
- Typical use case: 5-10 timetables per semester

**Cost if you exceed free tier**: ~$0.00002 per image

Realistically, you'll never pay anything for personal use.

---

## Testing Without API Key

### Mock Data Fallback

If no API key is configured, the app automatically:
- Detects missing key
- Offers to use mock data
- Shows 3 sample exams for testing

This lets you test the app without setting up Gemini first!

### Example Mock Data

```typescript
[
  {
    title: "Data Structures Final",
    date: "2025-01-15T09:00:00.000Z",
    subjectCategory: "Computer Science",
    examType: "Final",
    confidence: 0.95
  },
  // ... more exams
]
```

---

## Tips for Best Results

### 📸 Photo Quality

**Good Photos:**
- Well-lit, clear text
- Straight-on angle (not tilted)
- Full timetable visible
- High resolution

**Will Work:**
- Slightly blurry
- Some glare
- Handwritten timetables
- Screenshots

**Won't Work Well:**
- Very dark or blurry
- Text too small
- Heavy glare or shadows
- Incomplete information

### 📅 Date Handling

Gemini AI automatically:
- Infers current/next year if not visible
- Uses 09:00 AM as default time
- Converts all dates to ISO format

You can edit any extracted data before importing!

### 🎯 Subject Categorization

The AI intelligently maps exam titles to categories:
- "CS101" → Computer Science
- "MATH 203" → Mathematics
- "BIO Lab" → Biology
- "History Essay" → History

Categories: Mathematics, Science, English, History, Computer Science, Physics, Chemistry, Biology, Economics, Psychology, Engineering, Business, Arts, Other

---

## Troubleshooting

### Error: "API key not found"

**Solution**: Add `EXPO_PUBLIC_GEMINI_API_KEY` to `.env` file

```bash
# Create .env file
echo "EXPO_PUBLIC_GEMINI_API_KEY=your_key_here" > .env

# Restart Expo
npm start
```

### Error: "Invalid API key"

**Causes**:
- Key is incorrect (check for typos)
- Key is restricted (check API Console)
- Key was deleted/revoked

**Solution**: Generate a new key at https://makersuite.google.com/app/apikey

### Error: "Quota exceeded"

**Cause**: Exceeded 1,500 requests/day (unlikely!)

**Solutions**:
- Wait until next day (quota resets at midnight PST)
- Use mock data for testing
- Upgrade to paid tier (if needed)

### Error: "Failed to parse response"

**Cause**: Image unclear or no exams found

**Solutions**:
- Try a clearer photo
- Ensure timetable is visible
- Use mock data for testing
- Check image isn't corrupted

### API Key Not Working After Adding

**Solution**: Restart Expo dev server
```bash
# Stop the server (Ctrl+C)
# Clear cache
npm start --clear
```

---

## Privacy & Security

### Data Privacy

- Images are sent to Google's Gemini API
- Google processes them but doesn't store them (per policy)
- No exam data is stored by Google
- All your data stays local (AsyncStorage)

### API Key Security

**DO:**
- ✅ Use `.env` file (not tracked by Git)
- ✅ Keep API keys private
- ✅ Regenerate if accidentally exposed

**DON'T:**
- ❌ Commit `.env` to Git
- ❌ Share API key publicly
- ❌ Hardcode in production apps

### Best Practice

Add `.env` to `.gitignore`:
```bash
# Already included in the project
.env
```

---

## Advanced: Customizing the Prompt

Want to improve extraction? Edit `src/services/geminiService.ts`:

```typescript
const prompt = `You are an AI assistant that extracts exam information...

// Customize instructions here
- Look for specific formats
- Handle multiple languages
- Extract room numbers
- Include professor names

Return JSON array...`;
```

---

## Gemini API Resources

- **Get API Key**: https://makersuite.google.com/app/apikey
- **Pricing**: https://ai.google.dev/pricing
- **Documentation**: https://ai.google.dev/docs
- **Models**: https://ai.google.dev/models/gemini
- **Limits**: https://ai.google.dev/docs/quota

---

## What's Next?

With Gemini AI integrated, you can:

1. **Snap timetables** → Instant import
2. **Batch process** → Multiple photos
3. **Smart categorization** → Auto-organize
4. **Confidence scores** → See accuracy

This is production-ready and works with real timetables!

---

## Summary

```bash
# 1. Get API key
Visit: https://makersuite.google.com/app/apikey

# 2. Add to .env
echo "EXPO_PUBLIC_GEMINI_API_KEY=your_key" > .env

# 3. Restart app
npm start

# 4. Test it!
Import Timetable → Take Photo → See the magic ✨
```

---

**Built with Google Gemini AI - Making exam planning effortless!**
