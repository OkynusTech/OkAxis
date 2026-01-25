'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    FileText,
    ShieldAlert,
    LogOut,
    User,
    Shield,
    Menu,
    X,
    Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllClients, getClientUsers, getClient } from '@/lib/storage';
import { ClientUser, ClientProfile } from '@/lib/types';
import { Logo } from '@/components/ui/logo';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
    const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Auth Simulation State
    const [availableUsers, setAvailableUsers] = useState<ClientUser[]>([]);

    useEffect(() => {
        // Check for simulated session
        const storedUserId = localStorage.getItem('ok_portal_user_id');

        if (storedUserId) {
            // "Verify" session
            const clients = getAllClients();
            let foundUser: ClientUser | undefined;

            // Search across all clients (since getClientUsers is scoped)
            // In a real app, we'd have a global user table or index
            for (const client of clients) {
                const users = getClientUsers(client.id);
                foundUser = users.find(u => u.id === storedUserId);
                if (foundUser) break;
            }

            if (foundUser) {
                setCurrentUser(foundUser);
                const client = getClient(foundUser.clientId);
                if (client) setClientProfile(client);
            } else {
                localStorage.removeItem('ok_portal_user_id');
            }
        } else {
            // Load available users for the "Login" screen demo
            const clients = getAllClients();
            const allUsers: ClientUser[] = [];
            clients.forEach(client => {
                allUsers.push(...getClientUsers(client.id));
            });
            setAvailableUsers(allUsers);
        }
    }, []);

    const handleLogin = (userId: string) => {
        localStorage.setItem('ok_portal_user_id', userId);
        window.location.reload(); // Quick refresh to load state
    };

    const handleLogout = () => {
        localStorage.removeItem('ok_portal_user_id');
        setCurrentUser(null);
        setClientProfile(null);
        // Reload available users
        const clients = getAllClients();
        const allUsers: ClientUser[] = [];
        clients.forEach(client => {
            allUsers.push(...getClientUsers(client.id));
        });
        setAvailableUsers(allUsers);
    };

    // If not logged in, show "Login" screen
    if (!currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                            <Shield className="h-8 w-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Client Portal Access</h1>
                        <p className="text-slate-500 mt-2">Secure Digital Filing Cabinet</p>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm font-medium text-slate-700">Select a demo account to access:</p>
                        {availableUsers.length === 0 ? (
                            <div className="p-4 border border-dashed rounded text-center text-sm text-muted-foreground">
                                No client users found. Please create a Client in the Admin panel first.
                            </div>
                        ) : (
                            availableUsers.map(user => {
                                const client = getAllClients().find(c => c.id === user.clientId);
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => handleLogin(user.id)}
                                        className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 hover:border-blue-300 transition-all text-left group"
                                    >
                                        <div>
                                            <div className="font-semibold text-slate-900 group-hover:text-blue-700">
                                                {client?.companyName}
                                            </div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                        </div>
                                        <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                                            {user.role}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                        <div className="mt-8 pt-6 border-t text-center">
                            <Link href="/" className="text-sm text-slate-400 hover:text-slate-600">
                                Return to Admin Dashboard
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const navigation = [
        { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
        { name: 'Security Reports', href: '/portal/reports', icon: FileText },
        { name: 'Findings', href: '/portal/findings', icon: ShieldAlert },
    ];

    return (
        <div className="min-h-screen bg-slate-950 dark text-slate-50">
            {/* Top Navigation */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center gap-3">
                                <Logo className="text-white" />
                                <div>
                                    {clientProfile && (
                                        <span className="text-xs text-slate-400 font-medium">
                                            for {clientProfile.companyName}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${isActive
                                                ? 'border-blue-500 text-white'
                                                : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                                }`}
                                        >
                                            <item.icon className={`mr-2 h-4 w-4 ${isActive ? 'text-blue-500' : ''}`} />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-slate-400 hover:text-slate-300 relative">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-slate-900"></span>
                            </button>
                            <div className="flex items-center gap-3 border-l border-slate-800 pl-4 ml-2">
                                <div className="text-right hidden md:block">
                                    <div className="text-sm font-medium text-slate-200">{currentUser.name}</div>
                                    <div className="text-xs text-slate-400">{currentUser.email}</div>
                                </div>
                                <Button size="sm" variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-white hover:bg-slate-800">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu */}
            <div className="sm:hidden border-b border-slate-800 bg-slate-900">
                <div className="flex justify-around p-2">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`p-2 rounded-md ${pathname === item.href ? 'bg-slate-800 text-blue-500' : 'text-slate-400'
                                }`}
                        >
                            <item.icon className="h-5 w-5" />
                        </Link>
                    ))}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
