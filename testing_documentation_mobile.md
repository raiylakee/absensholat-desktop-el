# Testing Documentation & Specification: Absen Sholat Mobile

This document provides a comprehensive analysis and specification of the testing architecture designed for the **Absen Sholat Mobile Application** (built with React Native & Expo). It maps out the directory layout, mocking requirements, and testing methodologies (White-Box, Black-Box, and Property-Based testing) to serve as a guideline for QA engineers, mobile developers, and future test suites.

---

## 1. Testing Architecture & Tooling

The testing suite is designed around the standard React Native ecosystem, utilizing Vitest/Jest and Testing Library to render screens and simulate user interactions on simulated devices:

*   **Test Runner**: [Jest](https://jestjs.io/) or [Vitest](https://vitest.dev/) (Vite-native test runner optimized for speed).
*   **Component Rendering**: [@testing-library/react-native](https://callstack.github.io/react-native-testing-library/) (React Native Testing Library) to render virtual Native views and assert DOM/UI states.
*   **User Interactions**: `@testing-library/user-event` or native press wrappers (simulating gestures like tapping, typing, scrolling, and camera permission toggles).
*   **Property-Based Testing**: [fast-check](https://github.com/dubzzz/fast-check) (generates randomized inputs to test boundary conditions in token decoders, offline storage structures, and QR parsing).
*   **Native Modules Mocking**: Custom mock setups for hardware-dependent packages:
    *   `expo-secure-store`: Mocks persistent secure storage for session JWT tokens.
    *   `expo-local-authentication`: Mocks biometric sensors (Fingerprint, FaceID) to test device binding.
    *   `expo-camera` / `expo-barcode-scanner`: Mocks viewfinder captures and returns successful QR payload scans.
    *   `@react-native-async-storage/async-storage`: Mocks persistent offline cache storage.

### Directory Layout
```
├── src/
│   └── __tests__/
│       ├── setup.ts                  # Global mock declarations (SecureStore, Camera, LocalAuth)
│       ├── screens/                  # Black-box screen flow tests
│       │   ├── LoginScreen.test.tsx
│       │   ├── DashboardScreen.test.tsx
│       │   ├── QRCodeScannerScreen.test.tsx
│       │   └── ExcuseSubmissionScreen.test.tsx
│       ├── components/               # UI component-level integration tests
│       │   ├── BiometricButton.test.tsx
│       │   ├── ExcusePhotoPreview.test.tsx
│       │   └── HistoryListItem.test.tsx
│       ├── hooks/                    # Unit tests for custom React hooks
│       │   ├── useAuth.test.ts       # Validates stateful authentication lifecycle
│       │   └── useAttendance.test.ts # Validates offline synchronization and API queues
│       └── lib/                      # White-box unit & property-based tests
│           ├── qr-decoder.property.test.ts
│           ├── qr-decoder.test.ts
│           ├── secure-storage.test.ts
│           └── date-helper.test.ts
```

---

## 2. White-Box Testing Specifications

White-box testing validates native storage operations, biometric access paths, cryptographic signature decoding, and offline syncing queues.

### A. Native Storage and Sensor Integrations

These tests verify interaction with native APIs through mock structures.

| Test Scenario | Target Logic Checked | Mock Requirements | Expected Assertion |
| :--- | :--- | :--- | :--- |
| **Secure Token Persistence** | Writing, reading, and deleting JWT tokens | Mock `expo-secure-store` | Tokens are written successfully on login and deleted on logout; invalid tokens return null |
| **Biometric Authentication** | Checking support and triggering FaceID/Fingerprint | Mock `expo-local-authentication` | If hardware is supported, trigger fingerprint popup. Clicking success resolves login credentials |
| **Offline Cache Synced** | Caching attendance scans when connection is lost | Mock `@react-native-async-storage` | Attendance data is saved locally when offline; synced and deleted when connection restores |
| **QR Code Decryption** | Validating digital signature and timestamp of check-in QR | Cryptographic signature mock | Resolves checking payload details if signature is valid; fails if QR signature is spoofed |

### B. Utility Libraries (`src/__tests__/lib/`)

*   `qr-decoder.test.ts`: Asserts parser extracts coordinates, school IDs, and signature timestamps, and flags expired QR codes (e.g. >30 seconds old) as invalid.
*   `secure-storage.test.ts`: Verifies secure credential handling and keys encryption validations.
*   `date-helper.test.ts`: Formats timestamps matching timezone configurations of the server.

### C. Property-Based Testing (`fast-check`)

*   **QR Scanner Input Boundaries (`qr-decoder.property.test.ts`)**:
    *   **Invariant**: The decoding function must handle any random string payload without causing a JavaScript thread crash, returning either a parsed object or a graceful signature validation exception.
    *   **Execution**: Generates 200 iterations containing random strings, symbols, or broken base64 payloads to verify decoder crash safety.
*   **Excuse Text Sanitization**:
    *   **Invariant**: Excuse text fields must process raw text of any length and character set (including Emojis and Unicode) without breaking form layout or causing GORM parse errors in local SQLite storage.

---

## 3. Black-Box Testing Specifications

Black-box testing verifies user journeys, reactive UI feedback, layouts, and permissions on native screens.

### A. UI Mock Setup (`src/__tests__/setup.ts`)

Before executing tests, native platform views must be stubbed or mocked:

```typescript
// Example from setup.ts: Mocking Expo camera and biometric modules
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  },
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])), // Fingerprint
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));
```

### B. Screen Interaction Scenarios (`src/__tests__/screens/`)

#### 1. Student Login Screen (`LoginScreen.test.tsx`)
*   **Authentication Validation**: Verifies entering empty forms yields warning text. Entering correct parameters submits to server, triggers biometrics enrollment proposal, and redirects to dashboard.
*   **Biometric Login Bypass**: If credentials are saved, tapping the Biometric button invokes `expo-local-authentication` immediately, bypassing manual form entries.

#### 2. QR Scanner Screen (`QRCodeScannerScreen.test.tsx`)
*   **Permission Requests**: If camera permission is denied, asserts that a banner is rendered: "Camera permission is required to scan QR". If approved, renders the active viewport wrapper.
*   **Check-in Callback**: Simulating a camera frame scan triggers a mock API request, showing a check-in success tick anim or an error alert overlay.

#### 3. Excuse Submission Screen (`ExcuseSubmissionScreen.test.tsx`)
*   **Attachment Preview**: Renders thumbnail of the photo captured using the device camera or chosen from the library. Submitting without attachment sends request to backend with file attribute as null.

---

## 4. Test Execution Guide

To run the mobile test suites, run these commands inside the mobile repository:

### Run All Tests
```bash
npm run test
```
*Launches Jest/Vitest in watch mode for changes.*

### Run Single Run for CI Pipelines
```bash
npx jest --watchAll=false
```
*Performs a single complete scan and returns code 0 (success) or 1 (failure).*

### Compile Coverage Report
```bash
npm run test -- --coverage
```
*Generates HTML visualizer files outlining component coverage levels.*
