"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterIndex() {
    const router = useRouter();
    useEffect(() => {
        router.push("/register/step1");
    }, [router]);
    return null;
}
