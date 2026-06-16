# BigQuery Release Notes Hub 🚀

A modern, high-performance developer dashboard that aggregates, parses, and tags Google Cloud BigQuery release notes and lets you share them directly on X (formerly Twitter).

Built using a **Python Flask** backend and vanilla frontend technologies (**HTML5, CSS3, ES6+ JavaScript**).

---

## ✨ Features

- 🔄 **Atom Feed Aggregator**: Fetches raw XML updates directly from Google Cloud.
- 🧱 **Granular Entry Splitter**: Converts grouped daily updates into distinct searchable items (Features, Issues, Changes, Deprecations).
- ⚡ **In-Memory Cache**: Implements a 5-minute memory cache to ensure fast page loads and avoid rate limits.
- 🎨 **Premium Glassmorphic UI**: High-fidelity dark mode with neon gradients, hover scale animations, and modern typography.
- 📱 **Interactive Timeline**: Responsive vertical timeline with responsive layouts and hover glow indicators.
- 🔍 **Live Search & Filter Pills**: Instant client-side searches and category buttons with dynamic count badges.
- 🐦 **X/Twitter Web Intent Modal**: Draft updates dynamically using three editable templates (Standard, Short, Tech Details) with a real-time character limit indicator and SVG progress ring.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.13, Flask, `feedparser` (Atom/RSS parsing), `beautifulsoup4` (HTML traversal & cleaning), `requests`.
- **Frontend**: HTML5, Vanilla JavaScript, Vanilla CSS (Variables, Grid, Flexbox, Keyframes).
- **Icons & Typography**: FontAwesome, Google Fonts (`Inter`, `Outfit`, `JetBrains Mono`).

---

## 📂 Project Structure

```text
bq-releases-notes/
├── .venv/                  # Python virtual environment (ignored by Git)
├── templates/
│   └── index.html         # Main dashboard markup & modal structure
├── static/
│   ├── css/
│   │   └── styles.css     # CSS variables, glassmorphism, & keyframe animations
│   └── js/
│       └── app.js         # API requests, filters, character counters, & sharing intents
├── app.py                 # Flask server, feed parsers, caches, & API endpoints
├── .gitignore             # Configured Git ignore list
└── README.md              # Project documentation (this file)
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3 installed on your machine.

### Installation
1. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/vivekpandian/vsubburam-event-talks-app.git
   cd vsubburam-event-talks-app
   ```

2. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install flask requests feedparser beautifulsoup4
   ```

### Running the App
Start the Flask development server:
```bash
python3 app.py
```
Open your browser and navigate to:
👉 **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 🔄 How the Data Flows

1. **Trigger**: User opens the dashboard or clicks **Refresh**.
2. **Request**: Frontend requests `/api/notes?refresh=true` (or hits the cache).
3. **Parse**: Server fetches XML, parses it using BeautifulSoup, normalizes links to open in a new tab, and formats dates.
4. **Cache**: Updates are saved in memory for 5 minutes.
5. **Render**: Frontend updates search indices, counts categories, and paints the interactive timeline.
6. **Share**: Clicking **Share on X** triggers the modal, formats the selected text into a templates, checks the 280-character limit, and initiates a Twitter Web Intent.
