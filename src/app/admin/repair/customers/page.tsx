"use client";

import React, { useEffect, useState } from "react";
import { 
    Search, 
    UserPlus, 
    Phone, 
    MessageCircle, 
    ChevronRight, 
    User,
    ClipboardList,
    MoreHorizontal,
    Loader2
} from "lucide-react";
import Link from "next/link";

export default function RepairCustomersList() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/repair/customers?q=${search}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setCustomers(data);
            }
        } catch (error) {
            console.error("Fetch Customers Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCustomers();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">ทะเบียนลูกค้า</h1>
                    <p className="text-sm text-gray-500 font-medium">จัดการข้อมูลติดต่อเบื้องต้นของลูกค้าทุกคนในระบบซ่อม</p>
                </div>
            </div>

            {/* Filter/Search Bar */}
            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
                <form onSubmit={handleSearch} className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="ค้นหาชื่อลูกค้า, นามสกุล, หรือเบอร์โทรศัพท์..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4.5 pl-16 pr-6 text-sm font-bold text-gray-800 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>
            </div>

            {/* Customers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-gray-300">
                        <Loader2 className="animate-spin mb-4" size={40} />
                        <p className="text-sm font-black uppercase tracking-widest leading-none">กำลังโหลดข้อมูลลูกค้า...</p>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="col-span-full py-32 bg-white rounded-[2.5rem] border border-gray-100 text-center text-gray-300">
                        <p className="text-sm font-black uppercase tracking-widest italic opacity-50">ยังไม่มีข้อมูลลูกค้าในฐานข้อมูล</p>
                    </div>
                ) : (
                    customers.map((c) => (
                        <div 
                            key={c._id} 
                            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col overflow-hidden relative"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000"></div>
                            
                            <div className="flex items-start justify-between relative z-10 mb-6">
                                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg font-black text-xl italic uppercase">
                                    {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                                </div>
                                <button className="p-2 text-gray-300 hover:text-gray-900 transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                            </div>

                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic leading-none">{c.customerId}</p>
                                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">{c.firstName} {c.lastName}</h3>
                                
                                <div className="h-px bg-slate-50 my-6"></div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                            <Phone size={14} />
                                        </div>
                                        <p className="text-xs font-black text-slate-800 uppercase italic">{c.phone}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                                            <MessageCircle size={14} />
                                        </div>
                                        <p className="text-xs font-black text-slate-800 uppercase italic">{c.lineId || "ไม่มีข้อมูล LINE ID"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between relative z-10">
                                <div className="flex flex-col text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                     บันทึกเมื่อ: {new Date(c.createdAt).toLocaleDateString()}
                                </div>
                                <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-50 active:scale-95 transition-all">
                                    ดูประวัติการซ่อม 
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-10">
                Found {customers.length} Customers in database
            </p>
        </div>
    );
}
