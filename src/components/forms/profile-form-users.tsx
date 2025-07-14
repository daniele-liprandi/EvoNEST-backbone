"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"


import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl, FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { prepend_path } from "@/lib/utils"
import { toast } from "sonner"
import { mutate } from "swr"
import { useCurrentUser } from "@/hooks/useCurrentUser"
import { useDatabases } from "@/hooks/useDatabases"
import { Checkbox } from "@/components/ui/checkbox"

//See form on shadcn/ui and see zod forms
const formSchema = z.object({
    name: z.string().min(2, { message: "Name needs to be longer than 2 characters" }),
    role: z.enum(["admin", "researcher", "student", "viewer"], { 
        required_error: "Please select a role" 
    }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    institution: z.string().optional(),
    databases: z.array(z.string()).min(1, { message: "At least one database must be selected" }),
})

export function ProfileFormUsers({}) {
    const { isAdmin } = useCurrentUser();
    const { databases, isDatabasesLoading, databasesError } = useDatabases();
    
    // 1. Define your form (must be called before any conditional returns)
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            role: undefined,
            email: "",
            institution: "",
            databases: [],
        },
    })
    
    // Only allow admin users to access this form
    if (!isAdmin) {
        return (
            <div className="p-4 text-center text-red-600">
                <p>Only administrators can create new users.</p>
            </div>
        );
    }// 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        const method = 'create';
        const endpoint = `${prepend_path}/api/users`;
        console.log(values)
        
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    method: method,
                    name: values.name,                    role: values.role,
                    email: values.email,
                    institution: values.institution,
                    databases: values.databases, // Already an array
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                mutate(`${prepend_path}/api/users`);
                toast.success("User created successfully!", {
                    description: `Created user: ${values.name} with role: ${values.role}`,
                });
                form.reset(); // Reset form after successful submission
            } else {
                toast.error("Failed to create user", {
                    description: result.error || "An unknown error occurred",
                });
            }
        } catch (error) {
            toast.error("Network error", {
                description: "Failed to connect to the server",
            });
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Researcher name" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="admin">Administrator</SelectItem>
                                    <SelectItem value="researcher">Researcher</SelectItem>
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="institution"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Institution (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="University or organization" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />                <FormField
                    control={form.control}
                    name="databases"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Databases</FormLabel>
                                <FormDescription>
                                    Select which databases this user should have access to.
                                </FormDescription>
                            </div>
                            {isDatabasesLoading ? (
                                <div>Loading databases...</div>
                            ) : databasesError ? (
                                <div className="text-red-500">Error loading databases</div>                            ) : databases.length === 0 ? (
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

                <Button type="submit">Submit</Button>
            </form>
        </Form>
    )
}