/**
 * Library shell component with sidebar and header
 */

import { useState, useEffect } from 'react';
import { 
  Home, 
  BookOpen, 
  Star, 
  Clock, 
  FolderOpen,
  Search,
  Grid3X3,
  List,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useLibraryStore, useBookCounts } from './store';
import UploadDialog from './UploadDialog';

interface LibraryShellProps {
  children: React.ReactNode;
}

const sidebarItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'all', label: 'All Books', icon: BookOpen },
  { id: 'favorites', label: 'Favorites', icon: Star },
  { id: 'recent', label: 'Recently Added', icon: Clock },
  { id: 'collections', label: 'Collections', icon: FolderOpen },
];

export default function LibraryShell({ children }: LibraryShellProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpenState] = useState(false);
  const { 
    viewState, 
    filters,
    setSidebarOpen, 
    setActiveSection, 
    setSearch, 
    setSortBy, 
    setViewMode,
    loadBooks 
  } = useLibraryStore();
  
  const bookCounts = useBookCounts();

  // Load books on mount
  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on "/"
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Open upload dialog on "u"
      if (e.key === 'u' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setUploadDialogOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Respond to BookShelf's "open upload" broadcast
  useEffect(() => {
    const onOpenUpload = () => setUploadDialogOpen(true);
    window.addEventListener('library:open-upload', onOpenUpload as EventListener);
    return () => window.removeEventListener('library:open-upload', onOpenUpload as EventListener);
  }, []);

  // Repaginate/reflow when the sidebar toggles
  useEffect(() => {
    const id = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => cancelAnimationFrame(id);
  }, [sidebarOpen]);

  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open);
    setSidebarOpenState(open);
  };

  const handleSectionChange = (section: string) => {
    setActiveSection(section as 'home' | 'all' | 'favorites' | 'recent' | 'collections');
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="offcanvas" side="left" className="border-r">
        <SidebarHeader className="px-3 py-2">
          <div className="text-sm font-medium truncate">Storytime Library</div>
        </SidebarHeader>

        <SidebarContent className="p-0">
          <nav className="space-y-1 px-3">
            {sidebarItems.map((item) => {
              const IconComponent = item.icon;
              const count = bookCounts[item.id as keyof typeof bookCounts] || 0;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
                    ${viewState.activeSection === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {count > 0 && (
                    <span className="text-xs bg-muted-foreground/20 text-muted-foreground px-2 py-1 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </SidebarContent>

        <SidebarFooter className="px-3 py-2 text-xs text-muted-foreground">
          Storytime
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex h-dvh min-h-0 w-full">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/80 backdrop-blur px-3 h-12 shrink-0">
          <SidebarTrigger className="-ml-1" />
          
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search your books..."
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                {viewState.viewMode === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <List className="w-4 h-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewMode('grid')}>
                <Grid3X3 className="w-4 h-4 mr-2" />
                Grid View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setViewMode('compact')}>
                <List className="w-4 h-4 mr-2" />
                Compact View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Upload Button */}
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">
          {children}
        </main>
      </SidebarInset>

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={() => {
          loadBooks();
        }}
      />
    </SidebarProvider>
  );
}
