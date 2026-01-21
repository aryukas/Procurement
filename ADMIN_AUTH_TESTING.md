# Admin Auth Testing Guide

## Quick Start

### Setup Firestore Rules (Optional - for development)
Allow read/write to admin_accounts for authenticated users:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /admin_accounts/{document=**} {
      allow read, write: if true; // Change for production!
    }
  }
}
```

## Test Scenarios

### Scenario 1: Create Admin Account (Signup)
**Steps:**
1. Start the dev server: `npm run dev`
2. Navigate to http://localhost:5173
3. Click "Admin Login" button
4. Switch to "Sign Up" tab
5. Fill form with:
   - Full Name: `Test Admin`
   - Username: `testadmin`
   - Email: `test@admin.com`
   - Password: `TestPass123`
   - Confirm Password: `TestPass123`
6. Click "Create Account"

**Expected Result:**
- Success message: "Account created successfully! Logging in..."
- Auto-redirect to login form after 1.5s
- Admin document created in Firestore `admin_accounts` collection
- Document contains all fields with correct values

### Scenario 2: Login with Admin Credentials
**Steps:**
1. From signup success (auto-redirected to login)
2. Enter credentials:
   - Username: `testadmin`
   - Password: `TestPass123`
3. Click "Sign In"

**Expected Result:**
- Success message: "Login successful! Redirecting..."
- Redirect to AdminDashboard after 1.5s
- Dashboard shows logged-in user info with ADMIN role
- currentUser state contains admin details

### Scenario 3: Invalid Credentials
**Test Case A - Wrong Password:**
1. Username: `testadmin`
2. Password: `WrongPassword`
3. Click "Sign In"

**Expected**: Error message "Invalid username or password"

**Test Case B - Non-existent Username:**
1. Username: `nonexistent`
2. Password: `TestPass123`
3. Click "Sign In"

**Expected**: Error message "Invalid username or password"

### Scenario 4: Signup Validation
**Test Case A - Username Too Short:**
- Username: `abc` (less than 4 chars in signup validation)
- Password: `TestPass123`

**Expected**: Error message "Username must be at least 4 characters"

**Test Case B - Passwords Don't Match:**
- Password: `TestPass123`
- Confirm Password: `TestPass124`

**Expected**: Error message "Passwords do not match"

**Test Case C - Password Too Short:**
- Password: `Test1`
- Confirm Password: `Test1`

**Expected**: Error message "Password must be at least 8 characters"

**Test Case D - Invalid Email:**
- Email: `notanemail`

**Expected**: Error message "Invalid email format"

**Test Case E - Duplicate Username:**
- Username: `testadmin` (already exists)
- New email: `different@admin.com`

**Expected**: Error message "Username already exists"

**Test Case F - Duplicate Email:**
- Username: `newadmin`
- Email: `test@admin.com` (already exists)

**Expected**: Error message "Email already registered"

## Debugging Tips

### Check Firestore Collection
1. Go to Firebase Console
2. Navigate to Firestore Database
3. Check `admin_accounts` collection
4. Verify document structure matches AdminAccount interface

### Browser Console Logs
- Check for errors: Right-click → Inspect → Console tab
- Look for messages from AdminAuthService (catch blocks log errors)

### Common Issues

**Issue**: "Cannot find module 'AdminAuthService'"
- **Solution**: Verify file is at `src/services/AdminAuthService.ts`
- **Solution**: Check import path uses correct capitalization

**Issue**: "Firestore collection not found"
- **Solution**: Create collection manually in Firestore Console
- **Solution**: Firestore auto-creates on first document write

**Issue**: "Invalid credentials" for correct password
- **Solution**: Check case sensitivity (usernames are lowercased automatically)
- **Solution**: Verify password was entered correctly during signup
- **Solution**: Check browser console for crypto errors

**Issue**: Signup redirects to login but no account created
- **Solution**: Check Firestore database permissions
- **Solution**: Check browser console for Firebase errors
- **Solution**: Verify Firebase SDK is properly initialized

## Load Testing

### Test Multiple Admin Accounts
```
Account 1: Username: admin1, Password: Admin@1234
Account 2: Username: admin2, Password: Admin@5678
Account 3: Username: admin3, Password: Admin@9012
```

### Stress Test Password Hashing
- Try 10+ quick signups
- Monitor browser performance (may be slow with SHA-256)
- Check if UI remains responsive

## Firestore Query Examples

### Find Admin by Username
```javascript
db.collection('admin_accounts')
  .where('username', '==', 'testadmin')
  .get()
```

### Find Active Admins
```javascript
db.collection('admin_accounts')
  .where('isActive', '==', true)
  .get()
```

### Find Recent Logins (last 7 days)
```javascript
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
db.collection('admin_accounts')
  .where('lastLogin', '>=', sevenDaysAgo)
  .orderBy('lastLogin', 'desc')
  .get()
```

## Performance Notes

### SHA-256 Hashing Impact
- Hashing takes 5-50ms depending on browser
- Password generation may cause slight UI freeze
- For production: Use backend API with bcrypt (much faster)

### Firestore Queries
- Duplicate checking queries: 2 reads per signup
- Username/email lookups are indexed (fast)
- Consider query caching for frequent lookups

## Security Testing Checklist

- [x] Passwords not displayed in plain text
- [x] Passwords hashed before storage
- [x] Case-insensitive username comparison prevents case attacks
- [x] Duplicate usernames/emails prevented
- [x] Minimum password length enforced (8 chars)
- [x] Email format validated
- [x] Last login timestamp updated on successful auth
- [x] Inactive accounts cannot login
- [ ] Rate limiting (needs implementation)
- [ ] HTTPS enforcement (for production)
- [ ] Session timeouts (needs implementation)

## Next Steps After Successful Testing

1. **Backend Password Hashing**: Implement Firebase Cloud Functions to hash passwords on server
2. **Rate Limiting**: Add login attempt throttling via Firestore
3. **Email Verification**: Send confirmation email on signup
4. **Password Reset**: Implement forgot password flow
5. **Admin Dashboard**: Build admin-specific features
6. **Activity Logging**: Log all admin actions
7. **2FA**: Add two-factor authentication
