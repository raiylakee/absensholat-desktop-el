# Instructions for Generating Native Android Testing Documentation

This instruction guide is designed for an AI agent to generate/rewrite the testing documentation files (`testing_documentation_mobile.md` and `testing_bab_mobile.html`) for the **Absen Sholat Mobile** application located at `../mobile_ta`.

---

## ⚠️ Critical Context & Codebase Identification
The previous version of the testing documentation incorrectly assumed the mobile application was built using **React Native & Expo**. This is false. 

Upon scanning the `../mobile_ta` directory, the mobile app is a **Native Android application** written in **Kotlin** and built using **Gradle** (Kotlin DSL: `build.gradle.kts` files).

### Key Architectural details of `../mobile_ta`:
1. **Language/Framework**: Native Android (Kotlin), targeting SDK 36, compiled with Java 11.
2. **UI Architecture**: XML layouts combined with Android View Binding.
3. **Core Dependencies**:
   - **Retrofit & Gson**: Networking framework to talk to the Absen Sholat API.
   - **AndroidX Security Crypto**: `EncryptedSharedPreferences` for secure storage (e.g. JWT tokens and user session data).
   - **ZXing & ZXing Android Embedded**: Barcode/QR Code scanning engine.
   - **WorkManager**: Periodic background notification polling (`NotificationPollWorker`).
   - **MPAndroidChart**: Statistical charts displayed on the dashboards.
4. **Main UI Activities (`com.xirpl2.SASMobile`)**:
   - `MasukActivity.kt`: Login screen with validation, error states on `TextInputLayout`, and brute force cooldown (5 attempts lock out for 30 seconds).
   - `ScanQrActivity.kt`: QR code check-in scanner utilizing ZXing camera barcode view.
   - `PengajuanIzinActivity.kt`: Student excuse submission with photo/file attachments and preview thumbnail.
   - `BerandaActivity.kt` / `BerandaAdminActivity.kt` / `BerandaGuruActivity.kt`: Role-based dashboards.
   - `AdminDeviceManagementActivity.kt`: Authenticated device listing and management.
5. **Testing Stack**:
   - **Local Unit Tests**: JUnit 4 (`src/test/java`).
   - **Instrumented/UI Tests**: AndroidX Test + JUnit 4 + Espresso (`src/androidTest/java`).
   - **Mocking**: Mockito or MockK (for mocking API responses and android context).

---

## Task Instructions for the AI Agent

You must overwrite two files in the workspace directory `/home/raiyan/dev/absensholat-desktop-el`:
1. [testing_documentation_mobile.md](file:///home/raiyan/dev/absensholat-desktop-el/testing_documentation_mobile.md): A developer guide containing the technical testing specifications in English.
2. [testing_bab_mobile.html](file:///home/raiyan/dev/absensholat-desktop-el/testing_bab_mobile.html): An Indonesian academic report in the style of "BAB IV PENGUJIAN DAN ANALISIS" (suitable for thesis/docx printing), which translates the testing process into standard Indonesian academic research formatting.

---

### Step 1: Rewrite `testing_documentation_mobile.md`
Generate a technical specifications document that matches the structure below, using the actual Native Android architecture.

#### Structure of `testing_documentation_mobile.md`:
1. **Title**: `# Testing Documentation & Specification: Absen Sholat Mobile`
2. **1. Testing Architecture & Tooling**:
   - Describe **JUnit 4** for unit testing.
   - Describe **Espresso** & **ActivityScenario** for UI assertions and interaction simulations.
   - Describe **Mockito / MockK** for mocking network components (Retrofit/OkHttp) and secure storage objects.
   - Outline the **Directory Layout** representing standard native Android test source sets (`src/test` and `src/androidTest`).
3. **2. White-Box Testing Specifications**:
   - **Secure Store Integration**: Test scenario verifying `SecurePreferences` object (encrypting JWT tokens, migration of plaintext SharedPreferences properties, and setting brute-force login lockout attributes).
   - **Network Authenticator**: Test scenario verifying `TokenAuthenticator` (intercepting HTTP 401, refreshing tokens, saving to preferences, or logging out user on failure).
   - **Boundary/Property Tests**: Parameterized JUnit tests simulating randomized input strings (extreme unicode, emojis, sizing) targeting name formatting, time parsing, and QR base64 decoding safety.
4. **3. Black-Box Testing Specifications**:
   - **UI Mock Setup**: Describe how `GrantPermissionRule` is used to mock camera permission during QR scan tests, and how standard Espress Mocking (or `MockWebServer`) stub API payloads.
   - **Screen Interaction Scenarios**:
     - *MasukActivity*: Form validation (empty NIS/Password yields `TextInputLayout` errors), brute-force locking (5 failed logins disable the submit button and display the cooldown countdown), and successful login flow.
     - *ScanQrActivity*: Denied camera permission state shows dialog, successful QR payload capture displays `cardResult` showing check-in details.
     - *PengajuanIzinActivity*: Validating image attachment previews and form payload posts.
5. **4. Test Execution Guide**:
   - Commands to execute tests: `./gradlew test` for local unit tests and `./gradlew connectedAndroidTest` for instrumented tests.

---

### Step 2: Rewrite `testing_bab_mobile.html`
Generate an Indonesian-language academic testing report. The file should be written in clean HTML styled with a "Times New Roman" print layout matching standard Indonesian thesis requirements (size A4, margins 3-3-3-4 cm, double line spacing).

#### Structure of `testing_bab_mobile.html`:
1. **Header**: `<h1>BAB IV<br>PENGUJIAN DAN ANALISIS (MOBILE APPLICATION)</h1>`
2. **4.1. Rencana Pengujian (Test Plan)**:
   - Academic explanation of testing methodologies on Android devices (JUnit for Unit Testing, Espresso for UI Integration, Mockito for Hardware and API Mocks).
3. **4.2. Kasus Uji (Test Cases)**:
   - **4.2.1. Pengujian Kotak Hitam (Black-Box Testing)**:
     - Renders a table detailing Espresso UI test scenarios (ID, Komponen, Skenario, Masukan, Hasil yang Diharapkan). Include tests for `MasukActivity` (validation and 30s lockout cooldown), `ScanQrActivity` (permissions and scan success/failure), and `PengajuanIzinActivity` (attachment thumbnail preview).
   - **4.2.2. Pengujian Kotak Putih (White-Box Testing)**:
     - Renders a table detailing JUnit/Mockito code tests (ID, Modul, Skenario, Kondisi Internal, Kriteria Keberhasilan). Include tests for `SecurePreferences` migration, JWT token validation, `TokenAuthenticator` token refreshing, and crash prevention checks in navigation handlers.
   - **4.2.3. Pengujian Invarian / Parameterized Testing**:
     - Renders a table detailing input robustness tests. Describe testing the inputs with Unicode/Emojis and boundary check-in parsing.
4. **4.3. Pelaksanaan dan Hasil Pengujian**:
   - Summary of test execution results. Provide an academic table mapping overall passed/failed scenarios with a 100% success rate conclusion.
