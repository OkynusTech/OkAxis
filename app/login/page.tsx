'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <div className="w-full max-w-md px-4">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">OkNexus</h1>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">by OkynusTech</p>
                </div>

                <Card className="p-8 shadow-lg border-muted text-center space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">
                            Corporate Login
                        </h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Secure access for authorized personnel only via Zitadel Authentication.
                        </p>
                    </div>

                    <Button 
                        onClick={() => signIn('zitadel', { callbackUrl: '/' })} 
                        className="w-full py-5"
                    >
                        Sign In with Zitadel
                    </Button>

                    <div className="pt-4 border-t border-border">
                        <a href="/portal/findings" className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline">
                            Demo: Access Client Portal View
                        </a>
                    </div>
                </Card>

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} OkynusTech. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
