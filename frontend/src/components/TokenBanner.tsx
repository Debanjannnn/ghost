import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function TokenBanner() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="relative rounded-[28px] overflow-hidden">
          <Image
            src="/GHOST-banner.png"
            alt="GHOST Protocol Banner"
            width={1200}
            height={400}
            className="w-full h-auto object-cover"
            priority
          />
          <div className="absolute inset-0 flex flex-col justify-center p-10 sm:p-14">
            <h3 className="text-4xl sm:text-5xl font-semibold text-white mb-5 tracking-tight">$GHOST</h3>
            <p className="text-gray-300 leading-relaxed mb-8 text-base max-w-md">
              Ghost is building ethical, user-first lending. $GHOST is our community token to prove that crypto can and will be better.
            </p>
            <div>
              <button className="inline-flex items-center gap-2.5 px-7 py-3.5 text-gray-900 text-sm font-semibold rounded-full hover:opacity-90 transition-all hover:-translate-y-0.5 active:translate-y-0" style={{ backgroundColor: "#e2a9f1" }}>
                Learn more
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
