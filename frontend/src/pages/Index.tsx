import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTA, FooterSection } from "@/components/landing/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <DemoSection />
        <FAQSection />
        <FinalCTA />
      </main>
      <FooterSection />
    </div>
  );
};

export default Index;
