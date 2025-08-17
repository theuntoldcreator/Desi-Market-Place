import { useAuth } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const SupabaseSync = () => {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncSession = async () => {
      if (userId) {
        try {
          const supabaseToken = await getToken({ template: "supabase" });
          if (!supabaseToken) {
            console.error("Supabase token from Clerk is null or undefined. Ensure JWT template is set up correctly.");
            await supabase.auth.signOut();
            return;
          }
          
          const { error } = await supabase.auth.setSession({
            access_token: supabaseToken,
            refresh_token: supabaseToken,
          });

          if (error) {
            console.error("Error setting Supabase session:", error);
          } else {
            // Invalidate all queries to refetch data with the new user session
            queryClient.invalidateQueries();
          }
        } catch (e) {
          console.error("Error getting Supabase token from Clerk or setting session", e);
        }
      } else {
        // User is signed out from Clerk, so sign out from Supabase as well.
        await supabase.auth.signOut();
        queryClient.invalidateQueries();
      }
    };

    syncSession();
  }, [userId, getToken, queryClient]);

  return null; // This component does not render anything
};