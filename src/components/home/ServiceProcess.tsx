"use client";
import { useEffect, useState } from "react";

interface ServiceRow {
    request: string;
    delivery: string;
    area: string;
    shade: boolean;
}

export function ServiceProcess() {
    const [data, setData] = useState<{
        title: string;
        subtitle: string;
        columns: string[];
        rows: ServiceRow[];
        footer: string;
    } | null>(null);

    useEffect(() => {
        fetch("/api/admin/service-request")
            .then(r => r.json())
            .then(d => {
                if (d.success) setData(d.data);
            });
    }, []);

    if (!data) return null;

    const { title, subtitle, columns, rows, footer } = data;

    return (
        <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-4 md:px-8">

                <div className="rounded-3xl overflow-hidden border border-blue-100 shadow-lg shadow-blue-50/50">

                    {/* Dark Header */}
                    <div className="bg-gray-950 text-white text-center py-7 px-6">
                        <p className="text-sm font-bold text-blue-200 mb-1.5 tracking-wider uppercase">{subtitle}</p>
                        <p className="text-xl md:text-2xl font-black">
                            {title}
                        </p>
                    </div>

                    {/* Blue Column Headers */}
                    <div className="grid grid-cols-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-sm md:text-base">
                        {columns.map((col, idx) => (
                            <div key={idx} className={`px-6 py-4 flex items-center ${idx < 2 ? 'border-r border-white/20' : ''} text-center leading-snug whitespace-pre-line`}>
                                {col}
                            </div>
                        ))}
                    </div>

                    {/* Rows */}
                    {rows.map((row, i) => (
                        <div
                            key={i}
                            className={`grid grid-cols-3 border-t border-blue-50 text-sm md:text-base ${row.shade ? "bg-blue-50/40" : "bg-white"}`}
                        >
                            <div className="px-6 py-5 border-r border-blue-50 font-bold text-blue-700 flex items-center whitespace-pre-line">
                                {row.request}
                            </div>
                            <div className="px-6 py-5 border-r border-blue-50 text-gray-600 flex items-center whitespace-pre-line">
                                {row.delivery}
                            </div>
                            <div className="px-6 py-5 text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                                {row.area}
                            </div>
                        </div>
                    ))}

                    {/* Footer */}
                    <div className="bg-gray-950 text-white text-center text-sm py-4 px-6">
                        {footer}
                    </div>

                </div>
            </div>
        </section>
    );
}
