import Image from "next/image";

const coverageItems = [
    {
        icon: "/icons/coverage/screen-crack.png",
        label: "จอแตก",
    },
    {
        icon: "/icons/coverage/broken-device.png",
        label: "เครื่องแตก",
    },
    {
        icon: "/icons/coverage/fire-damage.png",
        label: "ไฟไหม้",
    },
    {
        icon: "/icons/coverage/water-damage.png",
        label: "ตกน้ำ",
    },
    {
        icon: "/icons/coverage/laser-damage.png",
        label: "Laser Damage",
    },
    {
        icon: "/icons/coverage/stolen-device.png",
        label: "เครื่องถูกขโมย",
    },
];

export function CoverageDetails() {
    return (
        <section className="py-24 bg-gradient-to-r from-blue-100/60 via-purple-100/50 to-white">
            <div className="max-w-6xl mx-auto px-4 md:px-8">

                {/* Heading */}
                <h2 className="text-3xl md:text-4xl font-black text-gray-800 text-center mb-12">
                    รายละเอียดความคุ้มครองอุบัติเหตุ
                </h2>

                {/* Icon Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {coverageItems.map((item) => (
                        <div
                            key={item.label}
                            className="flex flex-col items-center gap-4 bg-white rounded-3xl shadow-sm border border-white/80 px-4 py-8 hover:shadow-md transition-shadow"
                        >
                            <div className="relative w-24 h-24">
                                <Image
                                    src={item.icon}
                                    alt={item.label}
                                    fill
                                    sizes="96px"
                                    className="object-contain"
                                />
                            </div>
                            <p className="text-base font-bold text-gray-700 text-center">{item.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
