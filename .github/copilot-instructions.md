
## Task planning and problem-solving
<!-- the most important problem-solving guidelines -->
<!-- e.g. "plan the task before writing any code" -->
- Before each task, you must first complete the following steps:
  1. Provide a full plan of your changes.
  2. Provide a list of behaviors that you'll change.
  3. Provide a list of test cases to add.
- **Always ask the user for permission before starting to write or modify any code.** Present the plan first and wait for explicit approval before proceeding.
- **Always show a preview of the code changes** (as a code block in the chat) before applying them to any file. Wait for explicit approval before making the actual file change.
- **When creating or modifying multiple files, do them one file at a time.** After each file, stop and ask for permission before moving to the next file.
- Before you add any code, always check if you can just re-use
  or re-configure any existing code to achieve the result.
- Always focus on simplicity and precision and not comprehensiveness.
- When writing tests, focus on the happy path and only the most
  important edge cases.
- Before adding a new test, always make sure that a similar test
  doesn't exist already.
- use KISS (Keep It Simple, Stupid) principle to guide your design and implementation choices.


## Coding guidelines
<!-- the most important coding guidelines -->
- When fixing a bug, always write a failing test first.
- Always follow the DRY principle and avoid code duplication.
- Avoid hard-coded numbers and use shared constants instead.
- Prefix boolean variables with an appropriate verb, e.g. `isLoading`, `hasPermissions`, `matchesFilter`.
## General Principles

- **Clean Code:** Prioritize **readability, maintainability, and reusability**.
- **Conciseness:** Aim for concise and expressive code.
- **Descriptive Naming:** Use clear and descriptive names for variables, functions, components, and files (e.g., `getUserProfile`, `ProductCard`, `useAuth`).
- **DRY (Don't Repeat Yourself):** Extract reusable logic into functions, custom hooks, or components.
- **Modularization:** Break down complex problems and features into smaller, manageable units (components, functions, utilities).
- **TypeScript First:** All new code should be written in **TypeScript**, leveraging its type safety features.
- **Testable Code:** Design code to be easily testable.
- **Package Management:** This project uses **pnpm** for managing dependencies. All package installations and scripts should use `pnpm` instead of `npm` or `yarn`.
- **Documentation:** All principal documentation should be created in the `docs` folder.

### General Guidelines

- **Co-locate logic that change together**
- **Group code by feature, not by type**
- **Separate UI, logic, and data fetching**
- **Typesafety across the whole stack – db-server-client. If a type changes, everywhere using it should be aware.**
- **Clear product logic vs product infrastructure separation**
- **Design code such that it is easy to replace and delete**
- **Minimize places/number of changes to extend features**
- **Functions / APIs should do one thing well. One level of abstraction per function**
- **Minimize API interface and expose only what's necessary**
- **Favor pure functions, it makes logic easy to test**
- **Long, clear names over short, vague names, even at the cost of verbosity**

---

## React Specific Guidelines

### Component Design

- **Functional Components & Hooks:** Prefer **functional components with React Hooks**. Avoid class components unless explicitly for error boundaries.
- **Single Responsibility:** Each component should ideally have one primary responsibility. **Components should be kept small and focused.**
- **Component Naming:** Use `PascalCase` for all component names (e.g., `MyButton`, `UserAvatar`).
- **Props:**
  - Use `camelCase` for prop names.
  - Destructure props in the component's function signature.
  - Provide clear `interface` or `type` definitions for props in TypeScript.
- **Immutability:** Never mutate props or state directly. Always create new objects or arrays for updates.
- **Fragments:** Use `<>...</>` or `React.Fragment` to avoid unnecessary DOM wrapper elements.
- **Custom Hooks:** Extract reusable stateful logic into **custom hooks** (e.g., `useDebounce`, `useLocalStorage`).
- **UI Components:** Use [Mantine](https://mantine.dev/) for building UI components to ensure consistency and accessibility. **Avoid native HTML elements** (`<div>`, `<button>`, `<input>`, `<table>`, etc.) — always prefer the Mantine equivalent (`Box`, `Button`, `TextInput`, `Table`, etc.).