import CryptoJS from 'crypto-js';

export interface EncryptionResult {
  encrypted: string;
  key: string;
}

export interface DecryptionResult {
  decrypted: string;
  success: boolean;
}

/**
 * Encrypts text using AES encryption
 * @param text - The text to encrypt
 * @param password - Optional password for additional security
 * @returns Object containing encrypted text and key/salt
 */
export function encryptText(text: string, password?: string): EncryptionResult {
  if (password) {
    // Password-protected: Generate random salt, derive key from password+salt
    const salt = CryptoJS.lib.WordArray.random(16).toString();
    const derivedKey = CryptoJS.PBKDF2(password, salt, { keySize: 256/32, iterations: 100000 }).toString();
    const encrypted = CryptoJS.AES.encrypt(text, derivedKey).toString();
    // Return salt (not derived key) - server cannot decrypt without password
    return { encrypted, key: salt };
  }
  // Non-password: Generate random encryption key
  const randomKey = CryptoJS.lib.WordArray.random(256/8).toString();
  const encrypted = CryptoJS.AES.encrypt(text, randomKey).toString();
  return { encrypted, key: randomKey };
}

/**
 * Decrypts text using AES decryption
 * @param encryptedText - The encrypted text
 * @param key - The decryption key
 * @returns Object containing decrypted text and success status
 */
export function decryptText(encryptedText: string, key: string): DecryptionResult {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key).toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      return { decrypted: '', success: false };
    }
    
    return {
      decrypted,
      success: true
    };
  } catch (error) {
    return { decrypted: '', success: false };
  }
}

/**
 * Decrypts text using password-based key derivation
 * @param encryptedText - The encrypted text
 * @param password - The password
 * @param salt - The salt used for key derivation
 * @returns Object containing decrypted text and success status
 */
export function decryptTextWithPassword(encryptedText: string, password: string, salt: string): DecryptionResult {
  try {
    const derivedKey = CryptoJS.PBKDF2(password, salt, { keySize: 256/32, iterations: 100000 }).toString();
    const decrypted = CryptoJS.AES.decrypt(encryptedText, derivedKey).toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      return { decrypted: '', success: false };
    }
    
    return {
      decrypted,
      success: true
    };
  } catch (error) {
    return { decrypted: '', success: false };
  }
}

/**
 * Encrypts a file using AES encryption
 * @param file - The file to encrypt
 * @param password - Optional password for additional security
 * @returns Promise with encrypted file data and key/salt
 */
export async function encryptFile(file: File, password?: string): Promise<EncryptionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result as ArrayBuffer;
        const wordArray = CryptoJS.lib.WordArray.create(fileData);
        
        let encrypted: string;
        let keyOrSalt: string;
        
        if (password) {
          // Password-protected: Generate random salt, derive key from password+salt
          const salt = CryptoJS.lib.WordArray.random(16).toString();
          const derivedKey = CryptoJS.PBKDF2(password, salt, { keySize: 256/32, iterations: 100000 }).toString();
          encrypted = CryptoJS.AES.encrypt(wordArray, derivedKey).toString();
          keyOrSalt = salt; // Return salt (not derived key)
        } else {
          // Non-password: Generate random encryption key
          const randomKey = CryptoJS.lib.WordArray.random(256/8).toString();
          encrypted = CryptoJS.AES.encrypt(wordArray, randomKey).toString();
          keyOrSalt = randomKey;
        }
        
        resolve({ encrypted, key: keyOrSalt });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Decrypts a file using AES decryption
 * @param encryptedData - The encrypted file data
 * @param key - The decryption key
 * @param originalFileName - The original file name
 * @returns Promise with decrypted file or null if decryption fails
 */
export async function decryptFile(
  encryptedData: string, 
  key: string, 
  originalFileName: string
): Promise<File | null> {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    const wordArray = decrypted;
    
    if (!wordArray || wordArray.sigBytes === 0) {
      return null;
    }
    
    const arrayBuffer = wordArrayToArrayBuffer(wordArray);
    return new File([arrayBuffer], originalFileName);
  } catch (error) {
    return null;
  }
}

/**
 * Decrypts a file using password-based key derivation
 * @param encryptedData - The encrypted file data
 * @param password - The password
 * @param salt - The salt used for key derivation
 * @param originalFileName - The original file name
 * @returns Promise with decrypted file or null if decryption fails
 */
export async function decryptFileWithPassword(
  encryptedData: string, 
  password: string, 
  salt: string, 
  originalFileName: string
): Promise<File | null> {
  try {
    const derivedKey = CryptoJS.PBKDF2(password, salt, { keySize: 256/32, iterations: 100000 }).toString();
    const decrypted = CryptoJS.AES.decrypt(encryptedData, derivedKey);
    const wordArray = decrypted;
    
    if (!wordArray || wordArray.sigBytes === 0) {
      return null;
    }
    
    const arrayBuffer = wordArrayToArrayBuffer(wordArray);
    return new File([arrayBuffer], originalFileName);
  } catch (error) {
    return null;
  }
}

/**
 * Converts CryptoJS WordArray to ArrayBuffer
 */
function wordArrayToArrayBuffer(wordArray: CryptoJS.lib.WordArray): ArrayBuffer {
  const arrayOfWords = wordArray.hasOwnProperty("words") ? wordArray.words : [];
  const length = wordArray.hasOwnProperty("sigBytes") ? wordArray.sigBytes : arrayOfWords.length * 4;
  const uInt8Array = new Uint8Array(length);
  let index = 0, word, i;
  
  for (i = 0; i < length; i++) {
    word = arrayOfWords[i];
    uInt8Array[index++] = word >> 24;
    uInt8Array[index++] = (word >> 16) & 0xff;
    uInt8Array[index++] = (word >> 8) & 0xff;
    uInt8Array[index++] = word & 0xff;
  }
  
  return uInt8Array.buffer;
}

/**
 * Generates a random UUID for secret links
 */
export function generateSecretId(): string {
  return CryptoJS.lib.WordArray.random(16).toString();
}
