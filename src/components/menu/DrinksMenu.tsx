"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DRINKS_DATA = [
  {
    category: "Cocktails",
    items: [
      { name: "Bombay Bicycle Signature", description: "Gin, elderflower, cucumber, crushed black pepper.", price: "£12" },
      { name: "Spiced Old Fashioned", description: "Bourbon, cardamom bitters, orange peel, smoke.", price: "£14" },
      { name: "Mango & Chilli Margarita", description: "Tequila, alphonso mango, lime, red chilli salt rim.", price: "£13" }
    ]
  },
  {
    category: "Wine",
    items: [
      { name: "House Red - Merlot", description: "France. Smooth, plum, dark berries.", price: "£12.95 / 75cl" },
      { name: "House White - Sauvignon Blanc", description: "New Zealand. Crisp, citrus, refreshing.", price: "£12.95 / 75cl" }
    ]
  },
  {
    category: "Beer",
    items: [
      { name: "Cobra Premium", description: "620ml. The perfect pairing for spice.", price: "£7.95" }
    ]
  },
  {
    category: "Soft Drinks",
    items: [
      { name: "Homemade Mango Lassi", description: "Sweet yogurt, mango puree, cardamom.", price: "£4.25" },
      { name: "Homemade Sweet Lassi", description: "Sweetened yogurt drink.", price: "£4.25" },
      { name: "Coca Cola / Diet Coke", description: "330ml Can.", price: "£1.75" }
    ]
  }
];

export function DrinksMenu() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="menu-drinks" className="bg-[#F6F2EA] w-full pt-24 pb-32 lg:pt-[160px] lg:pb-[160px] px-6 border-t border-[#2A211C]/5">
      <div className="max-w-[1000px] mx-auto">
        
        {/* Header */}
        <div className="text-center mb-20 lg:mb-24">
          <span className="text-[#B08A3E] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans">
            The Bar
          </span>
          <h2 className="text-[40px] md:text-[56px] lg:text-[80px] font-serif text-[#2B221D] leading-[1]">
            Libations
          </h2>
        </div>

        {/* Accordion */}
        <div className="flex flex-col border-t border-[#2A211C]/20">
          {DRINKS_DATA.map((section, index) => {
            const isOpen = openIndex === index;

            return (
              <div key={index} className="flex flex-col border-b border-[#2A211C]/20">
                
                {/* Accordion Header */}
                <button 
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  className="w-full py-8 lg:py-10 flex items-center justify-between group focus:outline-none"
                >
                  <h3 className={`text-[28px] lg:text-[40px] font-serif transition-colors duration-300 ${isOpen ? "text-[#B08A3E]" : "text-[#2A211C] group-hover:text-[#B08A3E]"}`}>
                    {section.category}
                  </h3>
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <span className="absolute w-full h-[1px] bg-[#2A211C]" />
                    <span className={`absolute w-[1px] h-full bg-[#2A211C] transition-transform duration-500 ease-out ${isOpen ? "rotate-90 scale-0" : "rotate-0 scale-100"}`} />
                  </div>
                </button>

                {/* Accordion Content */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-12 flex flex-col space-y-8 pl-4 lg:pl-10">
                        {section.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex flex-col">
                            <div className="flex items-end justify-between w-full mb-2">
                              <h4 className="text-[18px] lg:text-[22px] font-serif text-[#2B221D]">
                                {item.name}
                              </h4>
                              <div className="flex-grow border-b border-dotted border-[#2A211C]/20 mx-4 mb-2" />
                              <span className="text-[16px] lg:text-[18px] font-serif text-[#2B221D]">
                                {item.price}
                              </span>
                            </div>
                            <p className="text-[14px] text-[#5A524B] font-sans leading-[1.6] max-w-[80%]">
                              {item.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
