# CP Progress Tracker

A browser extension for tracking competitive programming progress across 10+ platforms with analytics and insights.

![Version](https://img.shields.io/badge/version-1.1.5-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Author:** [thehav0k](https://github.com/thehav0k)  
**Built with assistance from:** Claude (Anthropic)

## Features

### Supported Platforms
- Codeforces, LeetCode, AtCoder, CodeChef, HackerRank
- CSES, SPOJ, TopCoder, UVa Online Judge, GeeksforGeeks

### Analytics
- Aggregated statistics across all platforms
- Rating progression curve with contest history
- Time-based comparisons (7d, 30d, 90d, 365d)
- Category mastery tracking
- Activity patterns by day of week
- Streak tracking with historical data

### Features
- Real-time data synchronization
- Auto-sync with configurable intervals
- Dark/Light theme support
- Custom goals and achievements
- Local data storage

## Installation

### Chrome/Edge

1. Clone the repository:
   ```bash
   git clone https://github.com/thehav0k/cp-progress-tracker.git
   cd cp-progress-tracker
   ```

2. Load in browser:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project folder

### Firefox

1. Navigate to `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `manifest.json` from the project folder

## Usage

1. Click the extension icon to open the popup
2. Navigate to Settings and configure your platform usernames
3. Click "Sync All Platforms" to fetch your data
4. View analytics in Dashboard, Compare, and Analytics tabs
5. Set goals in the Goals section

## Configuration

Supported settings in Options page:
- Platform usernames
- Auto-sync frequency (1h, 6h, 12h, 24h)
- Theme preference (Dark, Light, Auto)
- Notifications

## Technical Details

- **Manifest Version:** 3
- **Storage:** Chrome Storage API (local/sync)
- **APIs:** Platform-specific REST/GraphQL endpoints
- **Architecture:** Service Worker, Popup, Options page

## File Structure

```
cp-progress-tracker/
├── manifest.json          # Extension configuration
├── popup/                 # Main UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/               # Settings page
├── background/            # Service worker
├── utils/                 # Core modules
│   ├── api.js            # Platform APIs
│   ├── storage.js        # Data persistence
│   ├── analytics.js      # Statistics engine
│   └── goals.js          # Goals & achievements
└── icons/                # Extension icons
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Built with assistance from Claude (Anthropic)
- Platform APIs: Codeforces, LeetCode, and others
- Inspired by competitive programming community

---

**Note:** This extension is not affiliated with any of the supported platforms. All trademarks belong to their respective owners.

3. **Load in Firefox:**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the `cp-progress-tracker` folder

## 📖 Usage

### Initial Setup

1. **Click the extension icon** in your browser toolbar
2. **Click "Configure Usernames"** or open Settings
3. **Enter your usernames** for each platform you use
4. **Click "Save Settings"**
5. **Return to popup** and click the sync button (🔄)

### Dashboard

The main dashboard shows:
- **Quick Stats:** Total problems, average rating, streak, active platforms
- **Weekly Progress:** Visual calendar showing daily activity
- **Platform Overview:** Individual platform statistics
- **Recommendations:** Personalized suggestions for improvement

### Comparison View

Compare your progress across different time periods:
- Today vs Yesterday
- This Week vs Last Week
- This Month vs Last Month
- Last 30 days vs Previous 30 days

### Analytics View

Detailed analytics including:
- **Rating History:** Track rating changes over time
- **Problem Distribution:** See which difficulty levels you've solved
- **Category Mastery:** Identify your strongest and weakest areas
- **Activity Patterns:** Understand when you're most productive

## 🔧 Configuration

### Settings

Access settings by clicking the ⚙️ icon in the popup or opening the extension options page.

**General Settings:**
- **Auto Sync Frequency:** How often to automatically fetch new data
- **Theme:** Choose between Dark, Light, or Auto (follows system)
- **Notifications:** Enable/disable browser notifications
- **Default View:** Which view to show when opening the popup

**Platform Configuration:**
- Enter usernames for each platform
- Use "Validate All Usernames" to check if they're correct
- Empty fields are ignored (you don't need to use all platforms)

### Data Management

- **Export Data:** Download all your data as JSON
- **Clear Data:** Reset all statistics (keeps usernames)

## 🏗️ Architecture

```
cp-progress-tracker/
├── manifest.json          # Extension manifest (V3)
├── icons/                 # Extension icons
├── popup/                 # Main popup interface
│   ├── popup.html        # Popup UI
│   ├── popup.css         # Styles
│   └── popup.js          # UI logic
├── options/               # Settings page
│   ├── options.html      # Settings UI
│   ├── options.css       # Styles
│   └── options.js        # Settings logic
├── background/            # Background service worker
│   └── background.js     # Background tasks, sync
├── utils/                 # Utility modules
│   ├── api.js            # Platform API integrations
│   ├── storage.js        # Data storage management
│   ├── analytics.js      # Analytics and insights
│   └── visualization.js  # Chart generation
└── README.md             # This file
```

## 🔌 API Integration

### Supported Platforms

| Platform | API Type | Status |
|----------|----------|--------|
| Codeforces | REST API | ✅ Fully supported |
| LeetCode | GraphQL | ✅ Fully supported |
| AtCoder | Web Scraping | ⚠️ Limited (requires background script) |
| CodeChef | Web Scraping | ⚠️ Limited |
| HackerRank | Web Scraping | ⚠️ Limited |
| Others | Various | 🔄 In development |

## 🛠️ Development

### Prerequisites

- Node.js (optional, for development tools)
- Chrome or Firefox browser

### Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/cp-progress-tracker.git
cd cp-progress-tracker

# No build step required - it's vanilla JavaScript!
# Just load the extension in your browser
```

### Testing

1. Make changes to the code
2. Reload the extension in `chrome://extensions/`
3. Test functionality in the popup

### Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 Roadmap

### Phase 1: MVP ✅
- [x] Basic extension structure
- [x] 3 platform integrations (CF, LC, AtCoder)
- [x] Dashboard with stats
- [x] Manual sync
- [x] Settings page

### Phase 2: Core Features (In Progress)
- [ ] All 10 platform integrations
- [ ] Automated background sync
- [ ] Advanced comparisons
- [ ] Charts and visualizations
- [ ] Goals system
- [ ] Contest notifications

### Phase 3: Advanced Features
- [ ] Predictive analytics
- [ ] Social features (friends, leaderboards)
- [ ] Achievement system
- [ ] Browser notification enhancements
- [ ] Mobile responsive design

### Phase 4: Polish
- [ ] Performance optimization
- [ ] Cross-browser compatibility
- [ ] Cloud sync (optional)
- [ ] Plugin system for custom platforms

## 🐛 Known Issues

- **AtCoder, CodeChef, HackerRank:** Require web scraping or unofficial APIs (limited support)
- **Rate Limiting:** Be mindful of API rate limits when syncing frequently
- **CORS Issues:** Some platforms may require background script fetch

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Acknowledgments

- Thanks to all competitive programming platforms for their public APIs
- Inspired by the CP community's need for unified progress tracking
- Built with ❤️ for competitive programmers worldwide

## 📧 Contact

- **GitHub Issues:** [Report a bug](https://github.com/yourusername/cp-progress-tracker/issues)
- **Email:** your.email@example.com
- **Discord:** Join our community server

---

**Happy Coding! 🚀**

*Track your progress, identify weaknesses, and become a better competitive programmer!*
