import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  ThumbsUp, 
  Reply, 
  MoreVertical, 
  Trash2, 
  Send,
  Heart
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { 
  useComments, 
  useCreateComment, 
  useDeleteComment, 
  Comment 
} from '../../hooks/useComments';
import { useAuth } from '../../contexts/AuthContext';

interface CommentsSectionProps {
  entryId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserAvatar?: string;
}

interface CommentItemProps {
  comment: Comment;
  entryId: string;
  level?: number;
  onReply?: (parentId: string) => void;
  currentUserAvatar?: string;
}

function CommentItem({ comment, entryId, level = 0, onReply, currentUserAvatar }: CommentItemProps) {
  const { user } = useAuth();
  const [showReplies, setShowReplies] = useState(false);

  const deleteMutation = useDeleteComment();
  const isOwner = user?.id === comment.author.id;
  const maxLevel = 3; // Maximum nesting level

  // Get the appropriate avatar - use current user's avatar if they're the comment author
  const getCommentAuthorAvatar = () => {
    // Debug logging
    console.log('🔍 Comment Avatar Debug:', {
      isOwner,
      currentUserId: user?.id,
      commentAuthorId: comment.author.id,
      authUserAvatar: user?.avatar,
      passedCurrentUserAvatar: currentUserAvatar,
      commentAuthorAvatar: comment.author.avatar,
      willUseAuthAvatar: isOwner && user?.avatar,
      willUsePassedAvatar: isOwner && !user?.avatar && currentUserAvatar
    });

    if (isOwner) {
      // If this is the current user's comment, prefer their auth avatar, 
      // then the passed currentUserAvatar, then comment author avatar, then default
      return user?.avatar || currentUserAvatar || comment.author.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=32&h=32&fit=crop';
    }
    
    // For other users, use their comment author avatar or default
    return comment.author.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=32&h=32&fit=crop';
  };


  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteMutation.mutateAsync({
          entryId,
          commentId: comment.id
        });
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };


  return (
    <div className={cn("border-l-2 border-gray-100 pl-4", level > 0 && "ml-4")}>
      <div className="flex items-start space-x-3 py-3">
        <img
          src={getCommentAuthorAvatar()}
          alt={comment.author.name}
          className="h-8 w-8 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-sm text-gray-900">{comment.author.name}</span>
            {comment.author.title && (
              <span className="text-xs text-gray-500">{comment.author.title}</span>
            )}
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mt-1">{comment.content}</p>

          <div className="flex items-center space-x-4 mt-2">
            
            {level < maxLevel && onReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
              >
                <Reply className="h-3 w-3" />
                <span>Reply</span>
              </button>
            )}

            {comment._count.replies > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-primary-600 transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                <span>{comment._count.replies} {comment._count.replies === 1 ? 'reply' : 'replies'}</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={handleDelete}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="ml-4 border-l border-gray-100 pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              entryId={entryId}
              level={level + 1}
              onReply={onReply}
              currentUserAvatar={currentUserAvatar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentFormProps {
  entryId: string;
  parentId?: string;
  placeholder?: string;
  onSuccess?: () => void;
  autoFocus?: boolean;
}

function CommentForm({ entryId, parentId, placeholder = "Write a comment...", onSuccess, autoFocus }: CommentFormProps) {
  const [content, setContent] = useState('');
  const createMutation = useCreateComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await createMutation.mutateAsync({
        entryId,
        content: content.trim(),
        parentId
      });
      setContent('');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create comment:', error);
      // Show user-friendly error
      if (error instanceof Error) {
        alert(`Failed to post comment: ${error.message}`);
      } else {
        alert('Failed to post comment. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        rows={3}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={createMutation.isPending || !content.trim()}
          className="bg-primary-600 hover:bg-primary-700"
        >
          {createMutation.isPending ? (
            <>
              <Heart className="h-4 w-4 mr-2 animate-pulse" />
              Posting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function CommentsSection({ entryId, isOpen, onClose, currentUserAvatar }: CommentsSectionProps) {
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const { data: comments, isLoading, error } = useComments(entryId);

  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('🔍 CommentsSection state:', {
        entryId,
        isLoading,
        hasError: !!error,
        error: error?.message,
        commentsCount: comments?.length,
        comments: comments
      });
    }
  }, [isOpen, entryId, isLoading, error, comments]);

  if (!isOpen) return null;

  const handleReply = (parentId: string) => {
    setReplyToId(replyToId === parentId ? null : parentId);
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900 flex items-center">
          <MessageSquare className="h-4 w-4 mr-2" />
          Comments ({comments?.length || 0})
        </h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* New Comment Form */}
      <div className="mb-6">
        <CommentForm entryId={entryId} />
      </div>

      {/* Comments List */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading comments...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">Failed to load comments</p>
          </div>
        ) : comments && comments.length > 0 ? (
          <>
            {comments.map((comment) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  entryId={entryId}
                  onReply={handleReply}
                  currentUserAvatar={currentUserAvatar}
                />
                {replyToId === comment.id && (
                  <div className="ml-11 mb-4">
                    <CommentForm
                      entryId={entryId}
                      parentId={comment.id}
                      placeholder={`Reply to ${comment.author.name}...`}
                      onSuccess={() => setReplyToId(null)}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            ))}
          </>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No comments yet</p>
            <p className="text-xs text-gray-400">Be the first to share your thoughts!</p>
          </div>
        )}
      </div>
    </div>
  );
}