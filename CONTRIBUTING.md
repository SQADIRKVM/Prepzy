# Contributing to Prepzy

Thank you for your interest in contributing to Prepzy! This document provides guidelines and instructions for contributing to the project.

## 🤝 How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- A clear, descriptive title
- Steps to reproduce the bug
- Expected behavior vs actual behavior
- Screenshots (if applicable)
- Device/OS information (iOS/Android version, device model)
- App version

### Suggesting Features

We welcome feature suggestions! Please open an issue with:
- A clear description of the feature
- Use cases and examples
- Why this feature would be valuable
- Any mockups or design ideas (optional)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
   - Follow the existing code style
   - Write clear commit messages
   - Add comments for complex logic
   - Update documentation as needed
4. **Test your changes**
   - Test on iOS and Android if possible
   - Ensure no TypeScript errors
   - Check that existing features still work
5. **Commit your changes**:
   ```bash
   git commit -m "Add: description of your feature"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Open a Pull Request** on GitHub

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define types/interfaces for props and data structures
- Avoid `any` types - use proper typing
- Use meaningful variable and function names

### React Native / Expo

- Use functional components with hooks
- Follow React Native best practices
- Use Expo APIs when available
- Ensure cross-platform compatibility (iOS, Android, Web)

### Code Formatting

- Use consistent indentation (2 spaces)
- Add comments for complex logic
- Keep functions focused and small
- Follow the existing code structure

### File Organization

- Place components in `src/components/`
- Place screens in `src/screens/`
- Place services in `src/services/`
- Place utilities in `src/utils/`
- Use TypeScript for all files

## 🧪 Testing

Before submitting a PR, please:

1. **Run the app locally**:
   ```bash
   npm start
   ```

2. **Test on multiple platforms** (if possible):
   - iOS simulator/device
   - Android emulator/device
   - Web browser

3. **Check for TypeScript errors**:
   ```bash
   npx tsc --noEmit
   ```

4. **Verify existing features** still work

## 📚 Project Structure

- `src/components/` - Reusable UI components
- `src/screens/` - Screen components
- `src/services/` - Business logic and API services
- `src/store/` - Zustand state management
- `src/navigation/` - Navigation configuration
- `src/constants/` - Theme, colors, constants
- `src/types/` - TypeScript type definitions
- `src/utils/` - Helper functions

## 🎨 Design Guidelines

- Follow the existing design system (colors, spacing, typography)
- Use glassmorphism effects where appropriate
- Maintain consistency with existing UI patterns
- Ensure responsive design (phone, tablet, web)
- Consider accessibility (contrast, touch targets, screen readers)

## 🔒 Security

- Never commit API keys or secrets
- Use environment variables for sensitive data
- Follow security best practices
- Report security vulnerabilities privately

## 📖 Documentation

- Update README.md if adding new features
- Add JSDoc comments for public functions
- Update relevant documentation files
- Keep code comments clear and helpful

## 🐛 Known Issues

Check [FEATURE_STATUS.md](./FEATURE_STATUS.md) for current implementation status and known issues.

## 💬 Communication

- Be respectful and constructive
- Ask questions if something is unclear
- Provide context in issues and PRs
- Respond to feedback promptly

## ✅ Checklist for PRs

Before submitting, ensure:

- [ ] Code follows the project's style guidelines
- [ ] TypeScript compiles without errors
- [ ] Changes tested on at least one platform
- [ ] Documentation updated (if needed)
- [ ] No console.logs or debug code left
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains the changes

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Prepzy! 🎓✨
