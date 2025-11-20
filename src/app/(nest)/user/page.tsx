"use client"

import React, { useState, useEffect } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import UserAuthenticationControl from '@/components/nest/authui/UserAuthenticationControl';
import Link from 'next/link';
import { Copy, Eye, EyeOff, Trash2, Plus, Key } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ApiKey {
    id: string;
    name: string;
    keyPreview: string;
    isActive: boolean;
    createdAt: string;
    expiresAt: string | null;
    lastUsedAt: string | null;
    usageCount: number;
    databases: string[];
}

const UserPage: React.FC = () => {
    const [email, setEmail] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [newKeyName, setNewKeyName] = useState<string>('');
    const [newKeyExpiry, setNewKeyExpiry] = useState<string>('365');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [showGeneratedKey, setShowGeneratedKey] = useState<boolean>(false);
    const [apiKeysLoading, setApiKeysLoading] = useState<boolean>(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch(`${prepend_path}/api/user`);
                const data = await response.json();
                if (data.email) {
                    setEmail(data.email);
                }
            } catch (err) {
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
        fetchApiKeys();
        const interval = setInterval(fetchUserData, 300000); // 5 minutes

        return () => clearInterval(interval);
    }, [loading]);

    const fetchApiKeys = async () => {
        try {
            const response = await fetch(`${prepend_path}/api/user/api-keys`);
            console.log('Fetch API keys response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('API keys data received:', data);
                setApiKeys(data.apiKeys || []);
            } else {
                const errorData = await response.json();
                console.error('Failed to fetch API keys:', errorData);
            }
        } catch (err) {
            console.error('Failed to fetch API keys:', err);
        }
    };

    const generateApiKey = async () => {
        setApiKeysLoading(true);
        setGeneratedKey(null);
        
        try {
            const response = await fetch(`${prepend_path}/api/user/api-keys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newKeyName || `API Key ${new Date().toLocaleDateString()}`,
                    expiresInDays: newKeyExpiry ? parseInt(newKeyExpiry) : null,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Generated API key response:', data);
                setGeneratedKey(data.apiKey);
                setShowGeneratedKey(true);
                setNewKeyName('');
                setNewKeyExpiry('365');
                await fetchApiKeys();
            } else {
                const error = await response.json();
                alert(`Failed to generate API key: ${error.error}`);
            }
        } catch (err) {
            console.error('Failed to generate API key:', err);
            alert('Failed to generate API key');
        } finally {
            setApiKeysLoading(false);
        }
    };

    const revokeApiKey = async (keyId: string) => {
        if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
            return;
        }

        setApiKeysLoading(true);
        
        try {
            const response = await fetch(`${prepend_path}/api/user/api-keys`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ keyId }),
            });

            if (response.ok) {
                await fetchApiKeys();
            } else {
                const error = await response.json();
                alert(`Failed to revoke API key: ${error.error}`);
            }
        } catch (err) {
            console.error('Failed to revoke API key:', err);
            alert('Failed to revoke API key');
        } finally {
            setApiKeysLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('API key copied to clipboard!');
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${prepend_path}/api/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ method: 'setfield', field: 'email', value: email }),
            });

            if (!response.ok) {
                throw new Error('Failed to update email');
            }

        } catch (err) {
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">

                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    <div className="mx-auto grid max-w-[59rem] flex-1 auto-rows-max gap-4">
                        {/* Logout button */}
                        <div className="flex items-center gap-4">
                            <Button
                                variant="destructive"
                                size="sm"
                                asChild
                                className="ml-auto"
                            >
                                <Link href={`/api/auth/signout`}>
                                    Logout
                                </Link>
                            </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1 lg:gap-8">
                            <div className="grid auto-rows-max items-start gap-4 lg:gap-8">

                                <Card className="w-full max-w-[600px]">
                                    <CardHeader>
                                        <CardTitle>My profile</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSubmit}>
                                            <div className="grid w-full items-center gap-4">
                                                <div className="flex flex-col space-y-1.5">
                                                    <Label htmlFor="email">Email</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        value={email}
                                                        onChange={handleEmailChange}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </form>
                                    </CardContent>
                                    <CardFooter className="flex justify-between">
                                        <Button onClick={handleSubmit} disabled={loading}>
                                            {loading ? 'Updating...' : 'Update Email'}
                                        </Button>
                                    </CardFooter>
                                    <UserAuthenticationControl />
                                </Card>

                                {/* API Keys Management */}
                                <Card className="w-full max-w-[800px]">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Key className="h-5 w-5" />
                                            API Keys for Data Export
                                        </CardTitle>
                                        <CardDescription>
                                            Generate API keys to export data programmatically. Keys provide read-only access to all your databases.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Generate New Key Section */}
                                        <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                                            <h3 className="font-semibold text-sm">Generate New API Key</h3>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="flex flex-col space-y-1.5">
                                                    <Label htmlFor="keyName">Key Name</Label>
                                                    <Input
                                                        id="keyName"
                                                        placeholder="e.g., Python Export Script"
                                                        value={newKeyName}
                                                        onChange={(e) => setNewKeyName(e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex flex-col space-y-1.5">
                                                    <Label htmlFor="keyExpiry">Expires In (days)</Label>
                                                    <Input
                                                        id="keyExpiry"
                                                        type="number"
                                                        placeholder="365"
                                                        value={newKeyExpiry}
                                                        onChange={(e) => setNewKeyExpiry(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={generateApiKey} 
                                                disabled={apiKeysLoading}
                                                className="w-full sm:w-auto"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                {apiKeysLoading ? 'Generating...' : 'Generate API Key'}
                                            </Button>
                                        </div>

                                        {/* Generated Key Display */}
                                        {generatedKey && (
                                            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                                                <AlertDescription>
                                                    <div className="space-y-2">
                                                        <p className="font-semibold text-sm">⚠️ Save this API key now! You won&apos;t see it again.</p>
                                                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border">
                                                            <code className="flex-1 text-xs break-all font-mono">
                                                                {showGeneratedKey ? generatedKey : '••••••••••••••••••••••••••••••••'}
                                                            </code>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setShowGeneratedKey(!showGeneratedKey)}
                                                            >
                                                                {showGeneratedKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => copyToClipboard(generatedKey)}
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            Use this key with: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">Authorization: Bearer {'{key}'}</code>
                                                        </p>
                                                    </div>
                                                </AlertDescription>
                                            </Alert>
                                        )}

                                        {/* Existing Keys List */}
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-sm">Your API Keys ({apiKeys.filter(k => k.isActive).length} active)</h3>
                                            {apiKeys.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No API keys yet. Generate one above to get started.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {apiKeys.map((key) => (
                                                        <div
                                                            key={key.id}
                                                            className={`flex items-center justify-between p-3 border rounded-lg ${
                                                                !key.isActive ? 'opacity-50 bg-muted' : ''
                                                            }`}
                                                        >
                                                            <div className="flex-1 space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium text-sm">{key.name}</p>
                                                                    {!key.isActive && (
                                                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                                                            Revoked
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground font-mono">{key.keyPreview}</p>
                                                                <div className="flex gap-4 text-xs text-muted-foreground">
                                                                    <span>Created: {new Date(key.createdAt).toLocaleDateString()}</span>
                                                                    {key.lastUsedAt && (
                                                                        <span>Last used: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                                                                    )}
                                                                    <span>Uses: {key.usageCount}</span>
                                                                    {key.expiresAt && (
                                                                        <span>Expires: {new Date(key.expiresAt).toLocaleDateString()}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {key.isActive && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => revokeApiKey(key.id)}
                                                                    disabled={apiKeysLoading}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UserPage;