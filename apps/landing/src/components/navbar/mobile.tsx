import { Menu } from "lucide-react";

import { cn } from "@amaxa/ui";
import { buttonVariants } from "@amaxa/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@amaxa/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  children?: NavItem[];
}

export const MobileMenu = ({ navItems }: { navItems: NavItem[] }) => {
  return (
    <Sheet>
      <SheetTrigger render={<button className="p-2" />}>
        <Menu size={24} />
      </SheetTrigger>
      <SheetContent side="right" className="w-[80%] sm:w-[350px]">
        <div className="mt-8 flex flex-col gap-6">
          {navItems.map((item) => (
            <div key={item.href} className="flex flex-col gap-3">
              <SheetClose
                render={
                  <a
                    href={item.href}
                    className="hover:text-primary text-xl font-medium transition-colors"
                  >
                    {item.label}
                  </a>
                }
              />
              {item.children && (
                <div className="ml-3 flex flex-col gap-3 border-l border-black/10 pl-4">
                  {item.children.map((child) => (
                    <SheetClose
                      key={child.href}
                      render={
                        <a
                          href={child.href}
                          className="hover:text-primary text-base font-medium text-black/70 transition-colors"
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
          <div className="mt-4 flex flex-col gap-4">
            <SheetClose
              render={
                <a
                  href="https://airtable.com/appPR9mkslbn3U8YZ/shrHHUtRzK4DqKt3F"
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full rounded-[3rem]",
                  )}
                >
                  Apply Now
                </a>
              }
            />
            <SheetClose
              render={
                <a
                  href="https://collect.crowded.me/collection/8d1ba838-a38e-4803-b155-d102b7b131e4"
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "link", size: "lg" }),
                    "w-full rounded-[3rem]",
                  )}
                >
                  Support Us
                </a>
              }
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
