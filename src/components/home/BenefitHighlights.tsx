import Image from "next/image";

const topBenefits = [
    {
        icon: "/icons/benefits/device-swap.png",
        title: "เปลี่ยนได้ 2 ครั้ง\n(Device Swap)",
        note: "(อันส่วนต้องครบไม่สูญหาย)\nภายในประเทศเท่านั้น",
        noteColor: "text-pink-500",
    },
    {
        icon: "/icons/benefits/replacement.png",
        title: "รับเครื่องทดแทนได้ 1 ครั้ง\n(Replacement)",
        note: "(ภายในประเทศเท่านั้น)",
        noteColor: "text-pink-500",
    },
    {
        icon: "/icons/benefits/unlimited-repair.png",
        title: "อุบัติเหตุซ่อมได้\nไม่จำกัดจำนวนครั้ง",
        note: "",
        noteColor: "",
    },
    {
        icon: "/icons/benefits/unlimited-hardware.png",
        title: "บริการด้าน Hardware\nไม่จำกัดจำนวนครั้ง",
        note: "",
        noteColor: "",
    },
];

const bottomBenefits = [
    {
        icon: "/icons/benefits/battery-80.png",
        title: "กรณีแบตเตอรี่ต่ำกว่า\n80% สามารถเปลี่ยนได้\nตลอดอายุแพ็กเกจ",
    },
    {
        icon: "/icons/benefits/door-to-door.png",
        title: "บริการรับ - ส่งถึงหน้าบ้าน",
    },
    {
        icon: "/icons/benefits/worldwide.png",
        title: "เข้ารับบริการซ่อมแซม\nเครื่องได้ทั่วโลกที่\nApple Store และ\nApple Service Provider",
    },
];

export function BenefitHighlights() {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-5xl mx-auto px-4 md:px-8">

                {/* Heading */}
                <div className="text-center mb-12">
                    <h2 className="text-2xl md:text-3xl font-black mb-2">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                            Naravich Mobile Care | Apple Care Service
                        </span>
                    </h2>
                    <p className="text-lg md:text-xl font-bold text-gray-800">
                        เพิ่มการคุ้มครอง iPhone ของคุณในราคาที่คุ้มค่า
                    </p>
                </div>

                {/* Top row — 4 cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {topBenefits.map((b) => (
                        <div key={b.title} className="bg-gray-50 rounded-3xl p-6 flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow border border-gray-100">
                            <div className="relative w-20 h-20">
                                <Image src={b.icon} alt={b.title} fill sizes="80px" className="object-contain" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 whitespace-pre-line leading-snug">{b.title}</p>
                                {b.note && (
                                    <p className={`text-[11px] font-semibold mt-1 whitespace-pre-line leading-tight ${b.noteColor}`}>
                                        {b.note}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom row — 3 cards centered */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {bottomBenefits.map((b) => (
                        <div key={b.title} className="bg-gray-50 rounded-3xl p-6 flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow border border-gray-100">
                            <div className="relative w-20 h-20">
                                <Image src={b.icon} alt={b.title} fill sizes="80px" className="object-contain" />
                            </div>
                            <p className="text-sm font-bold text-gray-800 whitespace-pre-line leading-snug">{b.title}</p>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}
