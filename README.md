# 🧾 Invoice Dashboard
A modern, responsive web dashboard for visualizing and analyzing invoice (fatura-recibo) data, with support for Dropbox cloud storage integration.

---

## 📌 Purpose

- Visualize and analyze invoices by year, quarter, and entity.
- Store and load invoice data securely from Dropbox (no backend required).
- Easily switch between local and cloud data sources.
- Mobile-friendly and works on iOS, Android, and desktop browsers.

---

## 🚀 How to Use

### 🧱 Folder Layout

Prepare your folder structure:
<pre>
📁 invoice-dashboard/
├── .github\workflows/
│   └── static.yml          # Github actions that will override the default ones
├── config/
│   ├── .env                # Dropbox credentials (ignored by Git)
│   ├── .env.example        # Example .env for reference
│   └── config.json         # Configuration file
└── data                    # Folder to store data (when dropbox is disabled)
</pre>

### ⚙️ Configuration Files

1. Create a `config.json` in the config folder as:

```json
{
  "ivaThreshold": 13500.00,
  "retencaoFonteThreshold": 12500.00,
  "irsThreshold": 10640.00,
  "dataFolder": "./data",
  "loadFromDropbox": true,
  "dropboxFolder": "/invoice-dashboard-data"
}
```
- Modify paths as needed (relative or absolute).
- Set "loadFromDropbox": true to load data from Dropbox (recommended for GitHub Pages).
- Set "loadFromDropbox": false to load data from local files (for local development only).

2. Create a `.env` in the config folder, using the .env.example as example, as:

```
DROPBOX_REFRESH_TOKEN=your_refresh_token
DROPBOX_APP_KEY=you_app_key
DROPBOX_APP_SECRET=your_app_secret
```

⚠️ Never commit this file! Use dropbox.env.example as a template.

### 📄 Invoice Data File Format
- **File type:** CSV (Comma-Separated Values)
- **File name pattern:** The file name must be the year (e.g., 2024.csv, 2023.csv, etc.)
- **Required columns (header row):**
```
NIF,VALOR,DATA EMISSAO,DATA SERVICO
```
- **Example content:**
```
123456789,100.00,2025-03-01,2025-01-01
123456789,100.00,2025-03-01,2025-12-01
```
- **Where to store:**
    - If using Dropbox, upload these files to your configured Dropbox folder.
    - If using local files, place them in your data folder.

This format is required for the dashboard to correctly parse and display your invoice data.

---

## 🔧 Dropbox API Setup Instructions

### 📦 Install the Dropbox SDK
Please make sure to install the following dependencies:
```bash
pip install dropbox
```

#### 🔐 Generate a Refresh Token
1. Go to the [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create a new app
    - Choose “Scoped access”
    - Choose “App folder” access
3. Update the "App folder name" on the app "Settings" tab
4. Under "Files and folders" section on the app "Permissions" tab, enable
    - files.content.write
    - files.content.read
    - files.metadata.write
    - files.metadata.read
5. Under OAuth 2, get the app key and secret and replace it in the "config/.env" file
- ⚠️ Never commit this token to Git!
6. Run the helper script to get a refresh token:

```bash
python get-dropbox-refresh-token.py
```

You'll be prompted to authorize via browser. After success, it prints:
- User ID
- Access Token
- Refresh Token ← Save this value in your .env (DROPBOX_REFRESH_TOKEN)
- Expires At

---

## 🌐 Deploying to GitHub Pages

### Why use Dropbox and GitHub Actions?
- **No backend required:** All data is loaded directly from Dropbox using short-lived access tokens.
- **Secrets are safe:** Dropbox credentials are injected at build time using GitHub Actions and never committed to the repository.
- **Always up-to-date:** The dashboard always loads the latest data from your Dropbox folder.

### How it works
- On every push to main, the .github/workflows/static.yml workflow runs.
- This workflow generates a config/secrets.js file using your repository secrets(DROPBOX_REFRESH_TOKEN, DROPBOX_APP_KEY, DROPBOX_APP_SECRET).
- The website loads these secrets at runtime (only in the browser, never committed).
- If loadFromDropbox is true in config.json, all data is loaded from Dropbox.

### Setting up Dropbox secrets
1. Go to your repository **Settings > Secrets and variables > Actions**
2. Add the following secrets:
- DROPBOX_REFRESH_TOKEN
- DROPBOX_APP_KEY
- DROPBOX_APP_SECRET

The static.yml workflow
- **Purpose:** Automates deployment to GitHub Pages and injects Dropbox credentials at build time.
- **Key steps:**
 - Checks out your code.
 - Generates config/secrets.js with your Dropbox secrets.
 - Uploads the site to GitHub Pages.

**Excerpt from .github/workflows/static.yml:**
```yaml
- name: Generate config/secrets.js from repository secrets
  run: |
    mkdir -p config
    echo "window.DROPBOX_CONFIG = {" > config/secrets.js
    echo "  DROPBOX_REFRESH_TOKEN: '${{ secrets.DROPBOX_REFRESH_TOKEN }}'," >> config/secrets.js
    echo "  DROPBOX_APP_KEY: '${{ secrets.DROPBOX_APP_KEY }}'," >> config/secrets.js
    echo "  DROPBOX_APP_SECRET: '${{ secrets.DROPBOX_APP_SECRET }}'" >> config/secrets.js
    echo "};" >> config/secrets.js
```
---

## 🖥️ Local Development

1. Copy config/dropbox.env.example to config/dropbox.env and fill in your Dropbox credentials.
2. Run a local server (e.g., npx serve . or use VS Code Live Server).
3. Open http://localhost:PORT in your browser.

---

## 📱 Mobile & iOS Compatibility

- The dashboard is fully responsive and works on iOS Safari and Android Chrome.
- All data is loaded from Dropbox when loadFromDropbox is enabled, so no local files are required on mobile.

---

## 🛡️ Security Notes

- **Never commit your Dropbox credentials.**
- All secrets are injected at build time and are not visible in your repository.
- Only use this approach for read-only Dropbox access or with - non-sensitive data.

---

##  📦 Requirements
- Modern browser (Chrome, Firefox, Safari, Edge)
- For local development: Node.js (for static server) or any static file server