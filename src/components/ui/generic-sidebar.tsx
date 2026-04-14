"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ChevronRight, ChevronUp, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useUiText } from "@/hooks/use-ui-text";
import { useHydrated } from "@/hooks/use-hydrated";

export interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  count?: number;
}

export interface MenuSection {
  label?: string;
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
  const isHydrated = useHydrated();
  const effectivePathname = isHydrated ? pathname : "";
  const isExpanded = state === "expanded";
  const { t } = useUiText();

  const [collapsedSections, setCollapsedSections] = React.useState<
    Record<string, boolean>
  >({});

  // Track bulk collapse state
  const [bulkCollapsed, setBulkCollapsed] = React.useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");

  const toggleSection = (label: string) => {
    if (!label) return;
    setCollapsedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Toggle all sections
  const toggleAllSections = () => {
    const newBulkCollapsed = !bulkCollapsed;
    setBulkCollapsed(newBulkCollapsed);

    const newState: Record<string, boolean> = {};
    menuSections.forEach((section) => {
      if (!section.label) return; // Skip standalone sections
      // Don't collapse sections that have active items
      const hasActiveItem = section.items.some(
        (item) => effectivePathname === item.url,
      );
      newState[section.label] = hasActiveItem ? false : newBulkCollapsed;
    });
    setCollapsedSections(newState);
  };

  // Check if section should be open (not collapsed by user)
  const getSectionOpenState = (section: MenuSection) => {
    return !collapsedSections[section.label!];
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
            section.label?.toLowerCase().includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, searchQuery]);

  return (
    <Sidebar collapsible="icon" className="bg-sidebar z-50 border-r-0 pb-16">
      {/* Header */}
      <SidebarHeader
        className={cn(
          "border-sidebar-border/50 border-b",
          isExpanded ? "px-5 py-3" : "px-1 py-2",
        )}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center justify-between">
              {header}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAllSections}
                  className="hover:bg-sidebar-accent flex size-8 items-center justify-center rounded-lg transition-colors"
                  title={
                    bulkCollapsed
                      ? t("Expand all sections")
                      : t("Collapse all sections")
                  }
                >
                  <ChevronUp
                    className={cn(
                      "size-4 transition-transform duration-200",
                      bulkCollapsed ? "rotate-180" : "",
                    )}
                  />
                </button>
                <SidebarTrigger />
              </div>
            </div>
            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <SidebarInput
                type="text"
                placeholder={t("Search...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8 pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:bg-sidebar-accent absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm"
                >
                  <X className="text-muted-foreground size-3" />
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <SidebarTrigger />
          </div>
        )}
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent
        className={cn(
          "scrollbar-thin overflow-x-hidden py-2",
          isExpanded ? "px-3" : "px-1",
        )}
      >
        {filteredMenuSections.map((section, index) => {
          const hasActiveItem = section.items.some(
            (item) => effectivePathname === item.url,
          );
          const isOpen = section.label ? getSectionOpenState(section) : true; // Standalone always open
          const activeItem = section.items.find(
            (item) => effectivePathname === item.url,
          );

          // When sidebar is collapsed, only show items (no sections)
          if (!isExpanded) {
            return (
              <SidebarGroup
                key={section.label || `standalone-${index}`}
                className="py-0"
              >
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {section.items.map((item) => {
                      const isActive = effectivePathname === item.url;
                      const itemLabel = t(item.title);
                      return (
                        <SidebarMenuItem key={item.title}>
                          {item.disabled ? (
                            <SidebarMenuButton
                              asChild={false}
                              disabled
                              tooltip={itemLabel}
                              className={cn(
                                "w-full rounded-lg text-sm font-medium",
                                "cursor-not-allowed opacity-50",
                                "text-muted-foreground",
                              )}
                            >
                              <item.icon className="size-4 shrink-0" />
                            </SidebarMenuButton>
                          ) : (
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={itemLabel}
                              className={cn(
                                `w-full rounded-lg text-sm font-medium transition-all duration-200`,
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
                                <div className="relative">
                                  <item.icon
                                    className={cn(
                                      "size-4 shrink-0 transition-colors",
                                      isActive && "text-muted-foreground",
                                    )}
                                  />
                                  {item.count && item.count > 0 && (
                                    <div className="absolute -top-1 -left-1 size-2 rounded-full bg-red-500" />
                                  )}
                                </div>
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
            <SidebarGroup
              key={section.label || `standalone-${index}`}
              className="py-0.5"
            >
              {section.label ? (
                <Collapsible
                  open={isOpen}
                  onOpenChange={() => toggleSection(section.label!)}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarGroupLabel
                      className={cn(
                        `text-muted-foreground/70 mb-1 flex items-center justify-between px-3 text-xs font-semibold tracking-wider uppercase`,
                        !hasActiveItem && "cursor-pointer",
                      )}
                    >
                      <span>{t(section.label)}</span>
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform duration-200",
                          isOpen ? "rotate-90" : "",
                        )}
                      />
                    </SidebarGroupLabel>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="border-sidebar-border data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down ml-3 overflow-hidden border-l-2 pl-3">
                    <SidebarGroupContent>
                      <SidebarMenu className="gap-0.5">
                        {section.items.map((item) => {
                          const isActive = effectivePathname === item.url;
                          const itemLabel = t(item.title);
                          return (
                            <SidebarMenuItem key={item.title}>
                              {item.disabled ? (
                                <SidebarMenuButton
                                  asChild={false}
                                  disabled
                                  tooltip={itemLabel}
                                  className={cn(
                                    "w-full text-sm font-medium",
                                    isExpanded ? "rounded-xl" : "rounded-lg",
                                    "cursor-not-allowed opacity-50",
                                    "text-muted-foreground",
                                  )}
                                >
                                  <item.icon className="size-4 shrink-0" />
                                  {isExpanded && (
                                    <span className="truncate">
                                      {itemLabel}
                                    </span>
                                  )}
                                </SidebarMenuButton>
                              ) : (
                                <SidebarMenuButton
                                  asChild
                                  isActive={isActive}
                                  tooltip={itemLabel}
                                  className={cn(
                                    `w-full text-sm font-medium transition-all duration-200`,
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
                                        <span className="flex-1 truncate">
                                          {itemLabel}
                                        </span>
                                        {item.count && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {item.count}
                                          </Badge>
                                        )}
                                        {isActive && (
                                          <ChevronRight className="size-4 opacity-60" />
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
              ) : (
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.5">
                    {section.items.map((item) => {
                      const isActive = effectivePathname === item.url;
                      const itemLabel = t(item.title);
                      return (
                        <SidebarMenuItem key={item.title}>
                          {item.disabled ? (
                            <SidebarMenuButton
                              asChild={false}
                              disabled
                              tooltip={itemLabel}
                              className={cn(
                                "w-full rounded-xl text-sm font-medium",
                                "cursor-not-allowed opacity-50",
                                "text-muted-foreground",
                              )}
                            >
                              <item.icon className="size-4 shrink-0" />
                              <span className="truncate">{itemLabel}</span>
                            </SidebarMenuButton>
                          ) : (
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={itemLabel}
                              className={cn(
                                `w-full rounded-xl text-sm font-medium transition-all duration-200`,
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
                                className="flex items-center gap-3"
                              >
                                <item.icon
                                  className={cn(
                                    "size-4 shrink-0 transition-colors",
                                    isActive && "text-muted-foreground",
                                  )}
                                />
                                <span className="flex-1 truncate">
                                  {itemLabel}
                                </span>
                                {item.count && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {item.count}
                                  </Badge>
                                )}
                                {isActive && (
                                  <ChevronRight className="size-4 opacity-60" />
                                )}
                              </Link>
                            </SidebarMenuButton>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}

              {/* Show active item when section is collapsed - only for labeled sections */}
              {!isOpen && activeItem && section.label && (
                <div className="mb-1">
                  <SidebarMenu className="gap-0.5">
                    <SidebarMenuItem>
                      {(() => {
                        const activeItemLabel = t(activeItem.title);
                        return activeItem.disabled ? (
                          <SidebarMenuButton
                            asChild={false}
                            disabled
                            tooltip={activeItemLabel}
                            className={cn(
                              "w-full rounded-xl text-sm font-medium",
                              "cursor-not-allowed opacity-50",
                              "text-muted-foreground",
                            )}
                          >
                            <activeItem.icon className="size-4 shrink-0" />
                            <span className="truncate">{activeItemLabel}</span>
                          </SidebarMenuButton>
                        ) : (
                          <SidebarMenuButton
                            asChild
                            isActive={true}
                            tooltip={activeItemLabel}
                            className={cn(
                              `w-full rounded-xl text-sm font-medium transition-all duration-200`,
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
                              <span className="flex-1 truncate">
                                {activeItemLabel}
                              </span>
                              {activeItem.count && (
                                <Badge variant="secondary" className="text-xs">
                                  {activeItem.count}
                                </Badge>
                              )}
                              <ChevronRight className="size-4 opacity-60" />
                            </Link>
                          </SidebarMenuButton>
                        );
                      })()}
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
          "border-sidebar-border/50 border-t",
          isExpanded ? "px-3 py-4" : "px-1 py-2",
        )}
      >
        {footer || (
          <SidebarMenuButton
            asChild
            tooltip={t("Logout")}
            className={cn(
              "w-full text-sm font-medium",
              isExpanded ? "rounded-xl px-3 py-2.5" : "rounded-lg",
              `text-destructive hover:bg-destructive/10`,
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
              {isExpanded && <span>{t("Logout")}</span>}
            </button>
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
