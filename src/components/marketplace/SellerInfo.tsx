import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SellerInfoProps {
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export function SellerInfo({ firstName, lastName, avatarUrl }: SellerInfoProps) {
  const sellerName = `${firstName || ''} ${lastName || ''}`.trim() || 'Seller';
  const fallback = sellerName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-12 w-12 border">
        <AvatarImage src={avatarUrl || undefined} alt={sellerName} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold">{sellerName}</p>
        <p className="text-sm text-muted-foreground">Seller</p>
      </div>
    </div>
  );
}