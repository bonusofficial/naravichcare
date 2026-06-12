import { Header } from "@/components/layout/Header";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ServicesSection } from "@/components/home/ServicesSection";
import { CoverageDetails } from "@/components/home/CoverageDetails";
import { BenefitHighlights } from "@/components/home/BenefitHighlights";
import { PricingPackages } from "@/components/home/PricingPackages";
import { ServiceProcess } from "@/components/home/ServiceProcess";
import { TermsSection } from "@/components/home/TermsSection";
import { Footer } from "@/components/layout/Footer";
import { FloatingChat } from "@/components/layout/FloatingChat";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      <main className="flex-grow">
        <HeroBanner />
        <ServicesSection />
        <CoverageDetails />
        <BenefitHighlights />
        <PricingPackages />
        <ServiceProcess />
        <TermsSection />
      </main>
      <Footer />
      <FloatingChat />
    </div>
  );
}
