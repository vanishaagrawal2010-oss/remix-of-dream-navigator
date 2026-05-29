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

    // maybeSingle() returns null (not an error) when 0 rows exist
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      // Row exists — use it
      setProfile(data);
    } else if (!data && !error) {
      // Row missing — auto-create a blank one so saves always work
      const { data: created, error: insertErr } = await supabase
        .from("profiles")
        .insert({ user_id: user.id })
        .select("*")
        .maybeSingle();
      if (!insertErr && created) setProfile(created);
    }
    // If there was a real error, leave profile as null — UI will show CTA

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
  }, [user?.id]); // depend on user.id not the whole object to avoid infinite loops

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    // Optimistic update so UI reacts immediately
    setProfile((prev) => (prev ? { ...prev, ...updates } as Profile : prev));
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id);
    if (!error) await fetchProfile();
    return { error };
  };

  const isProfileComplete = !!(profile?.full_name && profile?.school && profile?.grades);

  return { profile, loading, updateProfile, refetch: fetchProfile, isProfileComplete };
};