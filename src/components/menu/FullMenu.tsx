"use client";

import { MENU_DATA } from "@/data/menu";

// Filter out Signature and Drinks from the main list as they have their own sections
const EDITORIAL_MENU = MENU_DATA.filter(cat => cat.id !== 'signatures' && cat.id !== 'desserts'); 
// Wait, user says Desserts and Drinks are part of the menu. I'll include Desserts. Only remove signatures.

export function FullMenu() {
  return (
    <section className="bg-[#F6F2EA] w-full pt-10 pb-32 lg:pb-[160px] px-6">
      <div className="max-w-[1000px] mx-auto">
        
        {MENU_DATA.filter(cat => cat.id !== 'signatures' && cat.id !== 'drinks').map((category, index) => (
          <div key={category.id} id={`menu-${category.id}`} className="mb-24 lg:mb-32">
            
            {/* Category Header */}
            <h2 className="text-[32px] md:text-[40px] font-serif text-[#2B221D] mb-12 uppercase tracking-widest text-center">
              {category.title}
            </h2>

            {/* Menu Items */}
            <div className="flex flex-col space-y-10">
              {category.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex flex-col group">
                  
                  {/* Title and Price Row */}
                  <div className="flex items-end justify-between w-full mb-3">
                    <h3 className="text-[20px] lg:text-[24px] font-serif text-[#2B221D] group-hover:text-[#B08A3E] transition-colors duration-300">
                      {item.name}
                    </h3>
                    
                    {/* Dot Leader */}
                    <div className="flex-grow border-b border-dotted border-[#2A211C]/20 mx-4 mb-2" />
                    
                    <span className="text-[18px] lg:text-[20px] font-serif text-[#2B221D]">
                      {item.price}
                    </span>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-[15px] text-[#5A524B] font-sans leading-[1.8] max-w-[80%] lg:max-w-[60%]">
                      {item.description}
                    </p>
                  )}

                  {/* Thin Divider */}
                  <div className="w-full h-[1px] bg-[#2A211C]/5 mt-8" />
                </div>
              ))}
            </div>

          </div>
        ))}
        
      </div>
    </section>
  );
}
