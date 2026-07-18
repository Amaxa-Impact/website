import { Menu, X } from "lucide-react";

import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@amaxa/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  children?: NavItem[];
}

const APPLY_HREF =
  "https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F";

const isExternal = (href: string) => href.startsWith("http");

export const MobileMenu = ({ navItems }: { navItems: NavItem[] }) => {
  return (
    <Sheet>
      <SheetTrigger render={<button className="p-2" aria-label="Open menu" />}>
        <Menu size={24} />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="bg-purple-dark-500 w-[85%] border-0 p-0 text-white sm:w-[360px]"
      >
        {/* Close — white circle to stay visible on the dark purple panel */}
        <SheetClose
          render={
            <button
              aria-label="Close menu"
              className="text-purple-dark-500 absolute top-5 right-5 z-10 flex size-11 items-center justify-center rounded-full bg-white transition-colors hover:bg-white/90"
            />
          }
        >
          <X size={22} />
        </SheetClose>

        {/* Scrollable so it never clips on short screens, centered otherwise */}
        <div className="h-full overflow-y-auto">
          <nav className="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-20 text-center">
            {navItems.map((item) => (
              <div key={item.href} className="flex flex-col items-center gap-3">
                <SheetClose
                  render={
                    <a
                      href={item.href}
                      {...(isExternal(item.href)
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="text-2xl font-semibold text-white transition-opacity hover:opacity-70"
                    >
                      {item.label}
                    </a>
                  }
                />
                {item.children && (
                  <div className="flex flex-col items-center gap-2">
                    {item.children.map((child) => (
                      <SheetClose
                        key={child.href}
                        render={
                          <a
                            href={child.href}
                            className="text-base font-medium text-white/70 transition-opacity hover:opacity-100"
                          >
                            {child.label}
                          </a>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Apply now — mirrors the desktop nav's coral pill button */}
            <SheetClose
              render={
                <a
                  href={APPLY_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-dark-500 mt-2 inline-flex items-center justify-center rounded-full bg-[#ffd0c5] px-8 py-3 text-base font-semibold transition-opacity hover:opacity-90"
                >
                  Apply now
                </a>
              }
            />
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};
