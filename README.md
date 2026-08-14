<p align="center">
  <picture>
    <img src="https://img.icons8.com/wired/128/split-transaction.png" height="120" alt="Tandas Bot Logo">
  </picture>
  <h1 align="center">Tandas Bot</h1>
  <p align="center">
    <strong>An open-source WhatsApp bot to automate the management of shared subscriptions, group savings, and "tandas" with friends or family.</strong>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20+-blue?logo=node.js" alt="Node Version">
  <img src="https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript" alt="TypeScript Version">
  <img src="https://img.shields.io/badge/BuilderBot-1.3-orange" alt="BuilderBot Version">
  <img src="https://img.shields.io/badge/Notion-Integration-black?logo=notion" alt="Notion Integration">
  <img src="https://img.shields.io/badge/Google_Gemini-AI-purple?logo=google-gemini" alt="Gemini Integration">
  <img src="https://img.shields.io/badge/License-ISC-green" alt="License">
</p>

---

## 📖 Overview

**Tandas Bot** is a virtual assistant on WhatsApp that helps you manage shared subscription groups or saving circles (known in Latin America as *"tandas"*). Instead of manually checking who has paid for shared services like Spotify, Netflix, HBO Max, YouTube Premium, or Amazon Prime, **Tandas Bot** automates the entire process: tracking members, logging payments, sending daily automated WhatsApp reminders, and answering user inquiries via a conversational AI powered by Google Gemini.

---

## ✨ Features

- 📱 **WhatsApp Integration**: Interact with your users directly on WhatsApp using [BuilderBot](https://www.builderbot.app/) and the Baileys provider.
- 💸 **Subscription & Tanda Tracking**: Supports both **monthly** (e.g., Spotify, Max) and **annual** (e.g., Amazon Prime) payment cycles.
- ⏰ **Automated Debt Reminders**: A scheduled daily cron job (running at 10:00 AM) that calculates pending payments and automatically pings overdue members on WhatsApp.
- 🧾 **Digital Payment Proofs**: Members submit their payment receipt screenshots directly via WhatsApp. The bot handles verification and uploads the proof to your database.
- 🗃️ **Notion as a Database**: Keep all user states, subscription details, and payment histories structured and easy to view inside Notion.
- 🤖 **Gemini AI Flow**: Includes a context-aware AI conversational assistant that helps answer user questions about subscription rules, costs, payment logs, and instructions in natural language.
- 📝 **Rules and Terms Acceptance**: Users can view terms and confirm compliance via the bot, which automatically updates Notion status flags.

---

## 🛠️ Stack

- **Runtime & Language**: [Node.js](https://nodejs.org/) & [TypeScript](https://www.typescriptlang.org/)
- **Bot Engine**: [BuilderBot](https://www.builderbot.app/) (utilizing `@builderbot/provider-baileys` & `@builderbot/database-json` under the hood)
- **Database**: [Notion SDK](https://github.com/makenotion/notion-sdk-js) for business data persistence (Users, Tandas, Payments)
- **AI Engine**: Google Gemini API (`@google/genai`)
- **Task Scheduling**: [node-cron](https://github.com/node-cron/node-cron)

---

## ⚙️ Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Chrisley304/tandasbot.git
cd tandasbot
```

### 2. Install Dependencies

Install the required packages using pnpm:

```bash
pnpm install
```

### 3. Environment Variables Configuration

Create a `.env` file at the root of the project using the example provided:

```bash
cp .env.example .env
```

Open `.env` and fill in the required details:

```env
# Admin Config
ADMIN_NUMBER=521XXXXXXXXXX       # Admin WhatsApp number with country code
ADMIN_NAME=AdminName             # Admin name

# Notion Integrations
NOTION_API_TOKEN=secret_xxx...  # Notion Integration API Token
NOTION_USERS_DATASOURCE_ID=xxx  # Notion Database ID for Users
NOTION_TANDAS_LIST_DATASOURCE_ID=xxx  # Notion Database ID for Tandas List
NOTION_TANDAS_PAYMENTS_DATASOURCE_ID=xxx # Notion Database ID for Payments

# Google Gemini AI
GEMINI_API_KEY=AIzaSy...         # Gemini API Key
GEMINI_MODEL_NAME=gemini-1.5-flash # Model name

# Provider Config
PROVIDER_VERSION=6               # WhatsApp Web version identifier (for Baileys)
```

---

## 🗃️ Notion Database Schema

To make Tandas Bot work correctly, you must create three databases inside Notion and share them with your Notion Integration connection. Below are the required properties for each database:

### 1. Users Database (`NOTION_USERS_DATASOURCE_ID`)
Tracks participants in different subscription groups.

| Property Name | Type | Description |
| :--- | :--- | :--- |
| `name` | **Title** | The user's name |
| `phone` | **Phone** | User's WhatsApp number (e.g. `52155...`) |
| `groups` | **Multi-select** | Subscription groups they belong to (e.g., `spotify`, `hbo max`, `amazon prime`, `youtube premium`) |
| `spotify_start_date` | **Date** | Date user joined Spotify |
| `hbo_max_start_date` | **Date** | Date user joined HBO Max |
| `amazon_prime_start_date`| **Date** | Date user joined Amazon Prime |
| `youtube_premium_start_date`| **Date**| Date user joined YouTube Premium |
| `accepted_spotify_terms` | **Checkbox** | True if Spotify rules were accepted |
| `accepted_hbo_max_terms` | **Checkbox** | True if HBO Max rules were accepted |
| `accepted_amazon_prime_terms`| **Checkbox** | True if Amazon Prime rules were accepted |
| `accepted_youtube_premium_terms`| **Checkbox** | True if YouTube Premium rules were accepted |

### 2. Tandas Database (`NOTION_TANDAS_LIST_DATASOURCE_ID`)
Defines the characteristics of each shared subscription or saving group.

| Property Name | Type | Description |
| :--- | :--- | :--- |
| `name` | **Title** | Name of the subscription group (matches multi-select groups) |
| `is_active` | **Checkbox** | Whether this tanda is currently active |
| `suscription_type` | **Select** | Subscription recurrence: `monthly` or `annual` |
| `payment_day` | **Date** | The billing/payment calendar day |
| `total_cost` | **Number** | Total cost of the subscription account |
| `n_members` | **Number** | Number of participants in the subscription |
| `cost_per_member` | **Formula** | Formula calculating split cost (e.g. `prop("total_cost") / prop("n_members")`) |

### 3. Payments Database (`NOTION_TANDAS_PAYMENTS_DATASOURCE_ID`)
Logs transaction histories and tracks due dates.

| Property Name | Type | Description |
| :--- | :--- | :--- |
| `title` | **Title** | Auto-generated title of the payment log (e.g. `Pago de John - $40.00`) |
| `user` | **Relation** | Relation linking to the **Users** database |
| `tanda` | **Select** | The name of the tanda paid (e.g. `spotify`, `hbo max`, etc.) |
| `payment_date` | **Date** | Date of the transaction |
| `payment` | **Number** | Total amount paid |
| `paid_periods` | **Number** | Number of periods covered (e.g. `1` for 1 month) |
| `next_payment` | **Date** | Next calculated payment deadline date |
| `voucher_path` | **Rich Text** | Text field containing path to the file |
| `voucher_image` | **Files & media** | Uploaded screenshot of the payment voucher receipt |
| `overdue_payment` | **Formula** | Checkbox formula verifying if the payment is past due |

---

## 🚀 Running the Bot

### Development Mode

Run the project in watch mode:

```bash
pnpm dev
```

On first startup, a QR code will render in the terminal console. Scan it using your WhatsApp application (Linked Devices) to authorize the bot session.

### Production Build

Build and start the application:

```bash
pnpm build
pnpm start
```

For keeping the bot running continuously in production, it is recommended to use [PM2](https://pm2.keymetrics.io/) or run via Docker.

### Docker Deployment

A `Dockerfile` is included in this repository. You can build and run it using:

```bash
docker build -t tandasbot .
docker run -d --name tandasbot-instance -p 3008:3008 --env-file .env tandasbot
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Chrisley304/tandasbot/issues).

---

## 📄 License

This project is licensed under the **ISC License**. See the `package.json` file for details.

Developed with ❤️ by [Christian Leyva](https://chrisley.dev/).
