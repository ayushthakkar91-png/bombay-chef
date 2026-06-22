"use client";

import type { MenuCategory } from "@/data/menu";

// Signature and Drinks render in their own dedicated sections, so they're
// excluded from the main editorial list here.
export function FullMenu({ categories }: { categories: MenuCategory[] }) {
  const visibleCategories = categories.filter(
    (cat) => cat.id !== "signatures" && cat.id !== "drinks"
  );

  return (
    <section className="bg-[#F6F2EA] w-full pt-10 pb-32 lg:pb-[160px] px-6">
      <div className="max-w-[1000px] mx-auto">

        {visibleCategories.map((category) => (
          <div key={category.id} id={`menu-${category.id}`} className="mb-24 lg:mb-32">
            
            {/* Category Header */}
            <h2 className="text-[28px] md:text-[36px] font-serif text-[#1A1411] mb-12 lg:mb-16 uppercase tracking-[0.2em] text-center border-b border-[#1A1411]/5 pb-6">
              {category.title}
            </h2>

            {/* Menu Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 lg:gap-x-24 gap-y-12 lg:gap-y-16">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex flex-col group">
                  
                  {/* Title and Price Row */}
                  <div className="flex items-start justify-between w-full mb-3 gap-6">
                    <h3 className="text-[18px] lg:text-[22px] font-serif text-[#1A1411] leading-tight">
                      {item.name}
                    </h3>
                    
                    <span className="text-[16px] lg:text-[18px] font-serif text-[#C8A96B] shrink-0 mt-1">
                      {item.price}
                    </span>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-[14px] text-[#1A1411]/60 font-sans font-light leading-[1.8] max-w-[90%]">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

          </div>
        ))}
        
      </div>
    </section>
  );
}
