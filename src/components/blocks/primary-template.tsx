import { ReactNode, useState, useEffect, Fragment, useRef, createContext, useContext } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { HelpCircle, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Create context for scroll container
const ScrollContainerContext = createContext<string | null>(null);

// Hook to access scroll container ID
export const useScrollContainer = () => {
  return useContext(ScrollContainerContext);
};

interface NavigationItem {
  id?: string;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  type?: "divider" | "header";
  children?: NavigationItem[];
  href?: string;
}

interface PrimaryTemplateProps {
  navigation: NavigationItem[];
  activePageId: string;
  onNavigate: (pageId: string) => void;
  breadcrumbItems: { label: string }[];
  children: ReactNode;
  showSearch?: boolean;
  appName?: string;
  appLogoSrc?: string;
  appLogoAlt?: string;
}

export function PrimaryTemplate({
  navigation,
  activePageId,
  onNavigate,
  breadcrumbItems,
  children,
  showSearch = true,
  appName = "Evo Builder Product Name",
  appLogoSrc = "https://evobuilder.ai.accessacloud.com/app-icon.png",
  appLogoAlt,
}: PrimaryTemplateProps) {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Auto-open sections containing active page
  useEffect(() => {
    const findAndOpenParents = (items: NavigationItem[], parents: string[] = []): boolean => {
      for (const item of items) {
        if (item.id === activePageId) {
          parents.forEach((parentId) => {
            if (!openSections.includes(parentId)) {
              setOpenSections((prev) => [...prev, parentId]);
            }
          });
          return true;
        }
        if (item.children && item.id) {
          if (findAndOpenParents(item.children, [...parents, item.id])) {
            return true;
          }
        }
      }
      return false;
    };
    findAndOpenParents(navigation);
  }, [activePageId, navigation]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const isCurrentlyOpen = prev.includes(sectionId);
      if (isCurrentlyOpen) {
        return prev.filter((id) => id !== sectionId);
      }

      const findParentAndSiblings = (
        items: NavigationItem[],
        targetId: string,
        parent: string | null = null,
      ): { parent: string | null; siblings: string[] } | null => {
        for (const item of items) {
          if (item.id === targetId) {
            const siblings = items
              .filter((i) => i.id && i.id !== targetId && i.children && i.children.length > 0)
              .map((i) => i.id!);
            return { parent, siblings };
          }
          if (item.children && item.id) {
            const result = findParentAndSiblings(item.children, targetId, item.id);
            if (result) return result;
          }
        }
        return null;
      };

      const result = findParentAndSiblings(navigation, sectionId);
      if (result) {
        const siblingsAndDescendants = new Set<string>();
        const addDescendants = (items: NavigationItem[]) => {
          items.forEach((item) => {
            if (item.id && item.children) {
              siblingsAndDescendants.add(item.id);
              addDescendants(item.children);
            }
          });
        };
        result.siblings.forEach((siblingId) => {
          siblingsAndDescendants.add(siblingId);
          const findAndAddDescendants = (items: NavigationItem[]) => {
            for (const item of items) {
              if (item.id === siblingId && item.children) {
                addDescendants(item.children);
                return;
              }
              if (item.children) findAndAddDescendants(item.children);
            }
          };
          findAndAddDescendants(navigation);
        });
        return [...prev.filter((id) => !siblingsAndDescendants.has(id)), sectionId];
      }
      return [...prev, sectionId];
    });
  };

  const isDescendantActive = (item: NavigationItem, pageId: string): boolean => {
    if (!item.children) return false;
    return item.children.some((child) => child.id === pageId || isDescendantActive(child, pageId));
  };

  const findPageInfo = (
    items: NavigationItem[],
    pageId: string,
  ): { label: string; icon?: React.ComponentType<{ className?: string }> } | null => {
    for (const item of items) {
      if (item.id === pageId && item.label) return { label: item.label, icon: item.icon };
      if (item.children) {
        const found = findPageInfo(item.children, pageId);
        if (found) return found;
      }
    }
    return null;
  };

  // Flatten all leaf pages for search
  const getAllPages = (
    items: NavigationItem[],
    parentLabels: string[] = [],
  ): {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    path: string;
    topCategory: string;
  }[] => {
    let pages: {
      id: string;
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      path: string;
      topCategory: string;
    }[] = [];
    items.forEach((item) => {
      if (item.type === "divider" || item.type === "header") return;
      if (item.id && item.label && (!item.children || item.children.length === 0)) {
        pages.push({
          id: item.id,
          label: item.label,
          icon: item.icon,
          path: [...parentLabels, item.label].join(" > "),
          topCategory: parentLabels[0] || item.label,
        });
      }
      if (item.children && item.label) {
        pages = [...pages, ...getAllPages(item.children, [...parentLabels, item.label])];
      }
    });
    return pages;
  };

  const allPages = getAllPages(navigation);
  const filteredPages = searchQuery
    ? allPages.filter(
        (page) =>
          page.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          page.path.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  const groupedResults = filteredPages.reduce(
    (acc, page) => {
      if (!acc[page.topCategory]) acc[page.topCategory] = [];
      acc[page.topCategory].push(page);
      return acc;
    },
    {} as Record<string, typeof filteredPages>,
  );

  const scrollPositionRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  function NavigationContent() {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const prevCollapsedRef = useRef(isCollapsed);

    useEffect(() => {
      if (isCollapsed && !prevCollapsedRef.current) {
        setIsSearchActive(false);
        setSearchQuery("");
        setOpenSections([]);
      }
      prevCollapsedRef.current = isCollapsed;
    }, [isCollapsed]);

    const setScrollRef = (node: HTMLDivElement | null) => {
      if (node) {
        scrollContainerRef.current = node;
        node.scrollTop = scrollPositionRef.current;
      }
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      scrollPositionRef.current = e.currentTarget.scrollTop;
    };

    return (
      <div
        ref={setScrollRef}
        onScroll={handleScroll}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden"
        data-sidebar="content"
      >
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Search results */}
              {isSearchActive &&
                searchQuery.trim() &&
                (Object.keys(groupedResults).length > 0 ? (
                  Object.entries(groupedResults).map(([category, pages]) => (
                    <div key={category}>
                      <div className="px-2 py-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">{category}</h4>
                      </div>
                      {pages.map((page) => {
                        const isActive = activePageId === page.id;
                        const Icon = page.icon;
                        const pathParts = page.path.split(" > ");
                        const immediateParent = pathParts.length > 2 ? pathParts[pathParts.length - 2] : null;
                        const showIcon = pathParts.length <= 2;
                        return (
                          <div key={page.id} className={cn(immediateParent && "mb-2")}>
                            {immediateParent && (
                              <div className="px-2 pt-2">
                                <span className="text-xs text-muted-foreground">{immediateParent}</span>
                              </div>
                            )}
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                tooltip={page.path}
                                onClick={() => {
                                  onNavigate(page.id);
                                  setSearchQuery("");
                                  setIsSearchActive(false);
                                }}
                                data-active={isActive}
                                className=""
                              >
                                {showIcon && Icon && <Icon className={cn("w-4 h-4")} />}
                                <span>{page.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">No pages found</div>
                ))}

              {/* Normal navigation */}
              {!isSearchActive && (
                <>
                  {navigation.map((item, idx) => {
                    if (item.type === "divider") return null;

                    if (item.type === "header") {
                      if (isCollapsed) return null;
                      return (
                        <div key={`header-${idx}`} className="px-2 pt-2 pb-1 mt-3">
                          <h4 className="text-sm font-semibold text-muted-foreground">{item.label}</h4>
                        </div>
                      );
                    }

                    if (!item.id || !item.label) return null;

                    // Item with children — collapsible in expanded, popover when collapsed
                    if (item.children && item.children.length > 0) {
                      const isOpen = openSections.includes(item.id);
                      const Icon = item.icon;

                      if (isCollapsed) {
                        return (
                          <SidebarMenuItem key={item.id}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <SidebarMenuButton tooltip={item.label} className="">
                                  {Icon && <Icon className={cn("w-4 h-4")} />}
                                  <span>{item.label}</span>
                                </SidebarMenuButton>
                              </PopoverTrigger>
                              <PopoverContent side="right" align="start" className="w-64 p-2">
                                <div className="space-y-1">
                                  {item.children.map((child) => {
                                    if (!child.id || !child.label) return null;
                                    const isActive =
                                      activePageId === child.id || isDescendantActive(child, activePageId);
                                    const ChildIcon = child.icon;
                                    return (
                                      <button
                                        key={child.id}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md transition-colors text-left cursor-pointer",
                                          isActive
                                            ? "bg-accent text-accent-foreground font-medium"
                                            : "hover:bg-accent hover:text-accent-foreground",
                                        )}
                                        onClick={() => child.id && onNavigate(child.id)}
                                      >
                                        {ChildIcon && <ChildIcon className={cn("w-4 h-4")} />}
                                        <span>{child.label}</span>
                                        {child.children && child.children.length > 0 && (
                                          <ChevronRight className="w-4 h-4 ml-auto" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </SidebarMenuItem>
                        );
                      }

                      return (
                        <SidebarMenuItem key={item.id}>
                          <Collapsible
                            open={isOpen}
                            onOpenChange={() => toggleSection(item.id!)}
                            className="group/collapsible"
                          >
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton tooltip={item.label} className={cn("group")}>
                                {item.icon && <item.icon className={cn("w-4 h-4")} />}
                                <span className="flex-1">{item.label}</span>
                                <ChevronRight
                                  className={cn("w-4 h-4 transition-transform ml-auto", isOpen && "rotate-90")}
                                />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.children.map((child) => {
                                  if (!child.id || !child.label) return null;

                                  if (child.children && child.children.length > 0) {
                                    const isChildOpen = openSections.includes(child.id);
                                    return (
                                      <SidebarMenuItem key={child.id}>
                                        <Collapsible
                                          open={isChildOpen}
                                          onOpenChange={() => toggleSection(child.id!)}
                                          className="group/collapsible"
                                        >
                                          <CollapsibleTrigger asChild>
                                            <SidebarMenuSubButton className={cn("group")}>
                                              {child.icon && <child.icon className={cn("w-4 h-4")} />}
                                              <span className="flex-1">{child.label}</span>
                                              <ChevronRight
                                                className={cn(
                                                  "w-4 h-4 transition-transform ml-auto",
                                                  isChildOpen && "rotate-90",
                                                )}
                                              />
                                            </SidebarMenuSubButton>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent>
                                            <SidebarMenuSub>
                                              {child.children.map((grandchild) => {
                                                if (!grandchild.id || !grandchild.label) return null;
                                                const isActive = activePageId === grandchild.id;
                                                return (
                                                  <SidebarMenuItem key={grandchild.id}>
                                                    <SidebarMenuSubButton
                                                      onClick={() => onNavigate(grandchild.id!)}
                                                      isActive={isActive}
                                                      className=""
                                                    >
                                                      <span>{grandchild.label}</span>
                                                    </SidebarMenuSubButton>
                                                  </SidebarMenuItem>
                                                );
                                              })}
                                            </SidebarMenuSub>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      </SidebarMenuItem>
                                    );
                                  }

                                  const ChildIcon = child.icon;
                                  const isActive = activePageId === child.id;
                                  return (
                                    <SidebarMenuItem key={child.id}>
                                      <SidebarMenuSubButton
                                        onClick={() => onNavigate(child.id!)}
                                        isActive={isActive}
                                        className=""
                                      >
                                        {ChildIcon && <ChildIcon className={cn("w-4 h-4")} />}
                                        <span>{child.label}</span>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuItem>
                                  );
                                })}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </Collapsible>
                        </SidebarMenuItem>
                      );
                    }

                    // Flat item
                    if (!item.icon) return null;
                    const Icon = item.icon;
                    const isActive = activePageId === item.id;

                    if (item.href) {
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton tooltip={item.label} asChild className="">
                            <a href={item.href}>
                              <Icon className={cn("w-4 h-4")} />
                              <span>{item.label}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          tooltip={item.label}
                          onClick={() => onNavigate(item.id!)}
                          data-active={isActive}
                          className=""
                        >
                          <Icon className={cn("w-4 h-4")} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full">
        <Sidebar variant="inset" collapsible="icon" className="border-r">
          <SidebarHeader className="flex-row items-center gap-2">
            <SidebarTrigger className="m-2" />
            {showSearch && (
              <div className="flex-1 group-data-[collapsible=icon]:hidden">
                <div className="relative pr-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchActive(e.target.value.length > 0);
                    }}
                    onFocus={() => setIsSearchActive(true)}
                    onBlur={() => {
                      if (!searchQuery.trim()) setIsSearchActive(false);
                    }}
                    placeholder="Search pages..."
                    className="pl-9 h-9"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => {
                        setSearchQuery("");
                        setIsSearchActive(false);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </SidebarHeader>

          <NavigationContent />

          <div className="mt-auto border-t p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Help & Support">
                  <HelpCircle className="w-4 h-4" />
                  <span>Help & Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </Sidebar>

        <div className="flex flex-1 flex-col min-w-0">
          <header className="flex h-16 shrink-0 items-center gap-6 border-b px-6 bg-bg-sidebar">
            <div className="flex items-center gap-2">
              <img src={appLogoSrc} alt={appLogoAlt ?? appName} className="w-8 h-8 rounded object-contain shrink-0" />
              {appName && <span className="font-bold text-lg text-foreground">{appName}</span>}
            </div>
            <div className="flex flex-col min-w-0">
              <Breadcrumb items={breadcrumbItems} />
            </div>
          </header>

          <ScrollContainerContext.Provider value="#primary-template-main-content">
            <main id="primary-template-main-content" className="flex-1 flex flex-col min-h-0 bg-muted/30 overflow-auto">
              {children}
            </main>
          </ScrollContainerContext.Provider>
        </div>
      </div>
    </SidebarProvider>
  );
}
