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

const FOOTER_LINKS = [
  {
    heading: "Explore",
    links: [
      { name: "Full Menu", href: "/menu" },
      { name: "Reservations", href: "/reservations" },
      { name: "Order Online", href: "https://www.bombaybicyclechef.uk/locator" },
      { name: "Private Dining", href: "/contact" },
      { name: "Contact Us", href: "/contact" },
    ]
  }
];

const SOCIALS = [
  { name: "Instagram", href: "#" },
  { name: "Facebook", href: "#" },
  { name: "TikTok", href: "#" },
];

export function Footer() {
  return (
    <footer className="bg-[#2A211C] w-full pt-24 lg:pt-32 pb-24 lg:pb-12 px-6 border-t border-[#F6F2EA]/5">
      <div className="max-w-[1200px] mx-auto">

        {/* Top: Brand + Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 mb-20 lg:mb-28 pb-16 border-b border-[#F6F2EA]/10">
          {/* Brand */}
          <div className="flex flex-col">
            <span className="font-serif text-[28px] lg:text-[36px] tracking-wide leading-none text-[#F6F2EA] mb-6">
              Bombay Bicycle Chef
            </span>
            <p className="text-[#F6F2EA]/60 text-[15px] leading-relaxed max-w-md font-sans">
              Inspired by the flavours, memories and gathering places of old Bombay, reimagined for modern London.
            </p>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col lg:items-end lg:text-right">
            <h3 className="text-[#F6F2EA] font-serif text-[22px] mb-3">
              Stay in the story
            </h3>
            <p className="text-[#F6F2EA]/60 text-[14px] font-sans mb-6">
              New dishes, events and the occasional love letter from our kitchen.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 w-full max-w-[400px]">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 h-[48px] px-4 bg-transparent border border-[#F6F2EA]/20 text-[#F6F2EA] text-[14px] font-sans placeholder:text-[#F6F2EA]/30 focus:outline-none focus:border-[#B08A3E] transition-colors duration-300"
              />
              <button
                type="submit"
                className="h-[48px] px-8 bg-[#7A0E2E] text-[#F6F2EA] text-[13px] tracking-[0.15em] uppercase font-medium hover:bg-[#5D0925] transition-colors duration-300 whitespace-nowrap font-sans"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Middle: Locations & Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-20">
          
          {LOCATIONS_DATA.map((loc) => (
            <div key={loc.name} className="flex flex-col">
              <Link href={loc.href} className="group">
                <h4 className="text-[#B08A3E] text-[13px] tracking-[0.2em] uppercase font-semibold font-sans mb-6 group-hover:text-[#F6F2EA] transition-colors">
                  {loc.name}
                </h4>
              </Link>
              <div className="flex flex-col space-y-4 text-[#F6F2EA]/70 text-[14px] font-sans leading-[1.6]">
                <p className="whitespace-pre-line">{loc.address}</p>
                <p>{loc.phone}</p>
                <p className="text-[#F6F2EA]/50">{loc.hours}</p>
              </div>
            </div>
          ))}

          {/* Useful Links */}
          {FOOTER_LINKS.map((col) => (
            <div key={col.heading} className="flex flex-col">
              <h4 className="text-[#B08A3E] text-[13px] tracking-[0.2em] uppercase font-semibold font-sans mb-6">
                {col.heading}
              </h4>
              <ul className="flex flex-col space-y-4">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[#F6F2EA]/70 text-[14px] font-sans hover:text-[#B08A3E] transition-colors duration-300"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        </div>

        {/* Bottom: Social + Legal */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[#F6F2EA]/10">
          <div className="flex items-center space-x-8 mb-6 md:mb-0">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                className="text-[#F6F2EA]/50 text-[12px] font-sans tracking-[0.15em] uppercase hover:text-[#B08A3E] transition-colors duration-300"
              >
                {s.name}
              </a>
            ))}
          </div>
          <p className="text-[#F6F2EA]/30 text-[12px] font-sans tracking-[0.1em]">
            &copy; {new Date().getFullYear()} Bombay Bicycle Chef. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
