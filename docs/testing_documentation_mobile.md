# Testing Documentation & Specification: Absen Sholat Mobile

This document provides a comprehensive analysis and specification of the testing architecture designed for the **Absen Sholat Mobile Application** (built with Native Android & Kotlin). It maps out the directory layout, mocking requirements, and testing methodologies (White-Box, Black-Box, and Parameterized/Property-Based testing) to serve as a guideline for QA engineers, mobile developers, and test automation suites.

---

## 1. Testing Architecture & Tooling

The testing suite is integrated within the standard Android build toolchain, utilizing Gradle to compile and run local unit tests and device-based instrumented tests:

*   **Test Runner**: JUnit 4 (configured via `androidx.test.runner.AndroidJUnitRunner`).
*   **Local Unit Tests (JVM)**: Runs quickly on the host machine to test domain logic, helper utilities, and network token decoders.
*   **Instrumented UI Tests (device/emulator)**: [Espresso](https://developer.android.com/training/testing/espresso) combined with `ActivityScenario` to launch activities, click views, type text, and assert UI hierarchies.
*   **Mocking Library**: [Mockito](https://site.mockito.org/) (specifically `mockito-core` and `mockito-android`) or MockK to mock `Context`, `SharedPreferences`, and Retrofit API client interfaces.
*   **Secure Storage Engine**: `androidx.security:security-crypto` (`EncryptedSharedPreferences`) used to store persistent session JWT credentials.
*   **QR Scanner engine**: ZXing (`com.journeyapps:zxing-android-embedded`) for scanning physical check-in QR codes.

### Directory Layout
```
├── app/
│   └── src/
│       ├── test/java/com/xirpl2/SASMobile/          # Local JVM Unit Tests
│       │   ├── utils/
│       │   │   ├── SecurePreferencesTest.kt          # Tests token encryption & database migration
│       │   │   └── SafeNavigatorTest.kt              # Verifies navigation lifecycle exception checks
│       │   ├── network/
│       │   │   └── TokenAuthenticatorTest.kt         # Tests JWT token interception & renewal
│       │   └── ExampleUnitTest.kt
│       └── androidTest/java/com/xirpl2/SASMobile/   # Instrumented Device UI Tests
│           ├── MasukActivityTest.kt                  # Espresso tests for Form validation & Brute Force Lockout
│           ├── ScanQrActivityTest.kt                 # Espresso tests for Camera permission & Scanner verification
│           ├── PengajuanIzinActivityTest.kt          # Espresso tests for attachments & photo previewing
│           └── ExampleInstrumentedTest.kt
```

---

## 2. White-Box Testing Specifications

White-box testing validates native storage operations, token authenticator interception, navigation crash-prevention lifecycle assertions, and input sanitization bounds.

### A. Secure Storage and Network Autentikasi
These tests verify correct interaction with the Android Operating System APIs through Mockito stubs.

| Test Scenario | Target Logic Checked | Mock Requirements | Expected Assertion |
| :--- | :--- | :--- | :--- |
| **Secure Preferences Persistence** | Writing, reading, and deleting JWT keys in secure keystore | Mock `Context` and plain `SharedPreferences` | Verify values are written using AES256-GCM encryption wrappers and cleared cleanly on logout |
| **Legacy Preference Migration** | First-run migration of plain text configs to EncryptedSharedPreferences | Mock `Context` holding legacy key-value pairs | Legacy plaintext data is copied to the encrypted file; plaintext keys are purged upon commit |
| **Token HTTP Interception** | Intercepting requests to append JWT Bearer headers | Mock OkHttp Interceptor Chain | Requests are decorated with `Authorization: Bearer <token>` and matching device identifier headers |
| **Token Refresher (401)** | Renewing access tokens during invalid token returns | Mock Retrofit auth client & 401 callback | Authenticator captures HTTP 401, issues synchronous renew request, saves new token, or logs out user |

### B. Navigation Stability (`SafeNavigator` & `UniversalSafeNavigator`)
*   **Lifecycle Check**: Asserts that during transitions between activities, the navigator flags `isFinishing` or `isDestroyed` before attempting transitions to prevent `android.os.DeadObjectException` and Binder buffer overflow.

### C. Parameterized & Property-Based Testing
*   **Input Sanitization Boundaries**:
    *   **Invariant**: The sanitization utilities must parse strings of any size, including extreme Unicode sequences, Asian fonts, and emojis, without causing regular expression engine hangs (Catastrophic Backtracking) or formatting errors.
    *   **Execution**: Parameterized tests supply 200 combinations of extreme characters to validation methods.
*   **QR Scanner Decoder robustness**:
    *   **Invariant**: The QR base64 deserializer must gracefully catch parsing exceptions when encountering corrupted strings or non-json scans, rather than triggering a thread crash.

---

## 3. Black-Box Testing Specifications

Black-box testing asserts reactive UI widgets, form layouts, custom Toast notifications, and hardware runtime permission gates.

### A. Espresso Android UI Test Setup
Android Instrumented tests setup standard testing rules to execute UI assertions:

```kotlin
@RunWith(AndroidJUnit4::class)
class MasukActivityTest {
    
    @get:Rule
    val activityRule = ActivityScenarioRule(MasukActivity::class.java)

    @get:Rule
    val grantPermissionRule: GrantPermissionRule = GrantPermissionRule.grant(
        Manifest.permission.CAMERA
    )
}
```

### B. Screen Interaction Scenarios (`src/androidTest/`)

#### 1. Student Login Screen (`MasukActivityTest.kt`)
*   **Input Form Validation**:
    *   Simulates submitting empty credentials. Verifies that `TextInputLayout` display elements render validation messages (e.g. "NIS tidak boleh kosong").
*   **Brute Force Cooldown Lockout**:
    *   Simulates typing incorrect passwords and clicking "Masuk" 5 consecutive times.
    *   Asserts that the "Masuk" button becomes disabled (`isEnabled = false`) and displays a timer countdown (e.g., "Tunggu 30s...").
*   **Login Success**:
    *   Enters correct test credentials. Simulates clicking "Masuk". Asserts launcher navigates successfully to `BerandaActivity` and saves credentials.

#### 2. QR Scanner Screen (`ScanQrActivityTest.kt`)
*   **Camera Permission Gates**:
    *   Simulates entering screen with Camera Permission denied. Asserts that the application renders a custom permission warning dialog prompting the user to open device Settings.
*   **Check-In Result View**:
    *   Simulates camera scanning. Injects a mock success scan event. Asserts that `cardResult` becomes visible, displaying student name, class, prayer type, and timestamp values.

#### 3. Excuse Submission Screen (`PengajuanIzinActivityTest.kt`)
*   **Attachment Preview**:
    *   Simulates launching photo capture and returning a mock thumbnail. Asserts that the ImageView component updates with the thumbnail preview, and the layout remains visually stable.

---

## 4. Test Execution Guide

To execute the mobile test suite locally, use Gradle tasks within the `../mobile_ta` directory:

### Run Local Unit Tests (JVM)
```bash
./gradlew test
```
*Compiles the Kotlin source sets and executes all JVM-based unit tests quickly.*

### Run Instrumented UI Tests (Android Device / Emulator)
Ensure an emulator is active or a test device is connected via ADB, then run:
```bash
./gradlew connectedAndroidTest
```
*Installs the test APK and runs Espresso UI interactions on the simulated hardware.*

### Compile Test Coverage Reports
To generate code coverage profiles using JaCoCo:
```bash
./gradlew testDebugUnitTest --coverage
```
*Compiles HTML visualizer charts displaying code path coverage statistics inside `app/build/reports/tests/`.*
