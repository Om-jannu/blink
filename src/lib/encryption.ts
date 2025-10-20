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
 * @returns Object containing encrypted text and key
 */
export function encryptText(text: string, password?: string): EncryptionResult {
  const key = password || CryptoJS.lib.WordArray.random(256/8).toString();
  const encrypted = CryptoJS.AES.encrypt(text, key).toString();
  
  return {
    encrypted,
    key
  };
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
 * Encrypts a file using AES encryption
 * @param file - The file to encrypt
 * @param password - Optional password for additional security
 * @returns Promise with encrypted file data and key
 */
export async function encryptFile(file: File, password?: string): Promise<EncryptionResult> {
  const key = password || CryptoJS.lib.WordArray.random(256/8).toString();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const fileData = e.target?.result as ArrayBuffer;
        const wordArray = CryptoJS.lib.WordArray.create(fileData);
        const encrypted = CryptoJS.AES.encrypt(wordArray, key).toString();
        
        resolve({
          encrypted,
          key
        });
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
