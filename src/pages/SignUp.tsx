import { SignUp } from "@clerk/clerk-react";
import { Card, CardContent } from "@/components/ui/card";

const SignUpPage = () => {
  return (
    <div className="min-h-screen bg-marketplace-bg flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 bg-gradient-card">
        <CardContent className="p-8">
          <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" />
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpPage;