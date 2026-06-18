import Link from "next/link";

const FOOTER_LINKS = [
  {
    heading: "About",
    links: [
      { name: "Our Story", href: "/about" },
      { name: "The Team", href: "/about#team" },
      { name: "Careers", href: "/careers" },
    ]
  },
  {
    heading: "Menu",
    links: [
      { name: "Full Menu", href: "/menu" },
      { name: "Drinks", href: "/menu#drinks" },
      { name: "Catering", href: "/catering" },
    ]
  },
  {
    heading: "Locations",
    links: [
      { name: "Balham", href: "/locations#balham" },
      { name: "Battersea", href: "/locations#battersea" },
      { name: "Kilburn", href: "/locations#kilburn" },
    ]
  },
  {
    heading: "Connect",
    links: [
      { name: "Reservations", href: "/reservations" },
      { name: "Contact Us", href: "/contact" },
      { name: "Private Dining", href: "/private-dining" },
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
    <footer className="bg-[#2B241D] w-full pt-24 lg:pt-32 pb-12 px-6">
      <div className="max-w-[1200px] mx-auto">

        {/* Top: Brand + Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 mb-20 lg:mb-28 pb-16 border-b border-[rgba(245,240,230,0.08)]">
          {/* Brand */}
          <div className="flex flex-col">
            <div className="flex flex-col mb-6">
              <span className="font-serif text-[28px] lg:text-[32px] tracking-wide leading-none text-[#F5F0E6]">
                Bombay Bicycle Chef
              </span>
            </div>
            <p className="text-[#EFE6D8]/50 text-[15px] leading-relaxed max-w-md">
              Inspired by the flavours, memories and gathering places of old Bombay, reimagined for modern London.
            </p>
          </div>

          {/* Newsletter */}
          <div className="flex flex-col justify-center">
            <h3 className="text-[#F5F0E6] font-serif text-xl mb-3">
              Stay in the story
            </h3>
            <p className="text-[#EFE6D8]/50 text-sm mb-6">
              New dishes, events and the occasional love letter from our kitchen.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-1 h-[48px] px-4 bg-transparent border border-[rgba(245,240,230,0.12)] text-[#F5F0E6] text-sm tracking-wide placeholder:text-[#EFE6D8]/30 focus:outline-none focus:border-[#A88442]/50 transition-colors duration-300"
              />
              <button
                type="submit"
                className="h-[48px] px-6 bg-[#5D0925] text-[#F5F0E6] text-[13px] tracking-[0.12em] uppercase font-medium hover:bg-[#420616] transition-colors duration-300 whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Middle: Link Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-24 mb-20 lg:mb-28">
          {FOOTER_LINKS.map((col) => (
            <div key={col.heading} className="flex flex-col">
              <h4 className="text-[#A88442] text-[11px] tracking-[0.2em] uppercase font-medium mb-6">
                {col.heading}
              </h4>
              <ul className="flex flex-col space-y-4">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-[#EFE6D8]/50 text-[15px] hover:text-[#F5F0E6] transition-colors duration-300"
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
        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-[rgba(245,240,230,0.06)]">
          <div className="flex items-center space-x-8 mb-6 md:mb-0">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                className="text-[#EFE6D8]/40 text-xs tracking-[0.15em] uppercase hover:text-[#A88442] transition-colors duration-300"
              >
                {s.name}
              </a>
            ))}
          </div>
          <p className="text-[#EFE6D8]/25 text-xs tracking-wider">
            &copy; {new Date().getFullYear()} Bombay Bicycle Chef. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
