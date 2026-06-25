"use client";

import type { MenuCategory } from "@/data/menu";

// Signature and Drinks render in their own dedicated sections, so they're
// excluded from the main editorial (food) list here. Drinks live in the DB as
// `drinks-*` categories and are rendered by <DrinksMenu /> instead.
export function FullMenu({ categories }: { categories: MenuCategory[] }) {
  const visibleCategories = categories.filter(
    (cat) =>
      cat.id !== "signatures" &&
      cat.id !== "drinks" &&
      !cat.id.startsWith("drinks-")
  );

  return (
    <section className="bg-[#F6F2EA] w-full pt-10 pb-32 lg:pb-[160px] px-6">
      <div className="max-w-[1000px] mx-auto">

        {/* Food Allergy or Intolerance notice */}
        <div className="max-w-[820px] mx-auto mb-24 lg:mb-32 border border-[#1A1411]/10 bg-[#FBF8F2] px-6 py-8 lg:px-10 lg:py-10">
          <h2 className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-semibold font-sans text-center mb-6">
            Food Allergy or Intolerance
          </h2>
          <div className="flex flex-col space-y-4 text-[13px] lg:text-[14px] text-[#1A1411]/70 font-sans font-light leading-[1.8]">
            <p>
              All dishes may contain traces of the following allergens: wheat, gluten, peanuts, sesame seeds,
              celery, soyabeans, soyabean oil, milk, eggs, mustard, lupin, molasses, crustaceans, fish,
              sulphur dioxide and asafoetida (hing).
            </p>
            <p>
              Please inform a member of staff or management team if you are pregnant, allergic to any
              ingredients, or have any special request.
            </p>
            <p className="text-[#1A1411]/55 pt-2">
              <span className="font-medium text-[#1A1411]/70">Key:</span> E = Egg, G = Gluten, N = Nuts, D = Dairy,
              P = Peanuts, M = Mustard, SY = Soya, S = Seafood, V = Vegan.{" "}
              <span className="font-medium text-[#1A1411]/70">Spice:</span> 🌶 Slightly spicy, 🌶🌶 Medium spicy,
              🌶🌶🌶 Hot.
            </p>
          </div>
        </div>

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
