# Testing Documentation & Specification: Absen Sholat Desktop
This document provides a comprehensive analysis and specification of the testing architecture implemented in the **Absen Sholat Desktop Application**. It maps out the directories, tools, and testing methodologies (White-Box, Black-Box, and Property-Based testing) to serve as a guide for AI agents, QA engineers, and developers.

---

## 1. Testing Architecture & Tooling

The testing suite is powered by a modern JavaScript/TypeScript testing stack optimized for Vite and React:

*   **Test Runner**: [Vitest](https://vitest.dev/) (a fast Vite-native testing framework that shares configuration with Vite).
*   **Virtual DOM**: [jsdom](https://github.com/jsdom/jsdom) (simulates browser environments inside Node.js for rendering React components).
*   **Component Testing**: [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) (React Testing Library) & `@testing-library/user-event` (simulates realistic user interactions).
*   **Property-Based Testing**: [fast-check](https://github.com/dubzzz/fast-check) (generates hundreds of randomized inputs to assert logical invariants).
*   **IPC Mocking**: Custom global mocks defined in the testing setup to mock Electron's main process context bridge API (`window.electronAPI`).

### Directory Layout
```
├── electron/
│   └── __tests__/
│       └── handlers.test.js          # Integration tests for main process IPC handlers
├── src/
│   └── __tests__/
│       ├── setup.ts                  # Global test setup (defines window.electronAPI mock)
│       ├── components/               # Black-box tests for UI widgets and sections
│       │   ├── AppSidebar.test.tsx
│       │   ├── BuktiFotoPreview.property.test.tsx
│       │   ├── BuktiFotoPreview.test.tsx
│       │   ├── KelolaGuruSection.test.tsx
│       │   ├── PrintHeader.test.tsx
│       │   ├── ProfileSection.test.tsx
│       │   ├── SiswaProfile.test.tsx
│       │   └── UserDeviceCard.test.tsx
│       ├── hooks/                    # Unit tests for custom React hooks
│       ├── lib/                      # White-box unit & property-based utility tests
│       │   ├── api-utils.test.ts
│       │   ├── auth-session.test.ts
│       │   ├── export-filename.property.test.ts
│       │   ├── export-filename.test.ts
│       │   └── svg-to-png.test.ts
│       └── pages/                    # Semi-integration tests for dashboard routing
│           └── Dashboard.test.tsx
```

---

## 2. White-Box Testing Specifications
White-box tests verify the internal logic, algorithms, session states, and inter-process communication routes within the codebase.

### A. IPC Main Process Handlers (`electron/__tests__/handlers.test.js`)
These tests inspect how the Electron main process interacts with HTTP services, filesystem operations, and caches.

| Test Scenario | Target Logic Checked | Mock Requirements | Expected Assertion |
| :--- | :--- | :--- | :--- |
| **X-Hardware-ID inclusion** | Header injection in network requests | Mock `os.homedir` & file read for `.presensisholat-hwid` | All HTTP headers contain `"X-Hardware-ID": "stored-hwid-1234"` |
| **Login handler conflict** | Swallowing HTTP 409 (already registered device) | Mock login success (200) followed by device registration (409) | Login succeeds and resolves token; error is caught and ignored internally |
| **Parallel dashboard fetches** | Orchestrated concurrent API requests via `Promise.all` | Mock `fetch` endpoints for `/charts`, `/attendance`, `/closest` | Returns consolidated dashboard data object in a single transaction |
| **Cache invalidation mapping** | Cache clearing on mutation requests (POST/PUT/DELETE) | Mock cache storage and `invalidateRelated` lookup | Mutation routes clear dependency queries (e.g. updating a student invalidates `/analytics`) |

### B. Utility Libraries (`src/__tests__/lib/`)
Direct unit tests validating standalone functions.

*   `api-utils.test.ts`: Verifies payload extraction (`extractData`), pagination metadata wrapping (`extractPagination`), and mapping database keys into application fields (`normalizeStudent`, `normalizeAttendance`).
*   `auth-session.test.ts`: Validates storing, reading, and clearing authorization session profiles from storage.
*   `export-filename.test.ts`: Validates generation of structured filenames for exported documents based on dates, data types, and filtering parameters.

### C. Property-Based Testing (`fast-check`)
Property tests enforce boundary rules and invariants by running functions under hundreds of randomized parameters.

*   **File Char/Length Safety (`export-filename.property.test.ts`)**:
    *   **Invariant**: The generated filename must only contain safe alphanumeric characters, periods, or hyphens (`/^[a-z0-9.\-]+$/`) and never exceed `255` characters.
    *   **Execution**: Validates 200 random runs generating combinations of names, filters, NIS formats, and dates.
*   **File Extension Matching**:
    *   **Invariant**: The generated filename must end with the exact file format suffix requested (e.g. `.xlsx`, `.csv`, `.pdf`, `.png`).
*   **UI Input Bounds (`BuktiFotoPreview.property.test.tsx`)**:
    *   **Invariant**: Component must gracefully handle any random string input in the `url` property without throwing React crashes, dynamically adapting display output.

---

## 3. Black-Box Testing Specifications
Black-box testing verifies user-facing requirements, input validation, navigation, and reactive component behaviors by simulating user interactions.

### A. UI Integration Mock (`src/__tests__/setup.ts`)
Before rendering UI components, the test suite injects a mock implementation of the context bridge to intercept IPC messages:

```typescript
// Example from setup.ts: Mocking window.electronAPI context bridge
global.window = global.window || {};
window.electronAPI = {
  login: vi.fn(),
  register: vi.fn(),
  getGuruList: vi.fn(),
  getManagementClasses: vi.fn(),
  getStudents: vi.fn(),
  // ...other mocked handlers
};
```

### B. Component Interaction Scenarios (`src/__tests__/components/`)

#### 1. Teacher Management (`KelolaGuruSection.test.tsx`)
*   **Roster Display**: Asserts that loading triggers a spinner animation, which disappears upon data resolution, rendering rows containing teacher NIP, name, email, and class badges.
*   **Search Form**: Simulates typing a name query into the search input and pressing **Enter** or clicking the **Cari** button, verifying it invokes `window.electronAPI.getGuruList` with the correct `search` parameter.
*   **Pagination Control**: Simulates clicking "Sebelumnya" and "Berikutnya", verifying they increment page bounds and call APIs accordingly.

#### 2. Device Authorization UI (`UserDeviceCard.test.tsx`)
*   **Not Registered State**: If the device is unrecognized, asserts that a warning banner is shown with a **Daftarkan Perangkat Ini** button. Clicking it initiates registration and reloads device status.
*   **Mismatch Warning**: If the logged-in student has registered a different device, asserts that a critical alert is shown with an **Ajukan Ganti Perangkat** option.
*   **Binding Release**: Simulates clicking "Lepas Perangkat" (Unbind), which displays a confirmation modal, and confirms by invoking `window.electronAPI.deleteProfileDevice`.

#### 3. Excuse Application & Previews (`BuktiFotoPreview.test.tsx`)
*   **Triage Render Logic**:
    *   If `url` ends with `.png`, `.jpg`, `.jpeg`, `.gif`, or `.webp`, verifies an `<img>` tag is rendered.
    *   If `url` ends with `.pdf` or other documents, verifies no image is shown, instead displaying file details and filename.
*   **Download Callback**: Verifies clicking the download button invokes the parent `onDownload` handler, and setting `isDownloading: true` disables the button state.

---

## 4. Test Execution Guide

To run the test suites locally, execute the following commands in the project directory:

### Run All Tests
```bash
npm run test
```
*Runs Vitest in watch mode. Press `q` to quit, or `u` to update snapshots.*

### Run Single Run (CI/CD Mode)
```bash
npx vitest run
```
*Executes all suites once and exits, returning an exit code representing success/failure.*

### Generate Coverage Reports
```bash
npx vitest run --coverage
```
*Compiles code coverage data to analyze code paths visited during testing.*
