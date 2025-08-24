# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite application with a modern frontend stack. The project uses:
- React 18 with TypeScript
- Vite for build tooling and development
- TailwindCSS for styling
- React Router for navigation
- TanStack Query for data fetching
- React Hook Form with Zod validation
- Additional UI libraries: Headless UI, Heroicons, Framer Motion

## Development Commands

- `npm run dev` - Start development server with hot module replacement
- `npm run build` - Build for production (runs TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint with TypeScript support
- `npm run preview` - Preview production build locally

## Architecture Notes

- **Entry Point**: `src/main.tsx` - React app initialization with StrictMode
- **Main Component**: `src/App.tsx` - Currently a basic Vite template
- **Build System**: Vite with React plugin, configured in `vite.config.ts`
- **TypeScript**: Uses project references pattern with separate configs for app and node
- **Linting**: ESLint with TypeScript, React Hooks, and React Refresh plugins

## Key Dependencies

The project includes several important libraries that suggest it's intended for a more complex application:
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod schema validation
- **UI Components**: Headless UI and Heroicons for accessible components
- **Data Visualization**: Recharts for charts
- **Animations**: Framer Motion
- **Date Handling**: date-fns
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **Data Tables**: React Table

This suggests the application is likely a dashboard or data-heavy application with forms, charts, and complex UI interactions.