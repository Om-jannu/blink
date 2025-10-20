import { useState, useCallback } from 'react';
import { ArrowLeft, Upload, File, Lock, Clock, Shield, Check, Copy, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from './theme-toggle';
import { encryptFile } from '../lib/encryption';
import { createSecret } from '../lib/supabase';

interface FileShareProps {
  onBack: () => void;
}

export default function FileShare({ onBack }: FileShareProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [expiry, setExpiry] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [secretUrl, setSecretUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const expiryOptions = [
    { value: '15', label: '15 minutes' },
    { value: '1', label: '1 hour' },
    { value: '6', label: '6 hours' },
    { value: '24', label: '24 hours' },
    { value: '168', label: '7 days' }
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    
    // Check file size (5MB limit for free tier)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB for the free tier');
      return;
    }
    
    setFile(selectedFile);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.json', '.csv'],
      'application/json': ['.json'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    multiple: false,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      // Encrypt the file
      const { encrypted, key } = await encryptFile(file, password || undefined);
      
      // Calculate expiry time
      const expiryHours = parseFloat(expiry);
      const expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
      
      // Create secret in database
      const { id, error: dbError } = await createSecret({
        type: 'file',
        encrypted_content: encrypted,
        file_name: file.name,
        file_size: file.size,
        expiry_time: expiryTime,
        password_hash: password ? btoa(password) : undefined,
        encryption_key_or_salt: key,
      });

      if (dbError) {
        throw new Error(dbError);
      }

      // Create the shareable URL with key in fragment
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/view/${id}#${encodeURIComponent(key)}`;
      setSecretUrl(shareUrl);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create secret');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(secretUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (secretUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold mb-4">File Encrypted!</h2>
            <p className="text-muted-foreground mb-8">
              Your encrypted file is ready to share. The link will expire after viewing or at the set time.
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Share this link:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white dark:bg-slate-800 p-2 rounded border break-all">
                  {secretUrl}
                </code>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={onBack}
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Create Another
              </button>
              <button
                onClick={copyToClipboard}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                onClick={onBack}
                variant="ghost"
                size="sm"
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-2xl">Share Secret File</CardTitle>
            </div>
            <ThemeToggle />
          </div>
        </CardHeader>
        <CardContent>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Choose your file
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center space-x-3">
                  <File className="w-8 h-8 text-blue-600" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">
                    {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
                  </p>
                  <p className="text-muted-foreground">or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Max 5MB • Images, PDFs, text files supported
                  </p>
                </div>
              )}
            </div>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-700"
              >
                Remove file
              </button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password (optional)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Add extra security"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expiry" className="block text-sm font-medium mb-2">
                Expires in
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {expiryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || isLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Encrypting & Uploading...' : 'Create Secret Link'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Security Features:</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• End-to-end encryption (AES-256)</li>
            <li>• One-time view only</li>
            <li>• Auto-deletion after expiry</li>
            <li>• No account required</li>
            <li>• File size limit: 5MB (free tier)</li>
          </ul>
        </div>
        </CardContent>
      </Card>
    </div>
  );
}
