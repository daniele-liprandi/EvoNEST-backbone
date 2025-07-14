"use client";

import { useState, useEffect } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { prepend_path } from '@/lib/utils';

export default function UserAuthenticationControl() {
    const [needsIdentification, setNeedsIdentification] = useState(false);
    const [retreivedAuth0Id, setRetreivedAuth0Id] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { usersData, usersError, isLoading } = useUserData(prepend_path, {
        revalidateIfStale: false,
        revalidateOnFocus: false,
        dedupingInterval: 3600000,
    }, true);

    interface User {
        _id: string;
        auth0id: string;
        name: string;
    }

    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const response = await fetch(`${prepend_path}/api/auth/usercontrol`);
                const data = await response.json();
                setNeedsIdentification(data.needsIdentification);
                setRetreivedAuth0Id(data.user.sub);
            } catch (error) {
                console.error('Error checking auth status:', error);
            }
        };

        checkAuthStatus();
    }, []);

    const handleUserSelection = async () => {
        if (selectedUser) {
            try {
                const response = await fetch(`${prepend_path}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        method: 'update',
                        id: selectedUser._id,
                        auth0id: retreivedAuth0Id,
                    }),
                });

                if (response.ok) {
                    setNeedsIdentification(false);
                } else {
                    console.error('Failed to update user');
                }
            } catch (error) {
                console.error('Error updating user:', error);
            }
        }
    };

    if (usersError) {
        console.error('Error during users control:', usersError);
        return <div>Error during users control</div>;
    }
        
    if (!usersData) return <div>Loading user control...</div>;

    return (
        <Dialog open={needsIdentification} onOpenChange={setNeedsIdentification}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Your Identity</DialogTitle>
                    <DialogDescription>
                        Please select your user account from the list below.
                    </DialogDescription>
                </DialogHeader>
                <Select onValueChange={(value) => setSelectedUser(JSON.parse(value))}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select your user account" />
                    </SelectTrigger>
                    <SelectContent>
                        {usersData.map((user: User) => (
                            <SelectItem key={user._id} value={JSON.stringify(user)}>
                                {user.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <DialogFooter>
                    <Button onClick={handleUserSelection} disabled={!selectedUser}>
                        Confirm Identity
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}