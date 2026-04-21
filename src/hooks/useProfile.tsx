import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    if (!user) return;
    // Realtime: any change to this user's profile row instantly updates everywhere
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) setProfile(payload.new as Profile);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    // Optimistic update so UI reacts immediately even before refetch / realtime
    setProfile((prev) => (prev ? { ...prev, ...updates } as Profile : prev));
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);
    if (!error) await fetchProfile();
    return { error };
  };

  const isProfileComplete = profile?.full_name && profile?.school && profile?.grades;

  return { profile, loading, updateProfile, refetch: fetchProfile, isProfileComplete };
};
