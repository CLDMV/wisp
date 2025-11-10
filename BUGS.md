# Bug Reports and Fixes

## CRITICAL: Caller Path Resolution Failure (Fixed in v1.0.1)

**Date Reported:** November 10, 2025  
**Status:** ✅ FIXED  
**Severity:** Critical  
**Affected Versions:** v1.0.0  

### Description

The wisp module had a fundamental flaw in its caller path resolution system that caused relative paths to be resolved from the wrong location, leading to `ENOENT` errors when loading JSON files.

### Error Example

```
Error: @cldmv/wisp: Failed to load JSON file at file:///P:/Dropbox/Sync/Documents/CLDMV/repos/tv-control/node_modules/@cldmv/wisp/examples/test-devices.json: ENOENT: no such file or directory
```

When calling:
```javascript
const testDevicesJson = wispSync("../examples/test-devices.json");
```

The path was being resolved relative to `src/wisp.mjs` instead of the actual caller's location.

### Root Cause Analysis

The issue was in `src/lib/resolve-from-caller.mjs` with multiple contributing factors:

1. **Hardcoded Filename Filtering**: The resolver used hardcoded filenames from slothlet (e.g., `"slothlet.mjs"`) that didn't apply to wisp
2. **Incorrect Stack Analysis**: Expected call chain `user-code.mjs → index.mjs → src/wisp.mjs` but `index.mjs` doesn't create stack frames due to `export *` optimization
3. **Package Boundary Detection**: Failed to properly distinguish between package infrastructure and user code
4. **Two-Flag State Machine Issues**: Required both `src/dist` exit AND `index.*` exit flags, but `index.mjs` was optimized away

### Technical Details

**Expected Stack Trace:**
```
user-code.mjs → index.mjs → src/wisp.mjs → src/lib/resolve-from-caller.mjs
```

**Actual Stack Trace:**
```
user-code.mjs → src/wisp.mjs → src/lib/resolve-from-caller.mjs
```

The `index.mjs` frame was missing due to Node.js optimizing `export *` re-exports.

### Solution Implemented

Replaced the flawed hardcoded approach with a **generic, package-agnostic** solution:

1. **Dynamic Package Root Detection**: Uses `package.json` to find package boundaries
2. **Exit-Based State Machine**: Tracks when we exit from `src/` or `dist/` directories
3. **Simplified Flag Logic**: Only requires exiting `src/dist` (not both flags)
4. **Removed Hardcoded Names**: No more dependency on specific filenames

**Key Changes:**
- Added `findPackageRoot()` function for dynamic package detection
- Reimplemented `pickPrimaryBaseFile()` with exit-based detection
- Simplified logic to handle `index.mjs` optimization
- Removed all hardcoded filename filters

### Test Coverage

Enhanced test suite to include:
- Proper entry point usage (`index.mjs` instead of `src/wisp.mjs`)
- Specific relative path resolution tests
- Real-world usage scenario validation

### Verification

✅ Fixed original error scenario  
✅ All existing tests pass  
✅ New relative path tests pass  
✅ Works through proper entry point  
✅ Generic solution works for any package structure  

### Files Modified

- `src/lib/resolve-from-caller.mjs` - Complete resolver rewrite
- `test/wisp.spec.mjs` - Fixed to use proper entry point and added relative path tests

### Impact

This fix resolves the fundamental caller resolution issue that prevented wisp from working correctly in consuming modules. The solution is now robust and package-agnostic, making it suitable for reuse in other projects.