"use client";

import { useEffect, useState } from "react";

interface AdminUser {
    _id: string;
    username: string;
    name: string;
    email?: string;
    role: string;
    isActive: boolean;
}

export function useCurrentAdmin() {
    const [user, setUser] = useState<AdminUser | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/auth/me")
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.user) setUser(data.user);
                if (data?.permissions) setPermissions(data.permissions);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return { user, permissions, loading };
}
