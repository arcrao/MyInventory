# MyInventory

A comprehensive Inventory Management System built with React, TypeScript, and Tailwind CSS.

## Features

- **User Authentication**: Secure authentication powered by Supabase
- **Dashboard**: Real-time overview of inventory metrics, low stock alerts, and category statistics
- **Product Management**: Add, edit, and delete products with detailed information
- **Stock Tracking**: Monitor stock levels with automatic low stock alerts
- **History Log**: Track all inventory changes and transactions
- **Categories & Locations**: Organize products by custom categories and storage locations
- **Persistent Storage**: Data persists using browser storage API

## Project Structure

```
MyInventory/
├── src/
│   ├── components/           # React components organized by feature
│   │   ├── Auth/
│   │   │   └── AuthForm.tsx           # Login/signup authentication form
│   │   ├── Dashboard/
│   │   │   └── Dashboard.tsx         # Main dashboard with metrics
│   │   ├── Products/
│   │   │   ├── ProductsList.tsx      # Product listing table
│   │   │   └── ProductForm.tsx       # Add/Edit product form
│   │   ├── History/
│   │   │   └── HistoryView.tsx       # Transaction history log
│   │   ├── Settings/
│   │   │   └── SettingsView.tsx      # Categories & locations management
│   │   └── Layout/
│   │       └── Header.tsx            # Application header
│   │
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx           # Authentication state management
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useProducts.ts            # Product CRUD operations
│   │   ├── useCategories.ts          # Category management
│   │   ├── useLocations.ts           # Location management
│   │   └── useHistory.ts             # History tracking
│   │
│   ├── lib/                  # Third-party library configurations
│   │   └── supabase.ts               # Supabase client setup
│   │
│   ├── services/             # Business logic and external services
│   │   └── storage.service.ts        # Storage API wrapper
│   │
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts                  # All interface definitions
│   │
│   ├── utils/                # Helper functions
│   │   └── helpers.ts                # Utility functions
│   │
│   ├── constants/            # Application constants
│   │   └── index.ts                  # Storage keys, units, defaults
│   │
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles with Tailwind
│
├── .env.example              # Environment variables template
├── SUPABASE_SETUP.md         # Supabase setup instructions
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite bundler configuration
├── tailwind.config.js        # Tailwind CSS configuration
└── README.md                 # This file

```

## Architecture Overview

### Components
- **Organized by Feature**: Each feature (Dashboard, Products, History, Settings) has its own folder
- **Separation of Concerns**: UI components are pure presentation, logic handled by hooks
- **Reusable**: Components receive data via props and callbacks

### Custom Hooks
- **useProducts**: Manages product state and CRUD operations
- **useCategories**: Handles category management
- **useLocations**: Manages storage locations
- **useHistory**: Tracks all inventory transactions

### Services
- **StorageService**: Abstraction layer for browser storage API
  - Handles JSON serialization/deserialization
  - Provides type-safe storage operations
  - Centralized error handling

### Types
- Comprehensive TypeScript interfaces for type safety
- Product, Category, Location, HistoryEntry, and form data types
- Ensures data consistency across the application

### Utils
- Helper functions for calculations and data transformations
- Low stock detection, value calculations, name lookups
- Category and location filtering

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your Supabase credentials
# See SUPABASE_SETUP.md for detailed instructions

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Important**: Before running the application, you must set up Supabase authentication. See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup instructions.

### Development

The project uses:
- **Vite** for fast development and building
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **ESLint** for code quality

## Usage

1. **First Time Setup**:
   - Navigate to Settings tab
   - Add categories (e.g., Electronics, Furniture)
   - Add locations (e.g., Warehouse A, Store Room)

2. **Adding Products**:
   - Go to Products tab
   - Click "Add Product"
   - Fill in product details
   - Select category and location
   - Set minimum stock level for alerts

3. **Managing Inventory**:
   - View dashboard for quick overview
   - Update quantities to trigger history logs
   - Monitor low stock alerts
   - Check history for all transactions

## Technology Stack

- **Frontend**: React 18
- **Language**: TypeScript
- **Authentication**: Supabase
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Linting**: ESLint

## Code Organization Benefits

1. **Maintainability**: Easy to locate and update specific functionality
2. **Scalability**: Simple to add new features without touching existing code
3. **Testability**: Isolated components and hooks are easier to test
4. **Collaboration**: Clear structure helps team members understand the codebase
5. **Reusability**: Hooks and utilities can be shared across components

## License

This project is open source and available for personal and commercial use.
