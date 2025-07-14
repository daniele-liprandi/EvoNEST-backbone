"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Database } from "lucide-react"
import { toast } from "sonner"
import { useDatabases } from "@/hooks/useDatabases"
import { useCurrentUser } from "@/hooks/useCurrentUser"

export function DatabaseManager() {
    const { isAdmin } = useCurrentUser();
    const { databases, isDatabasesLoading, databasesError, mutateDatabases } = useDatabases();
    const [newDatabase, setNewDatabase] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    if (!isAdmin) {
        return null; // Don't show to non-admins
    }

    const handleAddDatabase = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newDatabase.trim()) {
            toast.error("Database name is required");
            return;
        }

        setIsAdding(true);
        
        try {
            const response = await fetch('/api/databases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ database: newDatabase.trim() })
            });

            const result = await response.json();

            if (response.ok) {
                toast.success("Database added successfully", {
                    description: `Added database: ${result.database}`,
                });
                setNewDatabase("");
                mutateDatabases(); // Refresh the databases list
            } else {
                toast.error("Failed to add database", {
                    description: result.error || "An unknown error occurred",
                });
            }
        } catch (error) {
            toast.error("Network error", {
                description: "Failed to connect to the server",
            });
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database Management
                </CardTitle>
                <CardDescription>
                    Manage available databases that can be assigned to users
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add new database form */}
                <form onSubmit={handleAddDatabase} className="flex gap-2">
                    <div className="flex-1">
                        <Label htmlFor="database" className="sr-only">
                            Database Name
                        </Label>
                        <Input
                            id="database"
                            placeholder="Enter database name"
                            value={newDatabase}
                            onChange={(e) => setNewDatabase(e.target.value)}
                            disabled={isAdding}
                        />
                    </div>
                    <Button type="submit" disabled={isAdding || !newDatabase.trim()}>
                        <Plus className="h-4 w-4 mr-2" />
                        {isAdding ? "Adding..." : "Add"}
                    </Button>
                </form>

                {/* Current databases list */}
                <div>
                    <Label className="text-sm font-medium">Available Databases</Label>
                    <div className="mt-2">
                        {isDatabasesLoading ? (
                            <div className="text-sm text-muted-foreground">Loading databases...</div>
                        ) : databasesError ? (
                            <div className="text-sm text-red-500">Error loading databases</div>
                        ) : databases.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No databases available</div>                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {databases.map((database: string) => (
                                    <Badge key={database} variant="secondary">
                                        {database}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
