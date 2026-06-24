import Link from "next/link";

const LOCATIONS_DATA = [
  {
    name: "Balham",
    address: "12-14 Bedford Hill\nLondon SW12 9RG",
    phone: "020 8673 3456",
    hours: "Mon-Sun: 12pm - 11pm",
    href: "/locations"
  },
  {
    name: "Battersea",
    address: "89 Northcote Road\nLondon SW11 6PL",
    phone: "020 7228 1122",
    hours: "Mon-Sun: 12pm - 11pm",
    href: "/locations"
  },
  {
    name: "Kilburn",
    address: "244 High Road\nLondon NW6 2BS",
    phone: "020 7624 3322",
    hours: "Mon-Sun: 12pm - 11.30pm",
    href: "/locations"
  }
];

const SOCIALS = [
  { name: "Instagram", href: "#" },
  { name: "Facebook", href: "#" },
  { name: "TikTok", href: "#" },
];

export function Footer() {
  return (
    <footer className="bg-[#1A1411] w-full pt-32 lg:pt-40 pb-12 px-6 border-t border-[#F3EEE8]/5">
      <div className="max-w-[1200px] mx-auto">

        {/* Epilogue: The Final Chapter */}
        <div className="flex flex-col items-center text-center mb-24 pb-20 border-b border-[#F3EEE8]/10">
          <span className="text-[#C8A96B]/80 text-[10px] tracking-[0.4em] font-normal uppercase mb-6 font-sans block">
            Chapter VIII &middot; The Epilogue
          </span>
          <h2 className="font-serif text-[36px] md:text-[48px] tracking-wide leading-none text-[#F3EEE8] mb-6">
            The Story Continues.
          </h2>
          <p className="text-[#F3EEE8]/70 text-[16px] md:text-[18px] italic tracking-[0.05em] font-light max-w-lg mb-10">
            Inspired by the flavours, memories and gathering places of old Bombay, reimagined for modern London. We look forward to welcoming you to our table.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/reservations"
              className="flex items-center justify-center h-[44px] px-10 rounded-none border border-[#C8A96B]/30 text-[#C8A96B] text-[10px] tracking-[0.2em] font-normal uppercase font-sans hover:border-[#C8A96B] hover:text-[#F3EEE8] transition-all duration-500"
            >
              Reserve A Table
            </Link>
          </div>
        </div>

        {/* Middle: Locations & Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 lg:gap-12 mb-24">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 flex flex-col pr-8">
            <div
              className="w-[60px] h-[70px] bg-[#C8A96B] mb-8"
              style={{
                WebkitMaskImage: "url('/images/brand/logo.svg')",
                maskImage: "url('/images/brand/logo.svg')",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "left center",
                maskPosition: "left center",
              }}
              aria-hidden="true"
            />
            <h3 className="text-[#F3EEE8] font-serif text-[22px] mb-3">
              Stay in the story
            </h3>
            <p className="text-[#F3EEE8]/50 text-[14px] font-sans font-light mb-6 leading-relaxed max-w-sm">
              New dishes, events and the occasional love letter from our kitchen.
            </p>
            <form className="flex w-full max-w-[320px]">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 h-[44px] px-4 bg-transparent border-b border-[#F3EEE8]/20 text-[#F3EEE8] text-[14px] font-sans font-light placeholder:text-[#F3EEE8]/30 focus:outline-none focus:border-[#C8A96B] transition-colors duration-300"
              />
              <button
                type="submit"
                className="h-[44px] px-4 border-b border-[#F3EEE8]/20 text-[#C8A96B] text-[11px] tracking-[0.15em] uppercase font-normal hover:text-[#F3EEE8] hover:border-[#C8A96B] transition-colors duration-300 whitespace-nowrap font-sans"
              >
                Join
              </button>
            </form>
          </div>

          {LOCATIONS_DATA.map((loc) => (
            <div key={loc.name} className="flex flex-col">
              <Link href={loc.href} className="group">
                <h4 className="text-[#C8A96B] text-[11px] tracking-[0.25em] uppercase font-normal font-sans mb-6 group-hover:text-[#F3EEE8] transition-colors">
                  {loc.name}
                </h4>
              </Link>
              <div className="flex flex-col space-y-4 text-[#F3EEE8]/60 text-[13px] font-sans font-light leading-[1.8]">
                <p className="whitespace-pre-line">{loc.address}</p>
                <p className="hover:text-[#F3EEE8] transition-colors cursor-pointer">{loc.phone}</p>
                <p className="text-[#F3EEE8]/40">{loc.hours}</p>
              </div>
            </div>
          ))}

        </div>

        {/* Bottom: Social + Legal */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#F3EEE8]/10">
          <div className="flex items-center space-x-8 mb-6 md:mb-0">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                className="text-[#F3EEE8]/50 text-[10px] font-sans tracking-[0.2em] uppercase hover:text-[#C8A96B] transition-colors duration-300"
              >
                {s.name}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-4 md:gap-8 text-[#F3EEE8]/30 text-[10px] font-sans tracking-[0.15em] uppercase">
            <Link href="/privacy" className="hover:text-[#F3EEE8]/60 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[#F3EEE8]/60 transition-colors">Terms</Link>
            <span>&copy; {new Date().getFullYear()} Bombay Bicycle Chef</span>
            <span>Developed by <a href="https://digipi.uk" target="_blank" rel="noopener noreferrer" className="hover:text-[#F3EEE8]/60 transition-colors">digipi.uk</a></span>
          </div>
        </div>

      </div>
    </footer>
  );
}
