/**
 * Book card component for displaying book information
 */

import { useState } from 'react';
import { 
  MoreVertical, 
  Star, 
  StarOff, 
  Trash2, 
  Edit3, 
  FolderPlus,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookCardProps } from '@/types/library';
import { Progress } from '@/components/ui/progress';

export default function BookCard({ 
  book, 
  variant = 'default',
  onOpen,
  onFavorite,
  onRemove,
  onAddToCollection
}: BookCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const initials =
    (book.title || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'BK';

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(book.id, !book.favorite);
  };

  const handleRemove = () => {
    onRemove(book.id);
  };

  const handleOpen = () => {
    onOpen(book.id);
  };

  const progressPercent = book.progress?.percent || 0;
  const hasProgress = book.progress && progressPercent > 0;

  return (
    <div
      className={`
        group relative bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200
        ${variant === 'compact' ? 'h-32' : 'h-80'}
        cursor-pointer
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
    >
      {/* Cover Image */}
      <div className={`relative w-full overflow-hidden ${variant === 'compact' ? 'h-24' : 'h-48'}`}>
        {/* Fallback cover with initials - always show as background */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={`Cover for ${book.title}`}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={(e) => {
              // If cover fails to load, hide the image to show the fallback
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        ) : null}
        
        {/* Progress Ring */}
        {hasProgress && (
          <div className="absolute top-2 right-2">
            <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center">
              <span className="text-xs font-medium text-foreground">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        )}
        
        {/* Favorite Button */}
        <Button
          variant="ghost"
          size="icon"
          className={`
            absolute top-2 left-2 w-8 h-8 rounded-full bg-background/90 hover:bg-background
            transition-opacity duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={handleFavorite}
          aria-pressed={book.favorite}
          aria-label={book.favorite ? 'Unfavorite' : 'Favorite'}
        >
          {book.favorite ? (
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ) : (
            <Star className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Book Info */}
      <div className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {book.title}
        </h3>
        
        {book.author && (
          <p className="text-muted-foreground text-xs line-clamp-1 mb-2">
            {book.author}
          </p>
        )}

        {/* Progress Bar */}
        {hasProgress && (
          <div className="space-y-1">
            <Progress value={progressPercent} className="h-1" />
            <p className="text-xs text-muted-foreground">
              {Math.round(progressPercent)}% complete
            </p>
          </div>
        )}

        {/* Collections */}
        {book.collections.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {book.collections.slice(0, 2).map(collectionId => (
              <Badge key={collectionId} variant="secondary" className="text-xs">
                {collectionId}
              </Badge>
            ))}
            {book.collections.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{book.collections.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`
              absolute top-2 right-2 w-8 h-8 rounded-full bg-background/90 hover:bg-background
              transition-opacity duration-200
              ${isHovered ? 'opacity-100' : 'opacity-0'}
            `}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleOpen}>
            <BookOpen className="w-4 h-4 mr-2" />
            Open
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Edit3 className="w-4 h-4 mr-2" />
            Rename
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <FolderPlus className="w-4 h-4 mr-2" />
            Add to Collection
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleFavorite}>
            {book.favorite ? (
              <>
                <StarOff className="w-4 h-4 mr-2" />
                Remove from Favorites
              </>
            ) : (
              <>
                <Star className="w-4 h-4 mr-2" />
                Add to Favorites
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleRemove}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
