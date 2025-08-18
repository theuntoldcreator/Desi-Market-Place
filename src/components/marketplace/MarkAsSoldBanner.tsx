import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";

export function MarkAsSoldBanner() {
  return (
    <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-6">
      <Info className="h-4 w-4 !text-blue-800" />
      <AlertTitle className="font-semibold">Sold an item?</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between">
        <span>
          Please remember to mark your items as "Sold" once they are no longer available.
        </span>
        <Button asChild variant="link" className="p-0 h-auto mt-2 sm:mt-0 text-blue-800 font-semibold">
          <Link to="/my-listings">Go to My Listings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}