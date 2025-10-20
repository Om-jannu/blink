# 🔐 Blink - Secure Share

**The ultimate privacy-first file and text sharing platform with burn-after-read functionality.**

Blink is a secure, zero-knowledge file and text sharing service that prioritizes privacy and security. Share sensitive information with confidence knowing that your data is encrypted client-side and automatically deleted after viewing.

## ✨ Key Features

### 🔒 **Zero-Knowledge Encryption**
- **Client-side encryption** using AES-256-GCM
- **Password-protected secrets** with PBKDF2 key derivation
- **Server never sees your plaintext data**
- **Two-tier security model** for maximum protection

### ⚡ **One-Time Sharing**
- **Burn-after-read** functionality
- **Automatic deletion** after first view
- **No permanent storage** of sensitive data
- **Perfect for sensitive documents**

### 🎯 **Multiple Sharing Options**
- **Text secrets** - Share sensitive messages
- **File secrets** - Upload documents, images, PDFs
- **Password protection** - Add extra security layer
- **Custom expiry times** - Control when secrets expire

### 👤 **User Accounts & Plans**
- **Anonymous sharing** - No signup required
- **Free plan** - 10 text + 5 file secrets (5MB limit)
- **Pro plan** - Unlimited secrets (50MB limit)
- **Dashboard management** - Track and manage your secrets

### 🛡️ **Privacy-First Design**
- **No data collection** beyond what's necessary
- **Client-side encryption** before upload
- **Automatic cleanup** of expired secrets
- **GDPR compliant** architecture

## 🚀 Use Cases

### **Business & Enterprise**
- Share confidential documents securely
- Send sensitive financial information
- Transfer API keys and credentials
- Communicate with clients privately

### **Personal Privacy**
- Share personal documents safely
- Send sensitive photos privately
- Transfer passwords securely
- Share private notes and messages

### **Developer Tools**
- Share API keys and tokens
- Transfer configuration files
- Send debug logs securely
- Share code snippets privately

## 🎨 **Modern User Experience**

### **Beautiful Interface**
- **Dark/Light mode** support
- **Responsive design** for all devices
- **Intuitive drag-and-drop** file uploads
- **Real-time feedback** and notifications

### **Smart Features**
- **File type detection** and validation
- **Size limit enforcement** by plan
- **Expiry time management**
- **One-click sharing** with copy links

### **Dashboard Management**
- **Secret overview** with status tracking
- **Bulk operations** for multiple secrets
- **Usage analytics** and insights
- **Plan management** and upgrades

## 🔧 **Technical Architecture**

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **shadcn/ui** component library

### **Backend**
- **Supabase** for database and auth
- **PostgreSQL** for data storage
- **Edge Functions** for serverless logic
- **Row Level Security** for data protection

### **Security**
- **AES-256-GCM** encryption
- **PBKDF2** key derivation
- **Client-side encryption** only
- **Zero-knowledge architecture**

## 📊 **Plan Comparison**

| Feature | Anonymous | Free | Pro |
|---------|-----------|------|-----|
| Text Secrets | ✅ | 10 | Unlimited |
| File Secrets | ✅ | 5 | Unlimited |
| File Size Limit | 5MB | 5MB | 50MB |
| Password Protection | ❌ | ❌ | ✅ |
| Custom Expiry | ✅ | ✅ | ✅ |
| Dashboard | ❌ | ✅ | ✅ |
| Secret Management | ❌ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |

## 🌟 **Why Choose Blink?**

### **Privacy by Design**
- Your data is encrypted before leaving your device
- Server never has access to your plaintext content
- Automatic deletion ensures no data persistence
- GDPR compliant with minimal data collection

### **Security First**
- Military-grade encryption standards
- Password-protected secrets for extra security
- Client-side key generation and management
- Regular security audits and updates

### **User Experience**
- Simple, intuitive interface
- Fast and reliable performance
- Cross-platform compatibility
- No technical knowledge required

### **Enterprise Ready**
- Scalable architecture
- API access for integrations
- Custom deployment options
- White-label solutions available

## 🔮 **Roadmap**

### **Phase 1 - Core Features** ✅
- [x] Text and file sharing
- [x] Client-side encryption
- [x] One-time viewing
- [x] User authentication
- [x] Basic dashboard

### **Phase 2 - Enhanced Security** ✅
- [x] Password protection
- [x] Two-tier encryption model
- [x] Advanced expiry options
- [x] Secret management

### **Phase 3 - Enterprise Features** 🚧
- [ ] API access
- [ ] Custom domains
- [ ] Team collaboration
- [ ] Advanced analytics

### **Phase 4 - Platform Expansion** 📋
- [ ] Mobile applications
- [ ] Browser extensions
- [ ] Third-party integrations
- [ ] Enterprise solutions

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Documentation**: [docs.blink.sh](https://docs.blink.sh)
- **Community**: [Discord](https://discord.gg/blink)
- **Issues**: [GitHub Issues](https://github.com/blink/issues)
- **Email**: support@blink.sh

---

**Made with ❤️ for privacy-conscious users worldwide.**

*Blink - Share securely, delete automatically.*