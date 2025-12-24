# 🎬 WhatToWatch

**Can't Decide What to Watch?** WhatToWatch is a modern React application designed to help you discover your next favorite movie or TV show. Leveraging the power of the Watchmode API, it provides instant access to up-to-date information about thousands of films and series.

## ✨ Features

### 🔍 Smart Search & Discovery
- **Advanced Search**: Instant search by movie and TV show titles
- **Category Filtering**: Filter by genre, year, platform, and more
- **Trending Content**: Discover current popular movies and shows
- **Detailed Information**: Comprehensive information pages for each title

### 🎯 Personalized Experience
- **Favorites List**: Save your favorite content and watch later
- **Watchlist**: Organize content you want to watch
- **Recommendations**: Personalized suggestions based on viewing history

### 📱 Modern User Interface
- **Responsive Design**: Perfect appearance on mobile, tablet, and desktop
- **Fast & Smooth**: Optimized performance for a seamless experience
- **Modern UI/UX**: User-friendly and visually appealing interface

## 🚀 How It Works

### 1. **API Integration**
WhatToWatch accesses real-time movie and TV show data using the Watchmode API:
- **Movie/TV Show Information**: Detailed metadata, cast, director information
- **Streaming Platforms**: Information about where content can be watched
- **IMDb Ratings**: User ratings and scores
- **Current Data**: Continuously updated content library

### 2. **React Component Architecture**
The application is built with modular and reusable React components:
- **Home Page**: Trending content and featured recommendations
- **Search Page**: Advanced filtering and search features
- **Detail Page**: Comprehensive information display for each title
- **User Profile**: Favorites and watchlist management

### 3. **State Management**
- **React Hooks**: Component state management with `useState`, `useEffect`
- **Context API**: React Context for global state management
- **API State**: Management of loading, success, and error states

### 4. **User Flow**
```
User → Search/Filter → API Request → Data Processing → UI Update → User Interaction
```

## 🛠️ Technology Stack

- **Frontend Framework**: React 18+
- **API**: TMDB (The Movie Database) API
- **HTTP Client**: Fetch API
- **State Management**: React Hooks + Context API
- **Styling**: CSS Modules / Styled Components / Tailwind CSS
- **Routing**: React Router
- **Build Tool**: Vite / Create React App

## 📋 Project Structure

```
whattowatch/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── hooks/           # Custom React hooks
│   ├── context/         # Context API providers
│   ├── utils/           # Helper functions
│   └── styles/          # Style files
├── public/              # Static files
└── package.json         # Dependencies
```

## 🎯 Use Cases

1. **"What should I watch?"** → Discover trending content on the home page
2. **"I'm looking for a specific movie"** → Use the search bar
3. **"I want to watch a horror movie"** → Apply genre filter
4. **"What's on Netflix?"** → Apply platform filter
5. **"Save for later"** → Add to favorites

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Step 1: Clone the Repository
```bash
git clone https://github.com/Xinacris/whattowatch.git
cd whattowatch
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Create a `.env` file in the root directory:
```env
# Option 1: Bearer Token (Preferred)
REACT_APP_TMDB_API_TOKEN=your_bearer_token_here

# Option 2: API Key (Fallback)
REACT_APP_TMDB_API_KEY=your_api_key_here
```

### Step 4: Start the Development Server
```bash
npm start
```

The application will open in your browser at `http://localhost:3000`

### Available Scripts
- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (one-way operation)

## 🔐 API Configuration

To use the TMDB API:
1. Get your API key or Bearer token from [The Movie Database (TMDB)](https://www.themoviedb.org/settings/api)
2. Create a `.env` file in the root directory
3. Add your credentials (Bearer token is preferred):
   ```env
   # Option 1: Bearer Token (Preferred)
   REACT_APP_TMDB_API_TOKEN=your_bearer_token_here
   
   # Option 2: API Key (Fallback)
   REACT_APP_TMDB_API_KEY=your_api_key_here
   ```
4. Restart the development server for changes to take effect

**Note:** 
- TMDB API is free and provides better search results and movie/TV show data
- Bearer token authentication is preferred and more secure
- If both are provided, Bearer token will be used

## 🚧 Development Status

This project is actively under development. Features and improvements are continuously being added.

---

**Ready? Let's discover your next amazing watch! 🎥✨**
