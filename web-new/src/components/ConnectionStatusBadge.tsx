import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ConnectionStatusBadgeProps {
  isConnected: boolean;
  connectedAt?: string | null;
  lineDisplayName?: string | null;
  variant?: 'default' | 'detailed';
}

export function ConnectionStatusBadge({
  isConnected,
  connectedAt,
  lineDisplayName,
  variant = 'default',
}: ConnectionStatusBadgeProps) {
  if (variant === 'detailed' && isConnected) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="default" className="bg-green-500 hover:bg-green-600 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </Badge>
        {lineDisplayName && (
          <div className="text-sm text-muted-foreground">
            LINE: {lineDisplayName}
          </div>
        )}
        {connectedAt && (
          <div className="text-xs text-muted-foreground">
            Since {format(new Date(connectedAt), 'PP')}
          </div>
        )}
      </div>
    );
  }

  return (
    <Badge
      variant={isConnected ? 'default' : 'outline'}
      className={isConnected ? 'bg-green-500 hover:bg-green-600' : 'border-gray-300 text-gray-600'}
    >
      {isConnected ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3" />
          Not Connected
        </>
      )}
    </Badge>
  );
}
