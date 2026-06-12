"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRegister } from "../RegisterContext";

export default function Step6() {
    const router = useRouter();
    const {
        phone, imei, brand, model, devicePrice, deviceType, packageType, deviceImages, receiptImage,
        firstName, setFirstName, lastName, setLastName, idCard, setIdCard, email, setEmail,
        postCode, setPostCode, province, setProvince, district, setDistrict, subDistrict, setSubDistrict, addressDetails, setAddressDetails,
        agentCode, setRegistrationResult
    } = useRegister();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone, imei, brand, model,
                    firstName, lastName, idCard, email,
                    postCode, province, district, subDistrict, addressDetails,
                    agentCode,
                    devicePrice: Number(devicePrice) || 0,
                    deviceType,
                    packageType,
                    images: { ...deviceImages, receipt: receiptImage }
                }),
            });

            const result = await response.json();
            if (response.ok) {
                // Clear state
                localStorage.removeItem("registerState_text");
                // Construct fullName for success page
                const dataWithFullName = { ...result.data, fullName: `${firstName} ${lastName}` };
                setRegistrationResult(dataWithFullName);
                router.push("/register/success");
            } else {
                alert("เกิดข้อผิดพลาด: " + result.message);
            }
        } catch (error) {
            console.error("Submit Error:", error);
            alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[1000px] mx-auto space-y-12 py-10">
            {/* Personal Information Section */}
            <div className="space-y-8">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">ข้อมูลส่วนตัว (Personal information)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-800 block">ชื่อ (Name)</label>
                        <input
                            type="text"
                            placeholder="กรุณากรอก ชื่อ"
                            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                        <p className="text-[11px] text-red-400 font-bold">กรุณากรอก ชื่อ</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-800 block">นามสกุล (Surname)</label>
                        <input
                            type="text"
                            placeholder="กรุณากรอก นามสกุล"
                            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                        <p className="text-[11px] text-red-400 font-bold">กรุณากรอก นามสกุล</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-base font-black text-slate-800 block">เลขบัตรประจำตัวประชาชน (Thai National ID Card)</label>
                    <input
                        type="text"
                        placeholder="เลขบัตรประจำตัวประชาชน"
                        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30"
                        value={idCard}
                        onChange={(e) => setIdCard(e.target.value)}
                    />
                    <p className="text-[11px] text-red-400 font-bold">กรุณากรอกเลขบัตรประชาชน</p>
                </div>

                <div className="space-y-2">
                    <label className="text-base font-black text-slate-800 block">อีเมล (Email)</label>
                    <input
                        type="email"
                        placeholder="ระบุอีเมลของคุณ"
                        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            {/* Address Section */}
            <div className="space-y-8">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">ที่อยู่ (Address)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-800 block">รหัสไปรษณีย์ (Post Code)</label>
                        <input
                            type="text"
                            placeholder="กรุณากรอกรหัสไปรษณีย์"
                            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30"
                            value={postCode}
                            onChange={(e) => setPostCode(e.target.value)}
                        />
                        <p className="text-[11px] text-red-400 font-bold">กรุณากรอก รหัสไปรษณีย์</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-800 block">จังหวัด (Provinces)</label>
                        <input
                            type="text"
                            placeholder="กรุณากรอกรหัสไปรษณีย์"
                            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30"
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                        />
                        <p className="text-[11px] text-red-400 font-bold">กรุณาเลือก จังหวัด</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-800 block">อำเภอ/เขต (Districts)</label>
                        <input
                            type="text"
                            placeholder="กรุณากรอกรหัสไปรษณีย์"
                            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30"
                            value={district}
                            onChange={(e) => setDistrict(e.target.value)}
                        />
                        <p className="text-[11px] text-red-400 font-bold">กรุณาเลือก อำเภอ/เขต</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-base font-black text-slate-800 block">ตำบล/แขวง (Sub-district)</label>
                        <input
                            type="text"
                            placeholder="กรุณากรอกรหัสไปรษณีย์"
                            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30"
                            value={subDistrict}
                            onChange={(e) => setSubDistrict(e.target.value)}
                        />
                        <p className="text-[11px] text-red-400 font-bold">กรุณาเลือก ตำบล/แขวง</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-base font-black text-slate-800 block">รายละเอียดที่อยู่ (Address details)</label>
                    <textarea
                        placeholder="กรอกรายละเอียดที่อยู่"
                        rows={3}
                        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-base bg-slate-50/30 resize-none"
                        value={addressDetails}
                        onChange={(e) => setAddressDetails(e.target.value)}
                    />
                    <p className="text-[11px] text-red-400 font-bold">กรุณากรอก ที่อยู่</p>
                </div>
            </div>

            <div className="flex justify-center gap-4 pt-4">
                <button
                    onClick={() => router.back()}
                    className="px-12 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl text-xl shadow-lg transition-all"
                >
                    ย้อนกลับ
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-12 py-4 bg-slate-400 hover:bg-slate-500 text-white font-black rounded-2xl text-xl shadow-lg transition-all disabled:opacity-50"
                    disabled={!firstName || !lastName || !idCard || loading}
                >
                    {loading ? "กำลังบันทึก..." : "ต่อไป"}
                </button>
            </div>
        </div>
    );
}
