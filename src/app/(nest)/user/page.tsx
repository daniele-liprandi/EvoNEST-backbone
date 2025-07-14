"use client"

import React, { useState, useEffect } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import UserAuthenticationControl from '@/components/nest/authui/UserAuthenticationControl';
import Link from 'next/link';

const UserPage: React.FC = () => {
    const [email, setEmail] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);

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
        const interval = setInterval(fetchUserData, 300000); // 5 minutes

        return () => clearInterval(interval);
    }, [loading]);

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
                        <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
                            <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">

                                <Card className="w-[350px]">
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
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default UserPage;