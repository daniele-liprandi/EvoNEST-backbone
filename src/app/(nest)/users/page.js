"use client" // Enables client-side rendering in Next.js

import { DataTable } from '@/components/tables/data-table';
import { useUserData } from '@/hooks/useUserData';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { prepend_path } from "@/lib/utils";
import { mutate } from "swr";
import { getColumns } from './columns';
import { Skeleton } from '@/components/ui/skeleton';
import { SmartVaul } from '@/components/forms/smart-vaul';
import { DatabaseManager } from '@/components/forms/database-manager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {

    const { usersData, usersError } = useUserData(prepend_path);
    const { currentUser, isAdmin, isUserLoading, userError } = useCurrentUser();



    const handleEditUsers = async (user) => {
    };    const handleDeleteUser = async (userId) => {
        if (!isAdmin) {
            toast.error("Access denied", {
                description: "Only administrators can delete users",
            });
            return;
        }
        
        try {
            const response = await fetch(`${prepend_path}/api/users`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                mutate(`${prepend_path}/api/users`);
                toast.success("User deleted successfully");
            } else {
                toast.error("Failed to delete user", {
                    description: result.error || "An unknown error occurred",
                });
            }
        } catch (error) {
            toast.error("Network error", {
                description: "Failed to connect to the server",
            });
        }
    };if (!usersData || isUserLoading) return (
        <Skeleton className="h-[500px] w-[1000px] rounded-xl" />
    );
    if (usersError || userError) return <div>Error loading data</div>;

    const dataTableData = usersData.map((user) => ({
        ...user,
    }));    return (
        <div>
            <div className="flex flex-row justify-between m-2">
                <h1>Users</h1>
            </div>
              {/* Show admin-only create user section */}
            {isAdmin ? (
                <div className="space-y-4 m-2">
                    <div className="flex flex-row justify-between">
                        <SmartVaul formType='users' users={usersData} />
                    </div>
                    <DatabaseManager />
                </div>
            ) : (
                <div className="m-2">
                    <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                            Only administrators can create new users. Contact your system administrator to request a new user account.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
              <div>
                <DataTable 
                    columns={getColumns(isAdmin)} 
                    data={dataTableData} 
                    onDelete={isAdmin ? handleDeleteUser : undefined} 
                    onEdit={handleEditUsers}
                />
            </div>
        </div>
    );
}

