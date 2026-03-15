import { useEffect, useState, useMemo } from 'react';
import { Search, X, Loader2, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KbItemCard } from '@/components/KbItemCard';
import { useKbStore } from '@/stores/kb.store';
import { parseTags } from '@/api/kb';

export function KnowledgeBasePage() {
  const {
    items,
    isLoading,
    isSearching,
    searchResults,
    activeTag,
    hasMore,
    fetchItems,
    searchItems,
    clearSearch,
    setActiveTag,
  } = useKbStore();

  const [searchInput, setSearchInput] = useState('');

  // Load items on mount
  useEffect(() => {
    void fetchItems(undefined, 1);
  }, [fetchItems]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput) {
        void searchItems(searchInput);
      } else {
        clearSearch();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, searchItems, clearSearch]);

  // Get all unique tags from items
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach((item) => {
      const tags = parseTags(item.tags);
      tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [items]);

  const handleLoadMore = () => {
    const nextPage = useKbStore.getState().page + 1;
    void fetchItems(activeTag ?? undefined, nextPage);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    clearSearch();
  };

  const isSearchMode = searchInput.trim().length > 0;
  const displayedItems = isSearchMode ? (searchResults ?? []) : items;

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-[860px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground">Your saved research items</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-5">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search your knowledge base..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9 bg-card border-border"
          />
          {searchInput && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tag filter (only show when not searching) */}
        {!isSearchMode && allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                activeTag === null
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                  activeTag === tag
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading && items.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Searching state */}
        {isSearching && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state - no items */}
        {!isLoading && !isSearching && items.length === 0 && !isSearchMode && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Database size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No items saved yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Save responses from the chat to build your knowledge base.
            </p>
          </div>
        )}

        {/* Empty state - no search results */}
        {!isLoading && !isSearching && isSearchMode && displayedItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No results found.</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search term.</p>
          </div>
        )}

        {/* Items grid */}
        {!isLoading && !isSearching && displayedItems.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedItems.map((item) => (
              <KbItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Load more button */}
        {!isSearchMode && !isLoading && hasMore && (
          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={handleLoadMore}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeBasePage;
