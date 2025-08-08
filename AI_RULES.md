# AI Development Rules for UNT | MARKETPLACE

This document provides guidelines for the AI assistant to follow when developing and modifying this application.

## Tech Stack

This project is built with a modern, type-safe, and component-based architecture.

- **Framework:** React with Vite for a fast development experience.
- **Language:** TypeScript for type safety and improved developer experience.
- **UI Components:** shadcn/ui for a pre-built, accessible, and customizable component library.
- **Styling:** Tailwind CSS for all utility-first styling.
- **Routing:** React Router (`react-router-dom`) for all client-side routing.
- **Backend:** Supabase for Authentication, Database, and Storage.
- **Data Fetching & Server State:** TanStack Query for managing asynchronous operations, caching, and server state.
- **Forms:** React Hook Form and Zod for performant, scalable form state management and schema validation.
- **Icons:** Lucide React for a comprehensive and consistent set of icons.
- **Notifications:** Sonner and the built-in shadcn/ui Toaster for user feedback.

## Library Usage Rules

To maintain consistency and quality, please adhere to the following rules:

### 1. Component Development
- **Primary Library:** Always use **shadcn/ui** components from the `src/components/ui` directory as the base for any UI element.
- **Customization:** Do **not** modify the files in `src/components/ui` directly. If a customized version of a component is needed, create a new component in `src/components` that wraps the shadcn/ui component and applies the necessary changes.
- **File Structure:**
    - All page-level components go in `src/pages`.
    - All reusable, custom components go in `src/components`.
    - All custom hooks go in `src/hooks`.
    - All utility functions go in `src/lib`.

### 2. Styling
- **Primary Library:** Use **Tailwind CSS** for all styling.
- **No Custom CSS:** Avoid writing custom CSS in `.css` files. All styling should be done with Tailwind utility classes. The existing `index.css` is for global styles and Tailwind directives only.

### 3. Routing
- **Primary Library:** Use **React Router (`react-router-dom`)**.
- **Route Definitions:** All application routes must be defined within the `<Routes>` component in `src/App.tsx`.

### 4. Authentication & Backend
- **Primary Library:** Use **Supabase (`@supabase/supabase-js`)**.
- **Authentication:** Use `@supabase/auth-helpers-react` and `@supabase/auth-ui-react` for managing user sessions and login forms.
- **Database & Storage:** All data operations (listings, profiles, favorites) and file uploads must go through the Supabase client.
- **Security:** Always implement and respect Supabase Row Level Security (RLS) policies.

### 5. Data Fetching & State
- **Server State:** Use **TanStack Query** for all interactions with the Supabase API. This includes fetching, caching, and mutating data.
- **Client State:** For simple, local component state, use React's built-in hooks like `useState` and `useReducer`.

### 6. Forms
- **Primary Library:** Use **React Hook Form** for managing form logic and state.
- **Validation:** Use **Zod** to define validation schemas for all forms. Connect Zod schemas to React Hook Form using the `@hookform/resolvers` package.

### 7. Icons
- **Primary Library:** Use **Lucide React** for all icons to ensure visual consistency.

### 8. Notifications
- **Primary Library:** Use the `useToast` hook from `src/hooks/use-toast.ts` (which powers the shadcn/ui Toaster) for system feedback (e.g., "Listing created successfully").
- **Alternative:** `Sonner` can be used for simpler, less intrusive notifications if needed.

By following these rules, we can ensure the codebase remains clean, consistent, and maintainable.