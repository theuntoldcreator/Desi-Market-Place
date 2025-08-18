import React from 'react';
import { AlertTriangle } from 'lucide-react';

const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName]
);

export function EnvVarCheck({ children }: { children: React.ReactNode }) {
  if (missingEnvVars.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-md border border-destructive/50">
          <div className="flex items-center gap-4 mb-4">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <h1 className="text-2xl font-bold text-destructive">
              Configuration Error
            </h1>
          </div>
          <p className="text-foreground mb-4">
            The application cannot start because some required Firebase environment variables are missing.
          </p>
          <div className="bg-muted p-4 rounded-md mb-6">
            <h2 className="font-semibold mb-2">Missing Variables:</h2>
            <ul className="list-disc list-inside space-y-1 font-mono text-sm">
              {missingEnvVars.map((varName) => (
                <li key={varName}>{varName}</li>
              ))}
            </ul>
          </div>
          <p className="text-muted-foreground">
            Please create a <code>.env</code> file in the root of your project and add the missing variables. You can find detailed instructions in the <code>README.md</code> file.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}