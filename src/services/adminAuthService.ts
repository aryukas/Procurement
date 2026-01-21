// src/services/AdminAuthService.ts
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { firestore } from '../firebase';

export interface AdminAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const COLLECTION = 'admin_accounts';

class AdminAuthService {
  /**
   * Hash password using Web Crypto API with SHA-256 and salt
   * Production systems should hash passwords on the backend using bcrypt or Argon2
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a random salt for password hashing
   */
  private generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify a password against its hash
   */
  private async verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
    const computedHash = await this.hashPassword(password, salt);
    return computedHash === hash;
  }

  /**
   * Sign up a new admin account
   */
  async signup(username: string, email: string, password: string, fullName: string) {
    try {
      // Validate inputs
      if (!username || !email || !password || !fullName) {
        return { success: false, error: 'All fields are required' };
      }

      if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { success: false, error: 'Invalid email format' };
      }

      // Check if username already exists
      const usernameQuery = query(
        collection(firestore, COLLECTION),
        where('username', '==', username.toLowerCase())
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
        return { success: false, error: 'Username already exists' };
      }

      // Check if email already exists
      const emailQuery = query(
        collection(firestore, COLLECTION),
        where('email', '==', email.toLowerCase())
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        return { success: false, error: 'Email already registered' };
      }

      // Hash password
      const salt = this.generateSalt();
      const passwordHash = await this.hashPassword(password, salt);

      // Create admin account
      const adminAccount = {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
        salt,
        fullName,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(firestore, COLLECTION), adminAccount);

      return {
        success: true,
        admin: {
          ...adminAccount,
          id: docRef.id,
        },
      };
    } catch (error: any) {
      console.error('Error signing up:', error);
      return { success: false, error: error.message || 'Signup failed' };
    }
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string) {
    try {
      if (!username || !password) {
        return { success: false, error: 'Username and password are required' };
      }

      // Find admin by username
      const q = query(
        collection(firestore, COLLECTION),
        where('username', '==', username.toLowerCase()),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: false, error: 'Invalid username or password' };
      }

      const adminDoc = snapshot.docs[0];
      const admin = adminDoc.data() as Omit<AdminAccount, 'id'>;

      // Verify password
      const passwordValid = await this.verifyPassword(password, admin.salt, admin.passwordHash);

      if (!passwordValid) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Update last login
      await updateDoc(doc(firestore, COLLECTION, adminDoc.id), {
        lastLogin: new Date().toISOString(),
      });

      return {
        success: true,
        admin: {
          ...admin,
          id: adminDoc.id,
          lastLogin: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error('Error logging in:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  /**
   * Get admin by username
   */
  async getAdminByUsername(username: string) {
    try {
      const q = query(
        collection(firestore, COLLECTION),
        where('username', '==', username.toLowerCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        ...doc.data(),
        id: doc.id,
      } as AdminAccount;
    } catch (error) {
      console.error('Error fetching admin:', error);
      return null;
    }
  }

  /**
   * Get admin by email
   */
  async getAdminByEmail(email: string) {
    try {
      const q = query(
        collection(firestore, COLLECTION),
        where('email', '==', email.toLowerCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        ...doc.data(),
        id: doc.id,
      } as AdminAccount;
    } catch (error) {
      console.error('Error fetching admin:', error);
      return null;
    }
  }

  /**
   * Change admin password
   */
  async changePassword(adminId: string, currentPassword: string, newPassword: string) {
    try {
      if (!currentPassword || !newPassword) {
        return { success: false, error: 'Current and new passwords are required' };
      }

      if (newPassword.length < 8) {
        return { success: false, error: 'New password must be at least 8 characters' };
      }

      if (currentPassword === newPassword) {
        return { success: false, error: 'New password must be different from current password' };
      }

      // Get admin by ID
      const adminRef = doc(firestore, COLLECTION, adminId);
      const snapshot = await getDocs(query(collection(firestore, COLLECTION)));

      const adminDoc = snapshot.docs.find(d => d.id === adminId);
      if (!adminDoc) {
        return { success: false, error: 'Admin not found' };
      }

      const admin = adminDoc.data() as Omit<AdminAccount, 'id'>;

      // Verify current password
      const isValid = await this.verifyPassword(currentPassword, admin.salt, admin.passwordHash);

      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password and update
      const newPasswordHash = await this.hashPassword(newPassword, admin.salt);

      await updateDoc(adminRef, {
        passwordHash: newPasswordHash,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error changing password:', error);
      return { success: false, error: error.message || 'Failed to change password' };
    }
  }
}

export default new AdminAuthService();
