import React from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Image } from "@/components/ui/image";

const BG_IMAGE = "https://media.base44.com/images/public/6abf8a76114e77b62f2ab410/1b1269681_Gemini_Generated_Image_16jwjw16jwjw16jw.jpg";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Full-bleed pastel backdrop */}
      <div className="fixed inset-0 -z-10" aria-hidden="true">
        <Image src={BG_IMAGE} fittingType="fill" className="w-full h-full" />
      </div>

      {/* Compact header — logo only */}
      <header className="absolute top-0 left-0 z-10 px-6 sm:px-10 py-6">
        <h1
          className="text-[#1A1A1A] leading-none select-none"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "32px", fontWeight: 700, letterSpacing: "0.5px" }}
        >
          NaNa
        </h1>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5 sm:px-8">
        <Link
          to="/viewbook"
          className="inline-flex items-center gap-2 text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition font-mono text-[13px]"
        >
          <BookOpen size={15} />
          Open NaNa-ViewBook Engine
        </Link>
      </main>
    </div>
  );
}
