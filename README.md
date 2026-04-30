# Fusion Starter Template

This is a React TypeScript application built with Vite and React Router, configured for Builder.io Fusion projects.

## Project Setup

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

## Design System

The design system (builder-ui-kit) is included as a local dependency via a .tgz file in this repository. There is no need to connect to a separate design system repository.

For additional clarity: In this Fusion space template, the `builder-ui-kit` repository is also added to the workspace. This allows direct access to the design system source for reference, support, and best practices.

Use the CSS files in `src/css` (such as `colors-tokens.css`, `fonts-tokens.css`, and `fontawesome.css`) for global styles, color and font tokens, and font integration to ensure consistent styling across the application.

## Fonts Localization

To localize the font family used for all build projects:

- Font Awesome fonts and styles are located in `public/fontawesome/`.
- All Proxima font files (e.g., `proxima.*`) are located in the `public/` folder.

## Storybook

A public Storybook instance for builder-ui-kit components is available at the URL specified in the environment variable `VITE_STORYBOOK_URL`. Do not hardcode the URL; set it in your environment or Builder Fusion environment.
Use this as a visual and technical reference for available components, usage examples, and props documentation.

**Note:** `builder-ui-kit` requires `@material-ui/core` (MUI v4) and `styled-components` as peer dependencies. These are included in this project’s dependencies to ensure compatibility and proper usage of the design system components.

## Coding Standards

Always use ES6 import syntax for builder-ui-kit components. For example:

```
import { DataTable, FilterGroup, Badge, Switch, Avatar, Button } from 'builder-ui-kit';
```

Do not use legacy require or default import styles.

When adding new functionality or enhancements to existing UI-Kit tools, reference the builder-ui-kit code source repository for additional support, implementation details, and best practices.

Whenever possible, use existing builder-ui-kit components when creating pages or new UI features, rather than building components from scratch with HTML tags. This ensures consistency and leverages the design system.

Do NOT use box-shadow or text-shadow in styled components. Only use approved design system styles to maintain consistency.

**Important:** Do NOT use the `<StrictMode>` tag in `src/index.tsx` when building or modifying the project, as it can cause conflicts and crashes with builder-ui-kit and MUI v4. Remove `<StrictMode>` to ensure compatibility and stability in Builder.io projects.

- `npm run dev` - Start development server on port 5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎨 Setting Up Your Design System

### Option 1: Private Design System Library

If your organization has a private npm package for your design system:

```bash
# Configure npm for private registry (if needed)
npm config set @yourorg:registry https://your-registry-url.com

# Install your private design system
npm install @yourorg/design-system

# Or with authentication token
npm install @yourorg/design-system --registry https://your-registry-url.com --auth-token YOUR_TOKEN
```

### Option 2: Public Component Libraries

For publicly available design systems:

```bash
# Material-UI
npm install @mui/material @emotion/react @emotion/styled
```

### Option 3: Link Additional Repositories (Workspace/Monorepo)

For teams using separate repositories for their design system or Storybook, you can set up a multi-repository workspace. This gives Builder Fusion's AI visibility across multiple codebases:

1. **Create a workspace configuration:**
   Create a `workspace.json` file in your project root:

   ```json
   {
     "folders": [
       {
         "path": ".",
         "name": "main-app"
       },
       {
         "path": "../your-design-system",
         "name": "design-system"
       },
       {
         "path": "../your-storybook",
         "name": "storybook"
       }
     ]
   }
   ```

2. **In Builder Fusion UI:**
   - Go to your [Project Settings](https://www.builder.io/c/docs/projects-git-providers#add-additional-repositories)
   - Click "Add Repository" to connect your design system or Storybook repo
   - This gives the AI context about your components across repositories

   ```

   ```

## 🤖 Creating Custom AI Instructions

Builder Fusion uses several configuration files to provide context and instructions to the AI. Here's how to set them up:

### 1. AGENTS.md File

Create an `AGENTS.md` file in your project root to provide high-level context about your project:

```markdown
# Project Overview

This is a React TypeScript application built with Vite and React Router.

## Coding Standards

- Where the AI should import your components from
- Which packages to use for what components
- Design token information
- Any other specific instructions on how to use your design system
- Examples of good and bad usage

## Project Structure

- `/src/components` - Reusable UI components
- `/src/pages` - Page components for routing
- `/src/utils` - Utility functions
- `/src/styles` - Global styles and themes
```

### 3. .builderrules Directory

Create more granular rules for specific aspects of your codebase:

```bash
mkdir -p .builder/rules
```

Add rule files (`.md` format) for different concerns i.e:

**.builder/rules/testing.md:**

```markdown
# Testing Requirements

- Write unit tests for utility functions
- Use React Testing Library for component tests
- Maintain 80% code coverage
- Run tests before committing
```

Learn more about [AI instructions](https://www.builder.io/blog/agents-md) and [configuration files](https://www.builder.io/c/docs/projects-configuration-files).

## 📚 Indexing Your Components

Component indexing helps Builder Fusion's AI understand your design system and generate code that follows your patterns:

### Component Indexing (Enterprise)

Follow instructions listed here [component indexing](https://www.builder.io/c/docs/component-indexing).

## 🏗️ Creating a Starter Template in Fusion

To use this repository as a starter template in Builder Fusion:

### Method 1: Direct Repository Connection

1. Push your customized version to GitHub/GitLab/Bitbucket
2. Go to [Builder Fusion](https://www.builder.io/fusion)
3. Click "New Project"
4. Connect your Git provider
5. Select your starter template repository
6. Configure build settings:
   - **Setup command:** `npm install`
   - **Dev command:** `npm run dev`
   - **Port:** `5173`

### Method 2: Template Registration

For teams wanting to share this as an official template:

1. **Prepare your template:**
   - Ensure all dependencies are in `package.json`
   - Include clear documentation
   - Add example components and pages
   - Configure AGENTS.md with template-specific instructions

2. **Register as a template:**
   - Follow the [official guide](https://www.builder.io/c/docs/starter-templates#create-a-starter-template)
   - Submit your template for review
   - Once approved, it will appear in the template gallery

3. **Template structure requirements:**
   ```
   your-template/
   ├── src/
   ├── public/
   ├── package.json
   ├── README.md
   ├── AGENTS.md
   ├── .builder/
   │   └── rules/
   └── .claude/
       └── commands/
   ```

Watch the [video tutorial](https://www.youtube.com/watch?v=KEK_WcSTiuE&t=1s) for a complete walkthrough.

## 📖 Additional Resources

- [Builder Fusion Documentation](https://www.builder.io/c/docs/fusion)
- [Getting Started with Fusion](https://www.builder.io/c/docs/get-started-fusion)
- [Creating Starter Templates](https://www.builder.io/c/docs/create-a-starter-template)
- [Connecting Git Providers](https://www.builder.io/c/docs/projects-git-providers)
- [Configuration Files Guide](https://www.builder.io/c/docs/projects-configuration-files)
- [AGENTS.md Best Practices](https://www.builder.io/blog/agents-md)
- [Component Indexing](https://www.builder.io/c/docs/component-indexing)
- [Video Tutorial: Creating Templates](https://www.youtube.com/watch?v=KEK_WcSTiuE&t=1s)

## 🤝 Contributing

Feel free to fork this template and customize it for your team's needs. If you have improvements that could benefit others, please submit a pull request!

## 📝 License

MIT License - feel free to use this starter template for any project.

---

Built with ❤️ for [Builder Fusion](https://www.builder.io/fusion) developers
