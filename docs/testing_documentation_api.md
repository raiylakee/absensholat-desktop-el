# Testing Documentation & Specification: Absen Sholat API

This document provides a comprehensive analysis and specification of the testing architecture implemented in the **Absen Sholat Go API (Backend)**. It maps out the directories, tools, and testing methodologies (White-Box, Black-Box, and Property-Based/Fuzz testing) to serve as a guide for QA engineers, backend developers, and automated pipelines.

---

## 1. Testing Architecture & Tooling

The backend testing suite is built using Go's native testing toolchain combined with SQLite in-memory mocking and popular assertion packages:

*   **Test Runner**: Go native test framework (`go test`).
*   **Assertion Library**: [testify](https://github.com/stretchr/testify) (`testify/assert` and `testify/require` for clean, readable assertions).
*   **Database Mocking**: [GORM SQLite Driver](https://github.com/go-gorm/sqlite) (creates transient `:memory:` databases to isolate tests from production PostgreSQL).
*   **HTTP Engine Testing**: Gin's test engine powered by Go's native `net/http/httptest` (simulates HTTP request and response structures without binding to a physical TCP port).
*   **Logger Mock**: Zap logger in test mode (`zap.NewNop()` or custom buffers to capture logs).

### Directory Layout
```
├── handlers/                        # Controller layer handling HTTP requests
│   ├── auth.go
│   ├── auth_test.go                 # Integration tests for Login/Logout/Me endpoints
│   ├── jadwal.go
│   ├── jadwal_test.go               # Unit tests for academic calendar scheduling
│   ├── qrcode.go
│   ├── qrcode_test.go               # Tests for dynamic attendance QR generation
│   ├── siswa.go
│   ├── siswa_test.go                # Tests for student CRUD and data formatting
│   ├── features_03_04_05_test.go    # Flow tests for features 3, 4, 5
│   ├── features_06_08_09_12_test.go # Flow tests for features 6, 8, 9, 12
│   ├── notification_feature_test.go # Integration tests for user notifications
│   └── test_helpers_test.go         # Test initialization helpers for handlers
├── services/                        # Business logic and external caching/notification engines
│   ├── notification_service.go
│   └── services_test.go             # Unit tests for services and notification queues
├── utils/                           # Core utilities: token helpers, validators, error handlers
│   ├── jwt.go
│   ├── jwt_test.go                  # Unit tests for JWT signing & claims validation
│   ├── otp.go
│   ├── otp_test.go                  # Unit tests for OTP code lifecycle
│   ├── validation.go
│   ├── validation_test.go           # Unit tests for validation routines
│   └── test_helpers_test.go         # Helper functions for utility package tests
└── tests/                           # System integration & black-box API testing
    ├── auth_middleware_test.go      # Verifies JWT validation and RBAC
    ├── blackbox_helpers_test.go     # Sets up virtual DB seeds and test HTTP clients
    ├── e2e_flows_test.go            # Verifies complete role access control matrices
    ├── error_format_test.go         # Assertions on error format standardizations
    ├── health_test.go               # Health-check endpoint tests
    ├── input_validation_test.go     # Verifies SQLi, XSS, and content boundaries
    ├── ratelimit_test.go            # Verifies strict rate limiting on auth paths
    └── security_headers_test.go     # Verifies CORS, Security headers, and request-ids
```

---

## 2. White-Box Testing Specifications

White-box testing validates internal logic flow, database migrations, middleware processing, encryption/hashing operations, and security constraints.

### A. Middleware & Security Filters (`tests/`)

These tests verify how requests are filtered, modified, and authorized before reaching core business logic.

| Test Scenario | Target Logic Checked | Mock Requirements | Expected Assertion |
| :--- | :--- | :--- | :--- |
| **Security Headers Present** | Standard HTTP security headers injection | Virtual Gin engine with security middleware | Headers contain: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and custom `Server: AbsenSholat API` |
| **Request ID Management** | Generation and pass-through of `X-Request-ID` | Mock request with and without custom ID headers | If request has ID, matches request. If request is empty, a new UUID is generated and returned |
| **CORS Policy** | Cross-Origin Resource Sharing handling | CORS configuration in non-production mode | `OPTIONS` requests return appropriate `Access-Control-Allow-Origin` and methods |
| **Rate Limiting Limits** | Rate limits on auth routes (e.g. 5 requests per minute) | Redis cache mock / local key storage | The 7th request to a protected endpoint returns HTTP `429 Too Many Requests` |
| **Auth RBAC Restriction** | Token claims validation for roles (admin vs siswa) | JWT generation for specific roles | If a standard student tries to access administrative paths, return HTTP `403 Forbidden` |

### B. Input Validation Filters (`tests/input_validation_test.go`)

Verifies system defenses against common payloads and payload boundaries.

*   **SQL Injection Filter**: Requests containing malicious queries (e.g., `?search=1%20OR%201%3D1`) are intercepted and blocked with HTTP `400 Bad Request`.
*   **Cross-Site Scripting (XSS) Filter**: Requests containing HTML or script tags (e.g., `?search=<script>alert('xss')</script>`) are rejected with HTTP `400 Bad Request`.
*   **Oversized Payloads**: Requests sending content sizes exceeding the allowed threshold (e.g. >10MB) are immediately cut off returning HTTP `413 Payload Too Large`.
*   **Content-Type Check**: Endpoints expecting JSON payload reject `text/plain` or other types, returning HTTP `415 Unsupported Media Type`.

---

## 3. Black-Box Testing Specifications

Black-box tests focus on API endpoint functionality, request body validations, schema conformity, and data normalization.

### A. Virtual Database Engine & Seeding (`tests/blackbox_helpers_test.go`)

Before invoking endpoint tests, the framework initializes an isolated SQLite in-memory instance, runs schema migrations, and seeds test data:

```go
func setupBlackboxDB(t *testing.T) *gorm.DB {
    t.Helper()
    db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
    if err != nil {
        t.Fatalf("failed to open test db: %v", err)
    }
    // AutoMigrate all models
    db.AutoMigrate(&models.Account{}, &models.Siswa{}, &models.Staff{}, &models.Kelas{})
    return db
}
```

### B. Endpoint Interaction Scenarios (`handlers/` & `tests/`)

#### 1. Authentication Lifecycle (`handlers/auth_test.go`)
*   **Incorrect Password**: Posting credentials with mismatching values returns HTTP `401 Unauthorized` with a standardized error response.
*   **Successful Login**: Posting correct user credentials returns HTTP `200 OK` including a signed JWT token and user profile metadata.
*   **Logout Blacklisting**: Invoking the logout endpoint records the token inside GORM db blacklist table, preventing subsequent requests using the same token.

#### 2. Student & Presence Operations (`handlers/siswa_test.go`)
*   **Student Profile Fetch**: Authenticated requests to `/me` return the exact student profile containing class structures and student identity matching the authenticated token.
*   **Attendance Verification**: Verifies scanned QR dynamic codes. Checks parameters for expiration timestamps and signs. Invalid QR signatures return validation failure messages.

---

## 4. Property-Based & Invariant Testing (Fuzzing)

To match the safety invariants of the desktop codebase, the API utilizes **Go Fuzzing** (native fuzzing introduced in Go 1.18) to ensure core parsing functions never crash the backend runtime when handling malformed inputs.

### Fuzz Targets

#### 1. Token JWT Parser (`utils/jwt_test.go`)
*   **Invariant**: The parser must handle *any* arbitrary string payload without panic/nil pointer exceptions, returning either a parsed token structure or a graceful invalid token error.
*   **Execution**: Native Go fuzzing targets the parser function:
    ```go
    func FuzzParseToken(f *testing.F) {
        f.Add("header.payload.signature") // Seed corpus
        f.Fuzz(func(t *testing.T, tokenStr string) {
            _, _ = ParseToken(tokenStr) // Assert function never panics
        })
    }
    ```

#### 2. Input Validation Handlers (`utils/validation_test.go`)
*   **Invariant**: Email and alphanumeric validators must process long, complex, and binary strings without entering infinite regex evaluation loops or crashing.
*   **Execution**: Fuzzes the validation utility functions to ensure they complete execution in <10ms for any randomized character string.

---

## 5. Test Execution Guide

To execute the test suite in the API project, run the following commands in the backend repository root:

### Run All Tests
```bash
go test ./...
```
*Executes all handler, service, utility, and E2E tests.*

### Run Single Package with Verbose Logs
```bash
go test -v ./tests
```
*Runs the integration tests in the `tests/` folder with verbose step output.*

### Run Fuzzing Tests
```bash
go test -fuzz=FuzzParseToken ./utils
```
*Initiates the Go fuzzing engine for the JWT token parser.*

### Generate Coverage Reports
```bash
go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out
```
*Compiles code coverage data and launches a local browser interface showing which lines are covered.*
