# ⭐ Star Wars Chronological Watch Order Tracker

A beautiful, interactive Star Wars watch order tracker with episode-level progress tracking. Follow the complete chronological timeline of the Star Wars universe with a stunning space-themed interface!

![Star Wars Watch Order](https://img.shields.io/badge/Star%20Wars-Watch%20Order-yellow?style=for-the-badge&logo=starwars)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

## ✨ Features

- 🌌 **Complete Star Wars chronological watch order** - From Young Jedi Adventures to Rise of Skywalker
- 📺 **Episode-level tracking** - Check off individual episodes of TV series
- ⚡ **Smart completion** - Check series at top-level or mark all episodes at once
- 🎯 **Lightsaber progress bar** - Watch your progress grow with a glowing lightsaber effect
- 💾 **Local storage persistence** - Your progress is saved automatically
- 📱 **Mobile-responsive design** - Perfect on phones, tablets, and desktop
- ♿ **Fully accessible** - Keyboard navigation and screen reader support
- 🌟 **Animated starfield background** - Immersive Star Wars atmosphere
- 🔄 **Episode refresh system** - Check for new seasons and episodes
- 🔍 **Search and filtering** - Find titles quickly or show only remaining items

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/voodoogumbo/starwars-watch-order.git
cd starwars-watch-order
npm install
```

### 2. Configure TMDB API (Required for episode lists, posters and ratings)

1. **Get a free TMDB account**: [Sign up at TMDB](https://www.themoviedb.org/signup)
2. **Get your API key**: Go to [API Settings](https://www.themoviedb.org/settings/api)
3. **Copy your Read Access Token**: The long Bearer token (not the short API key)
4. **Create environment file**:
   ```bash
   cp .env.example .env.local
   ```
5. **Add your token**: Open `.env.local` and replace the placeholder with your token

### 3. Launch
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start your Star Wars journey! 🚀

## 📖 How to Use

### Basic Tracking
- ✅ **Check off movies and series** as you complete them
- 🎯 **Watch your progress** grow with the glowing lightsaber progress bar
- 🔍 **Search titles** to find specific content quickly
- 🔄 **Use "Show Remaining"** to focus only on unwatched content

### Series Tracking
- 📺 **Click "Expand"** on any TV series to see individual episodes
- ⚡ **Top-level checking**: Check the series title to mark ALL episodes as watched
- 📝 **Episode-by-episode**: Or check individual episodes for granular progress
- 🔄 **Refresh episodes**: Click the refresh button to check for new seasons

### Smart Features
- 💾 **Auto-save**: Your progress is automatically saved locally
- 📱 **Works offline**: No internet required after initial episode data loads
- ♿ **Keyboard friendly**: Navigate entirely with Tab, Enter, and Space
- 🌙 **Consistent theme**: Beautiful dark space theme throughout

## 📋 Watch Order Included

This tracker includes the complete Star Wars chronological timeline:

**High Republic Era**: Young Jedi Adventures → The Acolyte  
**Prequel Era**: Phantom Menace → Attack of the Clones → Clone Wars → Revenge of the Sith  
**Imperial Era**: Bad Batch → Maul: Shadow Lord → Solo → Obi-Wan Kenobi → Andor → Rebels → Rogue One  
**Original Era**: A New Hope → Empire Strikes Back → Return of the Jedi  
**New Republic Era**: Mandalorian → Book of Boba Fett → Ahsoka → The Mandalorian & Grogu → Skeleton Crew  
**Sequel Era**: Resistance → Force Awakens → Last Jedi → Rise of Skywalker

*Plus anthology series like Tales of the Jedi, Tales of the Empire and Tales of the Underworld positioned chronologically*

Each title carries its TMDB id in `data/watchOrder.ts`. Runtimes, ratings, posters and aired-episode lists are fetched server-side and refreshed daily; unaired episodes are excluded until they air.

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel, add TMDB_BEARER environment variable in dashboard
```

### Other Platforms
Works with any Next.js hosting provider. Just ensure:
1. `TMDB_BEARER` environment variable is set
2. Node.js 18+ is available

## 🛠 Development

### Scripts
```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint check
```

### Project Structure
```
├── app/
│   ├── api/tmdb/tv/[id]/   # Episode list for a series in the watch order
│   ├── page.tsx            # Main tracker page (server-rendered, revalidated daily)
│   ├── watch-order/        # Redirects to /
│   ├── layout.tsx          # Root layout with starfield
│   └── globals.css         # Star Wars themed styles
├── components/
│   ├── WatchList.tsx       # Main progress tracker
│   ├── WatchItem.tsx       # Individual movie/series component
│   ├── ProgressBar.tsx     # Lightsaber progress bar
│   ├── Skeleton.tsx        # Loading states
│   └── ErrorBoundary.tsx   # Error handling
├── data/
│   └── watchOrder.ts       # Complete Star Wars chronology
└── lib/
    ├── progress.ts         # Per-title progress (shared by list + items)
    ├── storage.ts          # Local storage state, reducer and migrations
    └── tmdb.ts             # Server-only TMDB client
```

## 🔧 Technologies

- **⚛️ Next.js 14** - React framework with App Router
- **🔷 TypeScript** - Type safety and better DX
- **🎬 TMDB API** - Episode and series metadata
- **🎨 CSS Variables** - Consistent theming system
- **💾 Local Storage** - Client-side progress persistence
- **♿ Web Accessibility** - WCAG compliant design
- **📱 Responsive Design** - Mobile-first approach

## 🤝 Contributing

We welcome contributions! Whether you want to:
- 🐛 Fix bugs or improve functionality
- 🎨 Enhance the UI/UX
- 📚 Improve documentation
- ⭐ Add new Star Wars content as it releases

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **The Movie Database (TMDB)** for providing comprehensive Star Wars episode data
- **Lucasfilm & Disney** for creating the Star Wars universe we all love
- **The Star Wars fan community** for maintaining chronological watch order discussions

---

**May the Force be with you** on your Star Wars journey! ⭐️

*This project is not affiliated with Lucasfilm, Disney, or The Movie Database.*