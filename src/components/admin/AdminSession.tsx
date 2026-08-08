"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface AdminSessionUser {
    id: string;
    username: string;
    name: string;
    role: "super_admin" | "admin" | "viewer" | "technician" | "staff";
    branch: { id: string; name: string; location: string } | null;
}

const AdminSessionContext = createContext<{ user: AdminSessionUser | null; loading: boolean }>({ user: null, loading: true });

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AdminSessionUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/auth/me", { cache: "no-store" })
            .then((response) => response.ok ? response.json() : Promise.reject(new Error("Session unavailable")))
            .then((payload) => setUser(payload.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    return <AdminSessionContext.Provider value={{ user, loading }}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
    return useContext(AdminSessionContext);
}
