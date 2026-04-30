# Project Setup

- **Development Server Port:** 5173
- **Setup Script:** pnpm install --no-frozen-lockfile
- **Development Server Command:** npm run dev

**React Version Requirement:**  
This project must use **React 18**. Specify the following versions in your dependencies for compatibility:

```
"react": "^18.2.0"
"react-dom": "^18.2.0"
```

If your Vite configuration or dependencies default to React 19, downgrade them to React 18 to ensure compatibility with builder-ui-kit and project standards.

## Project Structure

The following structure applies to both this project and any new Builder.io projects created from this template:

- `/src/components` - Reusable UI components
- `/src/pages` - Page components for routing. **When creating new pages, add them to the `src/pages` folder.**
- `/src/utils` - Utility functions
- `/src/styles` - Global styles and themes

## Builder.io Fusion Tealium Project

In the Fusion Tealium Project in Builder.io, there is already an indexed Design System named "tealium-ui-kit". This helps the AI understand the builder-ui-kit component patterns and coding conventions more effectively.

# Project Overview

This is a React TypeScript application built with Vite and React Router.

## Design System

The design system (builder-ui-kit) is included as a local dependency via a .tgz file in this repository. There is no need to connect to a separate design system repository.

For additional clarity: In this Fusion space template, the `builder-ui-kit` repository is also added to the workspace. This allows direct access to the design system source for reference, support, and best practices.

Use the CSS files in `src/css` (such as `colors-tokens.css`, `fonts-tokens.css`, and `fontawesome.css`) for global styles, color and font tokens, and font integration to ensure consistent styling across the application.

## Fonts Localization

To localize the font family used for all build projects:

- Font Awesome fonts and styles are located in `public/fontawesome/`.
- All Proxima font files (e.g., `proxima.*`) are located in the `public/` folder.

**Storybook:**  
A public Storybook instance for builder-ui-kit components is available at: [VITE_STORYBOOK_URL](https://your-storybook-url.com)  
A public Storybook instance for builder-ui-kit components is available at the URL specified in the environment variable `VITE_STORYBOOK_URL`. Do not hardcode the URL; set it in your environment or Builder Fusion environment.

Use this as a visual and technical reference for available components, usage examples, and props documentation.

**Note:** `builder-ui-kit` requires `@material-ui/core` (MUI v4) and `styled-components` as peer dependencies. These are included in this project’s dependencies to ensure compatibility and proper usage of the design system components.

## Coding Standards

When adding new functionality or enhancements to existing UI-Kit tools, reference the builder-ui-kit code source repository for additional support, implementation details, and best practices.

Whenever possible, use existing builder-ui-kit components when creating pages or new UI features, rather than building components from scratch with HTML tags. This ensures consistency and leverages the design system.

Do NOT use box-shadow or text-shadow in styled components. Only use approved design system styles to maintain consistency.

**Important:** Do NOT use the `<StrictMode>` tag in `src/index.tsx` when building or modifying the project, as it can cause conflicts and crashes with builder-ui-kit and MUI v4. Remove `<StrictMode>` to ensure compatibility and stability in Builder.io projects.
