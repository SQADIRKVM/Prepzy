# Prepzy - Smart Exam Countdown & Study Hub

<div align="center">

![Prepzy Logo](./assets/icon.png)

**A calm companion for confident studying**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54.0.23-blue.svg)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB.svg)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org)

</div>

## 📱 About

**Prepzy** is a beautifully designed React Native mobile application built with Expo that helps students manage exam preparation with calm and focus. It combines countdown timers, AI-powered timetable extraction, study resource management, Pomodoro-style focus sessions, and goal tracking into one cohesive experience.

### Design Philosophy

- **Clarity First**: Every screen answers "What should I do next?"
- **Emotional Kindness**: Gentle copy, patient animations, and forgiving flows
- **Smart Automation**: AI reduces busywork without taking control away
- **Visual Calm**: Muted pastel colors, spacious layouts, frictionless navigation

## ✨ Features

### Core Features

- **📊 Countdown Dashboard**: View all your exams with beautiful, color-coded cards showing time remaining
- **➕ Exam Management**: Easy exam entry with subject categories, exam types, dates, and notes
- **📝 Exam Details**: Comprehensive view with countdown, stats, and tabs for resources
- **🤖 AI Timetable Extractor**: Import exams from timetable photos using **Google Gemini AI** (real OCR!)
- **📚 Study Resources Hub**: Organize YouTube links, PDFs, notes, and other study materials
- **🍅 Focus Mode**: Pomodoro-style timer with resource tracking and encouraging messages
- **📈 Statistics & Progress**: Track focus sessions, study time, resource completion, and goal achievements
- **🎯 Goal Setting**: Set and track weekly study hours and grade-based goals
- **🔔 Smart Notifications**: Customizable exam reminders with custom sounds
- **🔍 Advanced Search**: Search exams with filters (subject, exam type, date range, resource type)
- **💾 Search History**: Save and manage your search queries
- **🌙 Do Not Disturb Integration**: System-level DND control for focused study sessions

### Additional Features

- **📱 Multi-Platform**: iOS, Android, and Web support
- **🎨 Glassmorphism UI**: Modern, beautiful design with glassmorphism effects
- **📱 Responsive Design**: Optimized for phones, tablets, and web
- **🌐 PWA Support**: Install as a Progressive Web App
- **♿ Accessibility**: Built with accessibility in mind

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: Zustand
- **Storage**: AsyncStorage (local persistence)
- **UI Components**: React Native Paper
- **Animations**: React Native Reanimated + Gesture Handler
- **Date Handling**: date-fns
- **AI/OCR**: Google Gemini AI for image analysis
- **Camera**: Expo Camera + Image Picker
- **Notifications**: Expo Notifications
- **Haptics**: Expo Haptics
- **Build System**: EAS Build (Expo Application Services)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI** (for building): `npm install -g eas-cli`
- **iOS Simulator** (Mac) or **Android Emulator** (optional, for local testing)
- **Git** (for cloning the repository)

## 🚀 Getting Started

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/prepzy.git
   cd prepzy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (Optional, for AI features)
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your Gemini API key (get it from https://makersuite.google.com/app/apikey)
   # Edit .env and add: EXPO_PUBLIC_GEMINI_API_KEY=your_key_here
   ```
   
   > 📖 See [GEMINI_SETUP.md](./GEMINI_SETUP.md) for detailed instructions on setting up Google Gemini AI.

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on your device**
   - **iOS**: Press `i` or run `npm run ios`
   - **Android**: Press `a` or run `npm run android`
   - **Web**: Press `w` or run `npm run web`

### Running on Physical Device

1. Install the **Expo Go** app on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code from the terminal
3. The app will load on your device

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo development server |
| `npm run android` | Run on Android emulator/device |
| `npm run ios` | Run on iOS simulator/device |
| `npm run web` | Run in web browser |
| `npm run build:android` | Build Android app (EAS) |
| `npm run build:ios` | Build iOS app (EAS) |
| `npm run build:all` | Build for both platforms |
| `npm run build:android:preview` | Build Android APK (preview) |
| `npm run build:android:production` | Build Android AAB (production) |
| `npm run build:ios:preview` | Build iOS app (preview) |
| `npm run build:ios:production` | Build iOS app (production) |

## 🏗️ Building for Production

This project uses **EAS Build** (Expo Application Services) for building production-ready apps.

### Prerequisites for Building

1. **EAS CLI** (already included in dependencies)
2. **Expo Account** - Sign up at [expo.dev](https://expo.dev)
3. **Login to EAS**:
   ```bash
   eas login
   ```

### Building

#### Android

**Preview Build (APK - for testing)**
```bash
npm run build:android:preview
# or
eas build --platform android --profile preview
```

**Production Build (App Bundle - for Play Store)**
```bash
npm run build:android:production
# or
eas build --platform android --profile production
```

#### iOS

**Preview Build (for testing)**
```bash
npm run build:ios:preview
# or
eas build --platform ios --profile preview
```

**Production Build (for App Store)**
```bash
npm run build:ios:production
# or
eas build --platform ios --profile production
```

#### Web (PWA)

**Build for Web**
```bash
# Export web build
npx expo export --platform web

# Output will be in ./dist folder
```

**Deploy to Vercel** (Recommended)
```bash
# Deploy to Vercel
cd dist
npx vercel --prod
```

**Deploy to Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd dist
netlify deploy --prod
```

**Deploy to GitHub Pages**
```bash
# Push dist folder to gh-pages branch
git subtree push --prefix dist origin gh-pages
```

#### Install as PWA on iPhone
1. Open the deployed web URL in Safari
2. Tap the **Share** button (box with arrow)
3. Select **"Add to Home Screen"**
4. The app will appear on your home screen like a native app!

#### Both Platforms
```bash
npm run build:all
```

> 📖 For detailed build instructions, see [BUILD_GUIDE.md](./BUILD_GUIDE.md)

### First Time Setup

If this is your first time building, you may need to configure credentials:

```bash
eas build:configure
```

- Select both Android and iOS
- EAS will manage credentials automatically (recommended)

## 📁 Project Structure

```
prepzy/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ExamCard.tsx
│   │   ├── CustomAlert.tsx
│   │   └── ...
│   ├── constants/          # Theme, colors, typography
│   │   └── theme.ts
│   ├── navigation/         # Navigation setup
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── screens/           # All app screens
│   │   ├── DashboardScreen.tsx
│   │   ├── AddExamScreen.tsx
│   │   ├── ExamDetailScreen.tsx
│   │   ├── FocusModeScreen.tsx
│   │   ├── ProgressScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   └── ...
│   ├── services/          # Business logic services
│   │   ├── notificationService.ts
│   │   ├── goalAchievementService.ts
│   │   ├── soundService.ts
│   │   └── ...
│   ├── store/             # Zustand state management
│   │   └── index.ts
│   ├── types/             # TypeScript definitions
│   │   └── index.ts
│   └── utils/             # Helper functions
│       └── dateHelpers.ts
├── assets/                # Images, icons, fonts
├── App.tsx                # Entry point
├── app.json              # Expo configuration
├── eas.json              # EAS Build configuration
└── package.json          # Dependencies
```

## 🎨 Design System

### Colors

- **Lavender** (#E6E6FA): Primary color, calm and focused
- **Sage** (#C8D5B9): Biology, natural sciences
- **Sand** (#F5E6D3): History, humanities
- **Peach** (#FFD4C4): English, arts
- **Sky** (#B4D4E1): Science, physics

### Typography

- Font: System default (Inter/Nunito recommended)
- Sizes: 12px to 40px scale
- Weights: Regular (400) to Bold (700)
- Line height: 1.5× for readability

### Spacing

- Based on 4px grid
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
5. **Push to the branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Write clear commit messages
- Add comments for complex logic
- Test your changes on both iOS and Android (if possible)
- Update documentation as needed

### Reporting Issues

If you find a bug or have a feature request, please [open an issue](https://github.com/yourusername/prepzy/issues) with:
- A clear description of the problem/feature
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots (if applicable)

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Design inspiration: Notion, Headspace, Forest
- Built with love for students who want to stay calm and focused
- **Developed by**: [Sarhan Qadir KVM](https://github.com/sqadirkvm) (SQADIRKVM)
- **Designed by**: [EdotStudio](https://github.com/edotstudio)

## 📚 Additional Documentation

- [Build Guide](./BUILD_GUIDE.md) - Detailed instructions for building the app
- [Gemini Setup](./GEMINI_SETUP.md) - Setting up Google Gemini AI integration
- [Features Roadmap](./FEATURES_ROADMAP.md) - Planned features and enhancements
- [Feature Status](./FEATURE_STATUS.md) - Current implementation status

## 📧 Support

For support, email support@edotstudio.com or open an issue on GitHub.

---

<div align="center">

**Made with care for students everywhere. Study smart, stay calm.** 🎓

⭐ Star this repo if you find it helpful!

---

**Developed by** [Sarhan Qadir KVM (SQADIRKVM)](https://github.com/sqadirkvm)
**Designed by** [EdotStudio](https://github.com/edotstudio)

</div>