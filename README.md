# 📱 Trackr - Personal Productivity Suite

A comprehensive React Native mobile app for tracking your finances, health, and habits. Built with Expo, TypeScript, and SQLite for offline-first functionality.

## 🌟 Features

### 💰 Finance Tracking
- **Transactions**: Add income and expenses with categories, descriptions, and dates
- **Budgets**: Set monthly/weekly budgets and track spending progress
- **Goals**: Create savings goals with target amounts and deadlines
- **Analytics**: View spending patterns, category breakdowns, and trends
- **Categories**: Pre-defined expense and income categories with icons

### 🏃 Health Monitoring
- **Weight Tracking**: Log daily weight with body fat percentage
- **Body Measurements**: Track waist, chest, hip, neck, bicep, and thigh measurements
- **Exercise Logging**: Record cardio and strength workouts
- **Health Metrics**: BMI calculation, body fat estimation, progress trends
- **Profile Management**: Personal health information and goals

### 📝 Habit Formation
- **Habit Management**: Create daily/weekly habits with categories
- **Progress Tracking**: Mark completions and view streaks
- **Analytics**: Completion rates, calendar view, progress charts
- **Categories**: Health, Fitness, Learning, Productivity, Mindfulness, and more
- **Streak Calculation**: Current and longest streaks with completion rates

## 🏗️ Technology Stack

- **Frontend**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **Database**: SQLite (expo-sqlite)
- **Storage**: AsyncStorage for preferences
- **Forms**: React Hook Form with Zod validation
- **Charts**: React Native Chart Kit
- **Icons**: Expo Vector Icons
- **Styling**: React Native StyleSheet with custom theme system

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd trackr-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```
   or
   ```bash
   expo start
   ```

4. **Run on your device**
   - Install Expo Go on your mobile device
   - Scan the QR code displayed in your terminal or browser
   - The app will load on your device

### Alternative: Run on Simulator/Emulator

- **iOS Simulator** (macOS only): `npm run ios`
- **Android Emulator**: `npm run android`
- **Web Browser**: `npm run web`

## 📱 Usage

### First Launch

The app comes pre-loaded with sample data for demonstration purposes. You can:

1. **Explore the Finance module** - View sample transactions, budgets, and goals
2. **Check the Health section** - See weight tracking and exercise logs
3. **Browse Habits** - Review daily and weekly habit tracking

### Adding Your Own Data

1. **Finance**:
   - Tap the "+" button to add transactions
   - Set up budgets in the Budgets section
   - Create savings goals in the Goals section

2. **Health**:
   - Log your weight in the Weight Entry screen
   - Add body measurements for progress tracking
   - Record workouts in the Exercise Log

3. **Habits**:
   - Create new habits with custom categories
   - Mark daily completions on the dashboard
   - View progress and streaks in analytics

### Navigation

- **Bottom Tabs**: Finance, Health, Habits, Settings
- **Stack Navigation**: Each module has its own screen stack
- **Modal Screens**: Add/edit forms open as modals

## 🎨 Design System

### Theme Support
- **Light and Dark modes** with automatic system detection
- **Custom color schemes** for each module:
  - Finance: Green accent
  - Health: Blue accent
  - Habits: Purple accent

### Typography
- Consistent font sizing and weights
- Proper text hierarchy
- Good contrast ratios for accessibility

### Components
- **Reusable UI components**: Button, Card, Input
- **Consistent spacing** and layout patterns
- **Material Design** inspired interactions

## 🗄️ Data Management

### Database Schema
- **SQLite database** with proper relationships
- **Normalized tables** for each data type
- **Indexes** for performance optimization

### Data Persistence
- **Offline-first** architecture
- **Local storage** for all data
- **No internet required** for core functionality

### Sample Data
The app includes comprehensive sample data:
- 50+ sample transactions across 6 months
- Multiple budgets and savings goals
- 90 days of weight tracking data
- Exercise logs and body measurements
- 5 habits with 30 days of completion data

## 🔧 Development

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI elements
│   ├── finance/        # Finance-specific components
│   ├── health/         # Health-specific components
│   ├── habits/         # Habits-specific components
│   └── common/         # Shared components
├── screens/            # Screen components
│   ├── finance/        # Finance module screens
│   ├── health/         # Health module screens
│   ├── habits/         # Habits module screens
│   └── settings/       # Settings screens
├── navigation/         # Navigation configuration
├── contexts/           # React Context providers
├── services/           # Database and API services
├── types/              # TypeScript type definitions
├── constants/          # App constants and themes
└── utils/              # Utility functions
```

### Key Commands
- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint
- `npx tsc --noEmit` - Type check without compilation

### Adding New Features

1. **Define types** in the appropriate `types/` file
2. **Update database schema** in `services/database.ts`
3. **Add context methods** for data management
4. **Create UI components** in `components/`
5. **Implement screens** with navigation
6. **Add sample data** for testing

## 🚀 Future Enhancements

### Planned Features
- **Data Sync**: Cloud backup and sync across devices
- **Notifications**: Reminders for habits and budget alerts
- **Charts**: Advanced data visualization with interactive charts
- **Export**: Data export to CSV/JSON formats
- **Themes**: Additional color themes and customization
- **Widgets**: Home screen widgets for quick data entry

### Technical Improvements
- **Performance**: Lazy loading and optimization
- **Testing**: Unit and integration tests
- **CI/CD**: Automated testing and deployment
- **Analytics**: App usage analytics
- **Offline Sync**: Smart sync when connection available

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support, email support@trackr-app.com or create an issue on GitHub.

---

**Built with ❤️ using React Native and Expo**