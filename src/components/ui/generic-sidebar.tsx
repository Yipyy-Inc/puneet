"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronRight, ChevronUp, Search, X } from "lucide-react";

import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarInput,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface MenuSection {
  label: string;
  items: MenuItem[];
}

export interface GenericSidebarProps {
  header?: React.ReactNode;
  menuSections: MenuSection[];
  footer?: React.ReactNode;
  onLogout?: () => void;
}

export function GenericSidebar({
  header,
  menuSections,
  footer,
  onLogout,
}: GenericSidebarProps) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const isExpanded = state === "expanded";

  const [collapsedSections, setCollapsedSections] = React.useState<
    Record<string, boolean>
  >({});

  // Track bulk collapse state
  const [bulkCollapsed, setBulkCollapsed] = React.useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Toggle all sections
  const toggleAllSections = () => {
    const newBulkCollapsed = !bulkCollapsed;
    setBulkCollapsed(newBulkCollapsed);

    const newState: Record<string, boolean> = {};
    menuSections.forEach((section) => {
      // Don't collapse sections that have active items
      const hasActiveItem = section.items.some((item) => pathname === item.url);
      newState[section.label] = hasActiveItem ? false : newBulkCollapsed;
    });
    setCollapsedSections(newState);
  };

  // Check if section should be open (not collapsed by user)
  const getSectionOpenState = (section: MenuSection) => {
    return !collapsedSections[section.label];
  };

  // Filter menu sections based on search query
  const filteredMenuSections = React.useMemo(() => {
    if (!searchQuery.trim()) return menuSections;

    const query = searchQuery.toLowerCase();
    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            section.label.toLowerCase().includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, searchQuery]);

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-sidebar">
      {/* Header */}
      {isExpanded && (
        <SidebarHeader className="px-5 py-3 border-b border-sidebar-border/50">
          <div className="flex items-center justify-between">
            {header}
            <button
              onClick={toggleAllSections}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-sidebar-accent transition-colors"
              title={
                bulkCollapsed ? "Expand all sections" : "Collapse all sections"
              }
            >
              <ChevronUp
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  bulkCollapsed ? "rotate-180" : "",
                )}
              />
            </button>
          </div>
          {/* Search Input */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <SidebarInput
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-sm hover:bg-sidebar-accent"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </SidebarHeader>
      )}

      {/* Navigation Content */}
      <SidebarContent
        className={cn("py-2 scrollbar-thin", isExpanded ? "px-3" : "px-1")}
      >
        {filteredMenuSections.map((section) => {
          const hasActiveItem = section.items.some(
            (item) => pathname === item.url,
          );
          const isOpen = getSectionOpenState(section);
          const activeItem = section.items.find(
            (item) => pathname === item.url,
          );

          // When sidebar is collapsed, only show items (no sections)
          if (!isExpanded) {
            return (
              <SidebarGroup key={section.label} className="py-0">
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {section.items.map((item) => {
                      const isActive = pathname === item.url;
                      return (
                        <SidebarMenuItem key={item.title}>
                          {item.disabled ? (
                            <SidebarMenuButton
                              asChild={false}
                              disabled
                              tooltip={item.title}
                              className={cn(
                                "w-full text-sm font-medium rounded-lg",
                                "opacity-50 cursor-not-allowed",
                                "text-muted-foreground",
                              )}
                            >
                              <item.icon className="size-4 shrink-0" />
                            </SidebarMenuButton>
                          ) : (
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.title}
                              className={cn(
                                "w-full text-sm font-medium transition-all duration-200 rounded-lg",
                                "hover:bg-sidebar-accent",
                                isActive && [
                                  "bg-primary text-primary-foreground",
                                  "shadow-sm",
                                  "hover:bg-primary/90",
                                ],
                              )}
                            >
                              <Link
                                href={item.url}
                                className="flex items-center justify-center"
                              >
                                <item.icon
                                  className={cn(
                                    "size-4 shrink-0 transition-colors",
                                    isActive && "text-muted-foreground",
                                  )}
                                />
                              </Link>
                            </SidebarMenuButton>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          return (
            <SidebarGroup key={section.label} className="py-0.5">
              <Collapsible
                open={isOpen}
                onOpenChange={() => toggleSection(section.label)}
              >
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel
                    className={cn(
                      "px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center justify-between",
                      !hasActiveItem && "cursor-pointer",
                    )}
                  >
                    <span>{section.label}</span>
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isOpen ? "rotate-90" : "",
                      )}
                    />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {section.items.map((item) => {
                        const isActive = pathname === item.url;
                        return (
                          <SidebarMenuItem key={item.title}>
                            {item.disabled ? (
                              <SidebarMenuButton
                                asChild={false}
                                disabled
                                tooltip={item.title}
                                className={cn(
                                  "w-full text-sm font-medium",
                                  isExpanded ? "rounded-xl" : "rounded-lg",
                                  "opacity-50 cursor-not-allowed",
                                  "text-muted-foreground",
                                )}
                              >
                                <item.icon className="size-4 shrink-0" />
                                {isExpanded && (
                                  <span className="truncate">{item.title}</span>
                                )}
                              </SidebarMenuButton>
                            ) : (
                              <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={item.title}
                                className={cn(
                                  "w-full text-sm font-medium transition-all duration-200",
                                  isExpanded ? "rounded-xl" : "rounded-lg",
                                  "hover:bg-sidebar-accent",
                                  isActive && [
                                    "bg-primary text-primary-foreground",
                                    "shadow-sm",
                                    "hover:bg-primary/90",
                                  ],
                                )}
                              >
                                <Link
                                  href={item.url}
                                  className={cn(
                                    "flex items-center",
                                    isExpanded ? "gap-3" : "justify-center",
                                  )}
                                >
                                  <item.icon
                                    className={cn(
                                      "size-4 shrink-0 transition-colors",
                                      isActive && "text-muted-foreground",
                                    )}
                                  />
                                  {isExpanded && (
                                    <>
                                      <span className="truncate flex-1">
                                        {item.title}
                                      </span>
                                      {isActive && (
                                        <ChevronRight className="h-4 w-4 opacity-60" />
                                      )}
                                    </>
                                  )}
                                </Link>
                              </SidebarMenuButton>
                            )}
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>

              {/* Show active item when section is collapsed */}
              {!isOpen && activeItem && (
                <div className="mb-1">
                  <SidebarMenu className="gap-0.5">
                    <SidebarMenuItem>
                      {activeItem.disabled ? (
                        <SidebarMenuButton
                          asChild={false}
                          disabled
                          tooltip={activeItem.title}
                          className={cn(
                            "w-full text-sm font-medium rounded-xl",
                            "opacity-50 cursor-not-allowed",
                            "text-muted-foreground",
                          )}
                        >
                          <activeItem.icon className="size-4 shrink-0" />
                          <span className="truncate">{activeItem.title}</span>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={true}
                          tooltip={activeItem.title}
                          className={cn(
                            "w-full text-sm font-medium transition-all duration-200 rounded-xl",
                            "bg-primary text-primary-foreground",
                            "shadow-sm",
                            "hover:bg-primary/90",
                          )}
                        >
                          <Link
                            href={activeItem.url}
                            className="flex items-center gap-3"
                          >
                            <activeItem.icon
                              className={cn(
                                "size-4 shrink-0 transition-colors",
                                "text-muted-foreground",
                              )}
                            />
                            <span className="truncate flex-1">
                              {activeItem.title}
                            </span>
                            <ChevronRight className="h-4 w-4 opacity-60" />
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  </SidebarMenu>
                </div>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter
        className={cn(
          "border-t border-sidebar-border/50",
          isExpanded ? "px-3 py-4" : "px-1 py-2",
        )}
      >
        {footer || (
          <SidebarMenuButton
            asChild
            tooltip="Logout"
            className={cn(
              "w-full text-sm font-medium",
              isExpanded ? "rounded-xl px-3 py-2.5" : "rounded-lg",
              "text-destructive hover:bg-destructive/10",
              "transition-all duration-200",
            )}
            onClick={onLogout}
          >
            <button
              className={cn(
                "flex items-center",
                isExpanded ? "gap-3" : "justify-center",
              )}
            >
              <LogOut className="size-4 shrink-0" />
              {isExpanded && <span>Logout</span>}
            </button>
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
