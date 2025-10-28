import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Copy, 
  Check, 
  Code, 
  Key, 
  Shield, 
  Clock, 
  AlertCircle,
  ExternalLink,
  BookOpen,
  Terminal,
  Globe,
  ArrowRight,
  Rocket,
  Play,
  Download,
  FileText,
  Upload,
  Eye,
  List
} from 'lucide-react';
import { useAuth, SignInButton } from '@clerk/clerk-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { PublicFooter } from '../components/PublicFooter';

export function ApiDocs() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const baseUrl = import.meta.env.VITE_APP_URL || 'https://your-app.vercel.app';

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const codeExamples = {
    createTextSecret: `curl -X POST ${baseUrl}/api/secrets \\
  -H "x-api-key: your-api-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "text",
    "content": "This is my secret message",
    "expiry_minutes": 60
  }'`,

    createFileSecret: `curl -X POST ${baseUrl}/api/secrets \\
  -H "x-api-key: your-api-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "file",
    "file": {
      "name": "document.pdf",
      "data": "base64-encoded-content",
      "size": 1024
    },
    "expiry_minutes": 30
  }'`,

    listSecrets: `curl -X GET ${baseUrl}/api/secrets \\
  -H "x-api-key: your-api-key-here"`,

    getSecret: `curl -X GET ${baseUrl}/api/secrets/{secret-id} \\
  -H "x-api-key: your-api-key-here"`,

    deleteSecret: `curl -X DELETE ${baseUrl}/api/secrets/{secret-id} \\
  -H "x-api-key: your-api-key-here"`
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/api/secrets',
      title: 'Create Secret',
      description: 'Create a new text or file secret',
      parameters: [
        { name: 'type', type: 'string', required: true, description: 'Secret type: "text" or "file"' },
        { name: 'content', type: 'string', required: false, description: 'Text content (for text secrets)' },
        { name: 'file', type: 'object', required: false, description: 'File object (for file secrets)' },
        { name: 'expiry_minutes', type: 'number', required: true, description: 'Expiry time in minutes' },
        { name: 'password', type: 'string', required: false, description: 'Optional password protection' },
      ],
    },
    {
      method: 'GET',
      path: '/api/secrets',
      title: 'List Secrets',
      description: 'Get all secrets for the authenticated user',
      parameters: [],
    },
    {
      method: 'GET',
      path: '/api/secrets/{id}',
      title: 'Get Secret',
      description: 'Get details of a specific secret',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Secret ID' },
      ],
    },
    {
      method: 'DELETE',
      path: '/api/secrets/{id}',
      title: 'Delete Secret',
      description: 'Delete a specific secret',
      parameters: [
        { name: 'id', type: 'string', required: true, description: 'Secret ID' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
              <Code className="w-4 h-4" />
              <span>Developer API</span>
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight">
              Build with our{' '}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                Developer API
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Integrate Blink's secure secret sharing into your applications with our powerful REST API. 
              Perfect for developers, DevOps teams, and enterprise applications.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isSignedIn ? (
                <Button size="lg" onClick={() => navigate('/dashboard/api')} className="text-lg px-8 py-6">
                  <Key className="w-5 h-5 mr-2" />
                  Manage API Keys
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button size="lg" className="text-lg px-8 py-6">
                    <Key className="w-5 h-5 mr-2" />
                    Get Your API Key
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </SignInButton>
              )}
              <Button size="lg" variant="outline" onClick={() => setActiveTab('examples')} className="text-lg px-8 py-6">
                <Play className="w-5 h-5 mr-2" />
                Try Examples
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* API Stats */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">4</div>
                <div className="text-muted-foreground">REST Endpoints</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">256-bit</div>
                <div className="text-muted-foreground">AES Encryption</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-muted-foreground">API Uptime</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">&lt;100ms</div>
                <div className="text-muted-foreground">Response Time</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="examples" className="flex items-center gap-2">
                <Code className="w-4 h-4" />
                Examples
              </TabsTrigger>
              <TabsTrigger value="reference" className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Reference
              </TabsTrigger>
              <TabsTrigger value="sdk" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                SDK
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {/* Quick Start */}
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Rocket className="w-6 h-6 text-primary" />
                    Quick Start Guide
                  </CardTitle>
                  <CardDescription className="text-lg">
                    Get up and running with our API in minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Key className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">1. Get API Access</h3>
                      <p className="text-muted-foreground">
                        Create an API key in your dashboard for authentication
                      </p>
                      {isSignedIn ? (
                        <Button onClick={() => navigate('/dashboard/api')} className="w-full">
                          <Key className="w-4 h-4 mr-2" />
                          Manage API Keys
                        </Button>
                      ) : (
                        <SignInButton mode="modal">
                          <Button className="w-full">
                            <Key className="w-4 h-4 mr-2" />
                            Get API Key
                          </Button>
                        </SignInButton>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Code className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-semibold">2. Make Your First Request</h3>
                      <p className="text-muted-foreground">
                        Use our simple REST endpoints to create and manage secrets
                      </p>
                      <Button variant="outline" onClick={() => setActiveTab('examples')} className="w-full">
                        <Play className="w-4 h-4 mr-2" />
                        View Examples
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                        <Rocket className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="text-xl font-semibold">3. Start Building</h3>
                      <p className="text-muted-foreground">
                        Integrate secure secret sharing into your applications
                      </p>
                      <Button variant="outline" onClick={() => setActiveTab('reference')} className="w-full">
                        <BookOpen className="w-4 h-4 mr-2" />
                        API Reference
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* API Overview */}
              <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Authentication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      All API requests require an API key in the <code className="bg-muted px-2 py-1 rounded text-sm font-mono">x-api-key</code> header.
                    </p>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Keep your API key secure and never expose it in client-side code.
                      </AlertDescription>
                    </Alert>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm font-medium mb-2">Example Header:</p>
                      <code className="text-sm">x-api-key: your-api-key-here</code>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-primary" />
                      Base URL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      All API endpoints are relative to the base URL:
                    </p>
                    <div className="bg-muted p-4 rounded font-mono text-sm">
                      {baseUrl}/api
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All requests must be made over HTTPS in production.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Rate Limits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Rate Limits
                  </CardTitle>
                  <CardDescription>
                    API usage is limited to ensure fair usage and system stability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-2">100</div>
                      <div className="text-muted-foreground">Requests per minute</div>
                    </div>
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-2">1,000</div>
                      <div className="text-muted-foreground">Requests per hour</div>
                    </div>
                    <div className="text-center p-6 border rounded-lg">
                      <div className="text-3xl font-bold text-primary mb-2">10,000</div>
                      <div className="text-muted-foreground">Requests per day</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="examples" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Code Examples</CardTitle>
                  <CardDescription className="text-lg">
                    Copy and paste these examples to get started quickly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Create Text Secret
                      </h3>
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-6 rounded-lg overflow-x-auto text-sm">
                          <code>{codeExamples.createTextSecret}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-3 right-3"
                          onClick={() => copyToClipboard(codeExamples.createTextSecret, 'createTextSecret')}
                        >
                          {copiedCode === 'createTextSecret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Create File Secret
                      </h3>
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-6 rounded-lg overflow-x-auto text-sm">
                          <code>{codeExamples.createFileSecret}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-3 right-3"
                          onClick={() => copyToClipboard(codeExamples.createFileSecret, 'createFileSecret')}
                        >
                          {copiedCode === 'createFileSecret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <List className="w-5 h-5" />
                        List Secrets
                      </h3>
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-6 rounded-lg overflow-x-auto text-sm">
                          <code>{codeExamples.listSecrets}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-3 right-3"
                          onClick={() => copyToClipboard(codeExamples.listSecrets, 'listSecrets')}
                        >
                          {copiedCode === 'listSecrets' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Get Secret
                      </h3>
                      <div className="relative">
                        <pre className="bg-slate-900 text-slate-100 p-6 rounded-lg overflow-x-auto text-sm">
                          <code>{codeExamples.getSecret}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-3 right-3"
                          onClick={() => copyToClipboard(codeExamples.getSecret, 'getSecret')}
                        >
                          {copiedCode === 'getSecret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reference" className="space-y-8">
              <div className="space-y-6">
                {endpoints.map((endpoint, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Badge 
                            variant={endpoint.method === 'GET' ? 'default' : endpoint.method === 'POST' ? 'secondary' : 'destructive'}
                            className="text-sm px-3 py-1"
                          >
                            {endpoint.method}
                          </Badge>
                          <code className="text-lg font-mono bg-muted px-3 py-1 rounded">{endpoint.path}</code>
                        </div>
                      </div>
                      <CardTitle className="text-xl mt-4">{endpoint.title}</CardTitle>
                      <CardDescription className="text-base">{endpoint.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {endpoint.parameters && endpoint.parameters.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-lg">Parameters</h4>
                          <div className="space-y-3">
                            {endpoint.parameters.map((param, paramIndex) => (
                              <div key={paramIndex} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <code className="bg-background px-2 py-1 rounded text-sm font-mono">{param.name}</code>
                                <span className="text-muted-foreground">({param.type})</span>
                                {param.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                                <span className="text-muted-foreground">- {param.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sdk" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">SDK & Libraries</CardTitle>
                  <CardDescription className="text-lg">
                    Official and community libraries for popular programming languages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                            <span className="text-yellow-600 font-bold text-sm">JS</span>
                          </div>
                          JavaScript/Node.js
                        </CardTitle>
                        <CardDescription>Official SDK for JavaScript and Node.js</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">npm</Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded">npm install @blink/api-client</code>
                          </div>
                          <Button size="sm" variant="outline" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on GitHub
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">PY</span>
                          </div>
                          Python
                        </CardTitle>
                        <CardDescription>Official SDK for Python</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">pip</Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded">pip install blink-api</code>
                          </div>
                          <Button size="sm" variant="outline" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on GitHub
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <div className="w-8 h-8 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                            <span className="text-cyan-600 font-bold text-sm">GO</span>
                          </div>
                          Go
                        </CardTitle>
                        <CardDescription>Community SDK for Go</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">go</Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded">go get github.com/blink/go-sdk</code>
                          </div>
                          <Button size="sm" variant="outline" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on GitHub
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-sm">PHP</span>
                          </div>
                          PHP
                        </CardTitle>
                        <CardDescription>Community SDK for PHP</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">composer</Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded">composer require blink/api-client</code>
                          </div>
                          <Button size="sm" variant="outline" className="w-full">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on GitHub
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl font-bold">Need Help?</h2>
            <p className="text-xl text-muted-foreground">
              Get support and stay updated on API changes
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isSignedIn ? (
                <Button size="lg" onClick={() => navigate('/dashboard/settings')} className="text-lg px-8 py-6">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Contact Support
                </Button>
              ) : (
                <SignInButton mode="modal">
                  <Button size="lg" className="text-lg px-8 py-6">
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Contact Support
                  </Button>
                </SignInButton>
              )}
              {isSignedIn && (
                <Button size="lg" variant="outline" onClick={() => navigate('/dashboard/api')} className="text-lg px-8 py-6">
                  <Key className="w-5 h-5 mr-2" />
                  Manage API Keys
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
