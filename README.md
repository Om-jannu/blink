# 🔒 Blink - Secure Share

**Share secrets that vanish — truly private, one-time, and encrypted.**

Blink is a burn-after-read file and text sharing platform designed for individuals, professionals, and businesses who want to send confidential information securely. Once viewed, the message or file self-destructs — ensuring no trace remains on the server.

## ✨ Features

- **End-to-End Encryption**: AES-256 encryption done client-side
- **One-Time View**: Each secret can only be viewed once
- **Auto-Destruct**: Files and messages automatically delete after viewing
- **No Account Required**: Anonymous usage for basic features
- **File Support**: Upload and share encrypted files (1MB limit for free tier)
- **Password Protection**: Optional password for additional security
- **Expiry Options**: Set custom expiration times

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for backend)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up Supabase:**
   - Create a new Supabase project
   - Create the following table in your Supabase SQL editor:

```sql
CREATE TABLE secrets (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('text', 'file')),
  encrypted_content TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
  view_count INTEGER DEFAULT 0,
  password_hash TEXT,
  encryption_salt TEXT NOT NULL,
  owner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for expiry cleanup
CREATE INDEX idx_secrets_expiry ON secrets(expiry_time);

-- Enable RLS (Row Level Security)
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

-- Allow anonymous access for MVP
CREATE POLICY "Allow anonymous access" ON secrets FOR ALL USING (true);
```

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

## 🏗️ Architecture

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **shadcn/ui** for UI components
- **CryptoJS** for client-side encryption

### Backend
- **Supabase** for database and authentication
- **PostgreSQL** for data storage
- **Row Level Security** for data protection

### Security Features
- **Zero-knowledge encryption**: Data is encrypted client-side
- **One-time view**: Secrets are deleted after viewing
- **Auto-expiry**: TTL-based cleanup
- **Password protection**: Optional additional security layer

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── LandingPage.tsx  # Main landing page
│   ├── TextShare.tsx    # Text sharing interface
│   ├── FileShare.tsx    # File sharing interface
│   └── SecretViewer.tsx  # Secret viewing interface
├── lib/                 # Utility libraries
│   ├── encryption.ts    # Encryption/decryption functions
│   ├── supabase.ts      # Supabase client and API
│   └── utils.ts         # General utilities
└── App.tsx             # Main application component
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. **Text Sharing**: Implemented in `TextShare.tsx`
2. **File Sharing**: Implemented in `FileShare.tsx`
3. **Secret Viewing**: Implemented in `SecretViewer.tsx`

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Set environment variables in Netlify dashboard

## 🔒 Security Considerations

- All encryption happens client-side
- Server never sees plaintext data
- Secrets are automatically deleted after viewing
- TTL-based cleanup prevents data accumulation
- Password protection adds extra security layer

## 📈 Roadmap

### Phase 1 (MVP) ✅
- [x] Text and file sharing
- [x] One-time view validation
- [x] Client-side encryption
- [x] Expiry options
- [x] Anonymous usage

### Phase 2 (Growth)
- [ ] User accounts and authentication
- [ ] Password protection
- [ ] Email notifications
- [ ] Analytics dashboard
- [ ] Premium features

### Phase 3 (Enterprise)
- [ ] REST API
- [ ] CLI tool
- [ ] Team workspaces
- [ ] Custom domains
- [ ] Audit logs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support, email support@blink.app or create an issue on GitHub.

---

**Built with ❤️ for privacy and security**