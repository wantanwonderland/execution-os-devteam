---
name: unit-test-gen
description: Killua generates unit tests for changed files using Jest/Vitest, Pytest, or Go testing. Covers happy path, edge cases, error cases, and mocking. Follows TDD flow.
---

# Unit Test Generation

When Killua is dispatched to generate unit tests, follow this workflow exactly.

## Input

Killua receives one of:
- A file path or directory to generate tests for
- A git diff (changed files from a PR or commit)
- A function or module name to test

## Execution Flow

### 1. Identify Testable Units

From the target file(s), extract all testable units:
- **Functions**: exported functions, utility helpers, pure transformations
- **Classes/methods**: public methods with meaningful logic
- **API handlers**: request/response logic, input validation, error paths
- **Data transformations**: parsers, formatters, validators

For each unit, identify:
- Inputs (args, env vars, config)
- Outputs (return values, side effects, thrown errors)
- Dependencies to mock (DB, HTTP clients, file system, external modules)

If working from a diff:
```bash
git diff HEAD~1 --name-only   # changed files
git diff HEAD~1 -- {file}     # specific file diff
```

Filter to source files only (skip test files, config, migrations, assets).

### 2. Detect Framework

| Signal | Framework |
|--------|-----------|
| `package.json` has `jest` or `@jest/` | Jest (JS/TS) |
| `package.json` has `vitest` | Vitest (JS/TS) |
| `*.py` source files, `pytest.ini` or `pyproject.toml` | Pytest (Python) |
| `go.mod` present | Go testing |

Default to Jest if JS/TS and no config found.

### 3. Generate Tests

#### Jest / Vitest (JS/TS)

```typescript
// Pattern: describe block per function, it() per test case
import { functionName } from '../path/to/module';

// Mock external dependencies at the top
jest.mock('../services/database', () => ({
  query: jest.fn(),
}));

describe('functionName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Happy path
  it('returns expected result for valid input', () => {
    const result = functionName(validInput);
    expect(result).toEqual(expectedOutput);
  });

  // Edge cases
  it('handles empty input gracefully', () => {
    expect(functionName([])).toEqual([]);
    expect(functionName('')).toBe('');
  });

  it('handles null/undefined without throwing', () => {
    expect(() => functionName(null)).not.toThrow();
  });

  // Error cases
  it('throws ValidationError for invalid input', () => {
    expect(() => functionName(invalidInput)).toThrow('expected error message');
  });

  it('propagates upstream errors correctly', async () => {
    mockDb.query.mockRejectedValueOnce(new Error('DB error'));
    await expect(functionName(input)).rejects.toThrow('DB error');
  });

  // Mocking example
  it('calls dependency with correct args', () => {
    functionName(input);
    expect(mockDb.query).toHaveBeenCalledWith(expectedQuery, expectedParams);
  });
});
```

Vitest differences: replace `jest.mock` with `vi.mock`, `jest.fn()` with `vi.fn()`, `jest.clearAllMocks()` with `vi.clearAllMocks()`.

#### Pytest (Python)

```python
# Pattern: TestClass per module/class, test_ functions per case
import pytest
from unittest.mock import MagicMock, patch
from module.path import function_name

@pytest.fixture
def valid_input():
    return {"key": "value"}

class TestFunctionName:
    # Happy path
    def test_returns_expected_result(self, valid_input):
        result = function_name(valid_input)
        assert result == expected_output

    # Edge cases
    def test_handles_empty_input(self):
        assert function_name([]) == []
        assert function_name("") == ""

    def test_handles_none_without_raising(self):
        result = function_name(None)
        assert result is not None  # or whatever contract applies

    # Error cases
    def test_raises_value_error_for_invalid_input(self):
        with pytest.raises(ValueError, match="expected message"):
            function_name(invalid_input)

    # Mocking example
    @patch("module.path.external_service")
    def test_calls_service_with_correct_args(self, mock_service):
        mock_service.return_value = {"status": "ok"}
        function_name(input_data)
        mock_service.assert_called_once_with(expected_args)

    # Parametrize for multiple inputs
    @pytest.mark.parametrize("input,expected", [
        (1, "one"),
        (2, "two"),
        (3, "three"),
    ])
    def test_multiple_inputs(self, input, expected):
        assert function_name(input) == expected
```

#### Go Testing

```go
// Pattern: TestXxx per function, table-driven tests for multiple cases
package module_test

import (
    "testing"
    "errors"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "your/module/path"
)

// Table-driven test pattern
func TestFunctionName(t *testing.T) {
    tests := []struct {
        name    string
        input   InputType
        want    OutputType
        wantErr bool
    }{
        {
            name:  "happy path: valid input",
            input: InputType{Field: "value"},
            want:  OutputType{Result: "expected"},
        },
        {
            name:    "error: nil input returns error",
            input:   InputType{},
            wantErr: true,
        },
        {
            name:  "edge: empty string handled",
            input: InputType{Field: ""},
            want:  OutputType{Result: "default"},
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := FunctionName(tt.input)
            if tt.wantErr {
                assert.Error(t, err)
                return
            }
            assert.NoError(t, err)
            assert.Equal(t, tt.want, got)
        })
    }
}

// Mock pattern using testify/mock
type MockDependency struct {
    mock.Mock
}

func (m *MockDependency) Method(arg string) (string, error) {
    args := m.Called(arg)
    return args.String(0), args.Error(1)
}
```

### 4. TDD Flow (When Writing New Code)

When the task is to implement a feature test-first:

1. **Write failing test**: Generate the test file with all cases. Run to confirm failure:
   ```bash
   # Jest/Vitest
   npx jest path/to/test --no-coverage
   # Pytest
   pytest tests/test_module.py -v
   # Go
   go test ./... -run TestFunctionName -v
   ```

2. **Implement minimum code**: Write just enough to make tests pass. No gold-plating.

3. **Verify all pass**:
   ```bash
   npx jest path/to/test --coverage
   pytest tests/test_module.py -v --tb=short
   go test ./... -v
   ```

4. **Report results**: Show pass/fail counts and coverage delta.

### 5. File Placement

| Framework | Source file | Test file location |
|-----------|------------|-------------------|
| Jest/Vitest | `src/utils/parser.ts` | `src/utils/parser.test.ts` or `src/utils/__tests__/parser.test.ts` |
| Pytest | `app/services/parser.py` | `tests/services/test_parser.py` |
| Go | `pkg/parser/parser.go` | `pkg/parser/parser_test.go` |

Check existing test file locations in the project before deciding — match the convention already in use.

### 6. Mocking Strategy

| Dependency Type | Jest/Vitest | Pytest | Go |
|----------------|-------------|--------|----|
| Database | `jest.mock` the DB module | `unittest.mock.patch` | testify/mock interface |
| HTTP calls | `jest.mock('axios')` or `msw` handlers | `responses` library or `httpretty` | `httptest.NewServer` |
| File system | `jest.mock('fs')` | `tmp_path` fixture | `os.CreateTemp` |
| Time/Date | `jest.useFakeTimers()` | `freezegun` | clock injection |
| Environment vars | `process.env.VAR = 'test'` in `beforeEach` | `monkeypatch.setenv` | `t.Setenv` |

### 7. Write Results

1. **Test files**: Write generated test files to correct paths (per table above)
2. **Coverage report**: Run with coverage flag, capture output
3. **Vault report**: Write summary to `09-ops/test-reports/YYYY-MM-DD-unit-test-gen.md`:

```markdown
---
title: "Unit Test Generation -- YYYY-MM-DD"
created: YYYY-MM-DD
type: note
tags: [testing, unit-tests]
status: active
project: []
related: []
---

## Unit Test Generation Report -- YYYY-MM-DD

**Target**: {file or directory}
**Framework**: {Jest/Vitest/Pytest/Go}
**Tests Generated**: {count} test cases across {count} files

| File | Test Cases | Happy Path | Edge Cases | Error Cases |
|------|-----------|------------|------------|-------------|
| {file} | {n} | {n} | {n} | {n} |

### Coverage Delta
Before: {x}% → After: {y}% ({+z}% increase)

### Mocks Created
- {dependency}: {mock strategy used}

### Next Steps
{Any untestable units requiring refactor for testability}
```

## Constraints

- Never generate tests that always pass (no assertions, trivial matchers)
- Every test must have at least one meaningful assertion
- Mock at the boundary — don't mock the module under test itself
- Match existing test file naming and structure conventions
- If a unit cannot be tested without refactoring, flag it — do not skip silently
- Report exact test counts — never approximate
