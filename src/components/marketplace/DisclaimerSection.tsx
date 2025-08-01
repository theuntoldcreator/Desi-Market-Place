import { AlertTriangle, Shield, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DisclaimerSection() {
  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50/50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Important:</strong> Please exercise caution when interacting with other users. 
          Always meet in safe, public places and verify items before making payments.
        </AlertDescription>
      </Alert>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Safety Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <Eye className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>Always inspect items thoroughly before purchasing</span>
            </p>
            <p className="flex items-start gap-2">
              <Eye className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>Meet sellers in well-lit, public areas with people around</span>
            </p>
            <p className="flex items-start gap-2">
              <Eye className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>Trust your instincts - if something feels wrong, walk away</span>
            </p>
            <p className="flex items-start gap-2">
              <Eye className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span>Keep records of all communications and transactions</span>
            </p>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> UNT Market Place is not responsible for transactions between users. 
              We provide a platform to connect buyers and sellers, but all dealings are at your own risk. 
              Please report suspicious activity to our support team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}