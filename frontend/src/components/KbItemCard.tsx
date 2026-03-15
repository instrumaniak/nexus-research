import { useState } from 'react';
import { ExternalLink, Trash2, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseTags, type KbItem } from '@/api/kb';
import { useKbStore } from '@/stores/kb.store';

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

interface KbItemCardProps {
  item: KbItem;
}

export function KbItemCard({ item }: KbItemCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteItem } = useKbStore();

  const tags = parseTags(item.tags);
  const previewContent = item.summary || item.content.slice(0, 120);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteItem(item.id);
      setShowDeleteDialog(false);
    } catch {
      // Error handled in store
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors group">
        {/* Header: Title + Source URL */}
        <div className="flex flex-col gap-1.5">
          <h3 className="font-medium text-[14px] text-foreground line-clamp-2 leading-snug">
            {item.title}
          </h3>
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors w-fit"
            >
              <ExternalLink size={10} />
              <span className="truncate max-w-[200px]">{item.sourceUrl}</span>
              <ArrowUpRight size={10} />
            </a>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Content Preview */}
        <p className="text-[12.5px] text-muted-foreground line-clamp-3 leading-relaxed">
          {previewContent}
          {(item.summary || item.content.length > 120) && '...'}
        </p>

        {/* Footer: Date + Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-auto">
          <span className="text-[11px] text-muted-foreground">
            {formatRelative(item.createdAt)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-primary"
              onClick={() => setIsOpen(true)}
            >
              <span className="text-[11px]">View</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Delete item"
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
      </div>

      {/* Sheet for full content */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="leading-snug">{item.title}</SheetTitle>
            {item.sourceUrl && (
              <SheetDescription className="flex items-center gap-1">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 hover:text-primary"
                >
                  <ExternalLink size={12} />
                  <span className="truncate">{item.sourceUrl}</span>
                </a>
              </SheetDescription>
            )}
          </SheetHeader>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {item.summary && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
              <p className="text-sm text-foreground">{item.summary}</p>
            </div>
          )}
          <div className="mt-4">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {item.content}
            </p>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Saved {formatRelative(item.createdAt)}
          </p>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{item.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
