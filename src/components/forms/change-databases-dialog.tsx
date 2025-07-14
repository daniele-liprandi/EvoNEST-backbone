"use client"

import { useState } from "react"
import { useDatabases } from "@/hooks/useDatabases"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Database } from "lucide-react"
import { toast } from "sonner"
import { mutate } from "swr"
import { prepend_path } from "@/lib/utils"
import { useForm } from "react-hook-form"

import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const formSchema = z.object({
    databases: z.array(z.string()).min(1, { message: "At least one database must be selected" }),
})

type ChangeDatabasesDialogProps = {
    user: {
        _id: string
        name: string
        databases?: string[]
    }
    children: React.ReactNode
}

export function ChangeDatabasesDialog({ user, children }: ChangeDatabasesDialogProps) {
    const [open, setOpen] = useState(false)
    const { databases, isDatabasesLoading, databasesError } = useDatabases()
    const [isUpdating, setIsUpdating] = useState(false)

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            databases: user.databases || [],
        },
    })

    const onSubmit = async (values: { databases: any }) => {
        setIsUpdating(true)
        
        try {
            const response = await fetch(`${prepend_path}/api/users`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: "change_databases",
                    id: user._id,
                    databases: values.databases,
                })
            })
            
            const result = await response.json()
            
            if (response.ok) {
                toast.success("Databases updated successfully", {
                    description: `Updated databases for ${user.name}`,
                })
                mutate(`${prepend_path}/api/users`)
                setOpen(false)
            } else {
                toast.error("Failed to update databases", {
                    description: result.error || "An unknown error occurred",
                })
            }
        } catch (error) {
            toast.error("Network error", {
                description: "Failed to connect to the server",
            })
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Change Databases for {user.name}
                    </DialogTitle>
                    <DialogDescription>
                        Select which databases this user should have access to.
                    </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="databases"
                            render={() => (
                                <FormItem>
                                    <div className="mb-4">
                                        <FormLabel className="text-base">Available Databases</FormLabel>
                                        <FormDescription>
                                            Current databases: {user.databases?.join(', ') || 'None'}
                                        </FormDescription>
                                    </div>
                                    {isDatabasesLoading ? (
                                        <div>Loading databases...</div>
                                    ) : databasesError ? (
                                        <div className="text-red-500">Error loading databases</div>                                    ) : databases.length === 0 ? (
                                        <div className="text-muted-foreground">No databases available</div>
                                    ) : (
                                        databases.map((database: string) => (
                                            <FormField
                                                key={database}
                                                control={form.control}
                                                name="databases"
                                                render={({ field }) => {
                                                    return (
                                                        <FormItem
                                                            key={database}
                                                            className="flex flex-row items-start space-x-3 space-y-0"
                                                        >
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(database)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...field.value, database])
                                                                            : field.onChange(
                                                                                  field.value?.filter(
                                                                                      (value) => value !== database
                                                                                  )
                                                                              )
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">
                                                                {database}
                                                            </FormLabel>
                                                        </FormItem>
                                                    )
                                                }}
                                            />
                                        ))
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isUpdating}>
                                {isUpdating ? "Updating..." : "Update Databases"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
