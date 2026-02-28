# AgentSpark

Build your AI agent team in minutes. Choose a topic, answer questions, get production-ready agent files.

## 🚀 Live Demo
The project is set up to be automatically deployed to GitHub Pages via GitHub Actions.

## 🛠 Features
- **PWA Support**: Works offline and can be installed on your device.
- **Multilingual**: Supports English and Polish.
- **Modern UI**: Built with a focus on UX/UI using vanilla CSS and modular JS.
- **Interactive Interview**: AI-driven process to define agent roles.

## 💻 Local Development
Since this project uses ES Modules, you need a local web server to run it.

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd AgentsSpark-Split
   ```

2. Start a local server (requires Node.js):
   ```bash
   npm install
   npm run dev
   ```
   Or use any other static server:
   ```bash
   # Python
   python -m http.server 8000
   
   # npx
   npx http-server .
   ```

3. Open `http://localhost:3000` (if using `npm run dev`) or the appropriate URL in your browser.

## 📦 Deployment
The project is configured for **GitHub Pages**. Any push to the `main` branch will trigger the `Deploy to GitHub Pages` workflow.

To set it up on your own fork:
1. Go to **Settings > Pages**.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push your changes to the `main` branch.
