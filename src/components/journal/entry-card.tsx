import React from 'react';
import { format } from 'date-fns';
import { MessageSquare, ThumbsUp, User } from 'lucide-react';
import { Button } from '../ui/button';

interface JournalEntryCardProps {
  entry: {
    id: string;
    content: string;
    createdAt: Date;
    author: {
      name: string;
      avatar: string;
    };
    tags: string[];
    teammates: string[];
    likes: number;
    comments: number;
  };
}

export function JournalEntryCard({ entry }: JournalEntryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={entry.author.avatar}
            alt={entry.author.name}
            className="h-10 w-10 rounded-full"
          />
          <div>
            <h3 className="text-sm font-medium text-gray-900">{entry.author.name}</h3>
            <p className="text-sm text-gray-500">
              {format(entry.createdAt, "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div
          className="prose prose-sm max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />

        {(entry.tags.length > 0 || entry.teammates.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
              >
                #{tag}
              </span>
            ))}
            {entry.teammates.map((teammate) => (
              <span
                key={teammate}
                className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-800"
              >
                <User className="mr-1 h-3 w-3" />
                {teammate}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-600">
              <ThumbsUp className="mr-1.5 h-4 w-4" />
              {entry.likes}
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-600">
              <MessageSquare className="mr-1.5 h-4 w-4" />
              {entry.comments}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}