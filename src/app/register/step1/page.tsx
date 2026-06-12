"use client";
import { useRouter } from "next/navigation";
import { useRegister } from "../RegisterContext";

export default function Step1() {
    const router = useRouter();
    const { phone, setPhone, imei, setImei, agentCode, setAgentCode } = useRegister();

    return (
        <div className="w-full max-w-[600px] mx-auto space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 text-center">ระบุเบอร์โทรศัพท์และ IMEI</h2>
            <div className="space-y-3">
                <label className="text-xl font-bold text-gray-800 block">ระบุหมายเลขโทรศัพท์ของคุณ</label>
                <input
                    type="text"
                    placeholder="กรอกหมายเลขโทรศัพท์ 10 หลักของคุณ"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 focus:border-blue-600 focus:outline-none transition-colors text-lg"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                <label className="text-xl font-bold text-gray-800 block">หมายเลขเลข IMEI</label>
                <input
                    type="text"
                    placeholder="กรอกหมายเลขเลข IMEI 15 หลัก"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 focus:border-blue-600 focus:outline-none transition-colors text-lg"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                />
            </div>

            <div className="bg-blue-50/50 p-6 rounded-2xl border-2 border-blue-100/50 space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-lg font-bold text-slate-700">มีรหัสตัวแทน (Agent Code)?</label>
                    <input
                        type="checkbox"
                        className="w-6 h-6 rounded-md border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={!!agentCode}
                        onChange={(e) => !e.target.checked && setAgentCode("")}
                    />
                </div>
                {(agentCode !== undefined) && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <input
                            type="text"
                            placeholder="กรอกรหัสตัวแทน (เช่น AG-1234)"
                            className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-all font-bold text-blue-600 placeholder:text-blue-200 uppercase"
                            value={agentCode}
                            onChange={(e) => setAgentCode(e.target.value.toUpperCase())}
                        />
                        <p className="text-[10px] text-blue-400 font-bold mt-2 uppercase tracking-tight">กรอกรหัสตัวแทนหากคุณสมัครผ่านตัวแทนจำหน่าย</p>
                    </div>
                )}
            </div>

            <p className="text-xl font-bold text-gray-700 text-center py-4">
                ตรวจสอบหมายเลขเลขได้ เพียงกด <span className="text-blue-600 font-black">*#06#</span> โทรออก
            </p>

            <div className="pt-8">
                <button
                    onClick={() => router.push("/register/step2")}
                    className="w-full bg-[#9da3af] hover:bg-blue-600 text-white font-bold py-5 rounded-[1.5rem] text-2xl transition-all shadow-lg"
                    disabled={!phone || !imei}
                >
                    ต่อไป
                </button>
            </div>
        </div>
    );
}
